# Implementation debrief: tes_task_state_polling

Written at hand-off by the stage 3 agent of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md).

- Branch `tes_task_state_polling`: base `dev` (`61ec05da7b6`), head `411ad874536`, one commit, at hand-off. Now `28c0ea54595`; see the follow-ups at the end.
- Demo-only port `tes_task_polling_v26.1.2`: base tag `v26.1.2` (`391641a4e12`), head `7a9ccab279c` at hand-off, now `7a916480a88`. Not for a PR.

## Problem

`PulsarTesJobRunner` had `use_mq = True` and `poll = False`. Galaxy learned job state only from AMQP messages that Pulsar publishes from inside the TES task. It never called TES `GET /tasks/{id}`.

So a task that died before Pulsar published left the Galaxy job `queued` or `running` forever, along with any WES run waiting on it. The demo hit this when the staging image failed on a read-only root filesystem (demo `docs/troubleshooting.md`, T8 and I5).

## Change

**Polling.** `PulsarTesJobRunner` turns on the monitor thread (`poll = True` unless the interval is 0) and overrides `check_watched_item`. The MQ path is unchanged: status messages still drive the job.

- Every `tes_status_check_interval` seconds per job (default `60`, `0` disables), the runner reads the task with `GET /v1/tasks/{id}?view=BASIC` through pydantic-tes.
- The client comes from Pulsar's `tes_job_config.parse_tes_job_params` and `tes_client_from_params`, built from the destination params. Basic auth therefore works the same as at submission.
- The first check comes one interval after the job is watched.

**When the runner stops watching.** It checks only while all of these hold:

- The Galaxy job is `queued` or `running`.
- The job's `job_runner_external_id` is still the watched task.
- `job.handler` is this server.
- Pulsar hasn't reported a final status (`complete`, `cancelled`, `failed`, `lost`) for the task.

`_update_job_state_for_status` records those final statuses for watched tasks. Finishing a job runs on worker threads, and the job stays `running` meanwhile. Without the record, a slow finish or a backed-up work queue could get a job failed after Pulsar had reported success.

Anything else drops the watch: the job was stopped, deleted or resubmitted, or another handler claimed it to finish it.

**Failing the job.**

- The finished states are `COMPLETE`, `EXECUTOR_ERROR`, `SYSTEM_ERROR`, `CANCELED` and `PREEMPTED`, plus HTTP 404 (not found).
- Once the task has been in one of them for `tes_status_grace_period` seconds (default `120`), the runner reads the `FULL` view once and checks again that the job still waits.
- It then sets `job_state.stop_job = False` and calls `fail_job`. The task is already finished or gone, and cancelling a lost task raises. Runner state handlers such as resubmit still run.
- The grace clock restarts whenever the task is seen not finished again.
- `UNKNOWN`, `QUEUED`, `INITIALIZING`, `RUNNING`, `PAUSED` and `CANCELING` keep waiting.

**Errors.** TES errors other than 404 (connection refused, 5xx, unparseable documents) and unexpected exceptions in a check are logged and retried at the next interval. They never fail a job, and the rest of the monitor pass continues.

**Messages in job info.**

- Failure states: `TES task <id> ended in state EXECUTOR_ERROR before Pulsar reported a final job status. Executor 0 (pulsar-submit, image galaxy/pulsar-pod-staging:0.15.0.2) exited with code 1.`
- `COMPLETE`: `TES task <id> completed, but Pulsar never reported a final job status, so Galaxy could not collect the job's results. Executor 2 (pulsar-finish, ...) ran last and exited with code 0.`
- 404: `The TES server has no record of task <id>, and Pulsar never reported a final job status.`

**Job stderr and Galaxy log.**

- The failing executor is the first one with a non-zero exit, otherwise the last one.
- Its stderr tail (20 lines, at most 4000 characters) becomes the job's tool stderr, through `fail_job`'s existing `full_status["stderr"]` path.
- The TES system logs tail (10 lines) goes only to the Galaxy log, at INFO. It describes TES hosts and container command lines.

