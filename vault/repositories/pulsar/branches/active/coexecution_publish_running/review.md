# Review: `coexecution_publish_running`

- Branch: `coexecution_publish_running` on the jmchilton fork, diffed against its parent `coexecutor_image_modern_base` (`1138cd0`)
- Reviewed commit: `07051ab8d8258c834201bfa5962843de92274855`
- Date: 2026-11-14
- Reviewer: stage 3 review agent, Claude Opus, effort high

The change is correct for the case it targets. I found no wrong behavior and no duplicate or out-of-order status messages. The new tests drive the real entry points and fail without the fix. All findings below are polish.

## Findings

### P3 1: `wait_for_launch` never returns if the staging thread dies without a marker

`pulsar/scripts/submit_util.py:81-91`. The loop exits only when `get_status` stops returning `preprocessing`. That needs the preprocessing thread to write `preprocessed` or `preprocessing_failed` (`pulsar/managers/stateful.py`, `_handling_of_preprocessing_state`). If the thread dies before either is written, the loop spins forever. That can happen when the `except` branch's own `store_metadata` raises, for example on a full or read-only staging volume, or when the thread is killed by a `BaseException` the `except Exception` doesn't catch. Before this change `pulsar-submit` exited and the tool executor hung instead, in `TOOL_EXECUTION_CONTAINER_COMMAND_TEMPLATE`'s endless wait for `command_line`. So the task hangs either way, and this is not a regression. Only the place where it hangs moves. Still, an unbounded loop with no log line is hard to diagnose.

Fix: log once while waiting. Stop waiting when no preprocessing thread is alive any more. `new_thread_for_job` names the thread, so the proxy could expose a "staging in progress" check, or `submit_job` could return the thread. Failing that, add a generous timeout that logs and exits non-zero.

### P3 2: Two copies of the same polling loop

`pulsar/scripts/submit_util.py:71-78` (`wait_for_job`) and `81-91` (`wait_for_launch`) are the same loop with different exit predicates (`is_job_done(status)` and `status != PREPROCESSING`) and poll intervals. Fix: one `_poll_status(manager, job_id, until, poll_time)` helper with two thin callers, or a single function that takes the predicate.

### P3 3: Stacked on the image branch although it is independent

`07051ab` touches only `pulsar/scripts/submit_util.py` and `test/submit_util_test.py`. It cherry-picks onto `master` cleanly, as the record says. Stacking it on `coexecutor_image_modern_base` makes its PR wait on the image's open design questions (see that branch's review, P1 1). Fix: before opening a PR, rebase it onto `origin/master` and drop `parent_branch` from the record. Rebuild the demo image from a merge of both branches if it still needs both.

### P3 4: No HISTORY.rst entry

This is a user-visible fix: Galaxy now shows TES, AWS Batch and GCP Batch message-queue jobs as running. Fix: add a line to the unreleased section of `HISTORY.rst` when the PR number is known, as other entries do.

## Checked and fine

- Ordering and duplicates. `running` is published from `pulsar-submit`'s `get_status` on the `to_running` transition, under the job's status lock. The `running` marker is persisted, so `pulsar-finish`'s `get_status` never repeats it: with the PID file removed it goes straight from `COMPLETE` to `to_complete`. With the status outbox, the sequence number is recovered from disk (`_recover_next_seq`). So if a `running` stays undelivered from `pulsar-submit`, `pulsar-finish` drains it before its own `complete`. The new test confirms `['running', 'complete']`.
- A late `running` after `complete` would be harmless. That could only come from an `amqp_acknowledge` republish by `pulsar-finish`'s ack manager. Galaxy's `JobWrapper.change_state` (`lib/galaxy/jobs/__init__.py:1748`) and `Job.set_state` both ignore changes to a job that is already terminal.
- Staging failure. The `except` branch writes `preprocessing_failed` before it publishes `failed`. `get_status` then returns `failed` with `to_preprocessing_failed`, which publishes nothing. The test confirms exactly `['failed']`.
- Cancellation before launch returns `cancelled`. A missing job directory returns `lost`. Both end the loop.
- `--wait` path (Kubernetes PARALLEL, and containerless jobs on any runner): untouched. The new branch is the `else` of `if wait`.
- Kubernetes coexecution manager: it only ever runs `--wait`. In the `--no-wait` case `CoexecutionManager.launch` writes the dummy PID file, so the proxied status is `running` straight after launch. The loop cannot trigger postprocessing.
- Message contents. Non-terminal payloads are `{"complete": "false", "status": "running", "job_id": ...}` (`manager_endpoint_util.full_status`). Galaxy's `__async_update` needs only `job_id` and `status`, and `_update_job_state_for_status` maps `running` to `Job.states.RUNNING` (`lib/galaxy/jobs/runners/pulsar.py:428`). The polling TES client (`TesPollingCoexecutionJobClient`) already maps TES RUNNING to `running` and publishes nothing, so it is unaffected.
- Semantics. `running` now means "inputs staged and command written". The tool executor, which may still be pulling its image, starts after `pulsar-submit` exits. That matches what the polling TES client reports, since TES RUNNING covers staging too.
- Side benefit. Before the fix, `app.shutdown()` ran while staging was still in progress. With `preprocess_max_concurrent` set, `_staging_slot` raised `_StagingInterrupted` once `__shutting_down` was set, so the job never launched. A `failed` published after shutdown also went to an outbox that had already stopped. Waiting until launch before shutting down removes both races.
- Executor time does not grow. The process already waited for the non-daemon staging thread, and a poll interval of 0.5 s adds at most that.
- Tests. `test/submit_util_test.py` runs `submit.main` and `finish.main` with the coexecution manager, `monitor: none`, a persistence directory (so the outbox path) and a `memory://` broker. They are behavior tests, not mocks, in line with the integration-over-unit weighting. `files_server("/")` follows `integration_test.py:460` and works with CI's external job-files service, which mounts `/tmp`.
- Imports are at module top level. The `PREPROCESSING` import passes ruff/isort.

## What I ran

- `make lint` in the worktree: passes.
- `.venv/bin/pytest test/submit_util_test.py`: 3 passed.
- The same tests against `07051ab` with `1138cd0`'s `submit_util.py`, in a scratch copy: the first two fail (`[] != ['running']`, `['complete'] != ['running', 'complete']`) and the failure test passes.
- `stateful_test.py`, `messaging_outbox_test.py`, `coexecution_manager_test.py`, `manager_coexecution_test.py` and `integration_test_cli_submit.py`, with the venv on `PATH`: 63 passed.
- Fork CI for `07051ab`: everything finished is green except `Test (3.10, master, directory)`, which is also red on upstream `08dedcb` and so unrelated. At review time, `Test (3.10, dev, *)` was still running.
