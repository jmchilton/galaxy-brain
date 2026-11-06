# Test challenges debrief: #24706

Profile gx_test_challenger, model claude-opus-5-5, medium effort. Reviewed commit `5006c8fbfe3a91c7f12f628fdd543c478f1854fa`, compared with `origin/dev` (`78816c01d93`).

Static review. No tests were run: the worktree has no `.venv` or `client/node_modules`. "Passes on origin/dev" and mutation claims below come from reading the code.

## Verdict

The API tests are the right layer and mostly strong. `test_index_sort_by_size` asserts both directions and the id tiebreak on ties. Three gaps are worth closing: no E2E test for a user-facing sort, a 400 assertion that passes without the feature, and no test for the new default page size.

## Challenge of each added test

| Test | Decision | Reason |
|---|---|---|
| API `test_index_sort_by_size` | Keep, extend | Real ordering through real data, on Postgres in CI. Doesn't check paging or `total_matches`, which the list's pager reads. |
| API `test_index_sort_by_size_requires_own_histories` | Strengthen | Status-only 400. See below. |
| API `test_index_sort_by_size_requires_own_histories_for_admins` | Strengthen | Its 400 has the same weakness, but its 200 half is discriminating. |
| API `test_index_query_limit_is_capped` | Keep, extend | Red on `origin/dev` (`model_construct` skipped the bound). Boundary is well chosen. The default isn't covered. |
| Vitest `starts on update time when it is one of the given sort options` | Keep | Real component logic, no API or E2E equivalent worth writing. |
| Vitest `starts on the first given sort option without update time` | Keep | Covers the remaining branch of `initialSortBy`, which preserves prior behavior. |
| Vitest `sorts by size, largest first` | Drop once E2E exists | `listedNames` reads back the order the mock returned, so "largest first" isn't tested. Request parameters are covered by E2E. |
| Vitest `offers no size sort for %s histories` | Keep, tidy mocks | Guards the client against a server 400 on three tabs; not worth three E2E tests. |

## Weak 400 assertions

On `origin/dev`, `size` isn't in `HistorySortByEnum`, so FastAPI rejects `sort_by=size` with a literal error. `validation_error_to_message_exception` maps that to `RequestParameterInvalidException`, a 400. The same class is raised by the new guard, so the error code doesn't discriminate either. `test_index_sort_by_size_requires_own_histories` therefore passes with no implementation, and would keep passing if `size` were dropped from the enum. The error message does discriminate.

## Uncovered default page size

`LimitQueryParam` defaults to `None`, and `limit: int | None` accepts `None`. Only the dict comprehension that drops `None` values gives an omitted `limit` the payload default of 100. Removing the comprehension restores the unbounded response the PR description says it fixes, and every test still passes. `test_index_query_limit_is_capped` always sends `limit`.

## Ruled out

- Stale `sortBy=size` after a tab switch, which would send a 400-producing request from Shared or Published. `Analysis.vue` keys `router-view` by `route.fullPath`, so each tab remounts `HistoryList` and `ListHeader`. No test needed.
- `total_matches` being skewed by the added column. `get_count` runs before `add_columns`. Still worth an assertion, since paging is the client contract.

## Test plan

### E2E: add to `lib/galaxy_test/selenium/test_histories_list.py`

`test_sort_by_name` is the direct precedent and `histories.sort_button` already exists, so no `navigation.yml` change is needed. Only this layer proves the My Histories request is accepted by the real server guard, since Vitest mocks `getMyHistories`.

Use a new class with a fresh user rather than `TestSavedHistories`. That class shares one user across tests, and `test_bulk_open_in_multiview_limit_confirmation` alone adds 11 histories, so empty histories could push a sized one off the 24-card page in the ascending check. `TestHistoryMultiView` shows the `ensure_registered` pattern.

```python
class TestHistoriesListSortByStorage(SeleniumTestCase):
    ensure_registered = True

    @selenium_test
    def test_sort_by_storage_used(self):
        large_name = self._get_random_name()
        small_name = self._get_random_name()
        large_id = self.dataset_populator.new_history(large_name)
        self.dataset_populator.new_dataset(large_id, content="1\t2\t3\n" * 100, wait=True)
        small_id = self.dataset_populator.new_history(small_name)
        self.dataset_populator.new_dataset(small_id, content="1\t2\t3\n", wait=True)
        self.navigate_to_histories_page()

        histories = self.components.histories
        # The first click selects the field, descending; the second switches to ascending.
        histories.sort_button(field="Storage used", direction="ascending").wait_for_and_click()
        histories.list_loading.wait_for_absent()
        self._assert_order([large_name, small_name])

        histories.sort_button(field="Storage used", direction="ascending").wait_for_and_click()
        histories.sort_button(field="Storage used", direction="descending").wait_for_visible()
        histories.list_loading.wait_for_absent()
        self._assert_order([small_name, large_name])

    @retry_assertion_during_transitions
    def _assert_order(self, expected):
        # The registered user also has an empty current history.
        titles = self.get_history_titles(len(expected))
        assert [title for title in titles if title in expected] == expected
```

Reasoned only, per the Selenium guidance; the verifier should run it once.

### API: `lib/galaxy_test/api/test_histories.py`

Assert the message on both rejection tests:

```python
assert_error_message_contains(response, "Sorting by size requires")  # from galaxy_test.base.api_asserts
```

Default page size, with a fresh user:

```python
def test_index_query_limit_defaults_to_100(self):
    with self._different_user(f"user_{uuid4()}@bx.psu.edu"):
        unique_id = uuid4().hex
        for i in range(101):
            self._create_history(f"history_{i}_{unique_id}")
        response = self._index_search(search=unique_id, show_published=False)
        assert len(response.json()) == 100
        assert response.headers["total_matches"] == "101"
```

Paging, appended to `test_index_sort_by_size`, which has four histories:

```python
data.update(limit=2, offset=1)
response = self._get("histories", data=data)
assert [history["id"] for history in response.json()] == [small, empty_second]
assert response.headers["total_matches"] == "4"
```

Non-admin fallback, for `not show_published and not show_shared and not is_admin`:

```python
data = dict(search=unique_id, show_own=False, show_published=False, sort_by="size")
self._assert_status_code_is(self._get("histories", data=data), 200)
```

Helper: this PR adds seven `self._get("histories", data=...)` calls to a file with many more, most followed by a status check and all needing `search`. Add `_index_search(self, **params)` to the test class and use it in the new tests. Migrating older tests isn't needed here.

### Vitest

- Drop `sorts by size, largest first` once the E2E test lands. If E2E is declined, keep it, rename it `requests a size sort, descending first`, and remove the `listedNames` assertion.
- In `offers no size sort`, mock only the fetcher the list uses. The current loop queues a `mockResolvedValueOnce` on all three and leaves two unconsumed per case:

```ts
const FETCHERS = { shared: getSharedHistories, published: getPublishedHistories, archived: getArchivedHistories };
vi.mocked(FETCHERS[list]).mockResolvedValueOnce(historiesResponse([]) as never);
```

## Other observation

The `HistoryList.vue` comment says the server sorts by size "only when listing the user's own, non-archived histories". The manager guard doesn't check `show_archived`, so `show_own=true&show_archived=true&sort_by=size` is accepted. The Archived tab lacks the option because it calls `GET /api/histories/archived`, which has no `sort_by` parameter.
