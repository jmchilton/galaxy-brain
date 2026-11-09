(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_reviews/reviewers/learning_galaxy.md) was run via Claude Opus 5.5 at medium effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

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

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24738_round_0_rev_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

# Branch [`pr_24738_round_0_rev_0`](https://github.com/jmchilton/galaxy/tree/pr_24738_round_0_rev_0)

Branched from `c55d04482f9`; pushed to [jmchilton/galaxy](https://github.com/jmchilton/galaxy/tree/pr_24738_round_0_rev_0).

The branch hardens the quota SSE tests and tidies the server-side plumbing:

- The purge and job-finish integration tests now need their own event.
- New integration, unit and Playwright tests cover removed users, quota edits and deletes, group membership changes, and the live masthead meter.
- The quota-change announcers move off the RBAC agent into `galaxy.quota`, and `DatabaseQuotaAgent` queues inside its own mutations.
- Event-only work is skipped when live updates are off.
- The relabel path reuses the PostgreSQL lock's owner ids.
- Test listeners become removable, and the client SSE mock fans out like the real composable.

Commits:

- [`845819867ff`](https://github.com/jmchilton/galaxy/commit/845819867ff) Make the job-finish and purge quota SSE tests require their own event: fresh users, and the purge test waits out the upload's batched events before requiring a new one. (P2 1)
- [`45949341b08`](https://github.com/jmchilton/galaxy/commit/45949341b08) Test the quota SSE events for removed users, amount edits and deletes: four integration tests, plus the `_update_quota`/`_delete_quota`/`_quota_payload` helpers. (P2 2)
- [`9fbbdeb79c8`](https://github.com/jmchilton/galaxy/commit/9fbbdeb79c8) Move the quota change announcers from the RBAC agent to galaxy.quota: session-taking functions in `galaxy.quota`, with queueing inside `set_default_quota` and `set_entity_quota_associations`. (P2 4)
- [`d6eddcc25d1`](https://github.com/jmchilton/galaxy/commit/d6eddcc25d1) Skip quota event queries when live updates are off: installing the sender enables queueing through the session factory's `info`, which drops the `None` sender mode. (P3 1)
- [`d81bfaaec65`](https://github.com/jmchilton/galaxy/commit/d81bfaaec65) Reuse the relabel lock's user ids for the quota event on PostgreSQL: only SQLite runs the extra owner query. (P3 2)
- [`74917950ae9`](https://github.com/jmchilton/galaxy/commit/74917950ae9) Remove the quota update listeners the unit tests install: `send_user_quota_updates_on_commit` returns a remover, used by `test_quota.py`. (P3 3)
- [`9655f4bd9ec`](https://github.com/jmchilton/galaxy/commit/9655f4bd9ec) Fan out mocked SSE events to every subscribed store: per-type handler sets, removed on scope dispose, as in `useSSE`. (P3 4)
- [`7f38cd1791e`](https://github.com/jmchilton/galaxy/commit/7f38cd1791e) Unit test the group membership quota events: replaced group members, replaced user groups, and the no-quota short-circuit. (P2 2)
- [`a398cbe13c4`](https://github.com/jmchilton/galaxy/commit/a398cbe13c4) E2E test that the masthead quota meter updates live: a Playwright/Selenium integration test that assigns a quota and waits for the meter. (P2 3)

## Tests run

All were run one at a time on the branch.

- `test/integration/test_history_sse.py -k user_quota_update`: 10 passed, after the refactor and the SSE-off commits.
- `test/unit/data/test_quota.py` and `test/unit/data/model/test_user_quota_updates.py`: 48 passed. The 22 skipped are PostgreSQL-only.
- Vitest, seven suites that use `sseStoreSupport`: 123 passed.
- `test/integration_selenium/test_quota_meter_sse.py` with Playwright: passed.

Red checks:

- The old purge test passes with no purge, and the new one times out.
- With the pre-replacement and `_set_group_users` queueing removed, both removal tests time out.
- With `any_group_has_quota` disabled, 2 of the 3 group unit tests fail.
- With the `create_quota` user event removed, the E2E test times out.
- With the new-user guard removed, the new-user unit test fails.

Mypy on the touched modules adds no errors compared with the base.

</details>

</details>

### P2 1: The purge SSE test passes even if purging sends nothing (implementation verified)

`test_user_quota_update_after_dataset_purge` opens its listener right after `new_dataset(..., wait=True)` returns. The job finish queues its own `user_quota_update`, which `UserQuotaUpdateBatcher` holds for up to 1 s, so the listener receives it and `wait_for_event` succeeds before the purge is even checked. `test_user_quota_update_after_job_finishes` uses the shared default user too, so an event left batched by an earlier test in the class could satisfy it.

<details><summary>Evidence</summary>

A copy of the purge test with the purge call removed passes against the PR head.

</details>

Give each test a fresh user. In the purge test, wait until the upload's batched events have arrived, then require a new event after the purge.

<details><summary>Details</summary>

The review branch adds `_wait_until_quiet` (waits for the setup's event, then until none arrives for longer than the batch interval) and `_expect_new_user_quota_update` (requires the event count to grow). It also uses a fresh user per test. The same no-purge copy of the reworked test times out.

</details>

Fixed on the review branch in [`845819867ff`](https://github.com/jmchilton/galaxy/commit/845819867ff).

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

Fixed on the review branch in [`45949341b08`](https://github.com/jmchilton/galaxy/commit/45949341b08) and [`7f38cd1791e`](https://github.com/jmchilton/galaxy/commit/7f38cd1791e).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 3: No E2E test that the masthead meter updates live (implementation verified)

While SSE is connected, the client now skips its own refreshes (`refreshStorageUsageUnlessLive`). If anything broke between the event stream and `useSSE(onQuotaEvent, ["user_quota_update"])`, or in the config gate of `startWatchingStorageUsage`, the meter would go stale silently. Every current test would still pass: the integration tests stop at the stream, and Vitest mocks `useSSE`.

Add a Selenium integration test following `test/integration_selenium/test_entry_point_sse.py`.

<details><summary>Details</summary>

The review branch adds `test/integration_selenium/test_quota_meter_sse.py`. It turns on `enable_sse_updates` and `enable_quotas`, waits for `__galaxy_sse_connected`, and checks that the meter shows no limit. It then assigns the browser user a quota through the admin API and waits for the meter (`masthead.storage_dashboard_link`) to show "of …", without navigating. The test passes with Playwright. With the event for new quota users removed from `create_quota`, it times out.

</details>

Fixed on the review branch in [`a398cbe13c4`](https://github.com/jmchilton/galaxy/commit/a398cbe13c4).

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

Fixed on the review branch in [`9fbbdeb79c8`](https://github.com/jmchilton/galaxy/commit/9fbbdeb79c8).

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

Fixed on the review branch in [`d6eddcc25d1`](https://github.com/jmchilton/galaxy/commit/d6eddcc25d1).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: `relabel_quota_for_dataset` runs the affected-users CTE again for the event

After the relabel transaction, the code runs `quota_affected_users` again just to get the owner ids. On PostgreSQL, the `FOR UPDATE` lock statement inside the transaction already returns those ids. Cross-device storage moves call this once per dataset.

Keep the lock statement's result, and run the separate SELECT only on SQLite. The review branch does this. The SQLite unit test passes. `TestCalculateUsagePostgres` inherits `test_relabel_announces_the_usage_change_to_the_owner`, so CI's PostgreSQL unit job covers the lock path, but it wasn't run locally because no PostgreSQL was available.

Fixed on the review branch in [`d81bfaaec65`](https://github.com/jmchilton/galaxy/commit/d81bfaaec65).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Claude Opus 5.5 at medium effort.

</details>

### P3 3: `test_quota.py` leaves its listeners on the shared session (implementation verified)

Both new `TestCalculateUsage` tests install `send_user_quota_updates_on_commit` on the class-shared session and never remove it. They also commit and `sent.clear()` to drain what earlier tests queued, so every later test runs with all the listeners installed before it.

Have `send_user_quota_updates_on_commit` return a remover. The review branch does this, and the tests now remove their listener in `finally`. With the P3 1 gating, the drain is no longer needed. Removing the `self.id is not None` guard in `adjust_total_disk_usage` still fails `test_adjusting_a_new_user_announces_nothing`.

Fixed on the review branch in [`74917950ae9`](https://github.com/jmchilton/galaxy/commit/74917950ae9).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 4: The SSE test mock gives each event type one handler, the latest store's (implementation verified)

In `sseStoreSupport.ts`, each event type has a single handler, the most recently created store's. The real `useSSE` keeps a set per type and unsubscribes on scope dispose. The mismatch hides a real problem: switching the mock to fan out makes three `userStore.storageUsage` tests fail, because stores from earlier tests are never unsubscribed and keep receiving events.

Mirror the composable: fan out to every handler of the type, and remove a handler when its scope is disposed. The review branch does this. All seven suites that use the mock pass (123 tests).

Fixed on the review branch in [`9655f4bd9ec`](https://github.com/jmchilton/galaxy/commit/9655f4bd9ec).

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
