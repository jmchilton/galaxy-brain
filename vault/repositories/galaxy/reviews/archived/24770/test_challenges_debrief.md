# Test challenges debrief — PR #24770 @ 8ec2452c3bb

Review-only (no edits to PR). Tests not run locally: worktree has no `.venv` (not bootstrapped).

## Tests challenged

- `test/unit/workflows/test_input_readiness.py` — real DB, real `CoreWorkflowSchedulingPlugin`, real internal tools (`filter_empty_collection`, `keep_success_collection`), driven through `WorkflowRequestMonitor.__attempt_schedule`. Keep: "don't replay while unchanged" is not observable at API/framework layer (no attempt counter exposed), so unit is the right layer. No mocks to strip beyond MockTrans/MockToolbox.
  - `test_waiting_collection_is_retried_only_after_input_changes` — keep; good red/green shape (wait, mutate, wake).
  - `test_paused_input_override_does_not_replay_and_resumes_when_cleared` — keep; covers `_state` override vs `Dataset.state`.
  - `test_independent_workflow_branch_can_progress_while_another_waits` — keep.
  - `test_unresolved_extension_waits_on_any_pending_member` — weak: only asserts waiting w/o replays. If blocker selection wrongly picked the `error` member, snapshot never changes, so test still passes; bug would show only as never waking. Add resume step.
- `SchedulingHarness` move to `workflow_support.py` — good reuse; fine.
- `test_scheduling_manager.py`, `test_workflow_progress.py` — import moves only.

## Gaps

- Monitor HDA-readiness polling (`scheduling_manager.py`): no test for `deleted`/`dataset_deleted` change waking, nor for missing row (`len(rows) != len(batch)` -> wake, e.g. purged/removed HDA).
- `>500` batching untested (cheap at monitor level with synthetic dependencies).
- `input_readiness_dependencies` branches for `DatasetCollectionElement` / `CollectionAdapter` (mapped-over subcollection, promoted elements) not exercised; mapping a tool over a `list:list` with a running member would cover the DCE path end-to-end.

## Readability

- `real_workflow_scheduler` hand-builds steps (~50 lines, index juggling for `second_hdca`). `workflow_support.yaml_to_model` exists for building workflows from YAML; consider using it, or split input/tool construction. `RecordingCoreScheduler` defined inside the function; hoist to module level.

## E2E

Not warranted; no UI change.
