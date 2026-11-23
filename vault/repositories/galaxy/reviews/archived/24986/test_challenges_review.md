# PR #24986 test challenges review

- Profile: gx_test_challenger (`_shared/reviewers/gx_test_challenger.md`)
- Model: Claude Opus 5.5; effort: medium
- Reviewed commit: `be2b1655fc6b933f47ca7e41aa0ea308cccfd3b7`
- Full analysis and test plan: [test_challenges_debrief.md](test_challenges_debrief.md)

The PR has good E2E coverage. Both new Selenium tests use components from `navigation.yml`, populators, and the test HTTP server. The findings below cover what the API test leaves unchecked, the expanded run form's submit path, and two Vitest tests that are either duplicated by E2E tests or coupled to the implementation. No tests were run.

## P2 1 — The API round trip rewrites the default before saving, so "preserves file-default metadata" is not checked

`test_default_file_location_editor_round_trip_and_run` replaces the downloaded `in.input.default` with `{"class": "File", "location": ...}` before calling `_update_workflow`, which drops the fixture's `basename` and `format`. The test would still pass if the editor serializer or the update path lost those keys. Before this PR, the editor dict had no `in` at all, so any open-and-save in the editor dropped step-input defaults. The new `_workflow_to_dict_editor` code emits `in` for every step type, which also fixes inline tool-step defaults (`WORKFLOW_WITH_STEP_DEFAULT_FILE_DATASET_INPUT`), and nothing tests that case.

Fix: save the editor dict unchanged and assert the reopened default equals the original exactly, including `basename` and `format`. Add the same unchanged round trip for `WORKFLOW_WITH_STEP_DEFAULT_FILE_DATASET_INPUT`, checking that `cat1`'s `in.input1.default` survives.

## P2 2 — The expanded run form's submit path with a default is untested

`WorkflowRunForm.vue::onDefaultStepInputs` now deletes `inputs[stepId]` when the value is null instead of sending `null`. `test_dataset_default_location` selects "Use default file" in the expanded form but then switches to the Simple Form before submitting. The Simple Form builds its own payload, so the changed code never runs in any test.

Fix: submit from the expanded form after re-selecting "Use default file", or add a second short test that does, and assert the output contains `chr1`. Optionally, add an API test that invokes with `inputs={"default_file_input": None}`. That shows whether the server already treats `None` as omitted.

## P3 1 — Give the optional-plus-default case its own test; the current comment is misleading

`input_step["tool_state"]["optional"] = "true"` carries the comment "preserve an optional input". The line actually exercises the `modules.py` change that forces `data_src["optional"] = False` when a default exists, so the step can still build its `DataToolParameter` and run. The following `run_input[...]["optional"] is True` assertion holds either way, because `managers/workflows.py` forces it. Move this into a named test, for example `test_optional_data_input_with_default_file_location_runs`, that marks the input optional and has a default, then invokes and asserts `chr1`. Or at least fix the comment. In the same test, add a small helper for the `data_input` step lookup, which is repeated three times. The `inputs={}` invocation already duplicates `test_run_with_default_file_dataset_input`, because the server never auto-selects history datasets.

## P3 2 — Drop the `FormData.test.ts` test; the E2E test covers it

Each assertion ("Using default file", the location text, "Using selected dataset", the "Use default file" option) is also checked by `test_dataset_default_location`, which selects the option by that label. The only extra is the cosmetic "Default file:" prefix. Drop the test. If a unit check is wanted, keep only the option-label switch, with and without `defaultLocation`.

## P3 3 — Replace the mount-based `FormDefault.test.js` test with a pure helper (or an E2E assertion)

The merge rules are worth pinning down: keep `format`/`basename`, keep sibling `in` keys, and clear to nothing. The test, though, mounts `FormDefault`, finds a child `FormElement` by its `id` prop, and calls `field.vm.$emit` directly. Its `other: { default: 5 }` sibling cannot occur on a `data_input` step. Move `defaultLocation`/`onDefaultLocation`'s logic into a pure function in `Workflow/Editor/modules/` (for example `withDefaultFileLocation(stepIn, location)`) and unit test it with a small table, which leaves the component as thin wiring. Alternatively, start `test_data_input_default_location` from a workflow whose default has `format: txt`, edit the location, and assert `format` survives the save. Then drop the Vitest test.

## P3 4 — Add a navigation entry for the Simple Form toggle

`//button[contains(., "Simple Form")]` now appears twice in `test_workflow_run.py`. Add `workflow_run.simple_form_toggle` to `navigation.yml` and a `workflow_run_switch_to_simple_form()` helper, and use it in both places. Optionally, wait until the status text contains the expected string instead of reading `.text` once right after `select_set_value`.
