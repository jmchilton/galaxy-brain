Run via Claude Sonnet at high effort.

Gaps noted: the debrief's "Base `dev`, not a release branch" decision and `index.md`'s base (`dev`) are stale since the retarget to `release_26.2` (the options and the default-on monitor thread are now a behavior change on a release branch); `PULSAR_TES_IMPROVEMENTS.md` and `RESEARCH.md` still describe `PulsarTesJobRunner` with `poll = False` and `dev`/`v26.1.2` line numbers. No vault note covers the Galaxy runner watch/fail/stop lifecycle; that gap is queued below.

```yaml
documents:
  - path: vault/projects/ga4gh_wes_tes/PULSAR_TES_IMPROVEMENTS.md
    why: Items 1 (this branch), 30 (cancel of an ended task), 17 (credentials in executor args, why redaction exists) and 20 (pydantic-tes timeout, MINIMAL view, missing TES 1.1 states) are the problem statement and open questions.
  - path: vault/repositories/galaxy/branches/active/tes_task_state_polling/implementation_debrief.md
    why: Decisions, testing method (fake TES server, mutation checks) and the open questions (no HTTP timeout, late complete after failure, status before first check).
  - path: vault/projects/ga4gh_wes_tes/RESEARCH.md
    why: Section 2 describes the TES runner, destination params, the mandatory AMQP broker and the container choice (read 2.1 and 2.4); its `poll = False` and line numbers are stale.
    load_when: Understanding how a TES job's state reaches Galaxy, or reviewing the options and defaults.
  - path: vault/research/Component - Job Completion Lifecycle.md
    why: What `finish()`, `fail()` and `JobHandlerStopQueue` do and commit; the changed code calls `fail_job` and a non-raising kill from those paths and relies on `stop_job` rollback behaviour.
    load_when: Reviewing the fail path, the finishing-state race (job stays running while finishing) or the stop-queue retry loop.
  - path: vault/projects/ga4gh_wes_tes/STAGE_LOG.md
    why: Stage 3 evidence (demo runs, Funnel and TESK checks, fork CI history) and the follow-up cancel fix.
    load_when: Looking for verification evidence or CI history.
  - path: vault/research/Component - Galaxy Pulsar Runner Code Sharing.md
    why: pulsar-galaxy-lib pinning and import surfaces (`pulsar.client.tes_job_config` vs `container_job_config`) that decide how a release-branch or backport version differs.
    load_when: Retargeting or backporting to another release branch.
  - path: vault/repositories/galaxy/branches/active/tes_task_state_polling_unreachable/index.md
    why: Child branch on the same `PulsarTesJobRunner` code (retries cancel of an unreachable task); must stay compatible, and shows the hard-failure behaviour left out of this one.
  - path: vault/projects/wes_tesp_api/BUGS_AND_ENHANCEMENTS.md
    why: How the polling and cancel behaviour behaves against tesp-api (unreachable server, cancel races, job info text for SYSTEM_ERROR).
    load_when: Judging whether the poll and cancel semantics hold for non-Funnel TES servers.
  - path: vault/repositories/galaxy/branches/active/pulsar_mq_status_poll/index.md
    why: Another opt-in status recovery for Pulsar MQ in `check_watched_item` and `_update_job_state_for_status` (needs Pulsar #532); same seam, possible conflict or double-finish interplay.
    load_when: Reviewing interaction with other Pulsar status-recovery work or resolving conflicts.
  - path: vault/repositories/galaxy/branches/merged/issue_3899_pulsar_container_deps/index.md
    why: Recent `release_26.2` changes to `lib/galaxy/jobs/runners/pulsar.py` (PR 24555) that this branch rebases over.
    load_when: Conflict resolution in `pulsar.py` on the release branch.
  - path: vault/repositories/pulsar/branches/active/coexecution_stage_failures/index.md
    why: Pulsar-side counterpart (staging failures publish `failed`); this branch covers tasks that die with nothing published.
    load_when: Explaining scope split between the Pulsar and Galaxy fixes.
  - path: vault/research/Component - Pulsar Input Staging.md
    why: Background on coexecution file movement (remote_transfer, job files API) for what runs inside a TES task.
    load_when: Reasoning about what the task does before it dies.
research_requests:
  - vault/agents/gx_research/todo/galaxy_job_runner_monitor_and_stop_lifecycle.md
```
