# PR #24857 initial review (default profile)

- Profile: default
- Model: Claude Opus 5.5
- Effort: medium
- Reviewed commit: 93b224b00ea8b3330902da96c256b200df3b0bdf (merge-base 74ab04282474)

## Verdict

Solid, well-scoped set of fixes; each server bug comes with a red-to-green test. One real gap: the missing-tool upgrade path keeps the step alive but cannot see outputs the missing tools produce, so it reports them as dropped and (with this PR's other fix) now also strips the matching outer workflow outputs. Rest are minor. No security findings.

## Findings

### P2 1 - Missing-tool sub-workflow upgrade drops connections and workflow outputs from outputs produced by missing tools

`_apply_upgrade_subworkflow` (`lib/galaxy/workflow/refactor/execute.py:458-463`) now catches `ToolMissingException` and rebuilds the module so `_patch_step` can run. `_patch_step` takes outputs from `SubWorkflowModule.get_all_outputs()` (`lib/galaxy/workflow/modules.py:943`), which builds them from `_workflow_to_dict_editor`. For a missing tool `ToolModule.get_all_outputs()` returns `[]` (`modules.py:2971-2973`), and the sub-workflow output loop logs "Workflow output ... not listed among data outputs" and skips it. So any sub-workflow output sourced from a missing tool disappears from `upgrade_output_names`, and `_patch_step`:

- drops every downstream connection from that output (`connection_drop_forced`), and
- after commit `93b224b00ea`, removes the outer step's labeled workflow outputs for it.

The PR body says the step "keeps only the sub-workflow's inputs and outputs in that case", but outputs that come from the missing tools are exactly the ones lost. Before this PR the upgrade failed loudly; now it succeeds and quietly prunes the outer workflow (messages appear in the dry-run modal, but they describe the outputs as "no longer available", which is wrong).

The test (`test_subworkflow_upgrade_to_workflow_using_a_missing_tool`) can't show this: `SUBWORKFLOW_WITH_MISSING_TOOL` has no `outputs:`, so `second_cat`'s connections from `nested_workflow/workflow_output` are dropped legitimately. It also only asserts `subworkflow.id`.

Suggested fix: in the missing-tool case, derive outputs from the sub-workflow's `workflow_outputs` labels (they're stored even when the tool is missing), or skip output pruning/workflow-output removal when the new sub-workflow has missing tools. Add `outputs: {workflow_output: {outputSource: not_installed/out_file1}}` to the fixture and assert that `second_cat`'s connections and the outer `outer_output` survive. Not reproduced (no venv); reasoned from code.

### P3 1 - Undoing/redoing a refactor overwrites tags, which are not part of undo history

`restoreWorkflowState` (`client/src/components/Workflow/Editor/Index.vue`) calls `applyWorkflowAttributes`, which sets `tags.value = data.tags`. Tags are deliberately kept out of undo/redo because `WorkflowAttributes` persists them immediately (`setTags` doc comment, Index.vue:311). If a user edits tags after a refactor and then undoes the refactor, the editor reverts to the pre-refactor tags while the server keeps the new ones; the next save (`toSimple` includes `tags`) writes the old tags back. Suggest leaving tags (and anything else not tracked in undo) untouched in `restoreWorkflowState`, e.g. split tags out of `applyWorkflowAttributes` or pass a flag.

### P3 2 - Comment in `curated.py` now misdescribes `get_trs_url`

`lib/galaxy/workflow/curated.py:130` says `_dockstore_trs_url` uses `quote_plus` "as TrsServer.get_trs_url does, so this is the same URL an import by server id would have recorded". After this PR `get_trs_url` quotes the version with `urllib.parse.quote(version_id, safe='')` (`trs_proxy.py` `_get_version_api_endpoint`), which differs from `quote_plus` for spaces (`%20` vs `+`), and `parse_trs_url` now `unquote`s (not `unquote_plus`) the version. Either reuse one quoting helper in both places (preferred: have curated build the URL via the same function) or fix the comment. Current IWC versions (`main`, `vX.Y`) are unaffected.

### P3 3 - Loose assertion in the undo test

`Index.test.ts`: `expect(undoRedoStore.undoStackLength).toBeGreaterThanOrEqual(2)` passes regardless of whether the second refactor pushed an action if mounting already queued any. Assert the exact delta (record length before the refactors and expect `+2`), or assert `nextUndoAction` is a `RefactorWorkflowAction`.

## Notes (not findings)

- Input reconnection by name (`_patch_step` else-branch) matches how `run.py:859` binds by `input_subworkflow_step_id` and how `_workflow_to_dict_editor`/save round-trip it (`managers/workflows.py:2041`, `2528`). Popping the id for when-expression matches and tool steps is harmless.
- `parse_trs_url` now unquotes `version_id`, so a workflow previously imported from a URL with an escaped version (e.g. `feature%2Fx`) was stored with the escaped id and won't dedup against a new import (`get_workflow_by_trs_id_and_version`). Such imports were rare and broken by server id before, so not worth a change.
- `trsVersion.ts` extraction is clean reuse; `isTrsVersion` going private has no other callers.
- `restoreWorkflowState` relies on `fromSimple` being effectively synchronous (async with no awaits); the docstring says so. Fine, but fragile if `fromSimple` ever gains an await.
