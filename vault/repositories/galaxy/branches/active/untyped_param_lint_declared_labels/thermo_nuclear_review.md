# Thermo-nuclear code quality review

I acted on one finding: name extraction. `getUntypedWorkflowParameters` sliced `${...}` matches in two places, once through `getParameterFromMatch` and once inline. Both are now one module-private `replacementParameterNames` helper that uses the same `\$\{(.+?)\}` capture group as the run form and the backend. `getParameterFromMatch` is deleted because it had no other callers, and the post-job-action loop is one level flatter. This is commit `c2d059975ca`. Behavior is unchanged.

Verdict: approve. There is no structural regression. The change is small, lives in the right layer (the pure `Steps -> UntypedParameters` function), and adds no special-case branching to shared paths. No file crosses 1k lines because of this PR.

## Not acted on

- **Sharing the parameter-input-label rule with `Run/model.js` (Q1):** not shared. The two sites start from different data:
  - The run form uses the run API's `step_type`/`step_label` and filters a backend-computed `replacement_parameters` list.
  - The editor uses the store's `type`/`label` and computes the names itself.
  - A shared helper would need an adapter, which is more code than the 4-line `Set` it replaces.
  - It would also make Run import from Editor or add a new shared module, all inside legacy JS.
- **Using `replacementParameterNames` in `model.js` `_handleWorkflowParameter` (~line 111):** not done. The semantics are identical, but it means churn in legacy JS plus a cross-module import for a 3-line `exec` loop on a lint bug-fix branch. It is a fair follow-up if `model.js` gets touched or ported to TS. `model.js:224` needs `match[0]` for the split, so it wouldn't use the helper anyway.
- **Backend scope mismatch:** `get_informal_replacement_parameters` (`lib/galaxy/workflow/modules.py`, around line 3504) scans every post-job action's `action_arguments`, not just rename.
  - As a result, the run form still prompts for a `${X}` that appears only in, say, a tag action, and the editor now no longer flags it.
  - The initial debrief says this is the "same rule as the run form". That is true only for rename.
  - The canonical owner of "which names are replacement params" is that backend method. Narrowing it is out of scope for this client branch, but it is worth noting in the PR or a follow-up issue.
- **E2E section-status helper (Q4):** not extracted.
  - The `assert_linting_<section>_okay` retry closure is now in 3 tests, and a fourth inline warning check sits around line 1753. A helper such as `_assert_best_practices_section_status(section, status)` would dedupe them.
  - Doing that means editing unrelated tests in a 2391-line file that was already over 1k lines before this PR.
  - The same goes for folding `canvas_loading.wait_for_absent()` into `open_in_workflow_editor`, which the polish debrief already deferred.
  - Both are better as a separate cleanup. The E2E file is unchanged, so no rerun is needed.
- **`createTestStep` nit (Q3):** `label?: string` sits next to `NewStep["..."]`-style options. `when?: string` is already precedent, so I left it.

<details>
<summary>Full review</summary>

### Scope
`git diff origin/dev...58662e4c8e2`:
- `parameters.ts`: 25 lines changed
- `parameters.test.ts`: new, 75 lines
- `test_fixtures.ts`: 14 lines changed
- `navigation.yml`: 2 selectors added
- `test_workflow_editor.py`: 1 new test, 28 lines

### Q1: duplicated "rename `${label}` filled by parameter_input" rule
- **Editor:** builds `Set` of `label` for steps with `type == "parameter_input"`, then skips rename names in it.
- **Run form (`model.js` ~22-49, 129-133):** `parameterInputLabels` array of `step_label` for steps with `step_type == "parameter_input"`. Skips names from backend `step.replacement_parameters` that are in it.
- The "rule" is a single membership test over differently-shaped inputs. The real duplicated concept underneath is the backend's list of informal replacement parameters, and the editor can't consume that without an API round-trip.
- A shared TS helper would need either a shape adapter or two accessor callbacks. That adds indirection without deleting complexity. Verdict: leave it duplicated. If anything, the follow-up is to align the backend with the rename-only scope (see below), not to share the 4-line client set-building.

### Q2: `match.substring(2, match.length - 1)` vs `getParameterFromMatch`
- The slicing was textually identical to `getParameterFromMatch`, so it was the same logic duplicated inline.
- For matches of `/\$\{.+?\}/g` it is also identical to capture group 1 of `/\$\{(.+?)\}/g`, which `model.js` (`match[1]`) and the backend (`re.findall`) use.
- Code judo:
  - Use the capture-group regex once, in `replacementParameterNames(value)` via `matchAll`. It is a module-level `/g` constant, which is safe because `matchAll` clones the regex.
  - Callers get names directly and call `getParameter(name)`.
  - `getParameterFromMatch` disappears. It was a public method on an exported class, but grep shows no other callers.
- Done in `c2d059975ca`.

### Q3: `createTestStep` extension
- The new options (`type`, `label`, `configForm`, `postJobActions`) follow the existing camelCase-option → snake_case-field mapping (`inputConnections`).
- Changing the return type from `NewStep` to `Step` is correct, because it always sets `id`. It is also a safe widening for the existing callers:
  - `layout.test.ts`
  - `workflowStepStore.test.ts`, including the `addStep` calls and the spread at line 170
- `vue-tsc --noEmit` is clean.
- `label: undefined` / `config_form: undefined` are now set explicitly when not passed. This matches `when`, and no test checks key presence.
- Clean, consistent, and better than the `as unknown as Step` stubs it replaced.

### Q4: E2E test reuse
- It reuses `WORKFLOW_RENAME_ON_REPLACEMENT_PARAM`, `open_in_workflow_editor(auto_layout=False)`, `canvas_loading`, `confirm_dialog.ok_button`, `node._(label=...)`, and `retry_assertion_during_transitions`.
- The new `navigation.yml` selectors mirror the existing `best_practices` section/item pairs and target the existing `data-description="linting formal inputs"` in `Lint.vue`.
- No raw selectors, no sleeps.
- Duplication: this is the third copy of the inline "section is ok" retry closure. Extraction is deferred (see Not acted on).

### Other observations
- Restricting post-job-action scanning to `RenameDatasetAction.newname` deletes a branch: the old loop scanned all `action_arguments`. That is the right simplification, and it matches the runtime (`RenameDatasetAction._gen_new_name` is the only consumer of `replacement_dict`) and the extract refactor (`_iterate_over_rename_pjas`).
- The backend `get_informal_replacement_parameters` still scans all post-job-action arguments, so the run form and the editor now disagree for non-rename `${X}`. Backend narrowing is the canonical fix. It is out of scope here.
- `UntypedParameters.getParameter` does a linear scan where a `Map` would fit. This is pre-existing and harmless at workflow sizes, so I didn't flag it as a blocker.
- `parameters.ts` is 118 lines. No size concerns.

### Verification
- Vitest (`src/components/Workflow/Editor` + `src/stores/workflowStepStore.test.ts`, Node 22.20.0, `--no-experimental-webstorage`): 38 files, 382 tests passed.
- `vue-tsc --noEmit`: clean.
- eslint: 0 errors, 3 pre-existing `any` warnings. prettier: clean. Pre-commit hooks passed.
- The E2E file is untouched, so no rerun is needed.

</details>
