Run via Claude Opus 5.5 at high effort.

# Implementation debrief: tes_task_state_polling

**STATUS: READY.** This revision keys the TES task watches by TES server and task id. Head `54d2aa613df`: 16 commits on `origin/release_26.2` (`c9bd104e5e1`), pushed to `jmchilton` with `--force-with-lease` from `fdb30869fa8`.

The design, the retarget and the hardening are in the earlier debriefs: [earlier_drafts/2/implementation_debrief.md](earlier_drafts/2/implementation_debrief.md) (retarget and hardening) and [earlier_drafts/1/implementation_debrief.md](earlier_drafts/1/implementation_debrief.md) (design). The hardening's step debriefs in this directory still apply.

```text
created differential-review/snapshots/20261115T124742Z-revision-54d2aa613df4.json
  revision @ 54d2aa613df4 vs origin/release_26.2 (merge-base c9bd104e5e16)
  since 20261115T110452Z-hardening-fdb30869fa85:
    commits: 15 same, 0 rebased, 0 changed, 1 new, 0 dropped
    hunks:   10 carried, 2 changed, 0 new, 0 dropped
    new     54d2aa613df4 Key TES task watches by TES server and task id
```

## The change

Codex flagged this in both hardening runs, and the coordinator decided to fix it. `_tes_task_watches` was keyed by bare TES task id. Two destinations can use different TES servers, and nothing in the TES spec makes task ids unique across servers. Funnel's and TESK's ids are effectively unique, but tesp-api's are MongoDB ObjectIds.

When two jobs' tasks shared an id, they shared one watch. Pulsar's report for one job ended the other job's checks. The watch was then recreated without the report, so the job Pulsar had reported could be failed after the grace period. The two jobs also shared one check schedule.

- New `TesTaskKey = tuple[str | None, str]` and `tes_task_key(job_state)` in `pulsar.py`. They read `tes_url` from the job's destination params. Every path (submit, the message thread, recovery) uses the persisted destination params, so each job keeps one key.
- `_tes_task_watches`, `_watch()`, `check_watched_item` and the message thread's `_update_job_state_for_status` all use the key.
- It's a separate commit on top. Folding it into the polling commit would have rippled through about ten later commits for no review gain. The "Baseline tests" and refactor commits stay first.

## Testing

- New `test_tasks_sharing_an_id_on_two_tes_servers_are_watched_apart`: two fake TES servers, two jobs sharing `TASK_ID`, Pulsar reporting the first. Before the change it fails: the reported job is failed, and the other is never checked again. (An earlier draft passed before the change because of the order the jobs were checked in, so the order was changed to expose the bug.)
- `test_pulsar_tes_task_checks.py` with `test_pulsar_runner.py` and `test_runner_pulsar.py`: 103 passed (52 in the TES file).
- black, isort and ruff are clean. mypy from `lib/` shows only the pre-existing `galaxy/managers/notification.py` error.

```sh
cd ~/projects/worktrees/galaxy/branch/tes_task_state_polling
PYTHONPATH=lib .venv/bin/python -m pytest -q -p no:cacheprovider -p no:postgresql \
  test/unit/app/jobs/test_pulsar_tes_task_checks.py test/unit/app/jobs/test_pulsar_runner.py test/unit/app/jobs/test_runner_pulsar.py
```

Fork CI on `54d2aa613df` had not run when this was written.

## Review

[subagents/rekey_review.md](subagents/rekey_review.md) (one review across this branch and the child) found no bugs. Its two optional P3s were left for this branch, with reasons in the debrief: a key helper shared with the child's cancel retries, and typing the URL as `str`.

## Child

`tes_task_state_polling_unreachable` was rebased onto `54d2aa613df` and its pending cancels re-keyed the same way. Its new head is `766334a203e`.

## Open questions

These are unchanged from the earlier debrief:

- The grace-period default on a release branch (120 s, or the suggested 600 s).
- No HTTP timeout in pydantic-tes.
- New default-on traffic to TES.
- The merge forward conflicting with `pulsar_mq_status_poll`.