**Redaction.** The executor arguments carry Pulsar's base64 job description and app config, which include the message queue URL with its credentials. Funnel 0.12.3 prints the full `docker run` command, arguments included, in its system logs (verified).

Before stderr or system logs reach job info, job stderr or the Galaxy log, `redact()` does two things. First it removes known values exactly:

- the arguments of Pulsar's own `pulsar-*` executors (flags excluded);
- the password in the runner's `amqp_url`;
- the TES basic auth password.

Then it removes these patterns:

- base64-looking runs of 32 or more characters that mix upper case, lower case and digits;
- URL userinfo;
- `key`, `token`, `secret` and `password` assignments (`=`, `:`, quoted dict form);
- `Basic <credentials>`.

Only an executor's program name and image are shown. pydantic validation errors are logged without their text, because that text quotes the input document.

**Options.** `tes_status_check_interval` and `tes_status_grace_period` exist only in `PULSAR_TES_PARAM_SPECS`. `PulsarJobRunner` now takes its specs from a `pulsar_param_specs` class attribute, so the other Pulsar runners still reject these as unknown parameters.

**Files.**

- `lib/galaxy/jobs/runners/pulsar.py`
- New `lib/galaxy/jobs/runners/util/tes_task.py`: state fetch, failure description, redaction.
- `lib/galaxy/config/sample/job_conf.sample.yml`: the commented-out options.
- New `test/unit/app/jobs/test_pulsar_tes_task_checks.py`.

## Decisions

- **A COMPLETE task with no final message fails the job.** For co-execution, `pulsar-finish` stages outputs and publishes `complete` as the last step of the task. Galaxy's `finish_job` needs the cached final status (`client.full_status()`), so the job can't be finished without the message. A completed task with no message after the grace period means the publish failed (broker unreachable from the task, wrong credentials), or Galaxy's consumer was down past the grace period.
- **A task the server doesn't know fails after the same grace period.** Funnel answers 404 `task not found` (checked against a live Funnel 0.12.3). This happens when the TES server lost its database or deleted the task.
- **Grace period default 120 s.** Pulsar publishes before its executor exits, so a message normally arrives within a second of the task finishing. The grace period only matters when Galaxy's AMQP consumer lags or is disconnected. With the defaults, detection takes between interval + grace and grace + 2 × interval (about 3 to 4 minutes), where before it never happened.
- **Interval default 60 s, BASIC view.** That is one small GET per watched job per minute. pydantic-tes 0.4.0 can't parse the MINIMAL view, which omits `executors`, so BASIC is the cheapest view that works. FULL is read once, at failure time.
- **PREEMPTED and CANCELING.** pydantic-tes 0.4.0's `TesState` lacks these TES 1.1 states, so `get_task` raises a validation error. `fetch_tes_task_state` recovers the state string from that error (`loc == ("state",)`). The FULL view of such a task doesn't parse either, so the message has no executor details.
- **Galaxy only, no Pulsar change.**
  - Everything needed is already a Galaxy dependency: pulsar-galaxy-lib 0.16.0 (pinned on dev) and pydantic-tes 0.4.0.
  - A Pulsar change, such as a public "get TES task" method on the client, would need a Pulsar release and a pin bump before Galaxy could use it. It also wouldn't remove any Galaxy code.
  - Pulsar's client objects do have `_tes_client` and `_tes_task_id`. Both are private, and `_tes_task_id` doesn't exist in 0.15.15 (Galaxy 26.1).
- **Base `dev`, not a release branch.**
  - The runner has had this state since at least `release_25.1`, so the bug is long-standing.
  - But the fix adds two runner options and turns on a monitor thread that sends new HTTP requests by default. That behavior change belongs in a feature release.
  - The TES helpers also moved: `pulsar.client.container_job_config` in 0.15.14 and 0.15.15 (Galaxy 25.1 to 26.1), `pulsar.client.tes_job_config` in 0.16.0 (Galaxy 26.2 and dev). A release-branch version would differ per branch anyway.
  - For a backport, `release_26.2` has the same pulsar-galaxy-lib as dev. Older branches need the import swap that the demo branch shows.

