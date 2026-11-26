# Performance challenge debrief — PR #24738

Profile: gx_performance_challenger (N.O.T. M.A.R.I.U.S.). Model: Claude Opus 5.5, low effort. Reviewed commit: `c55d04482f9`. Static review only; no Galaxy/Postgres was started, so nothing below is new measurement. Speculative points are marked.

## What was checked

| Path | New work | Verdict |
|---|---|---|
| Every commit (`after_commit`/`after_rollback` listeners on the scoped session) | `session.info.pop` | Trivial; matches PR's 0.2 µs claim. |
| `User.adjust_total_disk_usage` (job finish `_charge_outputs`, `add_dataset(s)`, purges) | `object_session()` + set merge into `session.info` | Trivial per call. |
| Dispatch | `UserQuotaUpdateBatcher`: ≤1 AMQP control message per process per second, sent from a `threading.Timer` thread | Off the committing thread; bounded. New thread per batch window, negligible. |
| Web worker fan-out (`queue_worker.user_quota_update`) | dict lookup per user id, `push_to_user` | Cheap even for 20k ids. |
| Quota edits (`_queue_quota_update`, `_queue_users_and_groups`) | UNION of direct + group users, loads all ids | 13 ms for 20k per PR; rare admin action. Message size grows linearly (see P3 2). |
| `_set_group_users` / `_set_user_groups` / group purge / `_add_user_to_group` | `_any_group_has_quota` `LIMIT 1` probe, old-member load only when the group has a quota | Good: the probe gates the expensive load. |
| `relabel_quota_for_dataset` | 4th execution of `quota_affected_users` CTE per dataset | Redundant on Postgres (see P3 1). |
| `set_entity_quota_associations` commit → flush | One fewer commit | Neutral/positive. |
| Client | Event-driven refetch throttled 5 s; broadcast jitter 30 s; reconnect jitter 10 s; history-size refetch removed when live | Request rate with SSE is ≤ pre-PR rate on the job path. |

## Checking the PR's performance claims

- Commit-listener and group-save rows: plausible from the code; the work added is a dict pop and a `LIMIT 1` probe. Not re-measured.
- The table does not cover the job-finish dispatch path. The PR NOTE says "Finished jobs and new datasets don't send the event", but `adjust_total_disk_usage` queues an update for every nonzero adjustment, and `test_user_quota_update_after_job_finishes` asserts a finished job pushes `user_quota_update`. So the busy path does send (batched ≤1/s/process). The client side compensates: with live updates `refreshStorageUsageUnlessLive` skips the history-size refetch and `watchOwnHistorySize` is removed, so "one change can cause two usage requests" no longer describes the code either. Net effect looks fine; the description is stale (P3 3).

## Client polling / burst estimates (speculative, arithmetic only)

- Job runs: each of a user's open tabs refetches `GET /api/users/current` (+ quota-source usages if requested) at most once per 5 s while jobs finish. Pre-PR SSE path did the same via history size changes, but only for tabs holding that history; now every tab of the user refetches. Tab-count multiplier is the same pattern as other SSE stores.
- Default-quota broadcast: N connected tabs → about N/30 req/s for 30 s. 3,000 tabs ≈ 100 req/s of `/api/users/current`. Rare admin action; acceptable.
- Restart/reconnect: N tabs → N/10 req/s for 10 s, on top of other SSE stores' own catch-ups (history, notifications, entry points) which are not coordinated. PR already lists a shared composable as follow-up; not raised as a finding.
- A batch that is both broadcast and has user ids sends those users an immediate event as well as the jittered one, so they refetch twice. Rare; not actionable enough to raise.

## Measurement plan (if John wants data)

1. Postgres 16, `enable_sse_updates: true`, `enable_quotas: true`, one job handler, two web workers.
2. Run a 200-job workflow as one user with 3 tabs open; count `GET /api/users/current` and AMQP `user_quota_update` messages on dev vs PR (statsd `galaxy.sse.dispatch.count{task=user_quota_update}` already exists).
3. Quota on a 100k-member group: time `PUT /api/quotas/{id}` and record AMQP message size; compare with broadcasting instead.
4. Cross-device storage move of 10k datasets across quota sources: compare `relabel_quota_for_dataset` total time with and without the extra CTE.

## Recommendations

Rewritten as P-labeled findings in `performance_challenges_review.md`.
