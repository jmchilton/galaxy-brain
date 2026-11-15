Run via Claude Opus 5.5 at high effort.

# Test challenges debrief: tes_task_state_polling_unreachable

I challenged the tests this branch adds or changes in `test/unit/app/jobs/test_pulsar_tes_task_checks.py` (`git diff fdb30869fa8..dc32408c885`) and acted in place, in one commit, `f2e6a7a263f` "Tighten the TES unreachable and cancel retry tests" (not pushed). I merged five tests into others and changed no runner code. The file goes from 75 to 74 tests, and the three Pulsar runner suites together from 126 to 125. All 25 of the branch's tests fail on the parent's runner. Twenty fail at their own assertion; the five config-option tests fail because the option doesn't exist yet.

Not acted on:

- **Integration, API or E2E tests:** not feasible here, and there's no UI. The reasons are the parent's: an AMQP broker plus a TES server that accepts Pulsar's submission.
- **Untested guard:** the `_waits_for_pulsar` re-check in `_check_tes_server_unreachable` only matters if Pulsar reports during the HTTP request. A mutation removing it survives, and testing it would need a hook into the fake server.
- **Renamed parent test:** `test_tes_server_errors_before_the_unreachable_timeout_do_not_fail_the_job` is now covered by the first half of `test_unreachable_tes_server_fails_the_job_after_the_timeout`. I left it because it exists at `fdb30869fa8` (see the parent findings).
- **Retry scheduler stays in the runner:** I didn't extract `_retry_tes_cancels` into a standalone class. The tests drive it through `stop_job` and the monitor sweep against a real HTTP fake with the patched clock, and they read fine.
- **The shutdown test** still pokes `_init_noop_monitor()`, `work_threads` and `monitor_thread_join_timeout` to make `shutdown()` runnable on a runner that was never started. I kept it inline because only one test uses it.
- **Dead code:** the `except Exception` in `_retry_tes_cancels` can't be reached, since `_cancel_tes_task` never raises. This is a code note, not a test gap.

<details>
<summary>Details</summary>

## Acted on

- **Fail at their own assertion, not on a missing option.** Several behaviour tests used an `unreachable_harness` fixture with `tes_unreachable_timeout=600`. On the parent's runner they errored with "Invalid job runner parameter" instead of reaching their assertions. They now run on the default 3600 s timeout. Each check is one request per 60-second interval, so this costs only a few hundred milliseconds. I removed the fixture.
  - `test_unreachable_tes_server_fails_the_job_after_the_timeout` (connection refused, 500, 503) now asserts the 3600-second message. It absorbs `test_unreachable_tes_server_fails_the_job_after_an_hour_by_default`, which only repeated it with looser assertions.
  - `test_job_failed_for_an_unreachable_server_has_its_task_cancelled_once_the_server_is_back` now runs on the default timeout. Its "Stage 5 acceptance item 8" comment referred to the agent process, so it now describes the scenario: tesp-api resumes held tasks when it comes back.
  - The configured value keeps one behaviour test, the new `test_unreachable_timeout_is_configurable` (600 s, server stopped, fails at 600). Like the 0 test, it is an option test.