## Review

A nested review subagent (Claude Opus 5.5, high effort) reviewed the first version. These P1 and P2 findings were fixed before the push:

- **Lost tasks were never failed.** The real `fail_job` tried to cancel the task, because `stop_job` defaults to true. For a lost task the cancel raised a 404, so the job wasn't failed and the monitor pass aborted.
- **Finishing jobs could be failed.** A job Pulsar had reported complete could be failed while Galaxy was still finishing it, or after another handler had claimed it.
- **Redaction was hardened** with exact known values and dict-form and Basic credentials.

Also changed after review: the test harness now uses the real runner `__init__`, `AsynchronousJobState` and `fail_job`, and the options are accepted by the TES runner only.

The missing HTTP timeout was not fixed; see Open questions.

## Testing

The 20 tests in `test/unit/app/jobs/test_pulsar_tes_task_checks.py` use the real runner, built from a Mock app, with the real `fail_job` and runner state handlers. They talk through the real pydantic-tes client to a fake TES HTTP server (stdlib `ThreadingHTTPServer`). The server returns Funnel-like BASIC and FULL views, and 404 for unknown ids and for `:cancel`. The monotonic clock is patched.

They cover:

- Failure after interval + grace, with the executor summary, the stderr tail, and redaction in job stderr and the Galaxy log.
- No failure when Pulsar's final status arrives and the job stays running past the grace period.
- No checks for stopped, deleted or ok jobs, jobs Pulsar finished, jobs of another handler, and resubmitted jobs.
- A running task is checked once per interval.
- COMPLETE with no final status.
- 404, with no cancel attempted.
- PREEMPTED.
- The grace clock restarting.
- TES 500s and a dead server never failing a job.
- Exceptions in a check not escaping.
- Exact redaction of known secrets.
- Option parsing and the 0 switch.
- `PulsarMQJobRunner` still not polling.
- `redact()` keeping paths and hex digests.

```sh
cd ~/projects/worktrees/galaxy/branch/tes_task_state_polling
.venv/bin/python -m pytest -q -p no:cacheprovider -p no:postgresql test/unit/app/jobs/test_pulsar_tes_task_checks.py
```

`-p no:postgresql` is needed only because this venv has no libpq for the pytest-postgresql plugin.

**Fail before.**

- First version of the tests, with `pulsar.py` reverted to `origin/dev` and the helper module kept: 10 failed, 6 passed. The 6 that passed assert "no check, no failure" behavior that dev trivially satisfies, plus the redaction and MQ runner tests.
- Final tests with `origin/dev`'s `pulsar.py`: 2 failed, 16 errors, 2 passed. The errors come from dev rejecting the new runner options when the harness builds the runner.
- Mutation checks on the final code: removing `stop_job = False` fails 6 tests. Removing the record of Pulsar's final statuses fails `test_final_status_from_pulsar_outlasting_the_grace_period_keeps_the_job`.

**Pass after.**

- 20 passed.
- Together with the neighbouring files `test_pulsar_runner.py`, `test_runner_pulsar.py`, `test_runner_finishing_state.py` and `test_runner_default_destination_params.py`: 91 passed.
- `test_runner_local.py` has 4 failures that also fail on unmodified dev in this environment.

**Lint and types.** black, isort, ruff and flake8 are clean on the changed files. mypy on them reports only the pre-existing `galaxy/managers/notification.py` error.

**Demo branch.** In a fresh v26.1.2 venv (pulsar-galaxy-lib 0.15.15), the same 20 tests pass, and all 24 tests selected by `-k pulsar` in `test/unit/app/jobs/` pass.

**Real TES server.** A private Funnel 0.12.3 ran on ports 18190 and 18191 and was stopped afterwards. It ran four tasks and answered one lookup:

- a Pulsar-like 3-executor task whose executor 0 exits 1;
- a task with a nonexistent image;
- a COMPLETE task that never reports;
- a cancelled task;
- a lookup of a missing id.

