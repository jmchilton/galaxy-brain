# Test challenges review — PR #24770

Profile: gx_test_challenger. Model: Claude Opus 5.5, effort low. Reviewed commit: 8ec2452c3bb (vs origin/release_26.2).

Verdict: test layer is right (real DB + real scheduler + real internal tools; replay suppression isn't observable via API). A few coverage gaps. Tests not run locally (worktree not bootstrapped). Debrief: [test_challenges_debrief.md](test_challenges_debrief.md).

### P2 1: `test_unresolved_extension_waits_on_any_pending_member` can't detect wrong blocker

Only asserts the step waits without replays. If `input_readiness_dependencies(..., states=..., extensions=...)` picked the `error` member instead of the `running` one, the snapshot never changes, so the test still passes — the regression would be "never wakes". Fix: after the wait, set the running member to `ok` (or resolve its extension) and assert scheduling resumes / invocation fails per tool semantics.

### P2 2: Monitor readiness polling: deletion and missing-row wakeups untested

`WorkflowRequestMonitor` compares `deleted` / `dataset_deleted` and wakes when `len(rows) != len(batch)`. No test flips `HistoryDatasetAssociation.deleted` or `Dataset.deleted` on the blocker, or removes the row. Add one parametrized case to `test_waiting_collection_is_retried_only_after_input_changes` (or a `test_scheduling_manager.py` case with a synthetic `SchedulingDependency(HDA, id, readiness)`) asserting `scheduled` increments.

### P3 1: DCE / CollectionAdapter branches of `input_readiness_dependencies` unexercised

All cases pass a whole HDCA to the tool. Mapping the tool over a `list:list` with a running inner member would exercise the `DatasetCollectionElement` path; >500-ID batching is also untested (cheap with synthetic dependencies in `test_scheduling_manager.py`).

### P3 2: `real_workflow_scheduler` readability

~50 lines of hand-built steps with index juggling for `second_hdca`; `RecordingCoreScheduler` defined inside the function. Consider `workflow_support.yaml_to_model` for the workflow and hoisting the scheduler subclass to module level.
