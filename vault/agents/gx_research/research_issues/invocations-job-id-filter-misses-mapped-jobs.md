# `GET /api/invocations?job_id=` misses jobs of mapped-over steps

- Area: lib/galaxy/managers/workflows.py (`WorkflowsManager.build_invocations_query`), client/src/api/invocations.ts (`fetchInvocationForJob`)
- Found while: [[Component - Workflow Invocation Models]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

- The `job_id` filter joins only `WorkflowInvocationStep.job_id` (`lib/galaxy/managers/workflows.py:731-732`).
- A step that maps over a collection never sets `job_id`. `WorkflowStepExecutionTracker.record_success` sets `invocation_step.job` only when there is no `collection_info` (`lib/galaxy/tools/execute.py:924-929`); mapped steps set `implicit_collection_jobs` instead (`:967`). Their jobs are reachable only through `ImplicitCollectionJobsJobAssociation`.
- So a job id from a mapped-over step returns no invocation. `fetchInvocationForJob` (`client/src/api/invocations.ts:62-77`) uses this filter, and `JobInformation.vue` calls it (`client/src/components/JobInformation/JobInformation.vue:170`), so the job information page shows no invocation link for any element job of a mapped step.
- Model code elsewhere already treats both links: `WorkflowInvocation.cancel_invocation_steps` handles plain and ICJ jobs in two subqueries (`lib/galaxy/model/__init__.py:10196-10230`).

## Evidence / repro

Run a workflow whose tool step maps over a list. Take one element job id from `GET /api/invocations/{id}/step_jobs_summary` or the step's ICJ, then call `GET /api/invocations?job_id=<id>`. The response is empty; the same call with the job id of an unmapped step returns the invocation.

## Suggested fix

Add an `OR` branch: `WorkflowInvocationStep.implicit_collection_jobs_id IN (SELECT implicit_collection_jobs_id FROM implicit_collection_jobs_job_association WHERE job_id = :job_id)`. Both columns are indexed. Add an API test with a mapped step.

## Related

- [[Component - Jobs API and Job Cache]] (ICJ grouping)
