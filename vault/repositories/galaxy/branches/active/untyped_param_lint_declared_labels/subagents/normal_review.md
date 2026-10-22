# Normal review debrief

Fixed both real bugs, which were in the E2E commit. Moved one Python test helper, a nit. Everything else in the change is sound and consistent with runtime and the run form. Both fixes were autosquashed locally and the two "Baseline tests" commits are still first. Nothing pushed.

Acted on:
- **Bug: decorator shift.** The new E2E test was inserted between the existing `@selenium_only("Not yet migrated…")` and `test_rendering_rules_workflow_1`. That stripped the decorator from the rules test, so it would start running under Playwright, and pinned a false "not yet migrated" reason on the new test. Fixed: the decorator is back on the rules test. The new test has no `@selenium_only`, the same as its sibling best-practices tests, so **E2E must run it on both Selenium and Playwright**.
- **Bug: missing selector.** `workflow_editor.canvas_loading` doesn't exist in `navigation.yml` on `release_26.1`; it only arrived on dev in `2c06e8eb029`. The new E2E test would have errored on its first wait. Added `canvas_loading: '#workflow-canvas .galaxy-loading-shade'`, which is the same line as dev, so the forward-merge will be trivial. The element exists on 26.1: `WorkflowGraph.vue` renders `LoadingOverlay` inside `#workflow-canvas`.
- **Nit:** moved `__tool_module_with_post_job_actions` down beside `__from_step` / `__mock_tool` in `test_modules.py`, as a fixup into the backend baseline commit.

Not acted on:
- `unicodify(pja.action_arguments.get("newname", ""))` raises a TypeError if `newname` is explicitly `None`. This was already true of the old loop over every argument, and no stored data is known to hit it. A one-token hardening (`.get("newname") or ""`) is available if wanted.
- `Run/model.js` repeats the `${...}` regex twice, and `parameters.ts` has a third copy. Sharing `replacementParameterNames` would mean churning `model.js` on a release branch, so it belongs in a dev follow-up.
- `refactor/execute.py:_iterate_over_rename_pjas` works on dicts while `get_informal_replacement_parameters` works on model `PostJobAction`s, so there is no direct reuse. The `"RenameDatasetAction"` literal matches existing usage in `modules.py`.
- Scope 4 (`extract_untyped_parameter` dedupe against an existing labelled input) stays deferred, per the re-scope debrief.

<details>
<summary>Full review</summary>

## Verdict

Small, coherent change. The two real bugs were both in the E2E commit, and both were mechanical artifacts of the rebase/insert. The client and backend logic are correct.

## Domain checks

- **Runtime (`job_execution/actions/post.py`)**: `replacement_dict` is applied only in `RenameDatasetAction._gen_new_name`, to `newname`. Tag, ChangeDatatype and the other actions ignore it. Narrowing the editor lint and `get_informal_replacement_parameters` to rename `newname` matches runtime.
- **Label fill**: `WorkflowProgress.effective_replacement_dict` merges `runtime_replacements[step.label]` from parameter inputs, so a rename `${label}` backed by a `parameter_input` is filled at runtime. The editor skip is correct.
- **Run form (`Run/model.js`)**: it skips `step.replacement_parameters` that are in `parameterInputLabels` (all `parameter_input` steps with a label). It does not skip tool-state `${...}`. The editor now mirrors both rules exactly.
- **`SubWorkflowModule.get_informal_replacement_parameters`**: it aggregates child modules and filters subworkflow input labels, so the narrowing propagates as intended.
- **Refactor `extract_untyped_parameter`**: it already looks only at rename PJAs via `_iterate_over_rename_pjas`. The editor no longer offers the fix for declared labels, so the duplicate-label path is unreachable from the lint UI.

## Code quality

- `replacementParameterNames` with a capture group replaces the old `substring(2, len-1)` slicing. Removing `getParameterFromMatch` is a good simplification.
- Comments are short and non-obvious. The docstring addition in `modules.py` is one line.
- No embedded Python imports were added.
- `createTestStep` now returns `Step` (a subtype of `NewStep`) and takes `type/label/configForm/postJobActions`. This extends the existing fixture instead of adding a new one. `vue-tsc --noEmit` is clean.

## Tests

- Vitest `parameters.test.ts` (5 cases) covers declared, undeclared, mixed, tool-state and non-rename. These are behavioral, not trivial.
- The backend unit tests (baseline plus red→green) are cheap and targeted. An API test of the run model would be heavier for no extra signal.
- E2E: the extract → lint-clears test is the end-to-end red→green for the reported bug.

</details>
