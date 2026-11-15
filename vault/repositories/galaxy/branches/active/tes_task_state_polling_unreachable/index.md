---
upstream_base_branch: release_26.2
parent_branch: tes_task_state_polling
---
# Fail Pulsar TES jobs whose TES server stays unreachable, and retry cancelling their tasks

- [Open PR](https://github.com/jmchilton/galaxy/compare/tes_task_state_polling...tes_task_state_polling_unreachable?expand=1) (against the parent on the fork; the parent isn't upstream yet)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tes_task_state_polling_unreachable)

## Status

Retargeted to `release_26.2`, hardened, and revised on 2026-11-15: rebased onto the parent `54d2aa613df`, with pending cancels keyed by TES URL and task id. BLOCKED at `766334a203e` on John's two remaining scope decisions in the [hardening debrief](earlier_drafts/2/implementation_debrief.md): narrow the unreachable timeout (or move it to `dev`, or default it off), and split into two PRs with the cancel retry first.

No PR.

Fork CI on `766334a203e` had not run at hand-off.

## Notes

- New runner option `tes_unreachable_timeout` (default 3600 s, 0 retries forever), next to the parent's `tes_status_check_interval` and `tes_status_grace_period`.
- New runner option `tes_cancel_retry_timeout` (default 86400 s, 0 tries once): a cancel that fails because the TES server is unreachable is retried by the monitor thread, with one backoff per TES server (10 s, then doubling to 120 s), in `lib/galaxy/jobs/runners/util/tes_cancel_retries.py`. In memory only; a Galaxy restart drops pending retries (shutdown logs them).
- The single-log and SYSTEM_ERROR job-info fixes moved to the parent on 2026-11-15 (parent `2453e458bf6` and `fdb30869fa8`). The old head `025f1256ec3` still has them here.
- Since this branch runs the monitor thread for cancel retries even with `tes_status_check_interval: 0`, the task checks and the message thread's watch creation are gated on the check interval, not `poll` (test `test_task_checks_off_leave_the_tasks_alone_but_still_retry_cancels`).
- Pending cancels are kept by TES URL and task id, and the parent's watches by `(tes_url, task_id)`, since TES task ids needn't be unique across servers. The parent's grace-period default on 26.2 is still open.
- Demo-only ports, not for a PR, with the old per-cancel retry scheduling: `tes_task_polling_v26.1.2` at `1f7cae33d5f` (`a1b53d59234`, then the cancel retry `031b96fe16a`, then the SYSTEM_ERROR info) and `wes_tes_demo_fixes_v26.1.2` at `b317bc12545` (`3585089e925`, then `8b3166c80fb`, then the SYSTEM_ERROR info). `tes_native_staging_v26.1.2` stays stacked on `a1b53d59234`. The demo worktree `~/projects/worktrees/galaxy/branch/wes_tes_demo_fixes_v26.1.2` is detached at `8b3166c80fb`.
- Live check for the cancel retry: `scripts/tesp/acceptance/unreachable-cancel.sh` in `~/projects/repositories/galaxy-wes-tes` (demo commit `6f50454`), also the follow-up hook of `make acceptance`'s `unreachable` scenario. Not rerun on the hardened scheduling.
- Documentation of the whole Galaxy WES → tesp-api line: the [wes_tesp_api project](../../../../../projects/wes_tesp_api/index.md).

## Review materials

- [Implementation](implementation_debrief.md) (re-keying revision; [retarget, hardening and the open decisions](earlier_drafts/2/implementation_debrief.md); [design, stage history and live checks](earlier_drafts/1/implementation_debrief.md))
- [Re-keying review](subagents/rekey_review.md)
- [Brain research](brain_research.md) (points to the parent's)
- [Test challenges](test_challenges_debrief.md)
- [Performance challenges](performance_challenges_debrief.md)
- [Codex review](codex_review.md)
- [Thermo-nuclear review](thermo_nuclear_review.md)
- [Baseline refactor](baseline_refactor.md)
- [Scope evaluation](scope_evaluation.md)
