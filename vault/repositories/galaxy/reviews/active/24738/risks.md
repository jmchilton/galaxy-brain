Profile gx_risk_assessment, Claude Opus 5.5, low effort, reviewed commit c55d04482f9.

Mostly a two-way door: the one lasting commitment is a new `user_quota_update` SSE event/control-task contract plus commit-time hooks on the global SQLAlchemy session, which future usage/quota code paths must keep calling `queue_user_quota_update` to stay correct.

<details><summary>Risk Details</summary>

- New SSE event type `user_quota_update` and `UserQuotaUpdatePayload` control-task kwargs become a wire contract between processes (mixed-version web/job handlers during rolling upgrades will drop unknown control tasks).
- `after_commit`/`after_rollback` listeners are installed on the app's scoped session factory, so they run on every commit in every process; cheap when nothing is queued, but it is new global session behavior.
- Correctness depends on every usage/quota mutation site calling `queue_user_quota_update` on the same session that commits; paths that write usage via raw connections or other sessions (or future ones) silently won't notify, leaving stale UI until the old refresh path runs.
- Default-quota changes broadcast to all connected clients, including anonymous; client jitter mitigates but a large server still sees a refetch burst.
- Per-process `UserQuotaUpdateBatcher` uses a daemon `threading.Timer`; updates pending at hard kill are lost (benign: wake-up only), and flush ordering in `haltables` matters on shutdown.
- `calculate_and_set_disk_usage` and quota dataset moves now issue an extra query/queue step; `quota/__init__.py` adds a select of affected owners per dataset move.
- Client refactor moves storage polling/refresh from historyStore into userStore and deletes history-store tests; regression surface is the storage meter's refresh behaviour when SSE is disabled.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should focus on whether the session-event hook is the right abstraction (global listener vs explicit calls) and whether all writers of user disk usage go through a session that commits with it attached, since misses fail silently. Confirm the fallback when `enable_sse_updates` is off still refreshes usage as before.

Also sanity check the broadcast path on default quota edits for large deployments, and that the removed historyStore tests were moved rather than dropped coverage.

</details>
