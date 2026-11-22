# Component - SSE Live Updates

Cover Galaxy's server-sent events (`enable_sse_updates`) end to end:

- `SSEEventDispatcher` (`managers/sse_dispatch.py`) and its control-task fan-out to webapp workers, including the TTL-cached declare queues and the no-AMQP no-op.
- `SSEConnectionManager` routing: user, galaxy session, broadcast, and history viewers.
- The `/api/events/stream` endpoint.
- The producers:
  - `HistoryAuditMonitor`, using PostgreSQL LISTEN/NOTIFY or polling `history_audit`;
  - `InteractiveToolManager`'s `entry_point_update`;
  - notifications;
  - the commit-hook producer in `model/user_quota_updates.py`, if #24738 has merged;
  - `ChangeEventPublisher` (`managers/change_events.py`, `model/pending_changes.py`) publishing `invocation_update` / `job_update` from session events, including the savepoint handling, bulk-`UPDATE` self-reporting and 500-job resync, if #25003 has merged. Compare it with the #24738 commit hook.
- The access check on history-viewer subscriptions, if #25003 has merged.
- The SSE-driven test waits (`wait_on_sse` in `galaxy_test/base/populators.py`, `wait_on_events` in `galaxy_test/base/sse.py`).
- On the client: `useSSE` / `useNotificationSSE`, how stores subscribe to event types, and catching up after a reconnect. Mention the open follow-up for a shared composable.

Leave out the notification system's own semantics and the quota accounting itself, which `Component - User Disk Usage Accounting` covers.

## Why

#24738 adds a new event type and a second producer pattern alongside the database-detected `history_update`. No research note describes the SSE pipeline, so reviewers had to reconstruct it from code.

## Requested by

- vault/repositories/galaxy/reviews/active/24738/: needed the baseline SSE pipeline to explain the new `user_quota_update` producer.
- vault/repositories/galaxy/reviews/active/25003/: needed the SSE pipeline baseline to explain the session-event `invocation_update` / `job_update` producer.
