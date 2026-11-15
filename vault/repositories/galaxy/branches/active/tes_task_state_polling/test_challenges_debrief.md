Run via Claude Opus 5.5 at high effort.

# Test challenges debrief: tes_task_state_polling

Challenged the 33 tests in `test/unit/app/jobs/test_pulsar_tes_task_checks.py` on `af12aa04327` (base `origin/release_26.2`) and acted in place. There are now 31 tests, and all but one fail on the base runner at their own assertion or with the bug's own exception. The exception is the `redact()` test, which can only fail with an ImportError because the helper is new. Two commits, both on top of `af12aa04327` and not pushed:

- `7f7ac03572e` Tighten the TES task check tests
- `cc17a5b47c1` Keep Pulsar's report on the TES task watch (small runner refactor)

## Acted on

- **Fail-before at the test's own assertion.** With the base `pulsar.py` (helper module kept) 17 checks failed only because `FakeJobWrapper` lacked `guest_ports`, which the base runner reads and real wrappers always have. One more errored because the harness passed the new options. Now the fake has `guest_ports = []`, and the harness builds the runner from the defaults; `INTERVAL` and `GRACE` are the defaults, which `test_tes_checks_are_on_by_default` pins.
- **Tests that passed before the change.** The base runner stops watching MQ jobs that have no entry points straight away. So "returns None, no TES request" passed trivially for the resubmitted and other-handler cases. They now start from a watch that has already made one BASIC check, then resubmit or reassign the job, and assert the next check drops the watch. That is also the realistic order. They are folded into one parametrized `test_job_resubmitted_or_claimed_elsewhere_stops_the_checks`.
- **Overlap.** `test_job_finished_by_pulsar_stops_the_checks` (ERROR mid-watch) and `test_jobs_no_longer_queued_or_running_are_not_checked` (DELETING/STOPPED/OK from the start) exercised the same guard. Merged into `test_jobs_no_longer_queued_or_running_stop_the_checks` over ERROR, OK, DELETING and STOPPED, mid-watch, so it fails on base.
- **Dropped:**
  - `test_other_message_queue_runners_still_do_not_poll`: it asserts a class attribute the branch doesn't touch, and passes before and after.
  - `test_stopping_a_job_cancels_its_tes_task`: a control that passes before and after. It isn't in a Baseline commit, and moving it there would mean rewriting the branch's first commit. Every "task already ended" test still asserts the cancel POST is sent.
- **Mocks to plain fakes.** `SimpleNamespace(old_id=...)` became a `FakeTool` dataclass, and `FakeJob` became a dataclass. The error test patched `get_state` on the fake with monkeypatch, which caused the earlier CI failure (`undo()` also undid the clock). It now sets `FakeJobWrapper.state_error`, so no monkeypatch is involved.
- **Private state assertions.** These were removed: `_tes_task_watches == {}` (twice) and `_tes_tasks_reported == set()`. The public result already covers them, since `check_watched_item` returns None and the watch is dropped.
- **Design refactor driven by the test.** `_tes_tasks_reported`, a set beside the watches that needed a `discard` whenever a watch ended, became `TesTaskWatch.pulsar_reported`. The MQ thread marks the watch, and the flag goes away with it. This also removes a small leak: before, an id added while the monitor deleted the watch stayed in the set.

## Not acted on

