# Test challenges review: #24706

Profile gx_test_challenger, model claude-opus-5-5, medium effort. Reviewed commit `5006c8fbfe3a91c7f12f628fdd543c478f1854fa`, compared with `origin/dev`.

Static review; no tests were run. Test plan and code sketches: [test_challenges_debrief.md](test_challenges_debrief.md).

**Verdict:** no P1s. API tests sit at the right layer and the ordering test is strong. Three gaps should close before merge.

## P2 1: No E2E test for sorting by storage used

This is a user-facing control, and its sibling `test_sort_by_name` has an E2E test in `lib/galaxy_test/selenium/test_histories_list.py`. Vitest mocks `getMyHistories` and the API tests build their own query flags, so nothing proves the My Histories request passes the new server guard and renders in size order.

Add `test_sort_by_storage_used` in a new fresh-user class in that file: three histories of different sizes, created in an order matching neither size order, click "Storage used", assert largest first, click again, assert smallest first. `histories.sort_button` already covers the selector. `TestSavedHistories` shares one user with many empty histories, which could push a sized one off the page.

## P2 2: Rejection test passes without the feature

`test_index_sort_by_size_requires_own_histories` asserts only a 400. On `origin/dev`, `sort_by=size` is already a 400: it fails the `HistorySortByEnum` literal check, and `validation_error_to_message_exception` maps that to `RequestParameterInvalidException`, the class the new guard raises. So neither status nor error code tells the two apart, and the test stays green if `size` leaves the enum. The 400 half of `..._for_admins` has the same weakness.

Assert the message in both: `assert_error_message_contains(response, "Sorting by size requires")`.

## P2 3: New default page size is untested

The description says omitting `limit` used to return every match and now returns 100. Only the `None`-dropping comprehension in `FastAPIHistories.index` delivers that: `LimitQueryParam` defaults to `None` and the payload's `limit` accepts `None`. Remove the comprehension and the listing is unbounded again with all tests green, because `test_index_query_limit_is_capped` always sends `limit`.

Add an API test with a fresh user and 101 empty histories, omitting `limit`, asserting 100 entries and `total_matches == "101"`.

## P3 1: Size sort doesn't cover paging

`test_index_sort_by_size` never sends `limit` or `offset` or reads `total_matches`, although the description cites stable paging and the list's pager uses that header. Append `limit=2, offset=1` to the descending query, asserting `[small, empty_second]` and `total_matches == "4"`.

## P3 2: Non-admin fallback of the own-only guard is untested

`filter_own` is also true for a non-admin sending `show_own=False, show_published=False`. No test covers that case returning 200, so narrowing `own_only` to `show_own` would go unnoticed. Add one request to `test_index_sort_by_size`.

## P3 3: "sorts by size, largest first" doesn't test that

`listedNames` reads back the order the mock returned, so the title overclaims. Drop the test once the E2E test lands. If E2E is declined, rename it `requests a size sort, descending first` and remove the `listedNames` assertion.

## P3 4: `offers no size sort` over-mocks

The loop queues `mockResolvedValueOnce` on all three fetchers per case and leaves two unconsumed. Map `list` to its fetcher and mock only that one.

## P3 5: Repeated index requests need a helper

The PR adds seven `self._get("histories", data=...)` calls to `test_histories.py`. Add `_index_search(self, **params)` and use it in the new tests.

## P3 6: `HistoryList.vue` comment misstates the server rule

The comment says the server sorts by size only for "own, non-archived histories". The guard doesn't check `show_archived`, so `show_own=true&show_archived=true&sort_by=size` is accepted. The Archived tab lacks the option because `GET /api/histories/archived` has no `sort_by` parameter. Reword it to say that the server restricts the sort to the user's own histories and that the archived listing doesn't support it.
