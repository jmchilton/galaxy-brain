# Implementation debrief: tes_task_state_polling_unreachable

Written at hand-off by the stage 5 G1 agent of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md) (work order: `TESP_API_PLAN.md` section 4.3, G1).

- Branch `tes_task_state_polling_unreachable`: parent `tes_task_state_polling` (`e3c0cc44649`, base `dev` `61ec05da7b6`), head `025f1256ec3`, three commits: `f71ca18704d` (stage 5, below), `bd710f3b8da` (stage 6 cancel retry, see [Stage 6: retry the cancel](#stage-6-retry-the-cancel)) and `025f1256ec3` (stage 6 SYSTEM_ERROR job info, see [Stage 6: SYSTEM_ERROR reason in the job info](#stage-6-system_error-reason-in-the-job-info)).
- Demo-only port, not for a PR: cherry-picked onto `tes_task_polling_v26.1.2` as `a1b53d59234` (fast-forward from `6baaaec7486`), merged into `wes_tes_demo_fixes_v26.1.2` as `3585089e925` (fast-forward from `9f5084721b6`, same "Demo only: merge" pattern as before). Both pushed to `jmchilton`.

## Problems

1. **Polling a dead TES server never ends.** The parent's checks log and retry every TES error forever. Stage 3's TESK jobs 85 and 86 were retried every 15 s throughout stage 4 after TESK was gone. The job stays `queued` or `running`, and so does any WES run waiting on it.
2. **tesp-api's single log is pinned on executor 0.** Upstream tesp-api runs all of a task's executors as one Pulsar job and stores one `ExecutorLog` for it. The parent reads log `i` as executor `i`'s, so every tesp-api failure said `Executor 0 (pulsar-submit) exited with code N`, even when the tool failed (stage 4 run `galaxy/07`; it was right there only by luck).

## Change

**Unreachable timeout** (`lib/galaxy/jobs/runners/pulsar.py`):

- New runner option `tes_unreachable_timeout`: default `3600` seconds, `0` retries forever. It sits in `PULSAR_TES_PARAM_SPECS` beside `tes_status_check_interval` and `tes_status_grace_period`, so only the TES runner accepts it. It is documented in the runner docstring and, commented out, in `job_conf.sample.yml`.
- `TesTaskWatch` gets `unreachable_since`. A check that finds the server unreachable starts the clock if it isn't running. Once it has run for the timeout, the runner re-checks `_waits_for_pulsar` and calls `fail_job`.
- Any check that gets an answer from the server resets the clock: a task state, a 404, a 4xx or a document that fails validation.
- New `tes_server_unreachable_reason()` in `lib/galaxy/jobs/runners/util/tes_task.py`. It counts as unreachable a `requests` `ConnectionError` (which covers connection refused or reset, DNS, SSL and proxy errors) or `Timeout`, and any 5xx answer (through the existing `http_status_code`). It returns a short name for the message: the exception class or `HTTP 503`.
- `job.info`: `Galaxy could not reach the TES server to check task <id> for 3600 seconds, and Pulsar never reported a final job status. Last error: ConnectionError.` This is about 180 characters with a 36-character task id, inside `Job.info`'s 255. No stderr is attached. The full redacted error stays in the per-check warning in the Galaxy log.
- `fail_job` keeps `stop_job` true, so it tries to cancel the task. The parent's `_kill_remote_job` never raises. If the server is back, the cancel stops an orphan task. If it isn't, the runner logs an ERROR saying the task may still be running.

**Single-log label** (`tes_task.py` `describe_tes_task_failure`):

- New `_logs_are_per_executor(task, executor_logs)`. The logs are treated as per executor unless there are more logs than executors, or exactly one log for several executors.
- When they aren't per executor, the summary says `The task exited with code N.` (or `The task reported no exit code.`), and the stderr heading is `Task stderr, last lines:`. Exit 0 says `exited with code 0`, not `ran last`.
- Both tesp-api shapes are handled. Upstream tesp-api has one log for the task. The fork's per-executor logs (`f4e5ce1`, "One ExecutorLog per executor", tesp-api issue #67) log the executors that ran, up to the one that failed. Funnel and TESK do the same.

## Decisions

- **4xx other than 404 keeps retrying.** A 400, 401 or 403 comes from a server that answered. It is almost always a configuration problem (rotated credentials, a proxy rule). The task may still be running and Pulsar may still report over AMQP, so failing every watched job would turn an admin mistake into lost jobs. A 404 for a task Galaxy created is already terminal in the parent: `TES_TASK_NOT_FOUND` fails the job after the grace period. That is unchanged.
- **A runner option, not a destination option.** This follows the parent's two options, which are runner-level only. The plan said "destination parameter". A per-destination override would need the parent's options moved too; not worth it now.
- **Default 3600 s, as the plan asked, with a known cost.** A TES API outage longer than the timeout fails jobs whose tasks may still be running fine. Funnel workers and tesp-api's outer Pulsar can keep running containers while the API is down. If such a task later finishes, Pulsar's `complete` arrives for a job already in `error`. That is the parent's open question "Late `complete` after a failure", now reachable this way too. Sites with long maintenance windows should raise the timeout or set 0. One hour is long enough for restarts and short outages, and short enough that a server that is really gone doesn't hold jobs for days.
- **One log for several executors is never attributed, even when it is executor 0's.** Funnel and TESK log only the executors that ran, so a staging failure at executor 0 there also yields one log. It looks exactly like tesp-api's whole-task log. The plan's rule (`len(logs) != len(executors)`) would also drop the name for Funnel's prefix logs (two logs for three executors, executor 1 failing), which are unambiguous. So the rule here is narrower: only the single-log case loses the name. It is a real loss for Funnel and TESK staging failures: `Executor 0 (pulsar-submit) exited with code 1` becomes `The task exited with code 1`, and the parent's first test changed accordingly. The stderr tail is still attached either way. Telling the two apart would need server-specific heuristics, such as tesp-api's `set -x` trace in stderr or the TES service-info name. Not done; see Open questions.
- **No change to the existing 0-disables convention.** As with `tes_status_check_interval`, `0` turns the behaviour off, here meaning "retry forever".

## Testing

All in `test/unit/app/jobs/test_pulsar_tes_task_checks.py`, through the real runner, `fail_job`, pydantic-tes and the fake TES HTTP server with the patched clock.

New tests:

- `test_unreachable_tes_server_fails_the_job_after_the_timeout` × 3. The server is stopped (connection refused), or answers 500 or 503. No failure at interval + timeout − 1 s; failure at the next check, with the exact message, under 255 characters, and the watch dropped.
- `test_unreachable_tes_server_fails_the_job_after_an_hour_by_default` (runner default).
- `test_reaching_the_tes_server_again_restarts_the_unreachable_clock`: 502s for just under the timeout, one good check, then 502s for a full timeout before the job fails.
- `test_tes_server_refusing_the_check_never_fails_the_job` × 400, 401, 403, watched for 3 × the timeout.
- `test_unreachable_timeout_of_zero_retries_forever`.
- `test_one_log_for_all_executors_is_not_attributed_to_one` × EXECUTOR_ERROR exit 125, COMPLETE exit 0, SYSTEM_ERROR with no exit code. Three executors and one log; asserts that neither "Executor" nor "pulsar-submit" is in the message, and the `Task stderr` heading.
- `test_logs_of_the_executors_that_ran_are_attributed_to_them`: two logs for three executors, executor 1 exits 2, still named.
- Option tests extended: the default 3600, parsing, and `-1` rejected.

Changed tests:

- `test_tes_server_errors_never_fail_the_job` is renamed `..._before_the_unreachable_timeout_do_not_fail_the_job`, unchanged otherwise: 780 s of errors stays under the default hour.
- `test_task_dying_before_pulsar_reports_fails_the_job` now expects `The task exited with code 1.` and the `Task stderr` heading, with a comment saying why (see Decisions).

**Fail before** (tests written first, against `e3c0cc44649`'s code): 7 failed, 7 errors, 32 passed.

- Failed: the 3 single-log cases (message named `Executor 0 (pulsar-submit)`), the default-hour test and the zero-timeout test (no failure, or unknown option), and the two option tests.
- Errors: the 7 tests using a 600 s timeout harness, because the parent rejects the unknown `tes_unreachable_timeout` option when building the runner.

**Pass after:** 46 passed.

**Mutation check:** dropping the reset of `unreachable_since` after a good check fails `test_reaching_the_tes_server_again_restarts_the_unreachable_clock`.

Neighbouring files (`test_pulsar_runner.py`, `test_runner_pulsar.py`, `test_runner_finishing_state.py`, `test_runner_default_destination_params.py`) plus this one: 117 passed.

```sh
cd ~/projects/worktrees/galaxy/branch/tes_task_state_polling_unreachable
.venv/bin/python -m pytest -q -p no:cacheprovider -p no:postgresql test/unit/app/jobs/test_pulsar_tes_task_checks.py
```

The venv is new: `uv venv .venv --python 3.12`, then `uv pip install -r lib/galaxy/dependencies/pinned-requirements.txt -r lib/galaxy/dependencies/dev-requirements.txt`. `-p no:postgresql` is needed because there is no libpq.

**Lint and types:** black, isort, ruff and flake8 are clean on the three changed Python files. mypy (`cd lib && mypy` on them, run with the parent worktree's typecheck-equipped venv) reports only the pre-existing `galaxy/managers/notification.py` error.

**Demo port:** in `tes_task_polling_v26.1.2` (pulsar-galaxy-lib 0.15.15, the venv the demo worktree symlinks to), the cherry-pick applied cleanly with no import changes. 46 passed in the module, and all 50 tests selected by `-k pulsar` in `test/unit/app/jobs/` passed. The demo merge `3585089e925` was made with `git merge-tree`/`commit-tree`, without touching the running demo checkout. Its four touched files are byte-identical to `a1b53d59234`'s, and it differs from `a1b53d59234` only in WES files.

**Fork CI** on `f71ca18704d`: queued at hand-off.

No Galaxy server, TES server or demo run was used. The live check is left to the stage 5 acceptance agent (below).

## Live check for the acceptance agent

1. Use the new demo commit. The demo worktree was left detached at `9f5084721b6` because a Galaxy was running from it: `git -C ~/projects/worktrees/galaxy/branch/wes_tes_demo_fixes_v26.1.2 checkout --detach 3585089e925` (or check out the `wes_tes_demo_fixes_v26.1.2` branch).
2. The parameter is `tes_unreachable_timeout`, a runner parameter of the `pulsar_tes` runner (the `pulsar_tesp` environment uses that runner). Only `config/galaxy/job_conf_gaps.yml.in` has the `${GAP_TES_RUNNER_EXTRA}` hook; plain `job_conf.yml.in` doesn't, and would use the 3600 s default. `scripts/gaps/galaxy-restart.sh polling` overwrites `GAP_TES_RUNNER_EXTRA`, so start Galaxy by hand from the demo repo:

   ```sh
   cd ~/projects/repositories/galaxy-wes-tes
   export TES=tesp JOB_CONF_TEMPLATE=config/galaxy/job_conf_gaps.yml.in GAP_TES_CONCURRENCY=2
   export GALAXY_ROOT_OVERRIDE=$HOME/projects/worktrees/galaxy/branch/wes_tes_demo_fixes_v26.1.2
   export GAP_TES_RUNNER_EXTRA=$'    tes_status_check_interval: 15\n    tes_status_grace_period: 30\n    tes_unreachable_timeout: 60'
   scripts/galaxy-down.sh && scripts/galaxy-up.sh
   grep -n tes_unreachable_timeout var/galaxy/job_conf.yml   # expect it under both TES runners
   ```

3. Submit a job that stays queued or running for minutes, for example `gap_discover` with a long sleep (stage 4 run `galaxy/04` shows the `submit-watch.sh` command). Then `docker stop wes-tes-tesp-api` and leave it stopped for at least 2 minutes. If the job's Pulsar reports `complete` before the timeout, the job ends `ok` and the check proves nothing, so keep the tool running longer than about 90 s.
4. Expect the job in `error` 60 s after the first failed check, which comes at most 15 s after the stop: so 60 to 75 s after the stop. `job.info` should read `Galaxy could not reach the TES server to check task <tesp task id> for 60 seconds, and Pulsar never reported a final job status. Last error: ConnectionError.` The Galaxy log should show `Could not check TES task state, will retry` warnings every 15 s, then an ERROR `Failed to cancel TES task and could not read its state, so it may still be running`.
5. Then `docker start wes-tes-tesp-api`. The task may still be in tesp-api or the outer Pulsar; record its state and whether its containers are left behind.

## Open questions

- **Hung servers aren't covered.** pydantic-tes sets no HTTP timeout, so a server that accepts connections but never answers blocks the monitor thread before this code runs. Only refused connections, resets and 5xx count. This is the parent's open question, unchanged.
- **Healthy tasks during long TES outages** can be failed (see Decisions). An alternative is to fail only when the job never reached `running`. It would miss tasks that died mid-run while the server was down.
- **Telling tesp-api's whole-task log from an executor 0 log** would restore `pulsar-submit` in Funnel and TESK staging-failure messages. Options: check the TES `service-info` name once per destination, or treat the log as per executor when its `start_time`/`end_time` match the task's first executor only. Neither is done.
- The plan's "destination parameter" wording versus the runner option chosen here.

## Stage 6: retry the cancel

Added by the stage 6 H2a agent (hardening the Galaxy WES → tesp-api line, documented in the [wes_tesp_api project](../../../../../projects/wes_tesp_api/index.md)). Commit `bd710f3b8da` "Retry cancelling a TES task while its server is unreachable", on `f71ca18704d`.

### Problem

Stage 5 acceptance item 8 (`~/projects/repositories/galaxy-wes-tes/runs/tesp-acceptance/2026-11-15/08-g1-unreachable-fixes/`): with `tes_unreachable_timeout: 60`, tesp-api stopped for 152 s. Galaxy failed job 168 61.9 s after the stop. `fail_job` stops the job first, so Galaxy sent the TES cancel once, to the stopped server, and logged `Failed to cancel TES task and could not read its state, so it may still be running`. Nothing retried it. After `docker start`, tesp-api's restart recovery resumed waiting for the outer Pulsar job, the tool finished, and the task went COMPLETE. Its `pulsar-finish` got 403 on every upload and still published `complete` (see [Why pulsar-finish said complete](#why-pulsar-finish-said-complete)). Galaxy kept the job in `error`, but the task used its slot to the end.

### Change

`lib/galaxy/jobs/runners/pulsar.py`, `PulsarTesJobRunner` only:

- `_kill_remote_job` sends one cancel. If it fails with a connection error, a timeout or a 5xx (`tes_server_unreachable_reason`, from stage 5), the runner records a `PendingTesCancel` (task id, job id tag, destination params, TES URL, deadline, next attempt, delay) in `_pending_tes_cancels`, under a lock, logs a WARNING (`Could not reach the TES server to cancel the task, retrying for up to N seconds`) and returns. It skips the state read in that case: the server can't answer it either, and it would make the calling thread wait for a second request.
- The shared cancel logic is now `_cancel_tes_task`. It returns the unreachable error when a retry is due, else `None`: cancelled, nothing to cancel (ended, CANCELING, or 404), or a refusal from a server that answered (400, 401, 403 for a running task), which is logged as before and not retried.
- `check_watched_items` runs `_retry_tes_cancels` after the task checks, on the monitor thread. A due cancel goes through `_cancel_tes_task` with a fresh pydantic-tes client (`cancel_task(task_id)`, what `client.kill()` does). Backoff: first retry 10 s after the first attempt, then doubling to at most 120 s apart (`TES_CANCEL_RETRY_FIRST_DELAY`, `TES_CANCEL_RETRY_MAX_DELAY`). The last attempt is clamped to the deadline. Success logs INFO `Cancelled TES task on attempt N`; giving up logs ERROR `Gave up cancelling TES task after N attempts over S seconds ... the task may still be running`.
- A sweep asks each unreachable TES server once. Other due cancels for the same `tes_url` are deferred to their next backoff without a request. pydantic-tes has no request timeout, so each request to a black-holed host can wait for the OS connect timeout (about 2 minutes on Linux); without this, N pending cancels would hold the monitor thread N times as long.
- New runner option `tes_cancel_retry_timeout` in `PULSAR_TES_PARAM_SPECS`, default 86400 s, `0` tries once (the stage 5 behaviour, including the state read). Documented in the class docstring and, commented out, in `job_conf.sample.yml`.
- `poll` is now `tes_status_check_interval > 0 or tes_cancel_retry_timeout > 0`, because the monitor thread does the retries. With `tes_status_check_interval: 0`, `check_watched_item` drops watched jobs at once, so the task checks stay off.
- `shutdown` logs a WARNING naming every pending cancel (`job <id>: task <id> at <TES URL>`), so an admin can cancel those tasks by hand.
- A second stop of the same job while its cancel is pending sends one more cancel; if it succeeds the pending entry is dropped, if it fails the existing schedule is kept.

### Decisions

- **A configurable cap, default one day.** The cap bounds memory and log noise for a TES server that is gone for good (decommissioned, moved). The retries themselves are cheap: at the 120 s ceiling a day is about 720 requests per task, and a sweep sends at most one per unreachable server. One day covers restarts, upgrades and weekend outages. A task whose server is down longer than that has usually lost its state anyway. The backoff constants are not options: 10 s catches a quick restart, and 120 s keeps the cancel within two minutes of the server's return while staying far below the task checks' default 60 s per job.
- **`0` means "try once", unlike `tes_unreachable_timeout`'s `0` = "forever".** For a background retry "forever" is never what an admin wants, and "off" is the useful escape hatch. The sample config says so next to each option.
- **No recovery across a Galaxy restart.** Pending cancels are in memory, and the failed job is final (`error` or `deleted`), so `recover()` never sees it again. Persisting them would need a new table or an abused job column (for example a marker in `job.info` or the destination params) plus a startup scan of final jobs. The window is small: the TES server has to stay unreachable past `tes_unreachable_timeout`, and Galaxy has to restart before the server returns. The cost of missing it is bounded: the orphan task runs to the end, its uploads get 403 from Galaxy (`job_files.py` refuses jobs that are not in a non-ready state), and nothing in Galaxy changes. Shutdown names the tasks, so they can be cancelled by hand. Not worth a schema change now; revisit if Galaxy ever grows a generic "external cleanup owed" record.
- **The stop path stays non-blocking and never raises.** The thread that stops a job (stop queue, a worker running `fail_job`, the message-queue thread for a stopped job) sends exactly one request and returns. Stage 3's fix (no exception escapes `_kill_remote_job`, so the stop queue doesn't roll back and retry every second) is kept, and covered by the existing `test_stopping_a_job_whose_task_already_ended_is_done` and `test_failing_a_job_whose_task_already_ended_fails_the_job`.
- **Refusals aren't retried.** A 400, 401 or 403 to the cancel comes from a server that answered; retrying would get the same answer. A TESK 400 for an ended task is still resolved by the state read (`nothing to cancel`).

### Testing

All in `test/unit/app/jobs/test_pulsar_tes_task_checks.py`, through the real runner, `stop_job`/`fail_job`, pydantic-tes and the fake TES HTTP server with the patched clock. The fake server can now be stopped and started on the same port, answers 5xx to cancels when told to, and marks a task CANCELED on a successful cancel. `Harness.monitor_for(seconds)` runs the monitor's `check_watched_items` every simulated second and returns when cancel requests arrived.

New tests:

- `test_cancel_failing_on_an_unreachable_server_is_retried_until_it_answers` × connection refused, 503: one request on the stop thread, a WARNING and no ERROR, retries at 10, 30, 70 s; once the server is back the task is CANCELED within 120 s and INFO `Cancelled TES task on attempt N` is logged.
- `test_cancel_retries_back_off_to_two_minutes_apart`: retries at exactly 10, 30, 70, 150, 270, 390, 510 s, and no state reads.
- `test_cancel_retry_stops_once_the_task_has_ended_or_is_gone` × COMPLETE, CANCELED, deleted (404): one more cancel, one state read, `nothing to cancel`, then nothing.
- `test_cancel_retry_gives_up_after_tes_cancel_retry_timeout` (300 s): last attempt at the deadline, ERROR after 7 attempts with `HTTP 503`, then nothing.
- `test_cancel_retry_timeout_of_zero_tries_the_cancel_once`: the stage 5 behaviour.
- `test_pending_cancels_on_one_unreachable_server_cost_one_request_per_sweep`: two jobs, one request per sweep while unreachable, both CANCELED once back.
- `test_stopping_a_job_again_while_its_cancel_is_retried_keeps_one_retry` and `test_cancel_succeeding_on_a_later_stop_ends_the_retries`.
- `test_job_failed_for_an_unreachable_server_has_its_task_cancelled_once_the_server_is_back`: item 8 end to end. The server is stopped, the job fails after the unreachable timeout, the server stays down 300 s more, comes back, and the task is CANCELED within 120 s.
- `test_shutdown_names_the_tasks_whose_cancel_is_still_pending`.
- `test_cancel_retries_run_with_the_task_checks_off`: `tes_status_check_interval: 0` still polls (for retries) but never reads watched tasks.
- Changed: `test_failing_to_cancel_a_running_task_is_logged_not_raised` now also asserts that a refused cancel (401) is not retried; the option tests cover `tes_cancel_retry_timeout` (default, parse, `-1` rejected) and `poll` being off only when both options are 0.

**Fail before** (tests written first, run against `f71ca18704d`'s runner): 16 failed, 44 passed (`runs/stage6/h2a-cancel-retry/unit-before-fix.txt` in the demo repo). **Pass after:** 60 passed (`unit-after-fix.txt`). With the neighbouring `test_pulsar_runner.py`, `test_runner_pulsar.py`, `test_runner_finishing_state.py` and `test_runner_default_destination_params.py`: 131 passed (`unit-after-fix-neighbours.txt`).

**Mutation checks:** dropping the per-server deferral fails `..._cost_one_request_per_sweep`; dropping the clamp to the deadline fails `..._gives_up_after_tes_cancel_retry_timeout`.

**Lint and types:** isort and black applied; ruff 0.17.3 and flake8 7.4.1 (the pinned lint versions, via `uvx`) clean on `pulsar.py` and the test module; mypy (parent worktree's typecheck venv, `cd lib && mypy galaxy/jobs/runners/pulsar.py ../test/unit/app/jobs/test_pulsar_tes_task_checks.py`) reports only the pre-existing `galaxy/managers/notification.py` error.

**Demo ports** (pulsar-galaxy-lib 0.15.15 venv): cherry-picked cleanly as `031b96fe16a` on `tes_task_polling_v26.1.2` (in its worktree) and `8b3166c80fb` on `wes_tes_demo_fixes_v26.1.2` (in a temporary scratch worktree, removed afterwards; the detached demo worktree was not moved). Each: 60 passed in the module, 64 passed for `-k pulsar` in `test/unit/app/jobs/`. All three branches pushed to `jmchilton`.

### Live check (not run yet)

`scripts/tesp/acceptance/unreachable-cancel.sh` in the demo repo (commit `6f50454`). On a running `make up TES=tesp` stack whose Galaxy runs from a checkout with this commit (`wes_tes_demo_fixes_v26.1.2` at `8b3166c80fb`) on the gap-test job conf with `tes_status_check_interval` and `tes_unreachable_timeout`:

```sh
cd ~/projects/repositories/galaxy-wes-tes
git -C ~/projects/worktrees/galaxy/branch/wes_tes_demo_fixes_v26.1.2 checkout --detach 8b3166c80fb
export TES=tesp JOB_CONF_TEMPLATE=config/galaxy/job_conf_gaps.yml.in GAP_TES_CONCURRENCY=2
export GALAXY_ROOT_OVERRIDE=$HOME/projects/worktrees/galaxy/branch/wes_tes_demo_fixes_v26.1.2
export GAP_TES_RUNNER_EXTRA=$'    tes_status_check_interval: 15\n    tes_status_grace_period: 30\n    tes_unreachable_timeout: 60'
make up TES=tesp            # or, with the stack up: scripts/galaxy-down.sh && scripts/galaxy-up.sh
scripts/tesp/acceptance/unreachable-cancel.sh --out runs/stage6/h2a-cancel-retry/live
```

It submits `gap_discover 480`, stops tesp-api 5 s after the tool container starts, requires the job `error`, keeps tesp-api down 30 s more, starts it, and PASSes only when the task is CANCELED within 180 s of tesp-api answering, no `tesp-api.task=<id>` container or `vol-<id>-*` volume is left within 60 s, and `pulsar-finish` did not start (or started without Galaxy taking a `complete`). Result: `unreachable-cancel.json` (status, reason, epochs and durations). Exit 0 PASS, 1 FAIL, 2 refused, 77 SKIP. `make acceptance`'s `unreachable` scenario also calls it as its follow-up hook (`<dir> <task> <job>`), so on that path a Galaxy without this commit makes the scenario FAIL.

### Why pulsar-finish said complete

Not a bug in `coexecution_stage_out_failures` (`20b6460`), and not small to change, so not fixed:

- Galaxy refuses every job-files request for a job that has left the non-ready states: `lib/galaxy/webapps/galaxy/api/job_files.py`, `__authorize_job_access` (line 211 on v26.1.2), raises `ItemAccessibilityException` ("Attempting to read or modify the files of a job that has already completed."), which is HTTP 403. Job 168 was `error`, so all 13 uploads got 403.
- Pulsar treats a 403 on any output collection as an allowed failure: `pulsar/client/staging/down.py`, `ResultsCollector._collect_output` (lines 239–257 at `20b6460`) logs `Galaxy refused output ... (HTTP 403); not failing the job` and returns `False` without recording an exception. This is upstream master `8bff105` (mvdbeek, 2026-05-27, "Don't fail jobs when Galaxy refuses an output upload (HTTP 403)"), meant for outputs purged while the job ran.
- So `__collect_outputs` (`pulsar/managers/staging/post.py`) sees no collection failures, `postprocess` doesn't raise `OutputStagingError`, and the stateful manager publishes the terminal status unchanged: `complete`.
- Telling "this output was purged" from "the whole job is over" would mean, for example, failing (or reporting `lost`) when every upload is refused, or reading Galaxy's error message. That is a design change to a deliberate upstream rule, for a status Galaxy then ignores because the job is already final. With the cancel retry the task no longer reaches `pulsar-finish` in this scenario. Left for John.

### Open questions (stage 6)

- **Hung servers** still block: pydantic-tes sets no request timeout, so one request to a server that accepts connections but never answers holds the monitor thread (task checks and cancel retries) or the stopping thread indefinitely. The per-server deferral limits the damage to one request per sweep, not zero. A timeout belongs in pydantic-tes (`requests` calls in `pydantictes/api.py`).
- **Restart recovery** of pending cancels is not done (see Decisions).

## Stage 6: SYSTEM_ERROR reason in the job info

Commit `025f1256ec3` "Name the TES server's reason for a SYSTEM_ERROR task in the job info", on `bd710f3b8da`, asked for by the stage 6 coordinator after the argv agent (H5) found it.

### Problem

Funnel ends a task in SYSTEM_ERROR when it can't start an executor or a download or upload fails, and records exit code 0 for executor 0 anyway. The argv run (`runs/stage6/argv/tes-level/funnel/galaxy.json` in the demo repo, task `d08e39e6-…`) got job info `... ended in state SYSTEM_ERROR before Pulsar reported a final job status. The task exited with code 0.`; the reason, `fork/exec /usr/bin/docker: argument list too long`, was only in `logs[].system_logs`, which Galaxy logs for admins. The design B probes show the same for a failed download (no executor log, empty summary) and a refused upload (exit 0).

### What the three servers give for SYSTEM_ERROR

- **Funnel 0.12.3:** logfmt lines, one per entry. Several `level='error'` lines; the last is `msg='System error' ... error='<reason>'`. Executor 0 has exit code 0 even when it never started. Seen in the argv and design B evidence.
- **tesp-api with patch 0011:** one entry per failure, `stage_failure_log`: a reason line (`stage-in failed (exit code 22): downloading the inputs failed`, `stage-out failed ...`, or `the job did not start: Pulsar or the batch system refused it ...`), then the tail of the job's stderr. No executor log for stage-in and submission failures, exit 0 for stage-out. Taken from the patch and its tests; design A tasks have no TES inputs or outputs, so only the submission case is likely there. The argv case on tesp-api is an EXECUTOR_ERROR (exit 126) and is unchanged.
- **TESK (taskmaster 0.11.0):** the whole taskmaster pod log as one entry (`TesServiceImpl.java`, `addSystemLogsItem(taskMasterPodLog)`), lines `%(asctime)s %(levelname)s: %(message)s` (`tesk_core/Util.py`). A job that doesn't complete ends with `ERROR: Cancelling taskmaster: Got status Failed` (`exit_cancelled`). Taken from the source in `vendor/tesk-core` and `vendor/tesk-api`; no SYSTEM_ERROR task was observed on TESK in this project.

### Change

`lib/galaxy/jobs/runners/util/tes_task.py`, `describe_tes_task_failure`, SYSTEM_ERROR only:

- The summary becomes `System log: <reason>`. The reason is the last error line of the system logs, searched from the last entry back: a Funnel logfmt line with `level='error'` gives its `error='...'` (else its `msg`); a line with a level name gives the text after `ERROR:` (TESK); a line without a level counts as an error when it says fail, error, refused, denied, too long, not found, exception, cannot or unable (tesp-api). When the entry's first line is such an unlabelled error and isn't the chosen line, it goes in front (`stage-in failed (exit code 22): downloading the inputs failed: curl: (22) ...`).
- The text is redacted first (the same `redact` as the stderr excerpt: known secrets, Pulsar executor arguments, URL user info, key/password assignments, mixed-case base64), whitespace is collapsed, and the summary is cut to 130 characters with `...`, which keeps Job.info under 255 with a 36-character Funnel task id.
- An executor that really failed (non-zero exit code) keeps its part in front: `Executor 1 exited with code 2. System log: ...`. An exit code 0 is never reported for SYSTEM_ERROR. Without a reason in the system logs, an exit code 0 becomes `No executor reported a failure.`; no exit code keeps `reported no exit code`.
- The stderr details and the admin-only system log tail in the Galaxy log are unchanged. Other states are unchanged.

### Decision

Committed on this branch, not on the parent `tes_task_state_polling` where `describe_tes_task_failure` was added: this branch already changed the function (single-log label), the change builds on that, and it avoids rewriting and force-pushing the parent and child.

### Testing

New tests in `test/unit/app/jobs/test_pulsar_tes_task_checks.py`, through the runner and the fake TES server:

- `test_system_error_names_the_system_log_reason` × funnel-argv (the argv task's six system log lines, sanitized: paths, ids and the long docker command shortened, base64 replaced by the test's fixtures), funnel-download (design B t8), tesp-api-stage-in (patch 0011 format), tesk (taskmaster format): exact job info, no exit code, under 255 characters.
- `test_system_error_reason_is_cut_to_fit_job_info`: tesp-api's long submission reason with a 36-character task id ends in `...` within 255.
- `test_system_error_keeps_a_failing_executors_exit_code_and_redacts_the_reason`: executor 1 exit 2 stays in front; an AMQP password in the reason is `[redacted]`.
- `test_system_error_without_a_reason_claims_no_exit_code`.

**Fail before:** 7 failed, 60 passed (`runs/stage6/h2a-cancel-retry/system-error-unit-before-fix.txt` in the demo repo). **Pass after:** 67 passed; with the four neighbouring runner test files 138 passed. **Real tasks:** `system_error_real_tasks_view.py` runs the function on the recorded tasks: before, `The task exited with code 0.` (argv Funnel, t9) and `''` (t8); after, `System log: fork/exec /usr/bin/docker: argument list too long`, `System log: httpStorage: GET request returned status code: 404`, `System log: httpStorage: PUT request returned status code: 403: ok` (`system-error-real-tasks-{before,after}.txt`). **Mutation check:** dropping the failing executor's prefix fails the exit-code test. **Lint:** isort, black, ruff 0.17.3 (implicit concatenations parenthesized) and flake8 7.4.1 clean; mypy only the pre-existing `notification.py` error.

**Demo ports:** `1f7cae33d5f` on `tes_task_polling_v26.1.2` and `b317bc12545` on `wes_tes_demo_fixes_v26.1.2` (scratch worktree, removed; the detached demo worktree at `8b3166c80fb` untouched). 67 passed in the module on each, 71 for `-k pulsar` in `test/unit/app/jobs/`. All pushed to `jmchilton`.

