# Test challenges debrief — #24857

Profile gx_test_challenger, Claude Opus 5.5, effort medium. Reviewed commit `93b224b00ea8b3330902da96c256b200df3b0bdf` (merge-base `74ab04282474`). Review-directory mode: nothing in the PR was edited; every item below is a recommendation.

## Red/green check of the PR's "reproduced on dev" claim

Ran against PR head, then with only the implementation file reverted to the merge-base (`git show 74ab04282474:<file> > <file>`, restored afterwards; worktree left clean). Python from `~/projects/repositories/galaxy/.venv` with `PYTHONPATH=lib`.

| Test | Head | Base impl | Fails at |
|---|---|---|---|
| `test_trs_proxy.py::test_version_with_slash_stays_one_path_segment` | pass | fail | its assertion (`version_id == 'feature'`) |
| `test_trs_proxy.py::test_successful_response_without_json_is_upstream_error` | pass | fail | raw `requests.JSONDecodeError` (the bug) |
| `test_workflow_refactoring.py::..._keeps_connections_when_inputs_are_reordered` | pass | fail | its assertion (`first`->`second`, `second`->`first`) |
| `test_workflow_refactoring.py::..._to_workflow_using_a_missing_tool` | pass | fail | `ToolMissingException` (the bug) |
| `test_workflow_refactoring.py::test_subworkflow_upgrade_output_label_dropped` (new assert) | pass | fail | the new `workflow_outputs` assertion |

Claim holds for every backend test. The full `test_trs_proxy.py` passes on head (21 passed, 1 skipped).

Vitest (`Index.test.ts`) not run: worktree has no `client/node_modules`, and a borrowed `node_modules` from another worktree failed at happy-dom environment setup. Symlink removed.

## Unit tests

- `test_version_with_slash_stays_one_path_segment`: keep. Exercises the URL round trip (`get_trs_url` -> `parse_trs_url`) and the descriptor URL through the existing `_mock_get` helper; no new mocking. `get_version` shares `_get_version_api_endpoint`, so not testing it separately is fine.
- `test_successful_response_without_json_is_upstream_error`: keep. Small, behavioral, reuses `_response`/`_mock_get`.
- Neither duplicates an API/integration test, and TRS servers are external, so unit is the right layer.

## Vitest

- `undoes and redoes refactors as unsaved changes...`: keep; drives the real `onRefactor` path via the `RefactorConfirmationModal` emit and asserts store state. `expect(undoRedoStore.undoStackLength).toBeGreaterThanOrEqual(2)` is a vague count: `mountWithSteps` adds steps through `stepStore.addStep`, which records no undo actions, so the stack should be exactly 2. Tighten to `toBe(2)` (and `toBe(1)` after the first refactor).
- `replays edits made after a refactor when rolling the history over it`: keep; it pins the synchronous-restore contract that `rollBackTo`/`rollForwardTo` rely on, through the store's public API.
- Neither test checks the PR's stated save semantics ("saving after an undo writes a new version with the earlier content", version left at newest). That is cross-layer (client state + save request + server version) and belongs in E2E; see below.
- No prop-reaches-class tests, no faked layout.

## Integration tests

- Reordered-inputs test proves the stored connections now follow the input name. It does not prove the headline user-facing bug ("swaps the datasets at run time"). Extending it to invoke the upgraded workflow with two distinct datasets and assert the `cat1` output order would test the actual behavior; the fixture already concatenates `first` then `second`, so the output content distinguishes the two cases.
- Missing-tool test only asserts `nested_step.subworkflow.id == replacement.id`, i.e. "it didn't crash". The fallback path (`clear_module_extras` + `module_factory.from_workflow_step`) is supposed to keep the sub-workflow's inputs and outputs. With `WORKFLOW_NESTED_SIMPLE` -> `SUBWORKFLOW_WITH_MISSING_TOOL`, it should keep `inner_input` connected from `first_cat` and report two `connection_drop_forced` messages for `second_cat` (replacement has no outputs). Asserting those proves the fallback module computes real inputs/outputs.
- Helper reuse: the `upgrade_subworkflow` + `content_id: self._app.security.encode_id(...)` action dict now appears three times (`test_subworkflow_upgrade_specified` plus both new tests). A small `_upgrade_subworkflow_action(label, workflow)` helper would remove it. The missing-tool test uses `next(s for s in ... if s.label == ...)` where the next test (and the file) use `step_by_label`.
- These tests use the manager with `MockTrans`, matching the file's existing convention; not challenging the layer.

## E2E

No Selenium/Playwright test exists for upgrading a sub-workflow step in the editor, and none for undo/redo of any kind (`grep undo lib/galaxy_test/selenium` is empty). The PR adds a user-visible undo for refactors with non-trivial interplay: `resetStores({ keepUndoHistory })`, `version: undefined` so undo leaves the editor on the newest version, and save after undo writing a new version. Vitest stubs `WorkflowGraph` and feeds a hand-built single-step workflow, so it can't show the canvas reverting or what save sends. Recommended E2E (in `test_workflow_editor.py`): upload `WORKFLOW_NESTED_SIMPLE`, bump the nested workflow (populator/`export_for_update`), open the editor, click the subworkflow step's Upgrade, confirm, undo via the undo-redo activity, assert the node reflects the old version and the editor has changes, save, and assert via `download_workflow` that a new version exists with the pre-upgrade sub-workflow.

## Test plan (recommendations)

1. P2: extend reordered-inputs integration test to run the workflow and assert output order.
2. P2: strengthen missing-tool integration test (kept connection + drop messages).
3. P2: E2E for sub-workflow upgrade -> undo -> save.
4. P3: tighten `undoStackLength` assertion to exact counts.
5. P3: helper for the repeated `upgrade_subworkflow` action; use `step_by_label`.
6. P3 (optional): `TrsTool.test.ts` case for a Dockstore-style version id (`id` containing `:<name>`) now that `trsVersionId` is exported for reuse.
