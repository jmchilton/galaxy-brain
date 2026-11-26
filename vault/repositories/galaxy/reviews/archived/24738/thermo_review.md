# Thermo review — #24738

- Profile: thermo_review (`_shared/reviewers/thermo_review.md`)
- Model: Claude Opus 5.5, low effort
- Reviewed commit: `c55d04482f9` (base `git merge-base origin/dev HEAD`)

## Verdict

The backend core is sound. `galaxy.model.user_quota_updates` is a small, well-bounded abstraction: queue on `session.info`, send after commit, drop on rollback, batch per process. Hooking `User.adjust_total_disk_usage` (3f2a91f) was the right move, because one canonical choke point replaced several caller hooks. The rest of the diff did not get the same treatment. Quota-admin announcements are spread over four modules and two layers. The client adds a six-flag state machine to `userStore`, which isn't where storage-usage watching belongs. Neither is a merge blocker. Both are cheap to fix now and would accrete if left.

The PR description lists a shared SSE "connect / wait-for-config / catch-up" composable as a follow-up. That cross-store refactor is not re-raised here. P2 2 asks only that this PR's new logic stop growing `userStore`.

## Findings

### P2 1: Quota-change announcements are scattered rather than owned by the quota layer

`queue_user_quota_update` / `queue_user_quota_update_for_group_changes` are called from 14 sites across `managers/quotas.py`, `managers/groups.py`, `managers/group_users.py` and `model/security.py`, plus the model and the quota agent. Several are near-duplicates:

- `QuotaManager` has a `_queue_quota_update(quota)` helper that already handles `quota.default → broadcast=True`. Next to it, four call sites still inline `queue_user_quota_update(self.sa_session, broadcast=True)` (create default, set default, unset default ×2).
- Every `set_default_quota` / `set_entity_quota_associations` call is preceded by a hand-written queue call in the manager. `DatabaseQuotaAgent` owns those mutations (and this PR already changed `set_entity_quota_associations` commit→flush), so the queueing could live inside them and callers couldn't forget it.
- Group-membership-affects-quota logic (`queue_user_quota_update_for_group_changes`, `_any_group_has_quota`) is quota policy, but it was added as a public method on the RBAC agent (`GalaxyRBACAgent`). Managers then reach it via `trans.app.security_agent`. `_set_group_users` doesn't use that method. It inlines its own variant (check quota first, diff members, queue), while `_set_user_groups` diffs first and calls the method. That gives two shapes for one concern.
- `GroupUsersManager._add_user_to_group` and `security_agent.associate_user_group` both build a `UserGroupAssociation`, and both now get the same hook. Needing the same hook twice shows there's no canonical "add user to group" path.

Suggested fix: move the quota-specific announcers next to the quota agent, either as `DatabaseQuotaAgent` methods or as `galaxy.quota` functions taking a session. Something like `announce_quota_change(session, quota)`, which covers default→broadcast plus direct and group users, and `announce_membership_change(session, user_ids, group_ids)`. Call the first from inside `set_default_quota` / `set_entity_quota_associations` and from `QuotaManager` for amount/delete/undelete. Use the second from both `_set_*` association setters and the two add-user paths. The four inline broadcasts and the security-agent method then go away. `galaxy.model.user_quota_updates` stays the low-level transport.

<details><summary>Note on a larger alternative (not a finding)</summary>

History SSE uses DB triggers into `history_audit` and a monitor (`HistoryAuditMonitor`). The equivalent here would be triggers on `galaxy_user.disk_usage` / `user_quota_source_usage` and the quota-association tables. That would catch cleanup scripts and raw SQL, and would delete every hand-written hook. It also costs a migration, a new monitor, and users-per-group fanout in SQL. The PR's after-commit approach is a reasonable trade, and the description covers out-of-band changes with refresh-on-focus. Mentioned only so the choice is explicit.

</details>

### P2 2: Storage-usage live-update state machine bloats `userStore` instead of living in its own unit

`userStore.ts` grows 454 → 573 lines. The new logic is self-contained: six mutable closure flags (`watchingStorageUsage`, `liveUpdatesEnabled`, `refreshSkippedWhileHidden`, `catchUpOnWakeReconnect`, `connectedBefore`, `delayedRefreshPending`), three `setTimeout`s, five predicate helpers, an SSE subscription, and an async `startWatchingStorageUsage` (App.vue now needs `void`). None of it concerns user identity. Its only inputs are `currentUser`, `refreshStorageUsageInBackground` and the throttles. Its interactions, such as `refreshSkippedWhileHidden` being reset by the wake-reconnect branch and `catchUpOnWakeReconnect` being consumed by either a timer or the connection watcher, can't be checked without reading the whole store.

It also diverges from the sibling SSE store it most resembles. `entryPointStore` detects reconnects with `watch(sseConnected, (is, was) => ...)` and waits for config with `isLoaded ? decide() : watch(...)`. `userStore` uses a `connectedBefore` flag and `await until(...)`. The random-delay anti-thundering-herd refetch also lives only here, even though every SSE store reconnects at once on restart.

Suggested fix: extract a `useStorageUsageWatcher` composable, or move it into `quotaUsageStore`, which already owns the usage data. Give it an explicit state type such as `"idle" | "polling" | "live" | "awaitingReconnect"` instead of independent booleans. `userStore` would then keep `refreshStorageUsage*` and one `start` delegate. Taking the sibling's `(is, was)` watcher shape also removes `connectedBefore`. That makes the declared follow-up composable a lift of an existing unit rather than a rewrite.

### P3 1: `send_user_quota_updates_on_commit(..., send | None)` nullable mode

The `None` sender exists only so the listener still pops `session.info` when SSE is off. Pass a no-op sender in `app/__init__.py` (or don't create the batcher) and drop the `send is None` branch and the optional type.

### P3 2: SSE test mock routes events with semantics the real composable lacks

`sseStoreSupport.ts` now keeps a per-type handler map where "a type has one handler, the latest store's", and resetting `state.onEvent` clears everything. The real `useNotificationSSE` keeps a `Set` per type. Mirroring that (`Map<type, Set<handler>>`, fan out to all) would remove the "latest wins" caveat and its three-line comment, and tests couldn't pass on behaviour production doesn't have.

### P3 3: PR description contradicts the code after 3f2a91f / ad7dc0a / 50e28cd

The NOTE says finished jobs and new datasets don't send the event, and that #24664's history-size refreshes stay. The code now queues in `User.adjust_total_disk_usage` (so jobs/uploads do send, and `test_user_quota_update_after_job_finishes` asserts it). It also removed `watchOwnHistorySize`, and `watchHistory.js` / purge callers now go through `refreshStorageUsageUnlessLive`. Update the description so reviewers and the changelog describe the shipped design.

## Non-findings checked

- `historyStore.test.ts` removals correspond to the removed `watchOwnHistorySize` feature (replaced by a "doesn't refresh" test). Coverage was not weakened.
- No file crosses 1k lines. `user_quota_updates.py` is correctly a leaf module importable from `galaxy.model`.
- `UserQuotaUpdateBatcher` is a bespoke timer, but no existing debounce or batch helper exists in the SSE/dispatch code to reuse.
