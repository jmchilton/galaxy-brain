# Test challenges review — #24857

- Profile: gx_test_challenger
- Model: Claude Opus 5.5
- Effort: medium
- Reviewed commit: `93b224b00ea8b3330902da96c256b200df3b0bdf`

Details and red/green evidence: [test_challenges_debrief.md](test_challenges_debrief.md).

**Verdict:** the backend tests are well-placed, and each one fails on the merge-base implementation, so the PR's "reproduced on dev" claim holds (5/5 backend tests checked red-to-green; vitest not run locally, no `node_modules`). The gaps: two integration tests prove less than the bug they are named for, and the new editor undo feature has no E2E coverage.

## P2 1 — Reordered-inputs test checks stored connections, not the run-time swap

`test_subworkflow_upgrade_keeps_connections_when_inputs_are_reordered` asserts that `input_subworkflow_step.label` matches `input_name`. The bug the PR describes is that datasets swap *at run time*. Extend the test to invoke the upgraded workflow with two distinct datasets for `outer_a`/`outer_b` (e.g. a `DatasetPopulator` on `self.galaxy_interactor` plus `workflow_populator` run helpers) and assert the `cat1` output is `a` then `b`. The fixture already concatenates `first` then `second`, so the output tells the two cases apart.

## P2 2 — Missing-tool upgrade test only proves "no crash"

`test_subworkflow_upgrade_to_workflow_using_a_missing_tool` asserts only `nested_step.subworkflow.id == replacement.id`. The fix's point is that the fallback module (`clear_module_extras` + `module_factory.from_workflow_step`) still yields the sub-workflow's inputs and outputs. Also assert that `inner_input` stays connected from `first_cat` (with the right `input_subworkflow_step`) and that the response reports the two `connection_drop_forced` messages for `second_cat`, which `SUBWORKFLOW_WITH_MISSING_TOOL` loses because it has no outputs. While editing, use `step_by_label` instead of `next(s for s in ... if s.label == ...)`, as the sibling test does.

## P2 3 — No E2E for refactor undo/redo in the editor

The editor gains undo/redo for server-applied refactors, and the vitest tests stub `WorkflowGraph` and emit a hand-built one-step workflow. Neither vitest test checks the PR's stated save semantics: after an undo, the editor stays on the newest version and saving writes a new version with the earlier content. No Selenium/Playwright test covers sub-workflow upgrade in the editor, or undo of any kind. Add one to `lib/galaxy_test/selenium/test_workflow_editor.py`: upload `WORKFLOW_NESTED_SIMPLE`, bump the nested workflow, open the editor, Upgrade the sub-workflow step and confirm, undo through the undo-redo activity, assert the node is back to the old version and the editor has changes, save, then use `download_workflow` to assert a new version holds the pre-upgrade sub-workflow.

## P3 1 — Vague undo-stack count in `Index.test.ts`

`expect(undoRedoStore.undoStackLength).toBeGreaterThanOrEqual(2)`: `mountWithSteps` adds steps through `stepStore.addStep`, which records no undo actions, so the stack is exactly 2. Use `toBe(2)`, and `toBe(1)` after the first refactor, so a stray or missing `RefactorWorkflowAction` is caught.

## P3 2 — Repeated `upgrade_subworkflow`-to-version action dict

`{"action_type": "upgrade_subworkflow", "step": {"label": ...}, "content_id": self._app.security.encode_id(...)}` now appears three times (`test_subworkflow_upgrade_specified` and both new tests). Add a small helper on the test class (e.g. `_upgrade_subworkflow_to(label, workflow)`) that returns the action list.

## P3 3 — `trsVersionId` Dockstore branch untested (optional)

`trsVersionId` is now exported so the upcoming version picker can reuse it. `TrsTool.test.ts` covers only plain ids. A case with a Dockstore-style id (`"#workflow/x:v1"` with name `"v1"` should emit `"v1"`) through the existing emit test would pin the behavior before a second caller appears. This is optional, since the logic moved unchanged.
