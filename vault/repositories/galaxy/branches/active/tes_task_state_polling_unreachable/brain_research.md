Run via Claude Opus 5.5 at high effort.

Not rerun for this branch. The parent's [brain_research.md](../tes_task_state_polling/brain_research.md) (2026-11-15, Sonnet) covers the same runner, helper module and project documents, including this branch's record. Read it first; the entries below are the ones that matter most here, plus two documents the parent's list doesn't name.

```yaml
documents:
  - path: vault/repositories/galaxy/branches/active/tes_task_state_polling/brain_research.md
    why: Full document list for the shared `PulsarTesJobRunner` code, the job completion lifecycle and the GA4GH WES/TES project.
  - path: vault/repositories/galaxy/branches/active/tes_task_state_polling/implementation_debrief.md
    why: The parent's late-status rule (`FINISH_HANDLED_STATES`), the watch created by the message thread, and the check-interval gate this branch added during the rebase.
  - path: vault/repositories/galaxy/branches/active/tes_task_state_polling/scope_evaluation.md
    why: Explains why the unreachable timeout and the cancel retry stay in this separate PR and what the release-branch risks are.
  - path: vault/projects/wes_tesp_api/HARDENING.md
    why: Stage 6 hardening of the Galaxy WES to tesp-api line, which produced the cancel retry and its live acceptance check.
    load_when: Judging the cancel retry against tesp-api's restart recovery or the live evidence.
  - path: vault/research/Component - Job Completion Lifecycle.md
    why: What `fail_job`, `stop_job` and the stop queue commit; the unreachable timeout fails jobs through `fail_job`, which cancels the task.
    load_when: Reviewing the fail and stop paths or the non-raising `_kill_remote_job`.
research_requests: []
```
