---
upstream_base_branch: dev
parent_branch: tes_task_state_polling
---
# Fail Pulsar TES jobs whose TES server stays unreachable

- [Open PR](https://github.com/jmchilton/galaxy/compare/tes_task_state_polling...tes_task_state_polling_unreachable?expand=1) (against the parent on the fork; the parent isn't upstream yet)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tes_task_state_polling_unreachable)

## Status

Implemented at `f71ca18704d` (one commit on the parent's `e3c0cc44649`) during stage 5 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md); unit tested, not yet checked live.

No PR.

Fork CI on `f71ca18704d` queued at hand-off.

## Notes

- New runner option `tes_unreachable_timeout` (default 3600 s, 0 retries forever), next to the parent's `tes_status_check_interval` and `tes_status_grace_period`.
- Also stops attributing tesp-api's single whole-task executor log to "Executor 0 (pulsar-submit)". This also drops the executor name when Funnel or TESK fail at executor 0; see the debrief.
- Demo-only port, not for a PR: cherry-picked onto `tes_task_polling_v26.1.2` as `a1b53d59234`, merged into `wes_tes_demo_fixes_v26.1.2` at `3585089e925`. The demo worktree `~/projects/worktrees/galaxy/branch/wes_tes_demo_fixes_v26.1.2` was left detached at `9f5084721b6` because a Galaxy was running from it; check out `3585089e925` and restart Galaxy to use it.

## Review materials

- [Implementation](implementation_debrief.md)
