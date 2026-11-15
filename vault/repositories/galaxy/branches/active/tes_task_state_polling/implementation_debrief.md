Run via Claude Opus 5.5 at high effort.

# Implementation debrief: tes_task_state_polling

**STATUS: READY.** At John's request, the branch was retargeted from `dev` to `release_26.2`, then hardened. Base `origin/release_26.2` (`c9bd104e5e1`), head `fdb30869fa8`, 15 commits, pushed to `jmchilton`. The design, decisions and earlier testing are in [earlier_drafts/1/implementation_debrief.md](earlier_drafts/1/implementation_debrief.md). This file covers what changed since then.

```text
exists differential-review/snapshots/20261115T110452Z-hardening-fdb30869fa85.json
  hardening @ fdb30869fa85 vs origin/release_26.2 (merge-base c9bd104e5e16)
  since 20261115T100007Z-revision-af12aa043272:
    commits: 0 same, 3 rebased, 2 changed, 10 new, 0 dropped
    hunks:   5 carried, 5 changed, 2 new, 1 dropped
    new     a2619a1c5b22 Baseline tests for cancelling Pulsar TES tasks
    new     341d1043671b Let Pulsar runner subclasses set param specs and remote kills
    changed 7b16c21158bb Fail Pulsar TES jobs whose task dies before Pulsar reports (8 differing hunks)
    changed 645fa461a8ae Treat cancelling a TES task that already ended as done (5 differing hunks)
    new     a36b57f6f007 Tighten the TES task check tests
    new     82daaf71827a Keep Pulsar's report on the TES task watch
    new     2402c691a80f Remember Pulsar's final status when it beats the first TES check
    new     0c6639e4a058 Check that idle TES task watches don't read the job
    new     dec68d7a865a Describe unreported TES task endings in the TES helper module
    new     6195539cc7a0 Ignore a late Pulsar final status for a job that already ended
    new     2453e458bf68 Don't credit a single TES task log to executor 0
    new     fdb30869fa85 Name the TES server's reason for a SYSTEM_ERROR task in the job info
```

(The tool printed `exists` because the snapshot was first taken one command earlier with the same head. The `revision` snapshot `20261115T100007Z` records the plain retarget at `af12aa04327`.)

## Retarget

- The five `dev` commits (`411ad874536`..`e3c0cc44649`) were replayed onto `origin/release_26.2` with `rebase --onto`, which brought no dev-only commits along. There were no conflicts, because `pulsar.py` is identical on the two bases.
- `release_26.2` pins pulsar-galaxy-lib 0.16.0 and pydantic-tes 0.4.0, the same as `dev`, so the `pulsar.client.tes_job_config` import works unchanged. Only the v26.1.2 demo port needs Pulsar 0.15.15's `container_job_config`.
- The `revision` snapshot was taken at `af12aa04327`.
- Fork CI on `af12aa04327` finished green: 24 jobs passed, 2 skipped, and 2 were still running when the next push cancelled them.
- The superseded decision "Base `dev`, not a release branch" in the earlier debrief was John's call to reverse. The scope evaluation flags the release-branch risks below.

## Hardening

Each step's debrief is in this directory.

- [brain_research.md](brain_research.md) (Sonnet): 12 useful documents. It also queued one research request, on the Galaxy job runner monitor and stop lifecycle.
- [test_challenges_debrief.md](test_challenges_debrief.md):
  - Every test now fails on the base at its own assertion.
  - Overlapping tests were merged, and tests that passed before the change were dropped.
  - Plain dataclass fakes replaced `SimpleNamespace` and monkeypatching.
  - The `_tes_tasks_reported` set became `TesTaskWatch.pulsar_reported`.
- [performance_challenges_debrief.md](performance_challenges_debrief.md):
  - No runtime change. Checks that aren't due cost about 0.6 µs and touch neither the database nor TES. A due check costs two SQL statements and one GET.
  - Added a test that idle watches don't read the job.
  - It confirmed the missing HTTP timeout, which needs a fix upstream in pydantic-tes.
