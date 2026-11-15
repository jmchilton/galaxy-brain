```yaml
documents:
  - path: vault/research/PR 21335 - GA4GH WES API.md
    why: The WES endpoints, submit_run pipeline, state mapping (completed to COMPLETE), the earlier #22351 list_runs auth guard, test coverage gaps and the five bugs fixed here.
  - path: vault/repositories/galaxy/branches/active/wes_api_fixes_26_0/implementation_debrief.md
    why: Per-commit rationale, the cancel no-op and soft-delete trade-offs, and before/after test evidence.
    load_when: Reviewing any of the five commits or deciding whether a choice (idempotent cancel, soft delete over purge) is right.
  - path: vault/projects/ga4gh_wes_tes/STAGE_LOG.md
    why: Where the bugs were found (stage 2 probes on v26.1.2), the fixes' stage 3 outcome, and the confirmation that the probes no longer reproduce bugs 1-4 and 6.
    load_when: Needing the evidence behind a bug or the demo branch backport.
  - path: vault/projects/ga4gh_wes_tes/WES_TES_VS_GALAXY_APIS.md
    why: Why these fixes matter to WES clients (run states, 500s, null outputs) and how WES compares with the native invocation API.
    load_when: Writing the PR description or weighing WES-only versus native-API fixes (the NoReplacement mapping is WES-only on purpose).
  - path: vault/research/Component - Workflow Import.md
    why: Session ordering and commit points of workflow import; import is not atomic and commits mid-build, which is why a rejected submission needs a compensating soft delete.
    load_when: Reviewing _discard_rejected_submission (rollback then soft delete) or the import-before-validate ordering in submit_run.
  - path: vault/research/Component - Workflow Invocation Models.md
    why: Defines the NoReplacement sentinel, how it lands in output_values, and the to_dict views the run log reads.
    load_when: Reviewing the NO_REPLACEMENT_VALUE to null mapping in the run log.
  - path: vault/research/Component - Workflow API.md
    why: Invocation payload fields, the DELETE cancel endpoint and invocation state list that WES wraps. Its cancel text says state becomes "cancelled", which is imprecise (see research request).
    load_when: Checking what invoke_workflow validates (history_id, inputs, use_cached_job) and which errors it raises after the workflow import.
  - path: vault/research/Component - Jobs API and Job Cache.md
    why: Where invocation use_cached_job is consumed (run_request.py meta parameter), so the bool the WES layer now passes is the same type as the native API.
    load_when: Reviewing the use_cached_job boolean fix.
  - path: vault/research/Component - API Tests.md
    why: Conventions for the API tests each commit adds (one test per fix, populators, running one test at a time).
    load_when: Reviewing or extending test_wes.py.
  - path: vault/repositories/galaxy/branches/active/wes_run_state_executor_error_26_0/index.md
    why: Stacked child branch that changes WES run state for failed or paused jobs; pending a decision and touches the same service and terminal-state set.
    load_when: Judging merge order, or whether TERMINAL_GALAXY_STATES and the cancel no-op interact with EXECUTOR_ERROR.
  - path: vault/research/Component - DRS Support.md
    why: Sibling GA4GH surface that shares service-info and the anonymous-access convention; the 403 versus spec 401 question is settled by matching GET /runs.
    load_when: Checking consistency of auth responses with other GA4GH endpoints.
research_requests:
  - vault/agents/gx_research/todo/workflow_invocation_cancellation_and_terminal_states.md
  - vault/agents/gx_research/todo/ga4gh_wes_api.md
```
