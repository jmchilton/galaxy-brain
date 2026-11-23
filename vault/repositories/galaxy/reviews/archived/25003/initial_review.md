# PR #25003 initial review (default profile)

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5, effort: medium
- Reviewed commit: `e9fa3cda0899fe6de6fa53b13064a12905b97620`
- PR: https://github.com/galaxyproject/galaxy/pull/25003, "Send invocation_update and job_update SSE events" (mvdbeek, base `dev`)

## Verdict

Well designed. Collecting changes per transaction in `session.info` and sending them from `after_commit` is the right abstraction for state that changes in many processes, and it leaves something reusable behind (`PendingChanges` and the publisher can carry future event types). Savepoint and rollback handling is careful, and the unit tests run it against a real SQLite session. The integration tests check routing (owner only, viewers, a private history refused). Turning populator waits into event-driven waits on SSE-enabled servers is a good way to exercise the producers. One portability bug (P2) and a few smaller consistency and reuse points. Nothing blocks merge.

Not raised, since the PR description calls them out: synchronous dispatch in the committing thread (the "Known limitation"), and populator waits that time out when an event is missing (intended).

## Findings

### P2 1: `_delete_jobs` uses `RETURNING` without checking database support

`WorkflowInvocation._delete_jobs` (`lib/galaxy/model/__init__.py`) adds `.returning(Job.id, Job.user_id, Job.session_id, Job.history_id)` whenever a publisher listens, which is whenever `enable_sse_updates` is on. Galaxy already treats `RETURNING` as optional. `galaxy.model.database_utils.supports_returning(engine)` probes for it, `ApplicationStack.supports_returning()` caches the result, and `JobHandlerQueue.setup_query` (`lib/galaxy/jobs/handler.py`) falls back when it is missing. MySQL is still a conditional requirement. On a database without `RETURNING`, turning on SSE makes `cancel_invocation_steps` raise, so invocation cancellation breaks in the scheduler. Before this PR it just ran a bare `UPDATE`.

Fix: use the existing probe. When `RETURNING` isn't supported, select the affected `(id, user_id, session_id, history_id)` rows first (the subqueries already lock them `FOR UPDATE`), then run the bare `UPDATE` and record those rows. Alternatively, skip recording and rely on the next job state change.

### P3 1: `_is_accessible_history` re-implements `get_accessible`

`EventsService._is_accessible_history` (`lib/galaxy/webapps/galaxy/services/events.py`) calls `history_manager.by_id(...)` and then `is_accessible(..., current_history=trans.history)`. That is what `SecuredModelManager.get_accessible(id, user, current_history=...)` (`lib/galaxy/managers/secured.py`) already does, and other history services call it that way. Using it, and catching `ItemAccessibilityException` along with `ObjectNotFound`/`MalformedId`, keeps one access path for histories. It is optional and small.

### P3 2: viewer access is checked only at subscribe time

Viewers now receive invocation and job ids and states, so subscription is gated on access, which is good. The check only runs at `POST /api/events/history-subscriptions`, though. If the owner later makes the history private or unshares it, an existing subscription keeps receiving `history_update`, `invocation_update` and `job_update` for it until the viewer unsubscribes or disconnects. The leak is small (ids and states, and a REST refetch is still access controlled), and the PR may accept it. If it does, a sentence in the `subscribe_history_viewer` docstring or in `sse_updates.md` would record that. Optional.

### P3 3: job events route by the job's user or session, not the history owner as invocation and history events do

`invocation_update` goes to the owner of the invocation's history (`record_invocation_change` uses `history.user_id`), and `history_update` also routes by history owner. `job_update` instead goes to `job.user_id`, falling back to `job.session_id`. These differ in one real flow. An anonymous user starts jobs, then logs in. `handle_user_login` (`lib/galaxy/webapps/base/webapp.py`) creates a new Galaxy session and gives the anonymous history to the user. The running jobs keep `user_id=None` and the old, now invalid `session_id`, so their `job_update` events reach nobody, while `history_update` for the same history reaches the new owner. Routing jobs by `history.user_id`, falling back to the session when the history has no user, would match the sibling events. Otherwise, document that clients must resync after login.

### P3 4: `PendingChanges` stores positional tuples, which are converted again in the publisher

`PendingChanges.invocations` is `dict[int, tuple[int | None, int | None, str]]` and `jobs` is `dict[int, tuple[int | None, int | None, int | None, str]]`. `_send_invocation_updates` and `_send_job_updates` unpack these by position and rebuild `InvocationUpdate`/`JobUpdate` TypedDicts. Small NamedTuples or dataclasses in `galaxy.model.pending_changes`, such as `PendingInvocation(user_id, history_id, state)` and `PendingJob(user_id, session_id, history_id, state)`, would make the record type checked and self-describing. The two helpers are also placed asymmetrically: `record_job_change` is in `pending_changes.py`, while `record_invocation_change` is in `galaxy/model/__init__.py`, only because it reads `invocation.history`. Taking `(invocation_id, user_id, history_id, state)` would let both live together. Typing nit.

### P3 5: SSE-backed populator waits repeat setup requests on every wait

Each `wait_on_sse` call opens a new event stream. Every call also issues `GET histories/{id}` and `GET users/current`, and job waits add `GET jobs/{id}`, all to decide whether to subscribe as a viewer. `wait_for_jobs` and `wait_for_workflow` run many waits back to back. The PR reports `test_jobs.py` taking 4m27s with event-driven waits against 3m16s polling. Caching the current user id on the populator, as `_sse_updates_enabled` is already cached, would drop one request per wait. Also, `job_history_id` returns `None` for a job without a history, which makes `_subscribe_to_history_owned_by_others` request `histories/None`. Guarding that case and skipping the subscription would avoid a confusing failure. Test-framework only.

### P3 6: `enable_sse_updates` option description not updated

`doc/source/admin/sse_updates.md` now covers invocation and job events. The `enable_sse_updates` description in `lib/galaxy/config/schemas/config_schema.yml`, which feeds the sample config and the config docs, still lists only history, entry-point and notification updates. Add the two new event types there and regenerate the sample.

## Checked and fine

- `Job.set_state`: non-terminal states go through the bulk `UPDATE` plus a `JobStateHistory` row, which `after_flush` catches. Terminal states are ORM assignments. `JobWrapper`'s queueing `UPDATE` in `lib/galaxy/jobs/__init__.py` also appends `JobStateHistory`. No other bulk `UPDATE`s of job, invocation or step state were found in `lib/galaxy`.
- Every session comes from the same `sessionmaker` (`model.new_session()` and the scoped session), so the listeners cover the job handler, the workflow scheduler, Celery and the web app.
- Changing `subscribe_history_viewer` to depend on `ProvidesHistoryContext` has no side effect: `trans.history` doesn't create a history (`get_history(create=False)`).
- Imports are at module top level. Comments are concise.