- [codex_review.md](codex_review.md) (gpt-6.1-sol): one finding, confirmed and fixed (`2402c691a80`). A final status that arrived before the first monitor check wasn't remembered, so a slow finish could get a Pulsar-completed job failed. The message thread now creates the watch itself, via `setdefault`, when the job still runs the task on this handler. This closes the earlier open question "Status before the first check".
- [thermo_nuclear_review.md](thermo_nuclear_review.md) (`dec68d7a865`): the whole failure message is now built in `util/tes_task.py` (`describe_tes_task_failure` returns `TesTaskFailure(message, executor_stderr, system_logs)`), and `tes_known_secrets` moved there too. No behavior change. Moving `PulsarTesJobRunner` out of the 1800-line `pulsar.py` was deferred, since it would break the runner's load path on a release branch.
- [baseline_refactor.md](baseline_refactor.md): history rewritten so that "Baseline tests for cancelling Pulsar TES tasks" (`a2619a1c5b2`, four tests that pass on the base) and a pure refactor (`341d1043671`: the `pulsar_param_specs` class attribute and the `_kill_remote_job` hook) come first. Pre-rewrite head `e0eacf9c6c6`. Runner, helper and sample config came out byte-identical.
- [scope_evaluation.md](scope_evaluation.md) recommended a modest expansion. Both parts were done, with the coordinator's go-ahead for the second:
  1. `6195539cc7a`: `complete` and `cancelled` are now ignored for jobs already `OK`, `ERROR` or `FINISHING`. DELETED and DELETING jobs still finish, since that cleans them up. Before, when Galaxy's consumer was down past the grace period, the late message re-ran `finish_job` on a job the checks had failed. This closes the earlier open question "Late `complete` after a failure". It uses the same constant name (`FINISH_HANDLED_STATES`), states and log wording as the `pulsar_mq_status_poll` branch on `dev`, so merging forward is a trivial conflict. It changes the base `_update_job_state_for_status`, so it applies to every Pulsar MQ runner: a repeated `complete` for an `OK` job no longer re-runs the finish.
  2. The child branch's two job-info fixes moved down into this branch, since they correct text in the helper this branch adds:
     - `2453e458bf6`: a single executor log for several executors (tesp-api) is no longer credited to "Executor 0 (pulsar-submit)". The summary reads "The task exited with code N", and the stderr is labelled "Task". This was taken from the child's `f71ca18704d`.
     - `fdb30869fa8`: for SYSTEM_ERROR, the job info names the TES server's reason from the system logs ("System log: …", covering Funnel logfmt, TESK taskmaster and tesp-api lines), redacted and cut to fit `Job.info`. Exit code 0 is never reported for SYSTEM_ERROR. This was the child's `025f1256ec3`, ported onto the restructured helper with the same tests.
     - Cost noted by the scope evaluation: on Funnel and TESK, a staging failure at executor 0 with a single log loses its executor name.
- Check branch: `make format` changed nothing, and ruff and flake8 are clean. mypy, run as `cd lib && mypy` on the changed files, shows only the pre-existing `galaxy/managers/notification.py` error. From the repository root, mypy reports hundreds of errors in files the branch doesn't touch, so the `lib/` invocation was used.
- Not applicable: E2E polish and screenshots (no UI).

## Child branch

`tes_task_state_polling_unreachable` was rebased onto `fdb30869fa8`, and the coordinator asked for the move. It now has two commits:

- `ebc9e2617f5`: the unreachable timeout, without the single-log part.
- `dc32408c885`: the cancel retry.

Its new head `dc32408c885` was pushed with `--force-with-lease` from `025f1256ec3`.

While resolving the second commit, a real interaction turned up. The child turns the monitor thread on for cancel retries even when `tes_status_check_interval` is 0, and its `check_watched_item` then returns without removing watches. So the child gates the message thread's watch creation on the check interval rather than `poll`, with a new test `test_final_status_with_the_task_checks_off_adds_no_watch`, which fails with `poll`. The child's 75 TES tests pass, and 126 with the neighbouring files. It has not been hardened.

## Testing

On `fdb30869fa8`:

- `test/unit/app/jobs/test_pulsar_tes_task_checks.py`: 51 passed.
- With `test_pulsar_runner.py` and `test_runner_pulsar.py`: 102 passed.

Fail-before checks for this session's additions:

- Codex fix: the `before_the_first_check` case fails without it.
- Late-status guard: both `test_late_final_status_for_a_job_failed_by_the_checks_is_ignored` cases fail without it. `test_final_status_for_a_deleted_job_still_finishes_it` passes both ways on purpose, to catch a guard written too broadly.
- Single-log: four tests fail without it.
- SYSTEM_ERROR: seven tests fail without it.

```sh
cd ~/projects/worktrees/galaxy/branch/tes_task_state_polling
PYTHONPATH=lib .venv/bin/python -m pytest -q -p no:cacheprovider -p no:postgresql \
  test/unit/app/jobs/test_pulsar_tes_task_checks.py test/unit/app/jobs/test_pulsar_runner.py test/unit/app/jobs/test_runner_pulsar.py
```

Fork CI on `fdb30869fa8` was queued at hand-off.

## Open questions

- **Grace period default on a release branch.** The scope evaluation suggests 600 s instead of 120 s. If Galaxy's AMQP consumer lags or disconnects for longer than about interval + grace while tasks finish, those jobs fail, although their results sit in the broker. The new guard makes the late `complete` a clean no-op but can't undo the failure. Left at 120 s; it's John's call.
- **No HTTP timeout** in pydantic-tes 0.4.0. A TES server that accepts connections but never answers stalls every TES check on that handler. Status messages still flow. The fix is a pydantic-tes `timeout` option, then a Pulsar param, then a pin bump.
- **New default-on traffic:** one BASIC GET per TES job per minute. `tes_status_check_interval: 0` turns it off, which is worth a release note.
- **Merging forward** into `dev` will conflict with `pulsar_mq_status_poll` in `_update_job_state_for_status`. The shared guard keeps the conflict small.
- Still open from the earlier debrief: tasks stuck in TES `QUEUED`, resubmission on these failures untested, and pydantic-tes lacking PREEMPTED, CANCELING and MINIMAL.
