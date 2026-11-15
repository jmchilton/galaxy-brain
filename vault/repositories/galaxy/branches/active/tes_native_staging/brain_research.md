Run via Claude Sonnet at high effort.

Gaps noted: no vault note describes the job files API as a component (the best description is one section of `Component - Pulsar Input Staging`, which predates raw-body `PUT`, signed per-file tokens and directory writes), and none describes the runner watch/fail/stop/recover contract the new `TesJobRunner` implements; both are queued below. `RESEARCH.md` and `PULSAR_TES_IMPROVEMENTS.md` still describe the `v26.1.2` Pulsar TES runner (`poll = False`, old line numbers), and the prototype's `index.md` and `DESIGN_B.md` describe a `dev`/`v26.1.2` base and a legacy-module PUT route; this branch is a `release_26.2` rewrite on `JobFilesManager`, so read those for design and evidence, not for code locations. `STAGE_LOG.md` and `WES_TES_VS_GALAXY_APIS.md` still call design B a prototype that "needs a decision" (D2, park it); the branch record's decision for John is the same question. `research_issues/job-ports-tokens-auth-drift.md` records that the `ports` and `oidc-tokens` callbacks hand-copy the job key check that this branch extends with `job_token`; a review should note the token scheme exists only on the files routes.

```yaml
documents:
  - path: vault/projects/wes_tesp_api/DESIGN_B.md
    why: The design B write-up by the prototype's author: what the runner does, the wrapper script, the signed-token and DIRECTORY-output design, live evidence on Funnel, TESK and tesp-api, and the production gap table this branch is closing.
  - path: vault/repositories/galaxy/branches/active/tes_native_staging/initial_implementation_debrief.md
    why: What porting to release_26.2 changed (job files API rewrite over JobFilesManager, Pulsar 0.16.0 module names, the re-key commit), test counts, and what was not run live.
  - path: vault/repositories/galaxy/branches/active/tes_native_staging_v26.1.2/implementation_debrief.md
    why: Prototype decisions and their reasons (Galaxy absolute paths inside the task, the inline wrapper exiting 0, why Galaxy-side signed URLs, per-backend DIRECTORY behaviour from TES spec and Funnel, TESK and tesp-api code), problems hit, and known gaps (orphan task between create_task and set_external_id, no remote metadata).
    load_when: Reviewing why the runner is shaped as it is, or checking a design choice against the prototype's evidence.
  - path: vault/research/Component - Pulsar Input Staging.md
    why: The only description of the job files API (routes, JobFilesManager authorize/write rules, job_key scope, shared-disk assumption) that the new PUT routes, tokens and directory writes extend; predates this branch's additions.
    load_when: Reviewing changes to api/job_files.py, managers/job_files.py or the authorization model.
  - path: vault/projects/ga4gh_wes_tes/WES_TES_VS_GALAXY_APIS.md
    why: Approach 4 (design B) section, the capability and cost comparison against design A and Pulsar REST, and decision D2 (build B only when a real TES deployment asks).
    load_when: Judging whether the branch should be pursued and what it should and shouldn't promise.
  - path: vault/projects/ga4gh_wes_tes/STAGE_LOG.md
    why: Stages 5 and 6 record how design B was built and hardened, with run ids and CI/acceptance history; the Stage 5 stretch section ends with the known open items.
    load_when: Looking for verification evidence.
  - path: vault/repositories/galaxy/branches/active/tes_task_state_polling/index.md
    why: The parent branch whose helper module (`runners/util/tes_task.py`: state fetch, redacted failure messages, task key) the runner reuses and which this branch modified.
  - path: vault/repositories/galaxy/branches/active/tes_task_state_polling/implementation_debrief.md
    why: Poll, cancel and failure semantics the native runner inherits (nothing-to-cancel states, redaction, no HTTP timeout, unreachable-server retry-forever), with the fake-TES-server test method.
    load_when: Reviewing check_watched_item, stop_job or failure messages in tes.py.
  - path: vault/research/Component - Job Completion Lifecycle.md
    why: What finish() commits and how `_handle_metadata_externally` and the stop queue behave; the native runner finishes locally after COMPLETE and sets metadata on the Galaxy side.
    load_when: Reviewing finish_job, the failure path, or the cancel-while-finishing race.
  - path: vault/projects/ga4gh_wes_tes/PULSAR_TES_IMPROVEMENTS.md
    why: Item list for TES runner behaviour (credentials in executor args, cancel of an ended task, pydantic-tes timeout, MINIMAL view, missing TES 1.1 states) that applies to this runner too.
    load_when: Judging open questions on TES client behaviour.
  - path: vault/projects/wes_tesp_api/BUGS_AND_ENHANCEMENTS.md
    why: tesp-api limits that shape what design B can do there (no DIRECTORY outputs, multipart POST only, status behaviour).
    load_when: Judging backend-specific behaviour or the tes_directory_outputs default.
  - path: vault/projects/wes_tesp_api/HARDENING.md
    why: Hardening already done on the tesp-api line that design B depends on.
    load_when: Reproducing live runs against tesp-api.
  - path: vault/repositories/galaxy/branches/merged/job_files_fastapi/polish_debrief.md
    why: How the FastAPI job files API and JobFilesManager (#23933) were built, including streaming uploads and the re-check after long uploads that the PUT route copies.
    load_when: Reviewing the PUT route against the POST route's behaviour.
  - path: vault/agents/gx_research/research_issues/job-ports-tokens-auth-drift.md
    why: The sibling runner callbacks (`ports`, `oidc-tokens`) copy the job key check and diverge; relevant to where a signed-token check should live.
    load_when: Reviewing authorization changes in JobFilesManager._authorize.
  - path: vault/research/Component - Galaxy Pulsar Runner Code Sharing.md
    why: Pulsar library pinning and import surfaces (`pulsar.client.tes_job_config` vs `container_job_config`) that decide which Pulsar version the runner's config import works against on each release.
    load_when: Backporting or retargeting the runner.
  - path: vault/repositories/galaxy/branches/active/tes_task_state_polling_unreachable/index.md
    why: Sibling branch that adds the unreachable-server timeout this runner lacks (it retries forever); decides whether a follow-up should port it.
    load_when: Deciding scope of failure handling for an unreachable TES server.
research_requests:
  - vault/agents/gx_research/todo/job_files_api.md
  - vault/agents/gx_research/todo/galaxy_job_runner_monitor_and_stop_lifecycle.md
```
