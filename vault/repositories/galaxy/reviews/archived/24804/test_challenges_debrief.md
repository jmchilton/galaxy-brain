# #24804 test challenges debrief

- Profile: gx_test_challenger (`_shared/reviewers/gx_test_challenger.md`)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `677cab47347c1b40acf2988bed2f8ae18507ca9e`
- Mode: REVIEW_DIRECTORY. Nothing was edited in the PR; every drop, rewrite and implement below is a recommendation. No tests were run.

## What the PR tests today

| File | Layer | What it covers |
|---|---|---|
| `test/integration/test_job_resubmission.py` + `resubmission_embedded_pulsar_job_conf.yml` | integration | Embedded Pulsar, `exit_code_from_env` exits 4, `tool_detected_failure` resubmits to a second Pulsar environment that exits 0. |
| `test/unit/app/jobs/test_resubmit.py` (new) | unit | `failure()` and `_ExpressionContext` for each registered reason, never-resubmit reasons, a test-registered reason, unknown reasons. All through `MagicMock` job states, app and runner. |
| `test/unit/app/jobs/test_pulsar_runner.py` (+226 lines) | unit | `_update_job_state_for_status` with a `MagicMock` runner, polling (`check_watched_item_state`) with mock clients, `_resubmitted_for_tool_failure` with mock runner/job state, `get_client_from_wrapper` resubmission count, `__discard_previous_attempt`. |
| `test/unit/app/jobs/test_cli_failure_reasons.py` (new) | unit | `ShellJobRunner._handle_job_failure_reasons` called unbound on a `MagicMock` runner with a real `Slurm()` plugin. |
| `test/unit/app/jobs/test_slurm_util.py` (new) | unit | Moved `slurm_job_state` / `check_memory_limit` helpers, with an injected `execute`. |

No E2E test is needed: this is job-runner behaviour with no UI surface. No Vitest changes.

## Challenges, by test

### Integration: `TestJobResubmissionEmbeddedPulsarToolDetectedErrorIntegration`

Keep, but the assertion is weak. `_assert_job_fails` passes on *any* exception from `_run_tool_test` (tool missing, timeout, Pulsar setup error, a dispatch crash), so it would also pass if the resubmission never happened and the first attempt simply errored in some other way. With `expect_failure="true"` on the tool test, "the test failed" is being used as a proxy for "the job succeeded after resubmission". Assert it directly: run the tool in a test history, check the output dataset is `ok`, and call `_assert_resubmission_count(history_id, 1)`. That helper currently lives on `TestJobResubmissionIntegration`; move it (and `_job_metrics`) to `_BaseResubmissionIntegrationTestCase`. Whether Pulsar jobs record the `core` `resubmission_count` metric is unverified; if they don't, assert on the job's `job_messages` / `info` resubmission text or on the destination id of the final job via the jobs API instead.

### Missing integration tests that would replace unit tests

1. **OOM exit code over embedded Pulsar.** The PR description says OOM exit codes resubmit over embedded Pulsar "(tested)", but only the generic tool-detected path is in an integration test. `exit_code_oom` already exits 42 when `GALAXY_MEMORY_MB < 10` (`resubmission_small_memory_job_conf.xml` uses this locally). Add a second environment pair to `resubmission_embedded_pulsar_job_conf.yml` (`GALAXY_MEMORY_MB=4` with `condition: memory_limit_reached` resubmitting to `GALAXY_MEMORY_MB=20`) and a test that the job passes with one resubmission. This exercises `DETECTED_JOB_STATE.OUT_OF_MEMORY_ERROR -> MEMORY_LIMIT_REACHED` end to end.
2. **Unmatched resubmit rule on Pulsar finishes as a normal tool error.** A Pulsar environment with `resubmit: [{condition: memory_limit_reached}]` running `exit_code_from_env` (exit 4) must still end in error with the exit code recorded. This is the riskiest new path: `_resubmitted_for_tool_failure` calls `check_tool_output` and commits before `_finish_pulsar_job` runs the normal finish, so the "not handled" fall-through deserves real coverage, not a mock.
3. **New resubmit semantics via `FailsJobRunner`.** `FailsJobRunner` sets `job_state.runner_state` from the `failure_state` resource parameter, which is free text, so every new behaviour can be driven through the real resubmit handler with the existing `resubmission_job_conf.yml` pattern:
   - `failure_state=node_failure` and `preempted` resubmit with `condition: node_failure` / `preempted` (add those conditions to `fail_first_try`, or a new environment).
   - `failure_state=cancelled` on `fail_first_any_failure` fails (`_assert_job_fails`) — the headline "scancel stays cancelled under `any_failure`" behaviour.
   - `failure_state=node_failure` on an environment with only `condition: unknown_error` fails — the release-note behaviour change.
   - `failure_state=from_the_future` with `condition: "runner_state == 'from_the_future'"` passes, and with `condition: unknown_error` passes.
   These replace the `MagicMock`-driven `failure()` tests in `test_resubmit.py`.
