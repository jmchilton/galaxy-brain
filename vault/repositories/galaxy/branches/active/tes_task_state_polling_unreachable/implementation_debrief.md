# Implementation debrief: tes_task_state_polling_unreachable

Written at hand-off by the stage 5 G1 agent of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md) (work order: `TESP_API_PLAN.md` section 4.3, G1).

- Branch `tes_task_state_polling_unreachable`: parent `tes_task_state_polling` (`e3c0cc44649`, base `dev` `61ec05da7b6`), head `f71ca18704d`, one commit.
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
