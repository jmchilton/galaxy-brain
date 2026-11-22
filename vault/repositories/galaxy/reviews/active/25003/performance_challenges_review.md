# Performance challenge review: galaxy#25003

Profile: gx_performance_challenger. Model: Claude Opus 5.5. Effort: medium.
Reviewed commit: `e9fa3cda0899fe6de6fa53b13064a12905b97620`.
Details and measurement plan: [performance_challenges_debrief.md](performance_challenges_debrief.md).

Verdict: the listener itself is cheap (no extra queries, no measurable flush overhead, nothing when SSE is off). The concern is dispatch volume: every committing transaction becomes its own broadcast, unlike `history_update`, which is debounced and coalesced.

## P2 1 - Job and invocation events are broadcast once per commit, uncoalesced and in the committing thread

`ChangeEventPublisher._after_commit` (`lib/galaxy/managers/change_events.py`) calls `SSEEventDispatcher._send` synchronously for every root transaction that touched a job or invocation. Job handlers and runners commit once per job per transition, so a job produces at least three control tasks, each fanned out to every webapp worker's control queue and pushed to the owner's browser and history viewers.

Measured with a counting dispatcher (sqlite, from the PR worktree): 200 jobs moved `queued -> running -> ok` with a commit per transition produced 600 `job_update` dispatches. The `MAX_JOBS_PER_EVENT` resync cap only applies within one transaction, so a 10k-element map-over gets one resync at creation and then ~30k single-job events while it runs. Production message rates are extrapolated, not measured.

`history_update` already avoids this: `HistoryAuditMonitor` dispatches from a background thread with `DEBOUNCE_SECONDS = 0.2`, coalescing per user. The PR's "Known limitation" (an unreachable broker blocks committing threads) has the same root cause.

Suggested fix: have `_after_commit` merge into a per-process buffer keyed by job/invocation id (last state wins) and drain it from a background thread every ~200 ms, applying the 500 cap per window. Reuse or extract the `HistoryAuditMonitor` debounce rather than adding a second mechanism. A red-to-green unit test in `test/unit/app/managers/test_change_events.py` (N separate-transaction job commits, injectable clock, bounded dispatch count) would cover it. If the author would rather land this as the planned follow-up, the PR description should say that event volume, not only broker outage, is the reason.

## P3 1 - `history-subscriptions` does a load and access check per id on an unbounded list

`EventsService.subscribe_history_viewer` runs `history_manager.by_id` + `is_accessible` (1-2 SELECTs) and one broadcast for each entry of `history_ids`, which has no length limit. Small in practice; batch-load with `id IN (...)` or cap the list in `HistoryViewerSubscriptionPayload`.

## P3 2 - Event-driven test waits add requests per wait

`wait_on_sse` opens a new SSE stream per wait, and `_subscribe_to_history_owned_by_others` / `wait_on_job_update` add up to three GETs (`users/current` is fetched on every wait, uncached). `SSELineListener.matching_event_count` re-parses the whole buffer on each wake. The PR reports SSE-enabled `test_jobs.py` slower than polling (4m27s vs 3m16s). Caching the current user id on the populator is a cheap start. Optional; affects only SSE-enabled test runs.
