# #24738 test challenges review

- Profile: [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md)
- Model: Claude Opus 5.5, effort low
- Reviewed commit: `c55d04482f9`
- Details and test plan: [test_challenges_debrief.md](test_challenges_debrief.md)

Overall the test layering is good: new backend module tested with a real SQLite session (no mocks), event fan-out tested at integration level via the existing `SSELineListener`, and client timing logic tested in Vitest with the shared `sseStoreSupport` and MSW. The removed `historyStore` tests track behavior that moved server side, not a weakening. Findings below are about discrimination and gaps.

### P2 1: Purge and job-finish SSE tests can pass without the behavior

`test_user_quota_update_after_dataset_purge` starts its listener right after `new_dataset(..., wait=True)`; the job's own `user_quota_update` sits in `UserQuotaUpdateBatcher` for up to 1 s, so it can reach the listener and satisfy `wait_for_event` even if purging sent nothing. `test_user_quota_update_after_job_finishes` shares the default user with the other tests, so a leftover batched event can satisfy it too.

Use a fresh user per test (`_setup_user_get_key` + `_populator_for_user`); in the purge test wait for the upload's event first, then start a new listener before purging.

### P2 2: No test for users dropped from a quota, quota amount changes, or quota delete

`QuotaManager` queues the old associations before replacing them ("so the users the quota no longer applies to are told too"), and queues on amount change and delete/undelete; none is exercised. Each is a short addition with the existing `_quota`/`_listening` helpers: user in quota → listen → `PUT quotas/{id}` with `in_users=[]` / new amount, or `DELETE` → wait for the event.

### P2 3: No E2E test that the masthead meter updates live

With SSE connected the client now skips its own refreshes (`refreshStorageUsageUnlessLive`), so a break anywhere between the SSE stream and `useSSE(onQuotaEvent, ["user_quota_update"])` / the config gate in `startWatchingStorageUsage` would leave the meter stale while every current test passes (integration stops at the stream; Vitest mocks `useSSE`). Add a Selenium integration test following `test/integration_selenium/test_entry_point_sse.py`: `enable_quotas` + `enable_sse_updates`, wait for `__galaxy_sse_connected`, assign a quota to the browser user via the admin API, and wait for `.quota-meter` (new `masthead.quota_meter` selector) to show the limit without navigating.

### P3 1: Group membership announce paths untested

Only `PUT groups/{gid}/users/{uid}` is covered. `_remove_user_from_group`, `_set_group_users`, `_set_user_groups` (symmetric difference), group purge, and the `_any_group_has_quota` short-circuit aren't. A unit test with the `sent`-list pattern from `test_quota.py` against the security agent covers the no-quota negative deterministically, which SSE can't without a timeout.

### P3 2: `test_quota.py` listeners leak across tests

Both new tests install `send_user_quota_updates_on_commit` on the class-shared session without removing it and drain earlier tests' pending updates with a commit + `sent.clear()`. Return a remover from `send_user_quota_updates_on_commit` (or wrap install/drain/remove in a fixture) so tests don't depend on order or accumulate listeners.

### P3 3: Use existing populator helpers

`test_user_quota_update_after_usage_recalculation` hand-rolls `PUT users/current/recalculate_disk_usage`; use `DatasetPopulator.recalculate_disk_usage()`. Raw `PUT/DELETE quotas/{id}` and `PUT groups/{gid}/users/{uid}` would be worth populator helpers next to `create_quota`/`create_group`, especially if P2 2 adds more callers.