4. **Resubmit definitions survive a message-queue status update.** The `handler.job_pair_for_id` change (re-attaching configured `resubmit` to the persisted destination) has no test. `test_pulsar_embedded_mq.py` already builds an MQ job conf from a template (skipped without `GALAXY_TEST_AMQP_URL`). Add an environment that runs `exit_code_from_env` with `GX_TARGET_EXIT_CODE=4` and `resubmit: [{condition: tool_detected_failure, environment: local_environment}]`, with the local environment exiting 0. Resubmitting to a *different* runner avoids needing the new `resubmission_count` protocol, so this works with released Pulsar 0.16 and fails without the handler fix.

### `test_resubmit.py`

- `test_every_handled_runner_state_has_a_message` — drop. It asserts the registry table has a non-empty field for the entries the test lists; it restates the data in `runner_state_definitions.py`.
- `test_every_handled_runner_state_has_a_condition` — keep. It is a cheap check that each condition variable is true for exactly its own state, which integration tests won't cover exhaustively.
- `test_resubmits_for_every_handled_runner_state`, `test_does_not_resubmit_when_condition_is_for_another_state`, `test_states_without_a_description_are_never_resubmitted`, `test_reason_without_definition_can_be_matched_by_name`, `test_registering_a_reason_makes_it_available_to_conditions` — they call `failure(MagicMock(), MagicMock(), job_state)`, so `mark_as_resubmitted`, the job config lookup and the destination mapping are all mocks returning mocks; the only real assertion is that `runner_state_handled` flipped. Rewrite the ones covering real behaviour (new states, cancelled, unknown reason) as integration tests per item 3 above and drop the rest. If a registered-reason test stays at unit level, test it through `_ExpressionContext` only, which is what `test_registered_reason_does_not_count_as_unknown` already does.
- `_job_state` builds a `MagicMock` with hand-set `resubmission_count`, `state_history`, `destination_params`. For the `_ExpressionContext` tests that remain, a small dataclass job state (`runner_state`, `job_wrapper.get_job()` returning a dataclass job) reads better and fails loudly on unexpected attribute access.
- The `registered_reason` fixture mutates the global registry and deletes from `runner_states.__dict__` by hand. If registration is a supported extension point, give `runner_state_definitions` an `unregister_runner_state` (or a context manager) so tests don't reach into a `Bunch`'s `__dict__`.

### `test_pulsar_runner.py`

