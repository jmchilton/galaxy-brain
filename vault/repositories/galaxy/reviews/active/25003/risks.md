Profile: gx_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: e9fa3cda0899fe6de6fa53b13064a12905b97620

The main one-way door is the new SSE wire contract: the `invocation_update` and `job_update` event names, their payloads (`{"invocations"|"jobs": [{id, state}]}`, `{"resync": true}`), and when each fires. Clients and plugins will build on these. A second, softer one is making change publishing a side effect of every ORM commit in every process. Once that's in, call sites will stop adding explicit dispatches.

<details><summary>Risk Details</summary>

- New public event types and payload shapes on `/api/events/stream`. Renaming them, changing their fields or changing their meaning later breaks clients. What counts as a change is fixed here too: invocation state, new or changed steps, and new messages, but not other invocation fields.
- The resync threshold (`MAX_JOBS_PER_EVENT = 500` per recipient per transaction) and the `{"resync": true}` signal make a protocol that clients must implement.
- `ChangeEventPublisher` registers `after_transaction_create` / `after_flush` / `after_commit` / `after_transaction_end` listeners on the global scoped session whenever `enable_sse_updates` is on. Every commit in web, job handler, workflow scheduler and Celery processes now runs this code. A bug or slowdown here affects job and workflow processing broadly, not just SSE.
- `after_flush` can trigger lazy loads inside flush: `invocation.history`, `obj.workflow_invocation`, and `session.get(Job, ...)` for each new `JobStateHistory`. That costs extra queries on hot paths like job state transitions and large map-over submissions.
- Bulk UPDATE paths must remember to record themselves (`record_invocation_change`, `_delete_jobs` with `RETURNING`). Any future bulk job or invocation state update silently sends no event. The convention is easy to miss and nothing enforces it.
- Savepoint snapshot/restore logic is hand-rolled on top of SQLAlchemy transaction events. Subtle nesting, such as savepoints inside savepoints or rollback after release, could drop or leak events.
- Each committing transaction with changes now sends a Kombu control-task message to all webapp workers. Under heavy job churn, control-queue traffic increases considerably.
- Behavior change: `POST /api/events/history-subscriptions` now silently skips histories the requester can't access. Before, anything could be subscribed. Clients relying on subscribing before access was granted get no error and no events.
- Dispatch failures are logged and swallowed. That keeps commits safe, but missed events only show up as stale UIs.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should focus on the event contract (names, payload fields, resync semantics) as the long-lived API surface. Confirm the payload is minimal and extensible: ids plus state, with clients refetching. Also check that it matches the existing `history_update` conventions.

On the server side, examine `lib/galaxy/managers/change_events.py`. Look at the cost of the global session listeners in job handlers and the scheduler (lazy loads inside `after_flush`, a message per commit), and at whether the savepoint handling is right. Also judge whether "bulk updates must self-record" is a sustainable convention or needs a guard or lint. Because the feature is gated by `enable_sse_updates`, the server-side mechanics stay reversible. The client-facing contract does not.

</details>
