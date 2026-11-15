Run via Claude Opus 5.5 at high effort.

# Implementation debrief: tes_task_state_polling_unreachable

**STATUS: BLOCKED on a scope decision for John.** This revision did decision 3 of the hardening debrief: it keys the pending TES cancels by TES server and task id. The branch was rebased onto the parent's new head `54d2aa613df`. Head `766334a203e`, 4 commits, pushed to `jmchilton` with `--force-with-lease` from `4b3c1163e57`.

The other two decisions are unchanged and still open. They're in [earlier_drafts/2/implementation_debrief.md](earlier_drafts/2/implementation_debrief.md) ("Decisions for John" 1 and 2):

- Narrow the unreachable timeout, or keep it off 26.2.
- Split into two PRs, cancel retry first.

That file also covers the retarget and the hardening. [earlier_drafts/1/implementation_debrief.md](earlier_drafts/1/implementation_debrief.md) has the design and the live checks.

```text
created differential-review/snapshots/20261115T124742Z-revision-766334a203e2.json
  revision @ 766334a203e2 vs tes_task_state_polling (merge-base 54d2aa613df4)
  since 20261115T122416Z-hardening-4b3c1163e574:
    commits: 0 same, 2 rebased, 2 changed, 0 new, 0 dropped
    hunks:   25 carried, 4 changed, 0 new, 0 dropped
    changed a7e0fbc95888 Fail Pulsar TES jobs whose TES server stays unreachable (0 differing hunks)
    changed 766334a203e2 Retry cancelling a TES task while its server is unreachable (3 differing hunks)
```

## Commits

1. `65735c5d168` Baseline tests for cancelling a TES task with no recorded id
2. `5490c105e4f` Move the TES task cancel out of the TES runner's remote kill
3. `a7e0fbc9588` Fail Pulsar TES jobs whose TES server stays unreachable
4. `766334a203e` Retry cancelling a TES task while its server is unreachable

## Rebase

The parent's new commit keys `_tes_task_watches` by `TesTaskKey` (TES URL and task id). The tip commit conflicted in `__init__`, `_update_job_state_for_status` and `check_watched_item`. The resolution keeps the child's behaviour and the parent's keys:

- the `poll` expression and the cancel retries
- the check-interval gate on the message thread's watch
- `check_watched_item` returning early when the checks are off

## The change

This was Codex's P2 in both hardening runs. `TesCancelRetries` already grouped pending cancels by TES URL, but two of its operations ignored the server. `add` refused a task id that was pending on *any* server, so a same-id task on a second server was never retried. `discard` removed the id from *every* server, so a successful cancel on one server dropped the other server's pending cancel.

- `add` now dedupes within the task's own server only.
- `discard(task_id, destination_params)` removes the cancel from that server only. It takes the same destination params as `add`, so the two can't be handed different keys. This last part came from the review.
- The module docstring says why the cancels are kept per server. The tip commit's message gains a sentence saying the same.
- The change was folded into the tip commit, which adds `tes_cancel_retries.py`. A separate commit would only rewrite code added the commit before.

## Testing

- New `test_cancels_of_tasks_sharing_an_id_on_two_tes_servers_are_retried_apart`: two fake TES servers both return 503, and two jobs share `TASK_ID`. Both jobs are stopped. Then the first server comes back and the first job's cancel succeeds on a later stop. Then the second server comes back, and its task must be cancelled by the retries. The test fails on the old code. It also fails with only the `add` fix, because the old `discard` drops the other server's cancel.
- Each commit passes the TES test file on its own: 53, 53, 61 and 79 tests.
- `test_pulsar_tes_task_checks.py` with `test_pulsar_runner.py` and `test_runner_pulsar.py` on the head: 130 passed.
- black, isort, ruff and flake8 are clean. mypy from `lib/` reports 23 errors, the same as before the change, all in files the branch doesn't touch.

```sh
cd ~/projects/worktrees/galaxy/branch/tes_task_state_polling_unreachable
PYTHONPATH=lib .venv/bin/python -m pytest -q -p no:cacheprovider -p no:postgresql \
  test/unit/app/jobs/test_pulsar_tes_task_checks.py test/unit/app/jobs/test_pulsar_runner.py test/unit/app/jobs/test_runner_pulsar.py
```

No live run. Fork CI on `766334a203e` had not run when this was written.

## Review

[subagents/rekey_review.md](subagents/rekey_review.md) was one review across this branch and the parent. It found no bugs. One optional P3 was acted on: `discard` now takes destination params, as `add` does. Not acted on, with reasons in the debrief:

- a key helper shared with the parent
- typing the URL as `str`

## Open questions

These are unchanged from the earlier debrief:

- No HTTP timeout in pydantic-tes.
- Retries stall while the monitor's database check fails.
- Pending cancels aren't recovered after a restart.
