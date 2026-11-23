# Learning Galaxy follow-up — PR #25003

## Stale research

None found. The touched research notes agree with the pre-PR baseline: `Component - Job Completion Lifecycle` (the two modes of `Job.set_state`), `Component - Workflow Invocation Models`, and `Component - Invocation Graph View` (3s client polling). Their line references to `model/__init__.py` have drifted, for example `Job.set_state` is cited at `:2211`, but that is ordinary drift, not a conflict.

## Post-merge activities

- `vault/agents/gx_research/todo/sse_live_updates.md`: when the note is written, include the `ChangeEventPublisher` session-event producer, `invocation_update` / `job_update`, and the access check on viewer subscriptions. This PR has been added to that request.
- `Component - Job Completion Lifecycle`:
  - In "Who observes what" (the table that lists API polling and history panel polling), add that committed job state changes now emit `job_update` SSE events from the committing process, with a resync above 500 jobs per owner per transaction.
  - Note that `JobStateHistory` appends double as the change signal.
- `Component - Workflow Invocation Models`:
  - `WorkflowInvocation.set_state` now records a pending change when its guarded `UPDATE` hits a row.
  - `cancel_invocation_steps` now goes through `_delete_jobs` (`UPDATE ... RETURNING`).
- `Component - Invocation Graph View`: once a client PR consumes `invocation_update` / `job_update`, its "Data Flow & Polling" section (3s polling of invocation, job summaries and steps) goes stale. This PR is server-side only, so nothing changes yet.
- `vault/agents/gx_research/todo/workflow_invocation_cancellation_and_terminal_states.md`: under the effects of cancellation, mention that `cancel_invocation_steps` reports the jobs it moves to `deleting` as `job_update` events.