- **4xx folded into the clock restart.** `test_tes_server_refusing_the_check_never_fails_the_job[400,401,403]` passed on the parent, where nothing ever failed, and errored only because of the option. It is now a case of `test_tes_server_answering_again_restarts_the_unreachable_clock[None,400,401,403]`. The test goes 502 for just under the timeout, then gives one answer (a normal 200 or a refusal), then 502 again. It asserts that the clock restarted. A refusal is an answer, so if 4xx counted as unreachable, the job would fail during the refusal. The test covers the classification and the reset on the refusal path, and fails on the parent at its last assertion.
- **Checks-off tests merged.** `test_final_status_with_the_task_checks_off_adds_no_watch` passed on the parent. It guards a leak that only the branch's `poll` change could introduce. It is folded into `test_task_checks_off_leave_the_tasks_alone_but_still_retry_cancels` (renamed from `test_cancel_retries_run_with_the_task_checks_off`), which fails on the parent at `assert harness.runner.poll`. That test keeps its `_tes_task_watches == {}` assertion, because nothing public shows the leak.
- **Duplicate helper.** `_make_unreachable` (`error_status` only) and `_take_down`/`_bring_back` did the same job. One pair now sits above the unreachable tests. Setting `cancel_status` too is harmless there: `fail_job`'s cancel just becomes a pending retry.
- **Conditional branch dropped.** I removed the `if how == 503:` block in `test_cancel_failing_on_an_unreachable_server_is_retried_until_it_answers`. `test_cancel_retries_back_off_to_two_minutes_apart` already pins the schedule and that only POSTs are sent while the server is down.
- **Private-state assertion dropped.** I removed `harness.runner._tes_task_watches == {}` from the parametrized unreachable test, because `assert not harness.watch_for(...)` already shows that the watch was dropped (as in the parent's debrief).

## Kept as is

- Cancel retry tests: retried until it answers (×2), back-off schedule, stops once the task ended or is gone (×3), gives up at `tes_cancel_retry_timeout`, 0 tries once, one request per unreachable server per sweep, a second stop keeps one retry, a later successful stop ends the retries, the shutdown warning.
- Added assertions in the parent's `test_failing_to_cancel_a_running_task_is_logged_not_raised` (a 401 cancel isn't retried). They are a guard that passes on the parent, attached to an existing test.
- Option tests (`test_tes_checks_are_on_by_default`, `test_tes_checks_are_configurable`, `test_unreachable_timeout_of_zero_retries_forever`, `test_cancel_retry_timeout_of_zero_tries_the_cancel_once`, `test_cancel_retry_gives_up_after_tes_cancel_retry_timeout`, `test_unreachable_timeout_is_configurable`). As in the parent, the option is the API under test.
- No mocks to replace: the branch's tests use the parent's dataclass fakes, the real HTTP fake TES server, and the patched `monotonic` clock. `FakeTesServer.start()` (restart on the same port) is a small fake extension, not a mock.

## Parent findings

- `test_tes_server_errors_before_the_unreachable_timeout_do_not_fail_the_job` (the parent's `test_tes_server_errors_never_fail_the_job`, renamed by this branch) now overlaps the first half of `test_unreachable_tes_server_fails_the_job_after_the_timeout`. Its one extra assertion, that errors never trigger a FULL view, could move into that test and the renamed test be dropped. I left it alone because of the no-parent-changes rule. Restoring the parent's name and body isn't an option either, since "never fail" is no longer true.

## Verification

```sh
cd ~/projects/worktrees/galaxy/branch/tes_task_state_polling_unreachable
PYTHONPATH=lib .venv/bin/python -m pytest -q -p no:cacheprovider -p no:postgresql \
  test/unit/app/jobs/test_pulsar_tes_task_checks.py test/unit/app/jobs/test_pulsar_runner.py test/unit/app/jobs/test_runner_pulsar.py
```

- **Before (`dc32408c885`):** 75 in the TES file, 126 with the neighbours.
- **After (`f2e6a7a263f`):** 74 and 125 passed.
- **New tests against the parent's runner.** I checked out `pulsar.py` and `util/tes_task.py` from `fdb30869fa8` and kept the new tests: 25 failed and 49 passed (the parent's own tests). Of the 25:
  - 20 fail at their own assertions: `assert not True` (no failure at the timeout), `assert [] == [10]` / `[5, 25]` / the back-off schedule (no retries), an ERROR logged where none is expected, `['POST', 'BASIC', 'POST'] == ['POST', 'POST']`, `4 == 2` requests, the shutdown message's `ValueError` unpacking an empty list, `assert harness.runner.poll`.
  - 5 option tests fail on "Invalid job runner parameter" or the missing attribute.
- **Mutations of the branch's code.** Each mutation is caught except the race-only guard:

  | Mutation | Caught by |
  |---|---|
  | 4xx counts as unreachable | `answering_again[400,401,403]`, `cancel_retry_stops_once…` ×3, and the parent's cancel tests |
  | no clock reset on a 200 | `answering_again[None]` |
  | no clock reset on a refusal | `answering_again[400,401,403]` |
  | status watch gated on `poll` | `task_checks_off…` |
  | `poll` ignores the cancel retry | `task_checks_off…` |
  | checks run with interval 0 | `task_checks_off…` |
  | no per-server dedupe | `one_request_per_sweep` |
  | second stop adds a retry | `keeps_one_retry` |
  | success on a later stop keeps the retry | `later_stop_ends_the_retries` |
  | last attempt not clamped to the deadline | `gives_up_after…` |
  | no doubling, no 120 s cap | `back_off…`, `gives_up_after…` (+ `keeps_one_retry`) |
  | retry reads state from an unreachable server | 13 cancel retry tests |
  | no shutdown warning | `shutdown_names…` |
  | timeout 0 not special | `zero_retries_forever` |
  | unreachable failure ignores `_waits_for_pulsar` | survives (race only) |

- **Lint:** black and isort are clean. Ruff and flake8 aren't installed in the worktree's `.venv` or on PATH.

</details>
