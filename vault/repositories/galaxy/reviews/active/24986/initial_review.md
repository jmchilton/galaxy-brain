# Initial review: galaxyproject/galaxy#24986, "Allow default file locations for workflow inputs"

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5
- Effort: medium
- Reviewed commit: `be2b1655fc6b933f47ca7e41aa0ea308cccfd3b7`
- Scope: `git diff origin/dev...HEAD`, 14 files, about 226 added lines in two commits (`c845aa39fd8`, `be2b1655fc6`)

## Summary

The PR does three things:

1. The workflow editor gets a "Default file location" text field on `data_input` steps (`FormDefault.vue`). `_workflow_to_dict_editor` now emits step `in` defaults, so saving from the editor no longer drops them.
2. The run model now marks a data input that has a `File` default with a location as `optional: True`, sets `value: None`, and adds `default_location`. `FormData.vue` shows a status line and relabels the null option "Use default file". The long run form now omits null inputs.
3. `InputDataModule.get_runtime_inputs` forces `optional=False` when a default exists, so an optional input with a default no longer trips `DataToolParameter`'s "both optional and have a default" error.

The backend change is small and correct: `run_request` and `WorkflowProgress` already fall back to the step default when an input is omitted. The editor round trip also fixes defaults on tool steps, which the editor silently dropped before. Test coverage is good: an API round-trip and run test, Selenium tests for both the editor and the run form, and vitests for both components. The author notes that the API test was not run independently. I did not run any tests: the client has no `node_modules`, and I did not start a Galaxy server.

## Findings

### P2 1: Changing the location keeps metadata that describes the old file (basename, hashes)

`FormDefault.vue` `onDefaultLocation` spreads the previous `File` default and replaces only `location`:

```ts
inputs.input = { ...inputs.input, default: { ...file, class: "File", location } };
```

Keeping `format` is reasonable, and the new vitest asserts it. But `raw_to_galaxy` (`lib/galaxy/tools/parameters/basic.py:3474`) also reads `basename` (the dataset name), every `HASH_NAMES` key (attached as `DatasetHash` and validated when the deferred dataset materializes), and `created_from_basename`. All of these describe the previous file. The PR's own fixture `WORKFLOW_WITH_DEFAULT_FILE_DATASET_INPUT` has `basename: a file`. After an author points the input at a different URL in the editor, the run still names the dataset "a file". If the original default had an `MD5`/`SHA-1`/... hash, materializing the new URL fails hash validation, and nothing in the editor shows why.

The opposite case also loses data. Clearing the field, for example with select-all and then typing, deletes the whole default, including `format`.

Fix: when the location changes, keep only location-independent keys (`format`, possibly `dbkey`) and drop `basename`, the hash keys, and `created_from_basename`. Alternatively, show the extra metadata in the form so the author can see what is kept. Add a vitest case with a `basename` or `MD5` key.

### P2 2: The long run form now omits every null input step value, which diverges from the simple form and changes parameter-input semantics

`WorkflowRunForm.vue` `onDefaultStepInputs` deletes `inputs[stepId]` whenever `data.input == null`. This handler serves every non-tool step: `data_input`, `data_collection_input`, and `parameter_input`. The simple form's sibling path (`WorkflowRunFormSimple.vue` around line 455) deliberately omits null only for `data_input` / `data_collection_input`. It still sends `null` for parameters.

The backend treats the two cases differently (`WorkflowProgress.set_outputs_for_input`, `_ensure_input_step_outputs_populated` in `lib/galaxy/workflow/run.py`):

- If the key is missing, the step default is used.
- If the key is present with `None`, the output is `None`.

So for an optional `parameter_input` with a default, a field the user explicitly cleared to null now runs with the default in the long form, but with null in the simple form.

Fix: limit the omission to data and collection input steps, matching the simple form. Better, share one "should this input be omitted" helper between the two forms so they cannot drift again.

### P2 3: The default-file run-model logic is bolted onto the workflow manager instead of living with `DataToolParameter`

