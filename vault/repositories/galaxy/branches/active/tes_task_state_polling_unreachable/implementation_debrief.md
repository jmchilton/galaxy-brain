Run via Claude Opus 5.5 at high effort.

# Implementation debrief: tes_task_state_polling_unreachable

**STATUS: BLOCKED on a scope decision for John.** The branch was retargeted and hardened. Its base is now `release_26.2`, through the parent `tes_task_state_polling` at `fdb30869fa8`, which was not changed. Head `4b3c1163e57`, 4 commits, pushed to `jmchilton`. The scope evaluation recommends changing the scope (below), so per gx_workhorse "Parking on a Scope Decision" the branch is parked rather than re-scoped. The stage history, the original design and the live checks are in [earlier_drafts/1/implementation_debrief.md](earlier_drafts/1/implementation_debrief.md). This file covers the retarget and hardening.

```text
created differential-review/snapshots/20261115T122416Z-hardening-4b3c1163e574.json
  hardening @ 4b3c1163e574 vs tes_task_state_polling (merge-base fdb30869fa85)
  first snapshot: 4 commits, 5 files, 29 hunks
```

## Decisions for John

The [scope evaluation](scope_evaluation.md) recommends:

1. **Narrow the unreachable timeout, or keep it off 26.2.** As implemented, a TES API outage longer than `tes_unreachable_timeout` (default 1 h) fails every long job whose task is still running fine. The cancel retry then kills those tasks once the server is back. Stage 5's tesp-api run showed such a task resume and complete. The recommended fix: fail only jobs Pulsar never reported `running` (`job_state.running`, which `recover()` restores). That's about 3 lines and one test. A task that reported `running` can reach the broker and will report without the TES API. The cost: a task that dies mid-run during a long outage hangs as it does today. The demo's `unreachable` acceptance scenario, which stops tesp-api while the tool runs, would need to change. The alternatives are the timeout as implemented on `dev`, or on 26.2 with default 0 (off).
2. **Split into two stacked PRs, cancel retry first.** The cancel retry is a plain bug fix for every stop path (a stop or `fail_job` while the server is briefly down orphans the task today). The timeout is a policy change. Today the timeout commit comes first. Reordering moves `tes_server_unreachable_reason` down into the retry PR and the `stop_job = False` hand-off up into the timeout PR. That's a mechanical rebuild of two commits.
3. **Key pending cancels by `(tes_url, task_id)`.** This is Codex's P2. `TesCancelRetries` groups cancels by server but dedupes and discards by bare task id. I didn't do it here, because the parent's `_tes_task_watches` has the same bare-id keying (parent finding 1). The servers in use hand out effectively unique ids.

Once John decides, each change is small. Every review and test below still applies, except that a narrowed timeout needs its tests adjusted plus one new test, and a reordered split needs the per-commit test runs redone.

## Retarget

- `index.md` frontmatter: `upstream_base_branch: release_26.2`, `parent_branch: tes_task_state_polling`. Compare links stay on the fork against the parent. The MY_BRANCHES entry was updated to match.
- The parent's agent had already rebased the branch onto `fdb30869fa8` (head `dc32408c885`) and moved the single-log and SYSTEM_ERROR job-info fixes down into the parent. That left the unreachable timeout and the cancel retry here.

## Hardening

Each step's debrief is in this directory. SHAs in the step debriefs predate the baseline rewrite.

