### P2 1: No E2E test for sorting by storage used (implementation verified)

This is a user-facing control, and its sibling `test_sort_by_name` has an E2E test. Vitest mocks `getMyHistories` and the API tests pick their own flags, so nothing shows that the real button sends a request the new server guard accepts. A wrong flag from the client would appear only as a 400 toast.

Added `test_sort_by_storage_used` to `lib/galaxy_test/selenium/test_histories_list.py`, in a new fresh-user class. It creates three histories in an order matching neither size order, then checks largest first and smallest first through `histories.sort_button`. `TestSavedHistories` isn't suitable because it shares one user with many empty histories, which could push a sized one off the page.

<details><summary>Evidence</summary>

Run with Playwright, headless, against a harness-started server on SQLite. Passes as written, and fails with the wrong order when the guard is temporarily changed to refuse every size sort.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P2 2: Size sort rejection tests pass without the guard (implementation verified)

`test_index_sort_by_size_requires_own_histories` asserts only a 400, and so does the 400 half of `..._for_admins`. Without `size` in `HistorySortByEnum` the request still gets a 400, from the literal check, so these assertions can't tell the new guard from a rejected value.

Both tests now also call `assert_error_message_contains(response, "Sorting by size requires")`.

<details><summary>Evidence</summary>

With `size` temporarily removed from the enum, both strengthened tests pass the status check and fail on the message: `Expected error message [Input should be 'create_time', 'name', 'update_time' or 'username' in ('query', 'sort_by')] to contain [Sorting by size requires]`.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: `HistoryList.vue` comment misstates the server rule (implementation verified)

The comment says the server sorts by size only for the user's "own, non-archived histories". The guard doesn't check `show_archived`, so `show_own=true&show_archived=true&show_published=false&sort_by=size` returns 200. The Archived tab lacks the option for a different reason: `GET /api/histories/archived` declares no `sort_by`, so the value `getArchivedHistories` sends is ignored.

Reworded to say the server sorts by size only for the user's own histories, and the archived endpoint ignores `sort_by`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: The size branch repeats what `apply_sort_column` exists to do (implementation verified)

The size branch in `index_query` calls `stmt.add_columns(sort_column)` and restates the Postgres `SELECT DISTINCT` rule. `apply_sort_column` already owns that rule and that call, but only for expressions wrapped by `sort_expression`, so the next computed sort would have to repeat it again.

The helper now also selects any column that isn't a plain mapped one, and the size branch only assigns the column.

<details><summary>Details</summary>

The test is `not isinstance(column, InstrumentedAttribute)` because a class-level read of `History.disk_size` returns a proxy that is neither an `InstrumentedAttribute` nor a `Label`, so a `Label` check would silently skip it. The helper's other callers pass `InstrumentedAttribute`s for their date, name and title columns, so they select nothing new.

</details>

<details><summary>Evidence</summary>

Run on Postgres 16.2. `test_index_sort_by_size` passes with the helper change. With the condition temporarily reverted it fails with a 500: `for SELECT DISTINCT, ORDER BY expressions must appear in select list`. SQLite doesn't raise this error, so only a Postgres run exercises it.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 3: The route filters nine fields for `None` when only `limit` needs it (implementation verified)

The route builds a `fields` dict and drops `None` values so that an omitted `limit` takes the payload default. `offset` defaults to 0, `show_archived` already defaults to `None` in the model, and `search` isn't `None` in this branch, so only `limit` needs this. The dict and comprehension hide which field matters.

The route now passes the fields directly and adds `limit` only when it was supplied.

<details><summary>Evidence</summary>

`test_index_query_limit_defaults_to_100` and `test_index_query_limit_is_capped` pass after the change.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 4: The size sort API test doesn't cover paging or the count (implementation verified)

The description cites stable paging, but `test_index_sort_by_size` never sends `limit` or `offset`, and never reads `total_matches`, which the list's pager uses, on the path that adds the extra column.

The test now requests `limit=2, offset=1` descending, a window that starts between the two tied empty histories, and asserts `[small, empty_second]` and `total_matches == "4"`.

<details><summary>Evidence</summary>

Passes on SQLite and Postgres 16.2. No mutation was run against this assertion specifically.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 5: The non-admin fallback of the own-only guard is untested (implementation verified)

`filter_own` is also true for a non-admin sending `show_own=False, show_published=False`, and no test covers that case returning 200. Narrowing `own_only` to `show_own` would go unnoticed.

`test_index_sort_by_size` now makes that request and asserts a 200 with the user's four histories.

<details><summary>Evidence</summary>

With `own_only` temporarily narrowed to `show_own`, the test fails with a 400: `Sorting by size requires listing only your own histories.`

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 6: The "sorts by size, largest first" Vitest test doesn't test that (implementation verified)

`listedNames` reads back the order the mock returned, so the title overclaims. The E2E test in P2 1 covers both the request and the real order.

Dropped the test. If P2 1 is declined, keep it instead, rename it `requests a size sort, descending first`, and remove the `listedNames` assertion.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 7: `offers no size sort` queues mocks it never consumes (implementation verified)

The loop queues `mockResolvedValueOnce` on all three fetchers per case and leaves two unconsumed.

The test now maps `list` to its fetcher and mocks only that one. `HistoryList.test.ts` passes.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 8: Repeated index requests in the new API tests need a helper (implementation verified)

The PR adds seven `self._get("histories", data=...)` calls to `test_histories.py`, all needing `search`.

Added `_index_search(self, search="", **params)` and used it in the tests this PR adds. Older tests aren't migrated.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 9: Admins can still run the refused all-histories size sort through the legacy listing (implementation verified)

The description says any other listing, including an admin listing of all histories, gets a 400 for `sort_by=size`, and gives 10.4 s as the reason. `GET /api/histories?order=size-dsc&all=true` without `search` reaches `HistoryManager.parse_order_by`, which orders by the same `disk_size` with no default limit, so an admin can still run that sort. The refusal still protects non-admins from published listings, so it stands; only the admin rationale is inconsistent.

Mention in the description that the refusal covers search mode and that the legacy `order=size-*` path keeps this cost. This is not changed on the review branch, because the description also says the legacy listing is unchanged.

<details><summary>Evidence</summary>

A temporary test confirmed this request returns 200 as an admin; timing was not measured.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
