# Test challenges review - PR #24367

Profile: gx_test_challenger. Model: Claude Opus 5.5, low effort. Reviewed commit: 63c6cbf9eb3.

Debrief: [test_challenges_debrief.md](test_challenges_debrief.md)

Tests are behavior-level unit tests over the real handler queue and mapper on sqlite and postgres; both fail without the fix. Good shape overall.

### P2 1: Real `JobWrapper.fail` and monitor loop not exercised

The "don't re-map from tool default" guarantee is verified only against `HandlerJobWrapper.fail`, which copies `JobWrapper.fail`'s destination-resolution branch into the test harness. Drift in the real `fail()` would go unnoticed, and the actual symptom (monitor loop stalling all dispatch) is never run end to end. Add an integration test in `test/integration/test_job_resubmission.py` with a dynamic rule in `resubmission_rules/rules.py` that raises `JobMappingException` on resubmission (optionally a `JobNotReadyException` variant): assert the job errors with the rule's message and an unrelated job still completes.

### P3 1: Assertion pinned to mapper retry internals

`handler.poll().count(resubmit) == 2` encodes `JobRunnerMapper.__handle_rule`'s retry-without-resource-params behavior. Prefer asserting no mapping attempt happens after the failure (record attempts across `fail`) so mapper retry changes don't break the test for unrelated reasons.
