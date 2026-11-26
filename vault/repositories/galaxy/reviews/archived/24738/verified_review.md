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