- **Integration/API test.** Not added. The runner needs an AMQP broker (`use_mq`; Galaxy's Pulsar MQ integration tests skip without `GALAXY_TEST_AMQP_URL`) and a TES server that accepts Pulsar's task submission. `test_coexecution.py` likewise needs Kubernetes and RabbitMQ and doesn't run in CI. The unit tests already go through the real runner, `fail_job`, state handlers, the Pulsar client manager and pydantic-tes over real HTTP to a fake TES server, so only the job-conf-to-monitor-thread wiring is untested. I checked that wiring by reading the code: `PulsarJobRunner._monitor` reads `self.poll` at `start()`, after `__init__` set it, and `queue_job` and `recover` call `monitor_job`.
- **E2E/Selenium.** None needed; no UI.
- **`redact()` unit test.** Kept. It tests a pure function directly, with distinct cases (URL userinfo, `job_key=` query values, digests and paths kept) that the runner-level redaction tests don't reach. It can only fail before the change with an ImportError, since the helper is new.
- **Option tests.** `test_tes_checks_are_configurable` errors on base with "Invalid job runner parameter". The option is the API under test, so it can't fail any other way. `test_tes_checks_are_on_by_default` fails at `assert runner.poll`.
- **Cancel tests** fail on base with pydantic-tes `RequestResponseError` raised out of `stop_job`, `fail_job` or `_update_job_state_for_status`. That raise is the bug being fixed, not a missing API.
- **The patched `monotonic` clock** is kept as a module-level monkeypatch. Injecting a clock into the runner would add constructor surface for tests only.
- **The `Mock()` app in `_runner`** is kept. The runner `__init__` and `_init_client_manager` touch many app attributes, and `galaxy_mock.MockApp` would bring a database for nothing. The neighbouring `test_pulsar_runner.py` uses the same approach.
- **Open questions in `implementation_debrief.md`** (late `complete` after a failure, a status arriving before the first check, resubmission on these failures) are unchanged and not covered here.

## Verification

```sh
cd ~/projects/worktrees/galaxy/branch/tes_task_state_polling
PYTHONPATH=lib .venv/bin/python -m pytest -q -p no:cacheprovider -p no:postgresql test/unit/app/jobs/test_pulsar_tes_task_checks.py
```

- **Branch head `cc17a5b47c1`:** 31 passed. With `test_pulsar_runner.py` and `test_runner_pulsar.py`: 82 passed.
- **The new tests at `7f7ac03572e`,** run against the old runner from `af12aa04327`: 31 passed. So the test commit stands on its own.
- **Base `release_26.2` `pulsar.py`** (helper module kept): 30 failed, 1 passed (`redact()`). Failures:
  - 17 check tests fail at their own assertions (`AssertionError`, "assert None is job_state", or a `ValueError` unpacking an empty `failures` list);
  - 11 pydantic-tes `RequestResponseError`s from the cancel tests;
  - the two option tests, as described above.
- **Mutation checks**, each failing exactly one test:
  - not setting `pulsar_reported`: `test_final_status_from_pulsar_outlasting_the_grace_period_keeps_the_job`;
  - dropping the external id check: the resubmitted case;
  - dropping the handler check: the claimed-elsewhere case;
  - removing the `except` in `check_watched_item`: `test_errors_while_checking_do_not_stop_the_monitor`.
- **Lint and types:** black, isort, ruff and flake8 are clean on the two changed files. `cd lib && mypy` on them shows only the pre-existing `galaxy/managers/notification.py` error.

<details>
<summary>Per-test verdicts (33 before, 31 after)</summary>

| Test | Verdict |
|---|---|
| `test_task_dying_before_pulsar_reports_fails_the_job` | Keep; private watch assertion dropped |
| `test_job_finished_by_pulsar_stops_the_checks` | Merged into `test_jobs_no_longer_queued_or_running_stop_the_checks` |
| `test_jobs_no_longer_queued_or_running_are_not_checked` ×3 | Merged (passed trivially on base before the `guest_ports` fix, since it never reached a TES check) |
| `test_running_task_is_checked_once_per_interval_and_left_alone` | Keep |
| `test_completed_task_without_a_final_status_fails_the_job` | Keep |
| `test_failure_message_fits_job_info_with_long_image_names` | Keep (regression for `Job.info` truncation) |
| `test_task_unknown_to_the_tes_server_fails_the_job` | Keep |
| `test_tes_states_newer_than_pydantic_tes_are_recognized` | Keep. Will need updating when pydantic-tes learns PREEMPTED, because the FULL view will then parse and add an executor summary. |
| `test_task_back_to_running_restarts_the_grace_period` | Keep |
| `test_tes_server_errors_never_fail_the_job` | Keep |
| `test_resubmitted_job_stops_the_checks_of_its_old_task` | Rewritten mid-watch, merged into `test_job_resubmitted_or_claimed_elsewhere_stops_the_checks` (passed on base) |
| `test_final_status_from_pulsar_outlasting_the_grace_period_keeps_the_job` | Keep; private set assertion dropped |
| `test_job_claimed_by_another_handler_is_left_to_it` | Rewritten mid-watch, merged (passed on base) |
| `test_errors_while_checking_do_not_stop_the_monitor` | Rewritten with `state_error` instead of monkeypatch |
| `test_known_secrets_are_redacted_exactly` | Keep |
| `test_stopping_a_job_cancels_its_tes_task` | Dropped (control, passes before and after) |
| `test_stopping_a_job_whose_task_already_ended_is_done` ×6 | Keep |
| `test_stopping_a_job_whose_task_is_gone_is_done` | Keep |
| `test_failing_to_cancel_a_running_task_is_logged_not_raised` ×2 | Keep |
| `test_failing_a_job_whose_task_already_ended_fails_the_job` | Keep |
| `test_status_for_a_stopped_job_whose_task_already_ended_finishes_it` | Keep |
| `test_tes_checks_are_on_by_default` | Keep; now also pins the defaults that the harness relies on |
| `test_tes_checks_are_configurable` | Keep |
| `test_other_message_queue_runners_still_do_not_poll` | Dropped (untouched class attribute; passes before and after) |
| `test_redact_hides_credentials_but_keeps_paths_and_digests` | Keep (pure function) |

</details>
