# Performance challenge debrief: galaxy#25003

Profile: gx_performance_challenger (N.O.T. M.A.R.I.U.S.). Model: Claude Opus 5.5, effort medium.
Reviewed commit: `e9fa3cda0899fe6de6fa53b13064a12905b97620`.

## What was checked

| Pattern | Result |
|---|---|
| Extra per-row queries in the flush listener | None measured. `_after_flush` reads columns already loaded by `Job.set_state` (`JobStateHistory(self)` reloads the expired row), `session.get(Job, ...)` hits the identity map. |
| Cost of listening on every flush when SSE is on | Not measurable. Committing 5,000 new HDAs: median 0.518 s without publisher, 0.501 s with (6 alternating runs, sqlite in-memory). |
| Unbounded payloads | Capped per recipient per transaction (`MAX_JOBS_PER_EVENT = 500`), resync otherwise. Bulk cancel uses `RETURNING`, no reload. |
| Work when `enable_sse_updates` is off (default) | Listener not registered; `record_*` is a dict lookup. `_delete_jobs` keeps the plain `UPDATE`. |
| Dispatch volume / coalescing | **Concern.** One synchronous control task per committing transaction, no coalescing across transactions. See below. |
| Subscribe endpoint | Per-id `by_id` + `is_accessible` (1-2 SELECTs each) on an unbounded `history_ids` list. Small. |

## Measurement

Script: microbenchmark against `mapping.init(..., "sqlite:///:memory:")` with a counting dispatcher, run from the PR worktree with `PYTHONPATH=lib` (not committed anywhere).

- 200 jobs created in one transaction: 1 `job_update` dispatch.
- Same 200 jobs moved `queued -> running -> ok` with a commit per job per transition (how `JobWrapper.change_state` / `enqueue()` / runners commit): **600 dispatches**, 800 entries total. SELECT count identical with and without the publisher (1600 vs 1600), so no added query load.
- Big flush (5,000 HDAs + datasets): no measurable overhead (see table).

Data-based: dispatch count = number of committing transactions that touched a job or invocation. Speculative: production message rates and browser impact below are extrapolated, not measured on a deployment.

## Main concern: per-commit broadcast without coalescing

`history_update` goes through `HistoryAuditMonitor`: one background thread per process, `DEBOUNCE_SECONDS = 0.2`, coalesced per user before `SSEEventDispatcher._send`. The new events skip that: `ChangeEventPublisher._after_commit` calls `_send` in the committing thread for every transaction. Consequences:

- Each job transition is its own control task, fanned out (via `declare_queues`) to every webapp worker's control queue. A job is at least three transitions, so a server running thousands of jobs per minute becomes tens to hundreds of control messages per second times the webapp worker count, each decoded and `encode_id`'d on every worker even with no listener connected. Speculative magnitude; mechanism measured.
- The 500-job resync cap only works within one transaction. A 10k-element map-over gets a resync at creation, then ~30k single-job `job_update` events as its jobs progress in separate commits. Browsers receive all of them; a client that refetches per event (follow-up PR) would generate more requests than the polling it replaces, against the rate limiter.
- The same job commit also produces a (debounced) `history_update` when output datasets change, so clients get two signals for one change, one of them uncoalesced.
- The PR's own "Known limitation" (broker outage blocks committing threads) has the same fix.

### Recommendation

Route `_after_commit` into a per-process buffer (`dict` keyed by job/invocation id, last state wins), drained by a background thread every ~200 ms that applies `MAX_JOBS_PER_EVENT` per window and sends one `invocation_update` and one `job_update`. Reuse the debounce constant/pattern from `HistoryAuditMonitor` rather than inventing a second one (ideally extract a small shared "coalescing dispatcher" both use). The committing thread then only does an in-memory merge, so broker latency or outage cannot block job handlers, and the resync cap covers map-over progress as well as creation.

## Measurement plan (if the author wants numbers before/after)

1. Unit level (cheap, deterministic): add a test to `test/unit/app/managers/test_change_events.py` that commits N job transitions in separate transactions and asserts the dispatcher call count stays bounded by flush windows rather than N (red today, green with a coalescing buffer and an injectable clock).
2. Integration: with `enable_sse_updates` on and statsd enabled, run a map-over of a 1,000-element list (`cat1`) and read `galaxy.sse.dispatch.count{task=job_update}` and `galaxy.sse.dispatch.latency_ms` (already emitted by `_send`). Expect ~3,000 dispatches today.
3. Browser side: count `job_update` frames received on `/api/events/stream` for the same run (the test `SSELineListener` can do this).
4. Optional: same run against Postgres + RabbitMQ with 4 webapp workers to see broker deliveries (`rabbitmqctl list_queues messages_delivered`).

## Minor

- `subscribe_history_viewer`: `history_ids` is an unbounded list and each id costs a history load, an access check and one broadcast. Batch-load with `id IN (...)` and/or cap the list length.
- Test infra: each event-driven wait opens a fresh SSE stream and issues up to three extra GETs (`users/current` uncached, `histories/{id}`, `jobs/{id}`); `matching_event_count` re-parses the whole collected buffer on each wake. The PR reports SSE-enabled `test_jobs.py` at 4m27s vs 3m16s polling. Caching the current user id per populator would remove one request per wait. Only affects SSE-enabled runs.

## Not findings

- `record_invocation_change` lazy-loads `invocation.history` to get the owner; at most one extra SELECT per changed invocation per transaction (identity map), only with SSE on. Not worth changing without data showing it.
