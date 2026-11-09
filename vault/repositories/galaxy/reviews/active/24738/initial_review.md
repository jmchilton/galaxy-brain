# Initial review — #24738 (default profile)

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Claude Opus 5.5; effort: not specified by coordinator
- Reviewed commit: `c55d04482f9` (diff vs `git merge-base origin/dev HEAD`)

## Verdict

Solid, well-scoped PR. The commit-then-announce design is right: queue on `session.info`, send from `after_commit`, drop on rollback, and batch once a second per process off the committing thread. It also covers every usage path I could find: `adjust_total_disk_usage` (job finish, uploads, purges, storage cleaner), `calculate_and_set_disk_usage` (recalc and Celery history purge), relabel, quota CRUD, and the group membership paths in the managers, the security agent and the legacy user controller. The `set_entity_quota_associations` commit→flush change makes delete+re-add atomic, which is an improvement. I also checked whether anonymous users lose current-history meter refreshes in SSE mode: they don't, because `watchHistory.js` still calls `refreshStorageUsageUnlessLive` and that still refreshes for anonymous users.

I found no P1 bugs. The main asks are test discrimination/coverage and a stale PR description.

## Findings

### P2 1: `test_user_quota_update_after_dataset_purge` can pass without the purge sending anything

`new_dataset(..., wait=True)` returns once the job finishes. The job finish now queues `user_quota_update` too, via `adjust_disk_usage_for_datasets` → `adjust_total_disk_usage`. `UserQuotaUpdateBatcher` holds it for 1 s before sending. The listener opens right after `new_dataset` returns, so it usually receives the job-finish event, and `wait_for_event("user_quota_update")` succeeds even if the purge path queued nothing.

Fix: drain before purging. For example, sleep past the batch interval after `new_dataset` (or wait until no event arrives for over 1 s), then start listening. Or record events seen before the purge and assert a new one arrives after it. The same concern applies weakly to `test_user_quota_update_broadcast_after_default_quota_change`, but that test filters on `{"broadcast": true}`, so it's fine.

### P2 2: No tests for the quota edit and association-removal paths

The integration tests cover create (direct user), joining a group with a quota, the default broadcast, recalc, job finish and purge. The trickiest server logic has no test at any layer:

- `QuotaManager._queue_quota_update`: the `union` of direct and group users, used on amount edits, delete and undelete.
- `update_quota` replacing users/groups. The comment there says "Before replacing the associations, so the users the quota no longer applies to are told too". That behavior (a *removed* user gets the event) is the point and is untested.
- `_set_group_users` / `_set_user_groups` symmetric-difference logic (`PUT /api/groups/{id}` with `user_ids`, `PUT` user groups). Only the single-add `group_users` path is tested.

Suggest one or two more integration tests in `test_history_sse.py`, reusing `_quota`/`_listening`:
1. Quota on user A, update its `in_users` to `[B]`, and assert A receives the event.
2. Group with a quota, set the group's users to `[]` via `PUT groups/{id}`, and assert the former member receives the event.

These are cheap, given the existing helpers.

### P3 1: PR description contradicts the code

The NOTE says "Finished jobs and new datasets don't send the event … The refreshes from #24664 stay … when another of the user's histories changes size." Commit 3f2a91f3f85 made `adjust_total_disk_usage` queue for every change, and the PR adds `test_user_quota_update_after_job_finishes`. Commit ad7dc0ade9b removed `watchOwnHistorySize`, and `historyStore.test.ts` now asserts no refresh on another history's size change. The "Changes" list also omits job finishes and uploads. Reviewers and the changelog will read the description, so it should be updated to match.

### P3 2: Quota/group logic placed on the RBAC security agent

`queue_user_quota_update_for_group_changes` and `_any_group_has_quota` were added to `GalaxyRBACAgent` (`lib/galaxy/model/security.py`), and `groups.py`/`group_users.py` reach them via `trans.app.security_agent`. They only need a session and `GroupQuotaAssociation`, so a session-taking function in `galaxy.model.user_quota_updates`, or a method on `DatabaseQuotaAgent`, would keep quota concerns out of the RBAC agent. The security agent's `_set_*` methods could still call it.

### P3 3: Extra queries run even when `enable_sse_updates` is off

With SSE disabled, the listener is installed with `send=None` and drops what's queued. The queueing sites still do work whose only purpose is the event:
- `_set_user_groups`: the old-group query and the quota check.
- `_set_group_users`: loading all members (the PR measured 20 ms per 20k-member group).
- `_queue_quota_update`: the union query on every quota edit.
- `relabel_quota_for_dataset`: an extra CTE query per dataset move.

The cost is small and mostly on admin paths. A cheap enabled check (e.g. a flag set by `send_user_quota_updates_on_commit` on the session factory/`info`, read by those sites) would make it zero.

### P3 4 (follow-up, optional): generalize "dispatch after commit"

`user_quota_updates.py` is a good pattern but quota-specific (`_INFO_KEY`, `UserQuotaUpdates`). `InteractiveToolManager` (`lib/galaxy/managers/interactivetool.py:214-226`) hand-rolls the same idea: commit, then dispatch `entry_point_update` in a try/except. A generic helper, "queue an SSE dispatch on this session, send after commit, optionally batched", would leave a reusable abstraction for the next event type instead of a second bespoke module. Reasonable as a follow-up alongside the client-side composable follow-up the PR already lists.

## Non-findings / checked

- `event.listen(scoped_session, ...)` resolves to the sessionmaker's class, so it covers every thread's session. The job handler, web and Celery processes all get the listener via `GalaxyManagerApplication`.
- Celery workers publish via `queue_worker` built in `GalaxyManagerApplication` when AMQP is configured, so the motivating Celery purge case is delivered. Celery doesn't run `haltables`, so up to 1 s of pending updates can be lost on worker exit. That's negligible, given the focus-refresh fallback.
- Broadcast plus user ids in one batch sends a user two events. Harmless: the throttle and random delay absorb it.
- `historyStore.test.ts` removals track the removed `watchOwnHistorySize` feature, not a weakened test.
- Imports are all module-level.
