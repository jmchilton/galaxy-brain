# Branch `pr_24738_round_0_rev_0`

Branched from `c55d04482f9`; pushed to [jmchilton/galaxy](https://github.com/jmchilton/galaxy/tree/pr_24738_round_0_rev_0), not into the PR.

The branch hardens the quota SSE tests and tidies the server-side plumbing:

- The purge and job-finish integration tests now need their own event.
- New integration, unit and Playwright tests cover removed users, quota edits and deletes, group membership changes, and the live masthead meter.
- The quota-change announcers move off the RBAC agent into `galaxy.quota`, and `DatabaseQuotaAgent` queues inside its own mutations.
- Event-only work is skipped when live updates are off.
- The relabel path reuses the PostgreSQL lock's owner ids.
- Test listeners become removable, and the client SSE mock fans out like the real composable.

Commits:

- `845819867ff` Make the job-finish and purge quota SSE tests require their own event: fresh users, and the purge test waits out the upload's batched events before requiring a new one. (P2 1)
- `45949341b08` Test the quota SSE events for removed users, amount edits and deletes: four integration tests, plus the `_update_quota`/`_delete_quota`/`_quota_payload` helpers. (P2 2)
- `9fbbdeb79c8` Move the quota change announcers from the RBAC agent to galaxy.quota: session-taking functions in `galaxy.quota`, with queueing inside `set_default_quota` and `set_entity_quota_associations`. (P2 4)
- `d6eddcc25d1` Skip quota event queries when live updates are off: installing the sender enables queueing through the session factory's `info`, which drops the `None` sender mode. (P3 1)
- `d81bfaaec65` Reuse the relabel lock's user ids for the quota event on PostgreSQL: only SQLite runs the extra owner query. (P3 2)
- `74917950ae9` Remove the quota update listeners the unit tests install: `send_user_quota_updates_on_commit` returns a remover, used by `test_quota.py`. (P3 3)
- `9655f4bd9ec` Fan out mocked SSE events to every subscribed store: per-type handler sets, removed on scope dispose, as in `useSSE`. (P3 4)
- `7f38cd1791e` Unit test the group membership quota events: replaced group members, replaced user groups, and the no-quota short-circuit. (P2 2)
- `a398cbe13c4` E2E test that the masthead quota meter updates live: a Playwright/Selenium integration test that assigns a quota and waits for the meter. (P2 3)

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
