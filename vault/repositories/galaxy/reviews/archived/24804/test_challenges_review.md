# #24804 test challenges review

- Profile: gx_test_challenger (`_shared/reviewers/gx_test_challenger.md`)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `677cab47347c1b40acf2988bed2f8ae18507ca9e`
- Detailed reasoning and full test plan: [test_challenges_debrief.md](test_challenges_debrief.md). No tests were run.

No security findings. No E2E test is warranted (no UI surface).

## P2 1 — Embedded Pulsar resubmission test passes on any failure

`TestJobResubmissionEmbeddedPulsarToolDetectedErrorIntegration` uses `_assert_job_fails("exit_code_from_env")`, which passes whenever `_run_tool_test` raises for any reason (Pulsar setup error, timeout, tool error on the first attempt that never resubmitted). It stands in for "the job succeeded after resubmission" without checking it. Run the tool in a test history, assert the output is `ok`, and assert one resubmission with `_assert_resubmission_count(history_id, 1)` (move it and `_job_metrics` from `TestJobResubmissionIntegration` to `_BaseResubmissionIntegrationTestCase`). If Pulsar jobs don't record the `core` metric, assert the final job's destination or resubmission info through the jobs API instead.

## P2 2 — Pulsar OOM and unmatched-rule paths need integration tests, not mocked runners

The PR says OOM exit codes resubmit over embedded Pulsar "(tested)", but only the generic tool-detected path has an integration test. `_resubmitted_for_tool_failure` is covered only by unit tests on a `MagicMock` runner whose `_handle_runner_state` side effect sets the flag the test asserts. Add to `resubmission_embedded_pulsar_job_conf.yml`:

- an `exit_code_oom` environment pair (`GALAXY_MEMORY_MB=4` with `condition: memory_limit_reached` resubmitting to `GALAXY_MEMORY_MB=20`), asserting the job passes with one resubmission;
- an environment whose resubmit rule doesn't match (`condition: memory_limit_reached`, `exit_code_from_env` exiting 4), asserting the job still ends in error with its exit code. This fall-through runs `check_tool_output` and commits before the normal finish, so it is the riskiest new path.

Then drop `test_tool_detected_failures_reach_resubmission` and `test_unhandled_tool_failure_finishes_normally`, plus `test_destination_without_resubmit_skips_output_check` (asserts a mock wasn't called).

## P2 3 — New resubmit semantics should go through `FailsJobRunner`, not `failure(MagicMock(), MagicMock(), ...)`

`test_resubmit.py` checks `failure()` with mocked app, runner and job state; the only real assertion is that `runner_state_handled` flips. The existing `FailsJobRunner` takes a free-text `failure_state` resource parameter, so every new behaviour can run through the real handler alongside `test_condition_expressions`:

- `node_failure` and `preempted` resubmit with their new conditions;
- `cancelled` on `fail_first_any_failure` fails (the "scancel stays cancelled" behaviour);
- `node_failure` with only `condition: unknown_error` fails (the release-note behaviour change);
- an undefined reason such as `from_the_future` resubmits with `runner_state == 'from_the_future'` and with `unknown_error`.

Then drop `test_resubmits_for_every_handled_runner_state`, `test_does_not_resubmit_when_condition_is_for_another_state`, `test_states_without_a_description_are_never_resubmitted`, `test_reason_without_definition_can_be_matched_by_name`, and `test_every_handled_runner_state_has_a_message` (restates the registry table). Keep the `_ExpressionContext` tests, ideally on a small dataclass job state rather than a `MagicMock`.

## P2 4 — The message-queue resubmit fix in `job_pair_for_id` is untested

The handler change re-attaching configured `resubmit` definitions to persisted destinations (the "jobs updated over a message queue lost their resubmit definitions" fix) has no test. `test_pulsar_embedded_mq.py` already templates an MQ job conf (skipped without `GALAXY_TEST_AMQP_URL`). Add an MQ environment running `exit_code_from_env` with `GX_TARGET_EXIT_CODE=4` and `resubmit: [{condition: tool_detected_failure, environment: local_environment}]`, with the local environment succeeding. Resubmitting to a different runner avoids the new `resubmission_count` protocol, so it works against released Pulsar 0.16 and fails without the fix.

## P3 1 — Test `_apply_remote_runner_state` directly; drop mock call-graph tests in `test_pulsar_runner.py`

The six remote-runner-state tests call `PulsarJobRunner._update_job_state_for_status` unbound on a `MagicMock` runner and read `fail_job.call_args`, but the logic lives in the module-level `_apply_remote_runner_state(job_state, full_status)`. Test that function with a small dataclass job state and keep one runner-level test (`test_lost_job_ignores_runner_state`). The three polling tests assert `assert_called_once_with` on a mocked method; extract the "fetch full status only when failed, tolerate errors" step into a helper tested with a fake client, and drop `test_polling_does_not_fetch_full_status_of_running_jobs`. Drop both `__discard_previous_attempt` tests: they reach a name-mangled private method to assert `clean()` was called on a mock, and the embedded Pulsar integration test already resubmits to the same Pulsar job id, which depends on that cleanup.

## P3 2 — Extract the CLI failure-reason logic so its tests need no mocks

`test_cli_failure_reasons.py` calls `ShellJobRunner._handle_job_failure_reasons` unbound with a `MagicMock` runner, shell and job state. Extract a module-level `failure_reason_from_output(job_interface, stdout, job_id)` returning `(runner_state, message)`, apply it in the runner, and test it with the real `Slurm()` plugin and plain strings. Add the `sacct` fallback (no `JobState=`; a `CANCELLED by 1000` line) and `PREEMPTED`, which the new `get_failure_reason` command can produce and nothing tests.

## P3 3 — Slurm CLI plugin status parsing changes are untested

Besides failure reasons, the PR changes `Slurm` status parsing: `get_single_status` adds `-t all`, `PR` now maps to `ERROR` rather than `RUNNING`, `_state_from_sacct` replaces the inline loop, and `_get_job_state` returns `None` for an unmapped code instead of raising. Add `Slurm().parse_single_status(...)` unit tests with a small fake shell returning canned `squeue`/`sacct` output: a `PR` job is `ERROR`, an empty `squeue` plus `CANCELLED by 1000` from `sacct` is `ERROR`, and the unmapped-code result is pinned to whatever is intended.

## P3 4 — Small test hygiene

Optional. In `test_slurm_util.py`, `test_memory_limit_messages` also asserts `MEMORY_LIMIT_MESSAGES[expected] == message`, restating a constant table; drop that assertion and its parametrize column. In `test_resubmit.py`, the `registered_reason` fixture deletes from `runner_states.__dict__` by hand; if `register_runner_state` is a supported extension point, give the module an unregister helper or context manager for tests.
