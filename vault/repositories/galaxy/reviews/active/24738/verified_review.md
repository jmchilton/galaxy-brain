### P2 1: The purge SSE test passes even if purging sends nothing (implementation verified)

`test_user_quota_update_after_dataset_purge` opens its listener right after `new_dataset(..., wait=True)` returns. The job finish queues its own `user_quota_update`, which `UserQuotaUpdateBatcher` holds for up to 1 s, so the listener receives it and `wait_for_event` succeeds before the purge is even checked. `test_user_quota_update_after_job_finishes` uses the shared default user too, so an event left batched by an earlier test in the class could satisfy it.

<details><summary>Evidence</summary>

A copy of the purge test with the purge call removed passes against the PR head.

</details>

Give each test a fresh user. In the purge test, wait until the upload's batched events have arrived, then require a new event after the purge.

<details><summary>Details</summary>

The review branch adds `_wait_until_quiet` (waits for the setup's event, then until none arrives for longer than the batch interval) and `_expect_new_user_quota_update` (requires the event count to grow). It also uses a fresh user per test. The same no-purge copy of the reworked test times out.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 2: No tests for removed users, quota edits and deletes, or group membership changes (implementation verified)

The trickiest server logic is untested at every layer:

- `manage_users_and_groups_for_quota` announces the quota's current users before replacing them, "so the users the quota no longer applies to are told too". That's the point of the ordering, and no test removes a user.
- Quota amount edits and deletes.
- The `_set_group_users` / `_set_user_groups` symmetric-difference logic, and the short-circuit for groups without a quota. Only the single-add `PUT groups/{gid}/users/{uid}` path is tested.

Add integration tests in `test_history_sse.py`, reusing `_quota`/`_listening`, and unit-test the group paths, since the no-quota negative can't be checked over SSE without a timeout.

<details><summary>Details</summary>

The review branch adds four integration tests: removal from a quota (`in_users: []`), an amount change, quota deletion, and replacing a quota group's members via `PUT groups/{id}`. Each waits out the setup's events first, so it needs its own event. It also adds three unit tests in `test_quota.py` against the security agent's association setters: replaced group members (the ones who joined or left are told), a user's groups replaced (told only when a changed group has a quota), and no event for a group without a quota.

Still untested: `_remove_user_from_group` and group purge.

</details>

<details><summary>Evidence</summary>

Dropping the pre-replacement queueing in `manage_users_and_groups_for_quota` and the queueing in `_set_group_users` makes both removal integration tests time out. Dropping the `any_group_has_quota` check makes two of the three unit tests fail.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 3: No E2E test that the masthead meter updates live (implementation verified)

While SSE is connected, the client now skips its own refreshes (`refreshStorageUsageUnlessLive`). If anything broke between the event stream and `useSSE(onQuotaEvent, ["user_quota_update"])`, or in the config gate of `startWatchingStorageUsage`, the meter would go stale silently. Every current test would still pass: the integration tests stop at the stream, and Vitest mocks `useSSE`.

Add a Selenium integration test following `test/integration_selenium/test_entry_point_sse.py`.

<details><summary>Details</summary>

The review branch adds `test/integration_selenium/test_quota_meter_sse.py`. It turns on `enable_sse_updates` and `enable_quotas`, waits for `__galaxy_sse_connected`, and checks that the meter shows no limit. It then assigns the browser user a quota through the admin API and waits for the meter (`masthead.storage_dashboard_link`) to show "of …", without navigating. The test passes with Playwright. With the event for new quota users removed from `create_quota`, it times out.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 4: Quota-change announcements are scattered, and part of the quota policy sits on the RBAC agent (implementation verified)

The announcements are queued from 14 sites across `managers/quotas.py`, `managers/groups.py`, `managers/group_users.py` and `model/security.py`:

- `QuotaManager._queue_quota_update` already broadcasts for default quotas, but four call sites still inline `queue_user_quota_update(self.sa_session, broadcast=True)`.
- Every `set_default_quota` / `set_entity_quota_associations` call has a hand-written queue call before it, though `DatabaseQuotaAgent` owns those mutations.
- `queue_user_quota_update_for_group_changes` and `_any_group_has_quota` are quota policy, but they were added to `GalaxyRBACAgent`, and the managers reach them via `trans.app.security_agent`.

Move the announcers next to the quota agent and queue inside the agent's own mutations, so callers can't forget them. `galaxy.model.user_quota_updates` stays the transport.

<details><summary>Details</summary>

The review branch adds session-taking functions to `galaxy.quota`: `queue_quota_change`, `queue_quota_change_for_users_and_groups`, `queue_group_membership_change` and `any_group_has_quota`.

- `set_default_quota` now broadcasts itself.
- `set_entity_quota_associations` now queues the old and the new users itself.
- The four inline broadcasts and both security-agent helpers are gone.
- The managers and the security agent call the functions directly.

The diff is +88/-58, and the quota SSE integration tests pass on it.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: Quota-event work still runs with live updates off, through a nullable sender mode (implementation verified)

With `enable_sse_updates` off, the app installs the listener with `send=None`, and the listener just drops whatever was queued. The queueing sites still run queries whose only purpose is the event:

- `_set_user_groups`: the old-groups query and the quota check.
- `_set_group_users`: loading every member.
- The union query on each quota edit.
- An extra CTE in `relabel_quota_for_dataset`.

The `None` branch and the optional type exist only for this case.

Let installing the sender enable queueing, and skip the event-only work when it isn't installed.

<details><summary>Details</summary>

On the review branch, `send_user_quota_updates_on_commit` takes a required sender and sets a flag in the session factory's `info`. `user_quota_updates_enabled(session)` reads that flag. `queue_user_quota_update` and the query sites check it first, and the app installs the sender only when live updates are on. New unit tests cover queueing without a sender and enabling it for new sessions.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: `relabel_quota_for_dataset` runs the affected-users CTE again for the event

After the relabel transaction, the code runs `quota_affected_users` again just to get the owner ids. On PostgreSQL, the `FOR UPDATE` lock statement inside the transaction already returns those ids. Cross-device storage moves call this once per dataset.

Keep the lock statement's result, and run the separate SELECT only on SQLite. The review branch does this. The SQLite unit test passes. `TestCalculateUsagePostgres` inherits `test_relabel_announces_the_usage_change_to_the_owner`, so CI's PostgreSQL unit job covers the lock path, but it wasn't run locally because no PostgreSQL was available.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Claude Opus 5.5 at medium effort.

</details>

### P3 3: `test_quota.py` leaves its listeners on the shared session (implementation verified)

Both new `TestCalculateUsage` tests install `send_user_quota_updates_on_commit` on the class-shared session and never remove it. They also commit and `sent.clear()` to drain what earlier tests queued, so every later test runs with all the listeners installed before it.

Have `send_user_quota_updates_on_commit` return a remover. The review branch does this, and the tests now remove their listener in `finally`. With the P3 1 gating, the drain is no longer needed. Removing the `self.id is not None` guard in `adjust_total_disk_usage` still fails `test_adjusting_a_new_user_announces_nothing`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 4: The SSE test mock gives each event type one handler, the latest store's (implementation verified)

In `sseStoreSupport.ts`, each event type has a single handler, the most recently created store's. The real `useSSE` keeps a set per type and unsubscribes on scope dispose. The mismatch hides a real problem: switching the mock to fan out makes three `userStore.storageUsage` tests fail, because stores from earlier tests are never unsubscribed and keep receiving events.

Mirror the composable: fan out to every handler of the type, and remove a handler when its scope is disposed. The review branch does this. All seven suites that use the mock pass (123 tests).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 5: The storage-usage watcher grows `userStore` instead of living in its own unit

`userStore.ts` grows from 454 to 573 lines. The new code is self-contained and has nothing to do with user identity:

- six mutable closure flags (`watchingStorageUsage`, `liveUpdatesEnabled`, `refreshSkippedWhileHidden`, `catchUpOnWakeReconnect`, `connectedBefore`, `delayedRefreshPending`)
- three timers and five predicate helpers
- an SSE subscription

How the flags interact, such as which branch resets `refreshSkippedWhileHidden`, can't be checked without reading the whole store.

Extract a `useStorageUsageWatcher` composable, or move the watcher into `quotaUsageStore`, which already owns the usage data. Model its state as one explicit type (`"idle" | "polling" | "live" | "awaitingReconnect"`) instead of independent booleans. The shared SSE composable the PR lists as a follow-up then becomes a lift of an existing unit. This is P3 rather than the original P2 because part of the concern overlaps that declared follow-up. It isn't fixed on the branch: the move plus test rewiring is estimated at over 250 changed lines.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort.

</details>

### P3 6 (follow-up): Generalize "dispatch an SSE event after commit"

`galaxy.model.user_quota_updates` is a good pattern (queue on `session.info`, send after commit, drop on rollback, batch per process), but it is specific to quotas. `InteractiveToolManager` (`lib/galaxy/managers/interactivetool.py:214-226`) hand-rolls the same idea for `entry_point_update`. A generic helper would let the next event type reuse it instead of adding another bespoke module. This fits as a follow-up next to the client-side composable the PR already lists.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort.

</details>

### P3 7: The PR description's NOTE no longer matches the code

The NOTE says finished jobs and new datasets don't send the event, and that #24664's history-size refreshes stay. Since 3f2a91f, `User.adjust_total_disk_usage` queues an event on every change, and `test_user_quota_update_after_job_finishes` asserts that a finished job sends one. Since ad7dc0a, `watchOwnHistorySize` is gone, so one change causes one usage request, not two. The "Changes" list also leaves out job finishes and uploads. Please update the description, since reviewers and the changelog will read it.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort, by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort and by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Claude Opus 5.5 at medium effort.

</details>