The runner used real defaults apart from interval and grace, and went through the real `fail_job`. It failed each one as expected:

| Case | Result |
|---|---|
| Executor 0 exits 1 | `EXECUTOR_ERROR`, executor 0 exit 1, with its stderr |
| Nonexistent image | `EXECUTOR_ERROR`, exit 125, with Docker's "pull access denied" stderr. Funnel reports image pull failures as executor errors. |
| Silent COMPLETE | COMPLETE, with executor 2's stderr |
| Cancelled | CANCELED |
| Missing id | "no record" (404) |

The fake base64 argument was redacted everywhere, including Funnel's "Running command" system log line.

No Galaxy server and no end-to-end WES run were used for this branch. The record says how to apply the demo branch.

## Open questions

- **No HTTP timeout.** pydantic-tes calls `requests` without a timeout. A TES server that accepts connections but never answers blocks this runner's monitor thread. Status messages still flow; only these checks stall. The fix belongs in pydantic-tes (a timeout option), then here.
- **pydantic-tes gaps.** 0.4.0 lacks `PREEMPTED` and `CANCELING` and rejects MINIMAL. A pydantic-tes release would remove the state workaround and allow MINIMAL.
- **Late `complete` after a failure.** Galaxy's consumer can be down longer than the grace period, so a `complete` message can arrive after the runner already failed the job. `_update_job_state_for_status` then calls `mark_as_finished` without checking whether the job already finished. The `failed` branch has that check; `complete` doesn't. The code was already like this, but this change makes the case reachable.
- **Status before the first check.** A final status that arrives before the job's first `check_watched_item` call (within about a second of submission or recovery) isn't recorded. If finishing then outlasts interval + grace, the job would be failed. Unlikely.
- **Tasks stuck in TES `QUEUED`** (no capacity) aren't handled.
- **Resubmission** on these failures (`unknown_error`) goes through the real handlers but isn't tested.

## Follow-up (stage 3 coordinator)

- `0c07c2b505e`: the demo run showed `Job.info` (255 characters) cutting the COMPLETE-without-status message mid-sentence, because the message named the executor with its image. The message now names the executor without its image; the stderr details keep the full label. New test `test_failure_message_fits_job_info_with_long_image_names`; it and the two message assertions fail on `411ad874536`, all 21 pass after.

## Follow-up: cancelling a TES task that already ended (stage 3)

Commits `211ae51ddaa` (fix) and `28c0ea54595` (mypy fix for the `JOB_INFO_LENGTH` line from `0c07c2b505e`). Demo port: cherry-picked onto `tes_task_polling_v26.1.2` as `21cedb62252` and `7a916480a88`, merged into `wes_tes_demo_fixes_v26.1.2` at `d90dc5f1c9e`.

**Problem.** TESK answers `POST /tasks/{id}:cancel` on a task that has ended with HTTP 400 (`Job with ID=... has no pods in RUNNING status.`); Funnel answers 200. Pulsar's `kill()` (pydantic-tes `cancel_task`) raises. Seen in the demo on stock v26.1.2:

- From `JobHandlerStopQueue`, `stop_job` raises after the job's final state was flushed, so the step rolls back. The step retries every second forever and the job stays `deleting` (demo `runs/gaps/cancel-finished-task-tesk/`). Because the stop queue handles every job of a step in one transaction, the same exception also rolls back any other job stopped in that step.
- From `fail_job`, which calls `stop_job` before failing the job: the exception leaves the job unfailed. Reproduced this time (demo `runs/gaps/cancel-finished-task-tesk-fixed/fail-job-stock/`): Galaxy processed Pulsar's `failed` after the task had ended (Galaxy was down during stage-out). The exception escaped `__async_update`, Pulsar's consumer logged `Failure processing job status update message`, and the message was not redelivered. Both jobs stayed `running` with no info.
- `_update_job_state_for_status` also calls `client.kill()` for a `STOPPED` job that gets a status message; same exposure.