- [brain_research.md](brain_research.md): not rerun. It points to the parent's brain research, which covers the same code and project, and adds `HARDENING.md` and the job completion lifecycle note.
- [test_challenges_debrief.md](test_challenges_debrief.md): five tests merged into others. The behaviour tests run on the default timeout, so all 25 of the branch's tests fail on the parent's runner (20 at their own assertion, 5 option tests on the unknown option). 16 mutations tried; only the `_waits_for_pulsar` re-check survives (a race during the HTTP request). I then folded the renamed parent test `..._before_the_unreachable_timeout_do_not_fail_the_job` into the timeout test, keeping its no-FULL-view assertion. The test agent had flagged it as a parent finding, but this branch already owned the rename.
- [performance_challenges_debrief.md](performance_challenges_debrief.md): two request-count fixes. Cancels added at different times each asked a dead server on their own schedule (about 20 POSTs/min for 200 jobs over 24 h). A job failed by the unreachable timeout sent one more cancel to the server that had just failed. In the 50- and 200-job simulations, cancel POSTs dropped from 436 and 856 to 13 and 57. Retries do no database access.
- [codex_review.md](codex_review.md) (gpt-6.1-sol, two runs, diff pasted into the prompt since Codex's sandbox fails here): the same two findings both times, neither fixed. P1, no request timeout on the monitor thread: confirmed. It's the known pydantic-tes gap; the branch makes it no worse. P2, bare task-id keys: decision 3 above.
- [thermo_nuclear_review.md](thermo_nuclear_review.md): the retry scheduling moved into `lib/galaxy/jobs/runners/util/tes_cancel_retries.py` (`TesCancelRetries`, one backoff per TES server, with its own lock). The rewrite replaced the per-cancel backoff and both performance patches, and closed one more request-count gap (with a new test). The branch's `pulsar.py` diff dropped from +274 to +183 lines. I checked the module's locking myself: stop threads add and discard under the lock, and only the monitor thread sends requests, outside it.
- [baseline_refactor.md](baseline_refactor.md): history rebuilt as baseline test `388e28486ab` (cancelling a task with no recorded id), pure refactor `87d76ac0448` (`_cancel_tes_task` out of `_kill_remote_job`), unreachable timeout `cbe9c350514`, then cancel retry. The hardening commits are squashed into the two feature commits. `lib/` came out byte-identical to the pre-rewrite head `d227883227f`. Each commit passes the TES test file on its own: 52, 52, 60 and 77 tests.
- [scope_evaluation.md](scope_evaluation.md): recommends a scope change (above), so the branch is parked.
- Check branch: `make format` changed nothing. ruff 0.17.0 and flake8 7.4.1, the pinned lint versions (now installed in the worktree `.venv`), are clean on the changed files. mypy run as `make mypy` does (`cd lib`): 22 errors on both the parent and this branch, all in files the branch doesn't touch. Mypy flagged the TES `shutdown` as missing a return type, so I amended the last commit to `4b3c1163e57` with `-> None`. Run from the repository root, mypy names modules `lib.galaxy...` and skips mypy.ini's per-module sections, which inflates the counts.
- Not applicable: E2E polish and screenshots (no UI).

## Final shape

- `tes_unreachable_timeout` (runner option, default 3600 s, 0 = forever): unchanged from the earlier debrief, except that a job failed this way hands its cancel to the retries (`stop_job = False`) when retries are on.
- `tes_cancel_retry_timeout` (runner option, default 86400 s, 0 = try once): a cancel that fails with a connection error, timeout or 5xx goes into `TesCancelRetries`. Each TES server has one backoff, 10 s and then doubling to 120 s. An attempt tries the server's cancels oldest first and stops at the first that finds it unreachable. Each cancel's last try comes at its deadline. Retries stay in memory, and shutdown logs the cancels still pending.
- The monitor thread runs when either option is on. Task checks and the message-thread watch are gated on `tes_status_check_interval`.

## Testing

On `4b3c1163e57`:

- `test/unit/app/jobs/test_pulsar_tes_task_checks.py`: 77 passed.
- With `test_pulsar_runner.py` and `test_runner_pulsar.py`: 128 passed. Adding `test_runner_finishing_state.py` and `test_runner_default_destination_params.py`: 148 passed.

```sh
cd ~/projects/worktrees/galaxy/branch/tes_task_state_polling_unreachable
PYTHONPATH=lib .venv/bin/python -m pytest -q -p no:cacheprovider -p no:postgresql \
  test/unit/app/jobs/test_pulsar_tes_task_checks.py test/unit/app/jobs/test_pulsar_runner.py test/unit/app/jobs/test_runner_pulsar.py
```

No live run this session. The earlier live checks (stage 5 unreachable timeout, stage 6 `scripts/tesp/acceptance/unreachable-cancel.sh`) used the old per-cancel scheduling. The single-cancel timing is unchanged, but rerun the script if the scheduling matters.

Fork CI on `4b3c1163e57`: queued at hand-off.

## Parent findings

For John; the parent was not changed.

1. `_tes_task_watches` (`fdb30869fa8`) is keyed by bare TES task id. Re-key it together with this branch's pending cancels if decision 3 goes ahead.
2. The grace-period default (120 s vs the suggested 600 s on the release branch) is still open. The scope evaluation makes the same argument here: on a release branch, prefer defaults that don't fail healthy jobs during infrastructure hiccups.

## Open questions

- **No HTTP timeout** in pydantic-tes 0.4.0. A server that accepts connections but never answers blocks the monitor thread (task checks and cancel retries) and the stopping thread. The fix is a pydantic-tes `timeout` option, then a Pulsar param, then a pin bump.
- **Retries stall while the monitor's database check fails**, since `monitor()` skips `check_watched_items` then. The retries don't need the database. Rare, and left as is.
- **Restart recovery** of pending cancels is not done (see the earlier debrief's decisions).
