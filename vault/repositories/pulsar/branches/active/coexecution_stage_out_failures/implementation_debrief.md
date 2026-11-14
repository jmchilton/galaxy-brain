# Implementation debrief — `coexecution_stage_out_failures`

Run via claude-opus-5-5 (nested subagent of the ga4gh_wes_tes stage 3 agent, effort high). Parent `coexecutor_image_pycurl` `4ccfb64`; head `53f91f1`. Inputs: the demo's gap test 4 (`~/projects/repositories/galaxy-wes-tes`, `docs/gap-tests.md`, `runs/gaps/stage-out-*`) and a code-reading suspicion about lost terminal statuses.

## 1. Stage-out errors never reached Galaxy — fixed (`6038976`)

Galaxy's `PulsarJobRunner._update_job_state_for_status` maps `failed` to `fail_job(message=FAILED_REMOTE_ERROR, full_status=...)`, and `fail_job` (`lib/galaxy/jobs/runners/__init__.py`) passes only `full_status["stdout"]` and `["stderr"]` to `job_wrapper.fail`. Pulsar's `do_postprocess` logged the upload error and stored `postprocessing_failed: true`; the `failed` status carried only the tool's stderr.

Fix:

- `postprocess` raises `OutputStagingError` (holding the collection failures) instead of returning `False`. Its only callers were the stateful manager and two tests.
- The `postprocessing_failed` marker now holds `Pulsar failed to stage outputs: <error>\n` instead of `true`.
- `StatefulManagerProxy.stderr_contents` appends that message to the tool's stderr. It works for every manager (all are wrapped by the stateful proxy) and for the HTTP status endpoint too.
- A later successful attempt (recovery) removes the marker, so the `complete` status carries no stale error. A tool's own stderr file is never modified; that matters because legacy tools treat any stderr as failure. A `true` marker from an older Pulsar still means failed, without a message.

Preprocessing (`37a1e6d`) writes to `metadata/tool_stderr` directly. That's fine there, since the tool never ran, so it was left alone.

## 2. Output written as a directory, or missing — directory fixed (`53f91f1`); missing is Galaxy-consistent

A nested subagent (opus, high) read Galaxy at `65e6daff233` and probed the relevant functions in isolation (no server). Its findings:

| Case | Local Galaxy, default config | Local, `outputs_to_working_directory: true` | Pulsar before |
| --- | --- | --- | --- |
| Output replaced by a directory | job and dataset `error`, "Unable to finish job" (`IsADirectoryError` from `set_meta`/`set_peek` in `finish()`, caught in `runners/__init__.py`) | `error`, "Job N's output dataset(s) could not be read" (`shutil.move` fails) | green, 0-byte dataset |
| Output missing | `ok`, 0 bytes: `update_from_file(create=True)` re-creates an empty file in the disk object store | `error`, "could not be read" | green, 0-byte dataset |

So Pulsar silently diverged only for the directory. `ResultsCollector` now treats a non-empty directory at an output's path as a collection failure (`IsADirectoryError("Output <name> is a directory, not a file")`). It uses the new `PulsarOutputs.has_output_directory`, which checks for listing entries under `<name>/`.

- With Pulsar-side staging the job fails, and with fix 1 the `failed` status's stderr names the directory.
- When Galaxy collects outputs itself (same `ResultsCollector`), it fails the job with "Failed to find or download one or more job outputs from remote server."
- Missing outputs are still skipped.

Code reading only: `metadata_strategy: extended` for the missing case was not traced; the subagent thinks the dataset probably comes back purged.

## 3. Terminal status lost at shutdown — real, fixed (`90600e8`)

The race:

1. `do_postprocess` writes the `postprocessed` marker and then calls the state change callback. The callback builds `full_status` (directory listings, streams) and enqueues it in the status outbox.
2. `get_status` reports the terminal status as soon as the marker exists.
3. `pulsar-finish` polls `get_status` every 2 s and then calls `app.shutdown()`. Shutdown stops the outbox: it joins the drain thread, does one final drain, and leaves later entries on disk.
4. A message enqueued after that drain stays in `/pulsar_staging/persisted_data/...-status-outbox/`, which nothing drains once the TES task ends.

The preprocessing-failure path has the same window between releasing the status lock and the callback (`pulsar-submit --no-wait` polls every 0.5 s). A long-running Pulsar server drains the leftover on restart, so there the message is only late.

Proof: with `full_status` slowed to 3 s for `complete`, a real `pulsar-finish` published only `['running']` before the fix.

