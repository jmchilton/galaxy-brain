# Test challenges debrief - PR #24367

Reviewed commit 63c6cbf9eb3 (vs origin/release_26.2). No edits made to the PR.

## Tests challenged

- `test_deferred_resubmission_does_not_interrupt_other_jobs` - keep. Drives the real `JobHandlerQueue` poll with a real `JobRunnerMapper` and DB (sqlite+postgres); asserts behavior (other job dispatched, resubmission stays `resubmitted`, later dispatched). Fails without the fix.
- `test_unmappable_resubmission_fails_without_interrupting_other_jobs` - keep, but its key claim (failing does not re-map from the tool default) is proven only against `HandlerJobWrapper.fail`, which now re-implements `JobWrapper.fail`'s destination-resolution branch (`lib/galaxy/jobs/__init__.py:1526-1537`). If the real `fail()` changes, the test still passes. Also `poll().count(resubmit) == 2` pins `JobRunnerMapper.__handle_rule`'s retry-without-resource-params detail.

## Test plan recommendations

1. Integration test in `test/integration/test_job_resubmission.py`: add a dynamic rule to `test/integration/resubmission_rules/rules.py` that raises `JobMappingException` (and one raising `JobNotReadyException`) when the job is being resubmitted; configure a resubmit to it. Assert the resubmitted job ends `error` with the rule's message (or stays queued for the deferral) and that a second, unrelated tool job still completes. This exercises the real `JobWrapper.fail` and the real monitor loop - the actual regression (handler stopping all dispatch).
2. Keep the unit tests; with (1) in place, consider dropping the comment-heavy fake `fail()` logic or have the harness delegate to a shared helper.
3. Replace `count(resubmit) == 2` with an assertion independent of mapper retry internals (e.g. that no attempt occurs after `fail`, by recording attempts before/after the failure), or comment-pin it to the mapper behavior.

No E2E test warranted (backend scheduling).
