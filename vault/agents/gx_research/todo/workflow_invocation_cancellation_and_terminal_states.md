# Component - Workflow Invocation Cancellation

Document how a workflow invocation is cancelled and what its terminal states mean.

Cover:

- **Request.** `WorkflowInvocation.cancel` (`lib/galaxy/model/__init__.py`) sets `cancelling` for every state except `cancelling` and `cancelled`, so a `completed` or `failed` invocation is moved back to `cancelling` on purpose (to delete leftover paused or running jobs); `WorkflowsManager.request_invocation_cancellation` and the `InvocationCancellationUserRequest` message.
- **Entry points.** `DELETE /api/invocations/{id}` and its workflow-scoped aliases, the WES `POST /runs/{id}/cancel`, and any UI/CLI callers.
- **Effect.** Who observes `cancelling` (the scheduling manager and `WorkflowInvoker`), `cancel_invocation_steps` (jobs to `deleting`, implicit collection jobs, subworkflow invocations), and the transition to `cancelled`.
- **State table.** `new`, `requires_materialization`, `ready`, `scheduled`, `completed`, `failed`, `cancelling`, `cancelled`, `paused`: which are terminal, what `completed` means given failed jobs, and how clients map them (for example the WES mapping in `services/wes.py`).
- **Tests.** Where cancel behaviour is covered (`test_workflows.py`, `test_wes.py`).

Leave out per-iteration scheduling (pending `workflow_scheduling_iterations.md`), job-level cancellation in runners, and the invocation ORM tables already in [[Component - Workflow Invocation Models]].

## Why

`wes_api_fixes_26_0` makes WES cancel a no-op on terminal runs because Galaxy's own cancel moves a completed invocation to `cancelling`. No note covers that semantics: [[Component - Workflow API]] says DELETE "sets invocation state to cancelled", which misses the `cancelling` hop and the terminal-state behaviour, and [[Component - Workflow Invocation Models]] covers tables only.

## Requested by

- vault/repositories/galaxy/branches/active/wes_api_fixes_26_0/brain_research.md: needed cancel-on-terminal-run semantics and the invocation state lifecycle; the existing note is imprecise.
