---
upstream_base_branch: release_26.2
child_branches:
  - tes_task_state_polling_unreachable
  - tes_native_staging
related_records:
  - pulsar/branches/coexecution_publish_running
  - pulsar/branches/coexecution_stage_failures
  - galaxy/branches/tes_native_staging_v26.1.2
---
# Fail Pulsar TES jobs whose task dies before Pulsar reports

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:tes_task_state_polling?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tes_task_state_polling)

## Status

Retargeted from `dev` to `release_26.2`, hardened, and revised on 2026-11-15 to key TES task watches by TES server and task id. READY at `54d2aa613df` (16 commits on `release_26.2` `c9bd104e5e1`). Originally built in stage 3 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md) and verified end to end in the demo (`runs/gaps/tes-dies-early-polling/`, `runs/gaps/cancel-finished-task-tesk-fixed/` in `~/projects/repositories/galaxy-wes-tes`).

No PR.

Fork CI on `54d2aa613df` had not run at hand-off (`af12aa04327`, the plain retarget, was green).

## Notes

- New runner options on `PulsarTesJobRunner` only: `tes_status_check_interval` (default 60 s, 0 disables) and `tes_status_grace_period` (default 120 s).
- Complements Pulsar's `coexecution_stage_failures`, which makes staging failures publish `failed`. This branch covers tasks that die with nothing published at all.
- Also makes cancelling a TES task that already ended a no-op (`645fa461a8a`): TESK answers 400 to that cancel, which left jobs `deleting` with the stop queue retrying every second.
- Hardening added: a late `complete`/`cancelled` is ignored for jobs already OK/ERROR/FINISHING (same rule as `pulsar_mq_status_poll`; touches every Pulsar MQ runner), and the single-log and SYSTEM_ERROR job-info fixes moved down from the child. Commits start with baseline tests (`a2619a1c5b2`) and a pure hook refactor (`341d1043671`).
- Watches are keyed by `(tes_url, task_id)` (`54d2aa613df`), since TES task ids needn't be unique across servers (tesp-api's are MongoDB ObjectIds). The child keys its pending cancels the same way.
- Open for John: the scope evaluation suggests a 600 s grace default on the release branch (kept 120 s). See the debrief.
- Galaxy-only fix; no Pulsar change needed. Reasons and open questions (pydantic-tes timeout and TES 1.1 states) in the debrief.
- Demo-only port, not for a PR: `tes_task_polling_v26.1.2` at `6baaaec7486` on tag `v26.1.2`, merged into the demo's `wes_tes_demo_fixes_v26.1.2` at `9f5084721b6` ([GitHub](https://github.com/jmchilton/galaxy/tree/tes_task_polling_v26.1.2)). It imports Pulsar 0.15.15's `container_job_config` instead of `tes_job_config`. To use it in the demo worktree: `git -C ~/projects/worktrees/galaxy/branch/wes_tes_v26_1_2 merge --ff-only tes_task_polling_v26.1.2`, then restart Galaxy. Since stage 5 the port also carries the child branch `tes_task_state_polling_unreachable` (`a1b53d59234`; demo merge `3585089e925`).

## Review materials

- [Implementation](implementation_debrief.md) (re-keying revision; [retarget and hardening](earlier_drafts/2/implementation_debrief.md), [design](earlier_drafts/1/implementation_debrief.md))
- [Re-keying review](subagents/rekey_review.md)
- [Brain research](brain_research.md)
- [Test challenges](test_challenges_debrief.md)
- [Performance challenges](performance_challenges_debrief.md)
- [Codex review](codex_review.md)
- [Thermo-nuclear review](thermo_nuclear_review.md)
- [Baseline refactor](baseline_refactor.md)
- [Scope evaluation](scope_evaluation.md)
