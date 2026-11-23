# Test challenges review, round 1: #24635

- Profile: `gx_test_challenger`
- Model: Opus 5.5 (claude-opus-5-5), effort medium
- Reviewed commit: `9ee89b52d9` (delta from `64dad7223ea`)
- Prior round: [../test_challenges_review.md](../test_challenges_review.md)

Verdict: the delta keeps coverage. The deleted runner unit file's three cases now live in `test_job_wrapper_user_tool.py`, which uses lighter mocks and is a better layer for the check. The disallowed-container case is red without the `prepare` hunk. The allowed and non-user-tool cases are meaningful counterparts. The existing integration test `test_job_of_stored_tool_with_disallowed_container_fails` now exercises the `prepare` path end to end on the local runner. It is red without the fix because the busybox job would otherwise run on the host and succeed. The Pulsar no-resubmit arm has a unit test that is red without the arm, but only by accident. Still no Pulsar end-to-end test. No P1s.

Verified locally at `9ee89b52d9` in a temp worktree: `test_job_wrapper_user_tool.py`, `test_pulsar_runner.py` and `test_job_wrapper.py` pass (55 tests). Reverting the `MinimalJobWrapper.prepare` hunk fails only `test_prepare_fails_for_container_outside_allowlist`. Removing the new Pulsar `except InsufficientPermissionsException` arm fails `test_rejected_job_fails_without_resubmission`, but with an `AttributeError` (see P3 1).

## Status of round 0 items

- P2 1 (mocked `BaseJobRunner` unit file): **resolved** by the author. The file is deleted, and the cases moved to `JobWrapper.prepare` tests on the existing `BaseWrapperTestCase` fixture. The resolver-mapping case (declared vs resolved image) is now moot, because `prepare` never resolves containers. Review-branch commit `ededf3cc033` edits the deleted file and must be dropped or reworked when the branch is rebased.
- P2 2 (Pulsar end-to-end): **carried**, reframed below as P2 1.
- P2 3 (`_store_tool_row` duplicated between integration files): **carried**, unchanged.
- P3 1 (duplicate "not allowed" message): **carried**. The runner copy moved to `lib/galaxy/jobs/__init__.py`, but it still duplicates `DynamicToolManager.ensure_container_allowed`. Review-branch commit `c76b1bc6386` needs retargeting from `_find_container` to `prepare`.
- P3 2 (workflow import of a disallowed user tool): **carried**, unchanged.

## Findings

### P2 1: Pulsar end-to-end test now proves rejection, but not the no-resubmit property

The round 0 Pulsar test is review-branch commit `c8239cf7070`: an embedded-Pulsar variant of the disallowed-job integration test that asserts `error` plus the allowlist message in `misc_info`. It was red without the old `except ContainerNotAllowedError` arm. With the check moved into `prepare`, a missing new arm would send the exception to the generic path, which queues `fail_job` with `fail_message = str(e)`. The job would still end in `error` with the allowlist text, so this assertion alone is probably no longer red without the arm (by reading; integration test not run). The test is still worth rebasing in, because it is the only proof that Pulsar's `prepare` path rejects the job. To make it pin the arm's purpose, add a resubmit rule to its destination, e.g. `resubmit: [{condition: any_failure, destination: local}]`. Then assert that the job is not resubmitted, for example that the job's destination is still the Pulsar one, or by counting job state transitions. Without the arm, the job would be resubmitted.

This also covers #24607's execute-role recheck. Under Pulsar that check now fails without resubmission too, which is a behavior change for that path that only the unit test pins today.

### P3 1: Pulsar unit test is red-without-fix only through a missing fake attribute

In `test_rejected_job_fails_without_resubmission`, the `SimpleNamespace` job wrapper has no `get_job`. Without the new arm, the test fails with `AttributeError: ... no attribute 'get_job'` from the generic `except Exception` path. It never reaches the `failures == [...]` and `runner.work_queue.empty()` assertions it exists for. Give the fake `get_job=lambda: SimpleNamespace(...)`, or stub `runner._job_state`, so the generic path runs. Then the red failure comes from `work_queue.empty()` / `failures` instead of an incidental error.

### Not recommended

- New API/integration test for the local runner: the existing `test_job_of_stored_tool_with_disallowed_container_fails` already covers it at this head and is red without the fix.
- E2E/Selenium: unchanged from round 0.
