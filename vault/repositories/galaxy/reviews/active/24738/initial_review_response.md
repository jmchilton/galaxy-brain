

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

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24738_round_0_rev_1) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

# Branch [`pr_24738_round_0_rev_1`](https://github.com/jmchilton/galaxy/tree/pr_24738_round_0_rev_1)

Branched from `c55d04482f9`; pushed to [jmchilton/galaxy](https://github.com/jmchilton/galaxy/tree/pr_24738_round_0_rev_1), not into the PR. Trimmed from `pr_24738_round_0_rev_0` to the findings John kept.

The branch moves the quota-change announcers off the RBAC agent into `galaxy.quota`, with `DatabaseQuotaAgent` queueing inside its own mutations. It skips event-only work when live updates are off, reuses the PostgreSQL lock's owner ids on relabel, makes the unit tests' listeners removable, and adds a Playwright/Selenium test that the masthead meter updates live.

Commits:

- [`f13b1b3acfa`](https://github.com/jmchilton/galaxy/commit/f13b1b3acfa) Move the quota change announcers from the RBAC agent to galaxy.quota: session-taking functions in `galaxy.quota`, with queueing inside `set_default_quota` and `set_entity_quota_associations`. (P2 4)
- [`8f56f540c7d`](https://github.com/jmchilton/galaxy/commit/8f56f540c7d) Skip quota event queries when live updates are off: installing the sender enables queueing through the session factory's `info`, which drops the `None` sender mode. (P3 1)
- [`319a0e908da`](https://github.com/jmchilton/galaxy/commit/319a0e908da) Reuse the relabel lock's user ids for the quota event on PostgreSQL: only SQLite runs the extra owner query. (P3 2)
- [`ca74e072a2e`](https://github.com/jmchilton/galaxy/commit/ca74e072a2e) Remove the quota update listeners the unit tests install: `send_user_quota_updates_on_commit` returns a remover, used by `test_quota.py`. (P3 3)
- [`b769ef2143b`](https://github.com/jmchilton/galaxy/commit/b769ef2143b) E2E test that the masthead quota meter updates live: a Playwright/Selenium integration test that assigns a quota and waits for the meter. (P2 3)

## Tests run

All commits cherry-picked cleanly from rev_0, where their tests passed (see [round_0_rev_0_branch_details.md](https://github.com/jmchilton/galaxy-brain/blob/main/vault/repositories/galaxy/reviews/active/24738/round_0_rev_0_branch_details.md)). On this branch:

- `test/unit/data/test_quota.py` and `test/unit/data/model/test_user_quota_updates.py`: 45 passed, 22 PostgreSQL-only skipped.
- `test/integration_selenium/test_quota_meter_sse.py`: collects; not re-run.

</details>

</details>

### P2 3: No E2E test that the masthead meter updates live (implementation verified)

While SSE is connected, the client now skips its own refreshes (`refreshStorageUsageUnlessLive`). If anything broke between the event stream and `useSSE(onQuotaEvent, ["user_quota_update"])`, or in the config gate of `startWatchingStorageUsage`, the meter would go stale silently. Every current test would still pass: the integration tests stop at the stream, and Vitest mocks `useSSE`.

Add a Selenium integration test following `test/integration_selenium/test_entry_point_sse.py`.

<details><summary>Details</summary>

The review branch adds `test/integration_selenium/test_quota_meter_sse.py`. It turns on `enable_sse_updates` and `enable_quotas`, waits for `__galaxy_sse_connected`, and checks that the meter shows no limit. It then assigns the browser user a quota through the admin API and waits for the meter (`masthead.storage_dashboard_link`) to show "of …", without navigating. The test passes with Playwright. With the event for new quota users removed from `create_quota`, it times out.

</details>

Fixed on the review branch in [`b769ef2143b`](https://github.com/jmchilton/galaxy/commit/b769ef2143b).

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

Fixed on the review branch in [`f13b1b3acfa`](https://github.com/jmchilton/galaxy/commit/f13b1b3acfa).

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

Fixed on the review branch in [`8f56f540c7d`](https://github.com/jmchilton/galaxy/commit/8f56f540c7d).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: `relabel_quota_for_dataset` runs the affected-users CTE again for the event

After the relabel transaction, the code runs `quota_affected_users` again just to get the owner ids. On PostgreSQL, the `FOR UPDATE` lock statement inside the transaction already returns those ids. Cross-device storage moves call this once per dataset.

Keep the lock statement's result, and run the separate SELECT only on SQLite. The review branch does this. The SQLite unit test passes. `TestCalculateUsagePostgres` inherits `test_relabel_announces_the_usage_change_to_the_owner`, so CI's PostgreSQL unit job covers the lock path, but it wasn't run locally because no PostgreSQL was available.

Fixed on the review branch in [`319a0e908da`](https://github.com/jmchilton/galaxy/commit/319a0e908da).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Claude Opus 5.5 at medium effort.

</details>

### P3 3: `test_quota.py` leaves its listeners on the shared session (implementation verified)

Both new `TestCalculateUsage` tests install `send_user_quota_updates_on_commit` on the class-shared session and never remove it. They also commit and `sent.clear()` to drain what earlier tests queued, so every later test runs with all the listeners installed before it.

Have `send_user_quota_updates_on_commit` return a remover. The review branch does this, and the tests now remove their listener in `finally`. With the P3 1 gating, the drain is no longer needed. Removing the `self.id is not None` guard in `adjust_total_disk_usage` still fails `test_adjusting_a_new_user_announces_nothing`.

Fixed on the review branch in [`ca74e072a2e`](https://github.com/jmchilton/galaxy/commit/ca74e072a2e).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>
