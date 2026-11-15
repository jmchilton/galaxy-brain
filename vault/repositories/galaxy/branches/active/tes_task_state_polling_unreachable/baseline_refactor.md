Run via Claude Opus 5.5 at high effort.

The branch now opens with a "Baseline tests" commit and a pure refactor that moves the TES task cancel out of `_kill_remote_job` into `_cancel_tes_task`. Then come two feature commits, the unreachable timeout and the cancel retry, with the five hardening commits squashed into them.

- Pre-rewrite head: `d227883227f9a2aafd9bdf986ccf30ae4aeb36d9` (local only; the fork's `tes_task_state_polling_unreachable` is at `c0d2174aeaf`). Publishing the new history needs a force push.
- New head: `9c1da8a3657` (local only, not pushed), still on the frozen parent `tes_task_state_polling` at `fdb30869fa8`.
- `git diff d227883227f 9c1da8a3657` touches only `test/unit/app/jobs/test_pulsar_tes_task_checks.py`: one baseline test, plus `FakeJob.job_runner_external_id` typed `str | None` (+15/−1). Everything under `lib/` is byte-identical.
- I kept the backup ref `tes_task_state_polling_unreachable_pre_baseline_backup` at the old head until the result was verified, then deleted it. The old head stays reachable through the reflog.

## New history on `fdb30869fa8`

| Commit | Subject | TES test file |
|---|---|---|
| `388e28486ab` | Baseline tests for cancelling a TES task with no recorded id | 52 passed |
| `87d76ac0448` | Move the TES task cancel out of the TES runner's remote kill | 52 passed |
| `cbe9c350514` | Fail Pulsar TES jobs whose TES server stays unreachable | 60 passed |
| `9c1da8a3657` | Retry cancelling a TES task while its server is unreachable | 77 passed |

With `test_pulsar_runner.py` and `test_runner_pulsar.py` added (51 tests), the totals are 103, 103, 111 and 128. Before this work the head ran 127. black, isort and ruff are clean on the touched files at every commit. mypy (`cd lib`) reports nothing in the TES files; the errors it does report are in modules the branch doesn't touch (`notification.py`, `objectstore/s3*.py`, `util/__init__.py` and others).

## Baseline tests (`388e28486ab`)

`test_failing_to_cancel_a_task_with_no_recorded_id_is_logged_not_raised` covers the one branch of the TES `_kill_remote_job` that no test reached: a job with no recorded task id. `stop_job` returns early without an external id, so the test reaches that branch through a status message for a `STOPPED` job. The client still cancels by the job state's id. The fake server answers 404, and the runner logs "which has no recorded id", reads no task state and queues `finish_job`. The refactor reorders this branch, so it needed a pin. The other cancel paths (success, nothing to cancel, gone, refused with the state readable or not, cancel during `fail_job` and during a status message) already had tests on the parent.

## Refactor (`87d76ac0448`)

`_kill_remote_job` now reads the job's recorded task id first. With no id, it keeps the single `client.kill()` and its error log. Otherwise it calls `_cancel_tes_task(job_id_tag, task_id, destination_params, cancel)`, which holds the old try/except plus the state read and its logging. The function body has the same `try`/`except`/`else` shape as on the final head, so the cancel retry commit only adds the unreachable branch, the `attempt` parameter, the attempt-number log and the return values. The baseline test and the existing cancel tests pass on both sides. The only runtime difference is that the task id is read before the cancel rather than after a failed one.

## Feature commits

- **`cbe9c350514` (unreachable timeout)** is `ebc9e2617f5` with its later test fixes folded in. Those came from `f2e6a7a263f`: tests run on the default timeout, the 4xx test folds into the clock-restart test, and the shared `_take_down` helper. They also came from `1b65da358a9`: the errors-before-timeout test folds into the timeout test. Its `lib/` changes are exactly `ebc9e2617f5`'s. I checked them against the final head: what remains is all cancel-retry code. I made the test file by deleting the cancel-retry parts from the final test file: the fake server's 5xx/restart support, `monitor_for`, `another_job`, `_bring_back`, the `tes_cancel_retries` clock patch, the cancel-retry tests and option assertions. On the refactor commit's runner, the eight unreachable tests and the two option tests fail at their assertions. The commit keeps `ebc9e2617f5`'s message.
- **`9c1da8a3657` (cancel retry)** folds in `dc32408c885`, `3fc60a9739f`, `c0d2174aeaf`, `d227883227f` and the cancel-retry half of `f2e6a7a263f`. Squashing drops churn: `3fc60a9739f` added a hold pass, and the per-sweep dedupe came in `dc32408c885`. `d227883227f` then replaced both with the per-server `TesCancelRetries`. The message describes the final design: per-server backoff in `util/tes_cancel_retries.py`, keyed by `tes_url`, and a job failed for an unreachable server handing its cancel straight to the retries.

The two features could now ship as two PRs: one PR for commits 1–3 and one PR stacked on it for commit 4.

## Not done

- **Moving `tes_server_unreachable_reason` into the refactor.** It has no caller on the base, so a commit adding it alone would be dead code until the next commit. The parent made the same call for `util/tes_task.py`.
- **Splitting `TesCancelRetries` into its own leading commit.** It exists only for the cancel retry and has no caller before it.
- **Pushing.** The coordinator force-pushes.