Fix: `StatefulManagerProxy` counts terminal publications in progress (`_InFlight`), from just before the outcome marker is written until the callback returns. `shutdown(timeout)` waits for the count to reach zero, after stopping the monitor and before the proxied manager and outbox stop. It doesn't wait for transfers still running (those threads are non-daemon, as before).

## Tests

All fail on the parent code and pass on the branch.

| Test | Before (parent code) | After |
| --- | --- | --- |
| `stateful_test::test_failed_status_reports_the_stage_out_error_after_the_tool_stderr` | `'tool warning' == 'tool warning\nPulsar failed to stage outputs: ...'` fails | passes |
| `stateful_test::test_stage_out_error_is_dropped_once_outputs_are_staged_on_recovery` | `'earlier attempt' in ''` fails | passes |
| `submit_util_test::test_finish_output_staging_failure_publishes_failed_and_exits_non_zero` (extended) | `''.startswith('Pulsar failed to stage outputs: ')` fails | passes |
| `stateful_test::test_shutdown_waits_for_a_reported_postprocessing_outcome_to_be_published` | shutdown returned while the callback was held | passes |
| `stateful_test::test_shutdown_waits_for_a_reported_preprocessing_failure_to_be_published` | same | passes |
| `submit_util_test::test_finish_publishes_complete_even_when_publishing_is_slower_than_polling` | `['running'] == ['running', 'complete']` fails | passes (about 4 s) |
| `client_staging_test::test_collect_outputs_fails_an_output_written_as_a_directory` | no failure recorded | passes |
| `submit_util_test::test_finish_fails_an_output_written_as_a_directory` | `pulsar-finish` exits 0 | passes |
| `client_staging_test::test_collect_outputs_skips_a_missing_output`, `..._collects_an_output_file` | pass (document unchanged behavior) | pass |

How the "before" column was produced: `git stash push -- pulsar/` with the new tests in place, then `.venv/bin/python -m pytest <tests>`. The fixture `_postprocessing_failed` now raises instead of returning `False`, and the two `staging_metrics_test` asserts on `postprocess`'s return value were dropped.

Gate:

- `make lint` passes.
- Whole suite at `53f91f1`, `pytest test -k "not kubernetes"` with the venv on `PATH`: 650 passed, 92 skipped (parent: 641 passed).

## Docker verification

[docker_verification/output.md](docker_verification/output.md): 15/15 checks.

- Images: `wes-tes/pulsar-pod-staging:0.16.1.dev0-53f91f1` (`sha256:9314ab4dfc75…`) against `0.16.1.dev0-4ccfb64` (`sha256:dd2377f2f742…`).
- Every executor ran with `docker run --read-only` and a named volume at `/pulsar_staging`.
- Broker: throwaway `wes-tes-rabbitmq-pulsarfix2` on 18780, removed. Fake Galaxy job files APIs ran on 172.17.0.1:18781, 18783 (answers 500) and 18784 (stopped before stage-out).

Results:

- **D, success:** submit, tool and finish exit 0. Publishes `running`, `complete`; the output reaches the fake Galaxy.
- **G1, Galaxy down at stage-out:** `pulsar-finish` exits 1. `failed` stderr: `Pulsar failed to stage outputs: Connection refused (transport code: 7, ... Failed to connect to 172.17.0.1:18784 ...)`.
- **G2, same with the `4ccfb64` image:** `failed` with empty stderr. This is the demo's gap test 4c.
- **H, upload answered 500:** `failed` stderr: `Pulsar failed to stage outputs: Response code not 200 (transport code: 500, ...)`.
- **I1, tool replaces its output with a directory:** tool exits 0, `pulsar-finish` exits 1, nothing uploaded. `failed` stderr: `Pulsar failed to stage outputs: Output dataset_2.dat is a directory, not a file`.
- **I2, same with `4ccfb64`:** all exit 0, `complete`, nothing uploaded. This is the demo's gap test 4b.

Fix 3 isn't exercised in docker: the window is milliseconds without an injected delay. The in-process `pulsar-finish` test covers it.

## Open

- With `send_stdout_update` and a delivered live update, `full_status` sends `stderr: None`, so the stage-out message doesn't reach Galaxy. Live output is off by default.
- An empty directory at an output's path isn't in the file listing and still goes unnoticed.
- Galaxy's polling (non-AMQP) Pulsar runner calls `_update_job_state_for_status` without `full_status`, so it shows no stderr for `failed` from any source.
- Not yet run through the demo's Galaxy: switch `versions.env` to `0.16.1.dev0-53f91f1` and rerun gap test 4.