- `test_failure_without_runner_state_keeps_generic_message`, `test_failure_with_runner_state_is_classified`, `test_reason_without_definition_is_kept_for_resubmit_conditions`, `test_malformed_runner_state_is_logged_and_ignored`, `test_runner_state_message_is_preferred_over_the_definition`, `test_runner_state_message_without_a_reason_is_shown`: these call `PulsarJobRunner._update_job_state_for_status` unbound with a `MagicMock` runner and read `runner.fail_job.call_args`. Nearly all the logic under test is already in the module-level `_apply_remote_runner_state(job_state, full_status)`. Rewrite them against that function with a tiny dataclass job state (`job_id`, `runner_state`), asserting the return value and `job_state.runner_state`. Keep one test (or rely on the integration tests) that `_update_job_state_for_status` passes the message to `fail_job`. `test_lost_job_ignores_runner_state` then becomes the single runner-level test.
- `test_polling_passes_full_status_for_failed_jobs`, `test_polling_still_fails_job_when_full_status_unavailable`, `test_polling_does_not_fetch_full_status_of_running_jobs`: they assert `assert_called_once_with` on a mocked runner method, i.e. they test the call graph. Extract the "fetch full status only for failed, tolerate errors" step into a helper (`_failed_job_details(client, status, job_id) -> dict | None`) and test it with a small fake client class; drop the third test (asserting a call doesn't happen is implementation-direct).
- `test_tool_detected_failures_reach_resubmission`, `test_unhandled_tool_failure_finishes_normally`, `test_successful_tool_is_not_resubmitted`, `test_destination_without_resubmit_skips_output_check`, `test_job_already_finished_is_not_resubmitted`: MagicMock runner whose `_handle_runner_state` side effect sets the flag the test then asserts. The first two duplicate (or should be replaced by) integration items 1 and 2. `test_destination_without_resubmit_skips_output_check` asserts a mock wasn't called — drop. The remaining guards are cheap; keep `test_job_already_finished_is_not_resubmitted` only if the integration tests don't reach it.
- `test_client_from_wrapper_reports_resubmission_count` — keep; it uses the file's existing `_runner()` fake client manager and checks a real contract (the persisted destination is not mutated).
- `test_discard_previous_attempt_cleans_the_remote_job`, `test_discard_previous_attempt_tolerates_nothing_to_clean` — drop. They reach a name-mangled private staticmethod and assert `clean()` was called on a mock. The embedded Pulsar integration test resubmits to the same Pulsar with the same job id, which only works because the previous attempt is cleaned, so it covers this already.

### `test_cli_failure_reasons.py`

The tests invoke `ShellJobRunner._handle_job_failure_reasons(runner, ajs, "12")` with a `MagicMock` runner, `MagicMock` shell and `MagicMock` `ajs`. The interesting logic (registered reason -> state + definition message; plugin message without a reason; nothing for an ordinary failure) does not need a runner. Extract a module-level function, e.g. `failure_reason_from_output(job_interface, stdout, job_id) -> tuple[str | None, str | None]`, have `_handle_job_failure_reasons` apply its result to `ajs`, and test the function with the real `Slurm()` plugin and plain strings — no mocks. Add the `sacct` fallback (no `JobState=` in output; `CANCELLED by 1000` line) and `PREEMPTED` cases, which the new `get_failure_reason` command can produce and are currently untested.

### Slurm CLI plugin (`util/cli/job/slurm.py`) status parsing

The PR changes status parsing, not only failure reasons: `get_single_status` adds `-t all`, `PR` now maps to `ERROR` instead of `RUNNING`, `_state_from_sacct` replaces the inline loop, and `_get_job_state` now returns `None` for an unknown code instead of raising `KeyError`. None of this has a unit test, and `test_cli_runners.py` (Docker Slurm) doesn't exercise preemption. Add a few `Slurm().parse_single_status(...)` tests with a small fake shell class whose `execute` returns canned `squeue` / `sacct` output: a `PR` line is `ERROR`, an empty squeue plus `CANCELLED by 1000` sacct is `ERROR`, and an unmapped code's behaviour is pinned down (whatever the intended result of the `None` return is).

### `test_slurm_util.py`

Good: an injected `execute` rather than patching, and real temp files. One nit: `test_memory_limit_messages` also asserts `MEMORY_LIMIT_MESSAGES[expected] == message`, restating a constant table; drop that line (and the extra parametrize column).

## Helper usage

The new integration test reuses `_BaseResubmissionIntegrationTestCase`; no ad-hoc HTTP calls were added. Moving `_assert_resubmission_count` / `_job_metrics` to the base class is the only helper change recommended.

## Test plan (recommended)

1. Strengthen `test_resubmit_on_tool_detected_error` to assert an `ok` output and one resubmission (move helpers to the base class).
2. Add embedded Pulsar OOM-exit-code resubmission and unmatched-rule tool-error integration tests (new environments in `resubmission_embedded_pulsar_job_conf.yml`).
3. Add `FailsJobRunner` integration tests for `node_failure`, `preempted`, `cancelled` under `any_failure`, `node_failure` not matching `unknown_error`, and an undefined reason matched by `runner_state ==` / `unknown_error`.
4. Add an MQ resubmission-to-local integration test in `test_pulsar_embedded_mq.py` for the `job_pair_for_id` fix.
5. In `test_resubmit.py`, drop the message-table test and the `MagicMock` `failure()` tests covered by step 3; keep the `_ExpressionContext` tests on a dataclass job state.
6. In `test_pulsar_runner.py`, retarget remote-runner-state tests to `_apply_remote_runner_state`, extract and test the full-status fetch helper with a fake client, drop the mock-call and discard-previous-attempt tests.
7. Extract a pure CLI failure-reason function; test it with the real `Slurm()` plugin including `sacct` fallback and preemption.
8. Add `Slurm.parse_single_status` tests for `PR`, `CANCELLED by`, and unmapped codes.
