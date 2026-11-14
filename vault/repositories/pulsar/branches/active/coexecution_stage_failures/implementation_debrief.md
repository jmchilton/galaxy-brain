# Implementation debrief — `coexecution_stage_failures`

Run via claude-opus-5-5 (nested subagent of the ga4gh_wes_tes stage 3 agent). Parent `coexecution_publish_running` `07051ab`; head `37a1e6d`.

## Problem

In a TES task the executors are `pulsar-submit --no-wait`, the tool container (waits for `/pulsar_staging/<id>/command_line`) and `pulsar-finish`. Galaxy never polls TES; it learns job state only from AMQP status messages.

- `run_server_for_job` and `run_server_for_job_finish` (`pulsar/scripts/submit_util.py`) caught `BaseException`, logged and returned, so both scripts exited 0 on any failure. After a failed stage-in, executor 1 started and waited for `command_line` forever, and the TES task never ended.
- A failed stage-in already published `failed` (the stateful manager's `_handling_of_preprocessing_state`), but with an empty `stderr`: the error was written to a job file named `stderr`, which nothing has read since tool and job streams moved to `metadata/tool_stderr` and `metadata/job_stderr` (commit `00fa8c6`). Galaxy's `PulsarJobRunner._update_job_state_for_status` maps `failed` to `fail_job(message=FAILED_REMOTE_ERROR, full_status=...)`, and `fail_job` shows only `full_status["stdout"]` and `["stderr"]`. So the user saw "Remote job server indicated a problem running or monitoring this job." and nothing else.
- A failed stage-out in `pulsar-finish` published `failed` and exited 0.

## Fix

- `a3d83f6`: both scripts return an exit code (`main()` returns it; the console-script wrapper passes it to `sys.exit`, and `__main__` blocks now `sys.exit(main())`). Non-zero when the job's status is `failed` or `lost` after `wait_for_launch` / `wait_for_job` (both now return the status) or when the script raised. The `failed` status is published by the stateful manager as before; the exit code doesn't depend on the publish succeeding, so an unreachable broker still fails the executor. `--wait` keeps returning 0, because Kubernetes runs it in a Job without `backoffLimit` (default 6) and a failed pod would rerun the job after Galaxy was told it failed. The success path is unchanged.
- `37a1e6d`: `_record_preprocessing_failure` writes `Pulsar failed to stage inputs or launch the job: <error>` to `metadata/tool_stderr`. A write failure is logged and doesn't block the `failed` callback. This affects every Pulsar manager, not just coexecution, and is a plain bug fix there too.

## Broker unreachable

Status messages go through the status outbox (the client always sets `persistence_directory`). With no broker the outbox keeps the message on disk, the app shuts down after the outbox's final drain, and `pulsar-submit` exits 1 in about 16 s (docker scenario C). The undelivered `failed` is lost, because the TES task stops and `pulsar-finish`, which would drain the shared outbox, never runs. On the success path an undelivered `running` is still drained by `pulsar-finish` later; that path is unchanged.

## Testing

`test/submit_util_test.py` (real `pulsar-submit` / `pulsar-finish` entry points, `memory://` broker unless noted):

| Test | Before (`07051ab` scripts) | After |
| --- | --- | --- |
| `test_no_wait_submit_unreachable_galaxy_publishes_failed_and_exits_non_zero` | fails: `assert None == 1`; with exit codes but before `37a1e6d`: `stderr == ''` | passes |
| `test_finish_output_staging_failure_publishes_failed_and_exits_non_zero` | fails: `assert None == 1` | passes |
| `test_no_wait_submit_failure_exits_non_zero_with_unreachable_broker` (amqp URL on a closed port) | fails: `assert None == 1` | passes, 9 s |
| `test_no_wait_submit_preprocessing_failure_publishes_failed_only` (now also asserts the exit code) | fails: `assert None == 1` | passes |
| `test_waiting_submit_failure_still_exits_zero` | n/a (documents `--wait`) | passes |

Command: `.venv/bin/python -m pytest test/submit_util_test.py`. The "before" run used a copy of the test with literal exit codes, since the constants are new. The two existing success tests now assert exit code 0, which also fails before (`None`), harmlessly.

`make lint` passes. At the stack tip, `submit_util_test`, `stateful_test`, `messaging_outbox_test`, `coexecution_manager_test`, `scripts_config_test`, `cli_help_tests`, `integration_test_cli_submit`, `manager_coexecution_test`, `tes_test`, `client_test`, `client_k8s_test`, `manager_endpoint_util_test` and `main_util_test` pass (160 tests). The whole suite at the tip `4ccfb64`, `pytest test -k "not kubernetes"` with the venv on `PATH`: 641 passed, 92 skipped. The Kubernetes integration tests need a cluster and fail with a pykube config error here.

## Docker verification

[docker_verification/output.md](docker_verification/output.md), 14/14 checks, from `verify.sh` with image `wes-tes/pulsar-pod-staging:0.16.1.dev0-4ccfb64` (`sha256:dd2377f2f742…`, stack tip) against `0.16.1.dev0-07051ab` (`sha256:04065941d40e…`). Every executor ran `docker run --read-only` with a named volume at `/pulsar_staging`, Galaxy-shaped base64 arguments, throwaway RabbitMQ `wes-tes-rabbitmq-pulsarfix` on 18772 (removed), and a fake Galaxy job files API on 172.17.0.1:18774 / 18777.

- A, unreachable Galaxy: exit 1, publishes exactly `failed` with `stderr` `Pulsar failed to stage inputs or launch the job: Connection refused (transport code: 7, ... Failed to connect to 172.17.0.1:18775 ...)`, no `command_line`.
- B, same with the `07051ab` image: exit 0, `failed` with empty `stderr`.
- C, Galaxy and broker unreachable: exit 1 after 16 s, nothing published.
- D, success: submit, tool, finish exit 0, publishes `running`, `complete`, output staged back.
- E, fake Galaxy answers 500 to uploads: `pulsar-finish` exits 1, publishes `running`, `failed`.
- F belongs to [`coexecution_dependency_dir_default`](../coexecution_dependency_dir_default/index.md).

## Open

- A failed stage-out still reports only the tool's stderr; the upload error is in `pulsar-finish`'s log (the TES executor's stderr). Surfacing it means changing what postprocessing records for all managers.
- If `pulsar-submit` fails before the app exists (bad app config) or before the job config is read, nothing can be published and Galaxy still waits; the executor at least exits non-zero now.
- In Kubernetes (`--wait`) the tool container still waits for `command_line` after a failed stage-in until Galaxy removes the Job; unchanged.
- `pulsar-run --server` calls `run_server_for_job` without a `--wait` option and fails with `AttributeError` before and after this branch.
