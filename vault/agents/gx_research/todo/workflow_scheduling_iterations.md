# Component - Workflow Scheduling

Cover how workflow invocations are scheduled across iterations:
- The `WorkflowInvoker` step loop (`workflow/run.py`).
- `WorkflowProgress` and the `maximum_workflow_jobs_per_scheduling_iteration` cap (`jobs_per_scheduling_iteration`, `maximum_jobs_to_schedule_or_none`).
- Delayed and `ready` steps, and how a partially scheduled mapped tool step resumes: `WorkflowStepExecutionTracker`, `ensure_implicit_collections_populated`, and the ICJ `order_index` ledger.
- The scheduling manager's `ready_to_schedule_more` heuristic (history and step `update_time`, timeout).

Leave out the job handler, job runners and invocation API serialization (see `Component - Workflow Invocation Models`).

## Why

PR #24670 fixes cached map-over steps that were rescheduled forever under a per-iteration job cap. Understanding it needed the invoker and resume semantics, which no research note covers. `RESEARCH_GAPS_HIGH_PRIORITY.md` Q14 only touches persisted state.

## Requested by

- vault/repositories/galaxy/reviews/active/24670/: scheduling-iteration and mapped-step resume semantics for PR #24670
