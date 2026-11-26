# #24738 test challenges debrief

Reviewed commit `c55d04482f9` (diff vs `git merge-base origin/dev HEAD`). Review mode: recommendations only; nothing in the PR was edited and no tests were run.

## Tests in the PR

| Test | Layer | Verdict |
| --- | --- | --- |
| `test/unit/data/model/test_user_quota_updates.py` (8 tests) | unit, real in-memory SQLite session, no mocks | Keep. Exercises commit/rollback/once-only/failing-sender semantics of a new module through its public functions; batcher tests use a real timer. Not reachable as deterministically from the API. |
| `test/unit/data/test_quota.py::test_relabel_announces_the_usage_change_to_the_owner` | unit | Keep (an integration version needs a multi-quota-source object store config). Listener install is leaky, see below. |
| `test/unit/data/test_quota.py::test_adjusting_a_new_user_announces_nothing` | unit | Keep; regression for `Don't queue quota events for users not saved yet`. Same leak. |
| `test/integration/test_history_sse.py` 6 new `test_user_quota_update_*` tests | integration | Good layer and helper reuse (`SSELineListener`, `create_quota`, `create_group`). Two of them don't discriminate, see below. |
| `client/src/stores/userStore.storageUsage.test.ts` | Vitest, MSW server mock + `sseMockFactory` | Keep. Store-level timing logic (throttle, random spread, reconnect catch-up, wake timeout) is not practical E2E. Uses existing shared `sseStoreSupport` and MSW rather than bespoke mocks. |
| `client/src/stores/historyStore.test.ts` | Vitest | Five tests of the removed `watchOwnHistorySize` replaced by one guard that history size changes no longer refresh the user under SSE. Not a weakening: the behavior was intentionally moved server side. |
| `client/src/stores/_testing/sseStoreSupport.ts` | test util | Good reusable extension (per-event-type routing) rather than a per-test mock. |

## Challenges

### Integration tests that can pass without the behavior

`test_user_quota_update_after_dataset_purge` uses the shared default user and creates its dataset with `wait=True` immediately before starting the listener. The job finishing queues a `user_quota_update` that `UserQuotaUpdateBatcher` holds for up to 1 s before sending, and `SSELineListener.start()` typically returns well within that, so the listener can see the job's event and pass even if purging announced nothing. `test_user_quota_update_after_job_finishes` also uses the shared default user, so a batched event left over from an earlier test in the class (e.g. the purge) can satisfy it. The broadcast test already documents this cross-test leakage in a comment.

Recommendation: give each of these tests a fresh user (`_setup_user_get_key` + `_populator_for_user`, already used by the class), and in the purge test first wait for the upload's event in a listener, then open a second listener (or record the event count) before purging, and require a new event.

### Untested announce paths with explicit intent

`QuotaManager.edit_quota`'s users/groups path queues the old associations first, commented "so the users the quota no longer applies to are told too", but no test removes a user from a quota. Amount changes (`_queue_quota_update` in the amount path) and quota delete/undelete are also untested. Each is a few lines with the existing `_quota` / `_listening` helpers: create a quota with `in_users=[user]`, start the user's listener, `PUT quotas/{id}` with `in_users=[]` (or a new amount, or `DELETE`), wait for the event.

Group paths: only `PUT groups/{gid}/users/{uid}` is covered. `_remove_user_from_group`, `_set_group_users` (group update with `user_ids`), `_set_user_groups`, group purge, and the `_any_group_has_quota` short-circuit (no event for groups without a quota) are untested. The negative case is awkward over SSE (needs a timeout); a unit test with the `sent` list pattern from `test_quota.py` against `GalaxyRBACAgent` would cover the symmetric-difference and no-quota logic deterministically.

### Leaky listener installation in `test_quota.py`

Both new `TestCalculateUsage` tests call `send_user_quota_updates_on_commit(self.model.session, sent.append)` on the class-shared scoped session and never remove the listener, then commit and `sent.clear()` to drain updates queued by earlier tests (the comment says so). Every later test in the class runs with all previously installed listeners. Recommend having `send_user_quota_updates_on_commit` return a remover (`event.remove` for both listeners), or a small context manager / fixture in the test that installs, drains `session.info`, and removes, so the tests don't depend on ordering.

### Helper reuse in the new integration tests

- `test_user_quota_update_after_usage_recalculation` hand-rolls `put("users/current/recalculate_disk_usage")`; `DatasetPopulator.recalculate_disk_usage()` exists (and waits on the task). Use `self._populator_for_user(user_api_key).recalculate_disk_usage()`.
- `_quota` cleanup issues `PUT quotas/{id}` and `DELETE quotas/{id}` raw; `PUT groups/{gid}/users/{uid}` is also raw. Quota update/delete and group-user add are repeated across `lib/galaxy_test/api/test_quotas.py`/`test_groups.py`; moving them into `DatasetPopulator` (next to `create_quota`/`create_group`) would let the extra tests above stay short. Minor.

### E2E

No Selenium/Playwright test proves the user-visible claim: the masthead quota meter changes without a reload or refocus. The PR also suppresses the old client-side refreshes when SSE is connected (`refreshStorageUsageUnlessLive`), so if the event pipeline broke end to end (e.g. `SSE_EVENT_TYPES`/`useSSE` subscription, config gating in `startWatchingStorageUsage`), the meter would silently stop updating and no current test would catch it: the integration tests stop at the SSE stream and the Vitest tests mock `useSSE`. `test/integration_selenium/test_entry_point_sse.py` already has the pattern (`enable_sse_updates`, `__galaxy_sse_connected`). A deterministic scenario: `enable_quotas` + `enable_sse_updates`, open home, wait for SSE connected, assign a quota to the browser user via the admin API, and wait for the meter (`.quota-meter`, add a `masthead.quota_meter` navigation selector) to show "of 1 TB" (or similar) with no navigation.

## Test plan

1. Rework the purge and job-finish integration tests to use fresh users and to require an event after the action (P2).
2. Add integration tests for quota user removal and amount change/delete (P2); unit test for group membership paths incl. no-quota short-circuit (P3).
3. Add one Selenium integration test for the live masthead meter update (P2).
4. Make the `test_quota.py` listener installation removable/scoped (P3).
5. Use `recalculate_disk_usage()` and consider populator helpers for quota update/delete and group-user add (P3).