**Change.** `PulsarJobRunner` gets a one-line hook, `_kill_remote_job(client, job_wrapper, destination_params)`, used at both `client.kill()` call sites. `PulsarTesJobRunner` overrides it: when the cancel raises, it reads the task's state with the existing `fetch_tes_task_state`.

- `COMPLETE`, `EXECUTOR_ERROR`, `SYSTEM_ERROR`, `CANCELED`, `PREEMPTED`, `CANCELING`, or 404: logged at INFO (`TES task is COMPLETE, nothing to cancel`). New constant `TES_NOTHING_TO_CANCEL_STATES` in `tes_task.py` (the finished states plus `CANCELING`).
- Any other state, an unreadable state, or no recorded task id: logged at ERROR, saying the task may still be running, with the redacted cancel error.
- It never raises.

**Decision: log, don't re-raise, for a task that may still run.** Raising can't make a permanent error (e.g. a 401 or a TES server that refuses cancels) go away; it only loops the stop queue, blocks the other jobs in its step, and leaves `fail_job` jobs unfailed. A transient error now leaves the task running instead of being retried; the job is already final in Galaxy, and the error line names the task. DRMAA's `stop_job` makes the same choice. A bounded retry would need state across stop-queue steps; not worth it before someone hits it.

**Tests.** `test/unit/app/jobs/test_pulsar_tes_task_checks.py`: the fake TES server now answers cancels (`cancel_status`, `cancel_body`), and the harness builds the real Pulsar client manager. New tests, all through the real `stop_job`, `fail_job` and `_update_job_state_for_status`:

- `test_stopping_a_job_cancels_its_tes_task` (control, passes before and after);
- `test_stopping_a_job_whose_task_already_ended_is_done` × 6 states, with TESK's 400;
- `test_stopping_a_job_whose_task_is_gone_is_done` (404);
- `test_failing_to_cancel_a_running_task_is_logged_not_raised` × 2 (state readable or not);
- `test_failing_a_job_whose_task_already_ended_fails_the_job`;
- `test_status_for_a_stopped_job_whose_task_already_ended_finishes_it`.

Before the fix the 11 new behaviour tests fail with `RequestResponseError` from the fake server's 400/401/404; after it all 33 in the file pass, as do `test_pulsar_runner.py` and `test_runner_pulsar.py` (84 total). Same on the v26.1.2 port (35 with its `-k pulsar` files). ruff, black, isort clean; mypy (`cd lib && mypy` on the changed files and the test) shows only the pre-existing `galaxy/managers/notification.py` error.

**Demo verification** on TESK (demo `runs/gaps/cancel-finished-task-tesk-fixed/`, Galaxy `tes_task_polling_v26.1.2` `7a916480a88`, polling check off so only this fix acted):

- WES cancel of a run whose TESK task was already `COMPLETE`: job `deleted` within a second, one `nothing to cancel` line, no retries. TESK still answers the cancel with 400.
- `failed` processed after the task ended: both jobs `error` at once; the `53f91f1` staging image's job carries the stage-out error in its stderr.

**Pulsar side.** A matching fix in Pulsar's `LaunchesTesContainersMixin.kill()` (`pulsar/client/tes.py`) is warranted but wasn't made: on a cancel error, `get_task(..., "BASIC")` and return quietly when the task is in a final state or 404. It would cover every Pulsar TES client user once Galaxy picks up a new pulsar-galaxy-lib. Two snags: pydantic-tes 0.4.0's `RequestResponseError` carries the HTTP status only through `__cause__`, and it can't parse `PREEMPTED` or `CANCELING`, so Pulsar would need the same workarounds as `fetch_tes_task_state` (or a pydantic-tes release first). Galaxy's override stays useful as the one place that also refuses to raise for non-final states.

**Not covered.** The v26.1.2 port's `get_client_from_state` builds the client with the Galaxy job id, so the `STOPPED`-status kill on v26.1.2 cancels the wrong id (dev fixed this with `external_id`); the new code then reads the right task's state, so it ends quietly for a finished task and logs an error for a running one. Pre-existing and demo only.