`WorkflowContentsManager._workflow_to_dict_run` takes `DataToolParameter.to_dict()` and then patches the result for `data_input` steps (`optional = True`, `value = None`, `default_location`). It re-reads the default through `step.get_input_default_value(None)`, although the parameter it just built already holds it as `input.default_object`. Some consequences:

- **Sibling divergence.** Tool `<param type="data">` inputs can already declare a default (`default_object`, `basic.py:2633`). The tool form still preselects a history dataset and gives no way to choose the default, so the two ways of declaring a data default now behave differently in the UI.
- **Contract mismatch.** The client is told `optional: True`, while the backend parameter for the same input is constructed with `optional=False` (the `modules.py` change). The real state is "required, satisfied by a default". The client could express that directly by treating `default_location` as making null acceptable, rather than borrowing `optional`.
- **Narrower than the backend.** The UI path covers only a `class: File` default with a `location`. `run_request` and `InputDataModule` accept any default.

Suggested shape: have `DataToolParameter.to_dict` emit `default_location` (and `value: None`) when `default_object` has a location, and let `FormData` treat a present `default_location` as permitting null. Tool forms and workflow runs then share one abstraction, and the manager no longer needs the special case.

### P3 1: Each keystroke in the default-location field creates its own undo entry

`FormDefault` emits `onUpdateStep` on every `update:modelValue`. That reaches `stepActions.updateStep` (`Actions/stepActions.ts:690`), which applies a fresh `UpdateStepAction` every time. Typing a 40-character URL leaves about 40 undo steps named "modify step ...". Annotation and label edits use `changeValueOrCreateAction` / `LazyMutateStepAction` to merge keystrokes into one entry. Use the same mechanism for the `in` key, perhaps through a dedicated `setInputDefault` step action. A side effect of trimming on every keystroke is that the field drops trailing whitespace while the user is typing.

### P3 2: The simple form's help concatenation is unrelated and appears to do nothing

`WorkflowRunFormSimple.vue` now builds `help` from `step.annotation` plus `longFormInput?.help`. The runtime inputs of input-type steps (`InputDataModule.get_runtime_inputs` and its siblings) set no `help`, so `longFormInput.help` is empty and the change has no effect on this PR's feature, which is rendered by `FormData`'s status block. Drop it, or explain what it is meant to show. If it ever becomes non-empty, it changes the help text of every input type, not just inputs with a default.

### P3 3: The editor dict duplicates the export path's `in` serialization

The new `step_defaults` block in `_workflow_to_dict_editor` (`managers/workflows.py` around line 1709) repeats the `step_in` loop in the native export (around line 2076) almost line for line. Move it into a small helper, for example a `WorkflowStep` method that returns the `in` dict, and call it from both places. The editor and export representations then cannot drift apart.

### P3 4: Loose typing for step `in` pushes runtime narrowing into the component

`NewStep.in` is typed `Record<string, { default?: unknown }>`. As a result, `FormDefault.vue` repeats `typeof value === "object" && "location" in value && typeof value.location === "string"` and `"class" in previous && previous.class === "File"` guards. A narrow type, such as `FileDefault = { class: "File"; location: string; format?: string; [k: string]: unknown }` with a type guard, or the generated schema type if one exists, would make both functions shorter and would make the P2 1 decision about which keys survive explicit.

## Notes (not findings)

- The `modules.py` change (`optional=False` whenever a default exists) is consistent with `run_request._normalize_inputs`. That function already accepts "no value, has default" for both optional and required inputs. Before this PR, an optional input with a default raised `ParameterValueError` while the run form was being built.
- Editor round trip: `onSetData` merges only module fields, and `toSimple` sends whole steps, so `in` survives tool-state refreshes and saves. Emitting `in` in the editor dict also stops the editor from dropping step-level defaults on tool steps. That is a real fix worth mentioning in the PR description.
- No new security surface beyond what uploading a gxformat2 workflow with a default `location` already allows. The editor is just another way to set the same field.
