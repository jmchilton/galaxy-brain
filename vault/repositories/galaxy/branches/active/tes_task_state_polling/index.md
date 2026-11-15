---
upstream_base_branch: dev
child_branches: tes_task_state_polling_unreachable
related_records:
  - pulsar/branches/coexecution_publish_running
  - pulsar/branches/coexecution_stage_failures
---
# Fail Pulsar TES jobs whose task dies before Pulsar reports

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:tes_task_state_polling?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tes_task_state_polling)

## Status

Implemented at `e3c0cc44649` (five commits on `dev` `61ec05da7b6`) during stage 3 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md); unit tested, checked against a real Funnel 0.12.3, and verified end to end in the demo (`runs/gaps/tes-dies-early-polling/`, `runs/gaps/cancel-finished-task-tesk-fixed/` and siblings in `~/projects/repositories/galaxy-wes-tes`).

No PR.

Fork CI on `28c0ea54595`: one new test failed in Unit tests and Test Galaxy packages (`test_errors_while_checking_do_not_stop_the_monitor`: `monkeypatch.undo()` also undid the fake clock, so on young CI runners the last check was skipped); fixed in `e3c0cc44649`, reproduced and verified locally. On `e3c0cc44649` (checked in stage 5) every finished job is green, including Unit tests, Test Galaxy packages and API tests; first startup, Integration Selenium, Playwright and macOS startup were still queued or running.

## Notes

- New runner options on `PulsarTesJobRunner` only: `tes_status_check_interval` (default 60 s, 0 disables) and `tes_status_grace_period` (default 120 s).
- Complements Pulsar's `coexecution_stage_failures`, which makes staging failures publish `failed`. This branch covers tasks that die with nothing published at all.
- Also makes cancelling a TES task that already ended a no-op (`211ae51ddaa`): TESK answers 400 to that cancel, which left jobs `deleting` with the stop queue retrying every second. See the debrief's follow-up.
- Galaxy-only fix; no Pulsar change needed. Reasons and open questions (pydantic-tes timeout and TES 1.1 states) in the debrief.
- Demo-only port, not for a PR: `tes_task_polling_v26.1.2` at `6baaaec7486` on tag `v26.1.2`, merged into the demo's `wes_tes_demo_fixes_v26.1.2` at `9f5084721b6` ([GitHub](https://github.com/jmchilton/galaxy/tree/tes_task_polling_v26.1.2)). It imports Pulsar 0.15.15's `container_job_config` instead of `tes_job_config`. To use it in the demo worktree: `git -C ~/projects/worktrees/galaxy/branch/wes_tes_v26_1_2 merge --ff-only tes_task_polling_v26.1.2`, then restart Galaxy. Since stage 5 the port also carries the child branch `tes_task_state_polling_unreachable` (`a1b53d59234`; demo merge `3585089e925`).

## Review materials

- [Implementation](implementation_debrief.md)
