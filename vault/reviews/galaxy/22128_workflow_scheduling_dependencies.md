# PR 22128 — Track scheduling dependencies for workflow invocations

Reviewed head: `87518edb36df502b6d3c2cad21ab0b37cf009293` against `origin/dev`.

## Summary

This replaces the scheduler's periodic timestamp/backfill heuristic with explicit dependencies collected while workflow steps are evaluated. Delays can now name jobs, HDAs, unpopulated dataset collections, or pause invocation steps; the workflow monitor queries those objects and reschedules only when at least one becomes actionable. Untracked delays and per-iteration work limits continue polling, nested subworkflow dependencies propagate upward, and job completion now touches invocation steps linked through implicit collection jobs.

The implementation is well factored: dependency values are immutable, imports are at module scope, dependency checks mirror the predicates that caused the delay, and timestamps remain as a fallback for unrelated committed changes.

## Findings

### P2 — The agreed stalled-invocation warning is not implemented

`lib/galaxy/workflow/scheduling_manager.py:354-379,569-579`

The PR discussion raised the risk that removing the old periodic backfill makes a missed or incorrectly tracked dependency stall an invocation silently forever, and the author agreed to add observability for an invocation that has made no progress for some threshold. The current warning only covers `pending.untracked`, which is the opposite case: those invocations are intentionally scheduled every iteration. A tracked dependency that never becomes satisfied produces neither another scheduling attempt nor a warning/Sentry event. Please retain enough timing/progress state in `InvocationTracking` to emit the agreed warning for a long-lived tracked wait (without necessarily rescheduling it), and cover the threshold/deduplication behavior.

### P2 — The tests do not exercise the real dependency handoff that can deadlock an invocation

`test/unit/workflows/test_scheduling_manager.py:35-42,82-159`

Every monitor test injects a prebuilt `SchedulingDependencies` from `RecordingScheduler`; the workflow-progress tests separately exercise a few dependency producers. Nothing runs a real scheduling attempt through `WorkflowInvoker`/`CoreWorkflowSchedulingPlugin` and then verifies that the monitor stops polling while the dependency is pending and resumes after the persisted job/HDA/collection/pause transition. Consequently these tests would still pass if a delay path forgot `record_delay`, subworkflow propagation were omitted, the returned value were lost at the plugin boundary, or the new implicit-collection `Job.set_final_state()` update did not provide the expected signal. Since this PR removes the unconditional recovery path, add at least one integration-style regression that exercises the complete handoff and state transition; a mapped/implicit-collection job is the highest-value case, with pause-step action or nested collection coverage also useful.

## Test and CI evidence

- `./run_tests.sh -unit test/unit/workflows/test_scheduling_manager.py`: 6 passed.
- `./run_tests.sh -unit test/unit/workflows/test_workflow_progress.py`: 9 passed.
- `git diff --check origin/dev...HEAD`: clean.
- GitHub checks were freshly queued/in progress at review time; CircleCI `get_code_and_test` was green. Pending CI was not treated as a finding.
- Worktree remained clean after testing.

## Recommendation

The code itself looks sound in the reviewed paths, but I would address the stalled-wait observability promised in the discussion and land one end-to-end scheduler dependency regression before removing the old recovery behavior.
