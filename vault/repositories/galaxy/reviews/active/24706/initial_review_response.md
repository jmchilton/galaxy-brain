


<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via claude-opus-5-5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via claude-opus-5-5 at medium effort.

</details>

<details><summary>Risks</summary>

This changes the public `GET /api/histories` search-mode contract in two hard-to-walk-back ways: existing API clients that omit `limit` silently drop from all matches to 100 per page (and `limit` >= 1000 now gets a 400), and `sort_by=size` becomes a public value whose own-histories-only restriction is part of the API.

<details><summary>Risk Details</summary>

- Scripts that call search mode without `limit` and expect every match now get the first 100 with a 200 response and no error, so truncation can go unnoticed unless they read the `total_matches` header.
- Scripts that pass `limit` of 1000 or more now get a 400. The change is not limited to callers using the new sort.
- Search mode now validates its payload instead of using `model_construct`, so it can return validation errors for inputs that previously passed through (`limit` is the known case).
- The legacy listing without `search` stays uncapped, so the two modes of one endpoint now differ in paging behavior.
- `show_published` defaults to true on this endpoint, so `sort_by=size` with default flags gets a 400. API users must pass `show_published=false`.
- Once `sort_by=size` ships, consumers can depend on it. Loosening the restriction later is easy; tightening it or removing the value would be a breaking change.
- The sort computes `History.disk_size` per matching history on each page request, plus the id tiebreaker. Cost scales with the caller's dataset count, and PR profiling reports 60 ms for 400 histories / 27k datasets; users with far larger histories, the target audience, will pay more.
- The own-histories guard is the only thing preventing the expensive listings profiled at 745 ms (published) and 10.4 s (admin, all histories).
- `ListHeader` initial sort selection changed, but only `HistoryList` passes `sortOptions`, so this is cheap to reverse.

</details>

<details><summary>Risk Review Advice</summary>

The decision to weigh is whether capping search mode belongs in this feature PR and whether the silent drop to 100 is acceptable for existing scripts and libraries such as BioBlend. The in-tree callers checked all pass an explicit `limit`, so the exposure is external API clients, which this review did not survey. Consider whether a release note is warranted.

Also confirm the guard in `HistoryManager.index_query` covers every flag combination that reaches the size sort, and that the 60 ms profile is representative of the heaviest real users, since those are the people this sort is built for.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24706_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24706_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24706_review_0) branches from the reviewed commit [`5006c8fbfe3`](https://github.com/jmchilton/galaxy/commit/5006c8fbfe3) and is mostly test work: it adds an E2E test for the "Storage used" sort, makes the rejection tests tell the new guard from a literal validation error, and covers the default page size, paging, `total_matches` and the non-admin fallback. It also corrects the `HistoryList.vue` comment, moves the `SELECT DISTINCT` handling of computed sort columns into `apply_sort_column`, and reduces the route's `None` filtering to `limit`. Each commit addresses one finding, and server behavior is unchanged.

- [`f4b628e5f44`](https://github.com/jmchilton/galaxy/commit/f4b628e5f44) Correct the HistoryList comment on the size sort restriction: says the server restricts the sort to the user's own histories and the archived endpoint ignores `sort_by`.
- [`b56fde2a953`](https://github.com/jmchilton/galaxy/commit/b56fde2a953) Assert the error message in the size sort rejection tests: both rejection tests now fail if `size` leaves `HistorySortByEnum`.
- [`980601a356c`](https://github.com/jmchilton/galaxy/commit/980601a356c) Test the default page size of GET /api/histories in search mode: 101 histories with `limit` omitted give 100 entries and `total_matches == "101"`.
- [`f991b537da8`](https://github.com/jmchilton/galaxy/commit/f991b537da8) Cover paging and total_matches in the size sort API test: requests a window that starts between the two tied empty histories.
- [`d636e3787c3`](https://github.com/jmchilton/galaxy/commit/d636e3787c3) Test the size sort when a non-admin falls back to their own histories: `show_own=False, show_published=False` as a non-admin returns the user's four histories, and its lines sit after those of the paging commit.
- [`52cdb4b0c40`](https://github.com/jmchilton/galaxy/commit/52cdb4b0c40) Add an E2E test for sorting the history list by storage used: clicks the real button against the real server guard and checks the order in both directions.
- [`e7f28273ded`](https://github.com/jmchilton/galaxy/commit/e7f28273ded) Drop the Vitest test that claims to check size order: it read back the mock's order, and depends on the E2E commit for coverage.
- [`937b394fc71`](https://github.com/jmchilton/galaxy/commit/937b394fc71) Mock only the fetcher each list uses in the size sort option test: stops queueing one-time responses that are never consumed.
- [`bd47eb4d28c`](https://github.com/jmchilton/galaxy/commit/bd47eb4d28c) Pass the history index query fields directly: only `limit` is now omitted when `None`, so it takes the payload default.
- [`ffd7abf55ab`](https://github.com/jmchilton/galaxy/commit/ffd7abf55ab) Let apply_sort_column select computed sort columns: the helper now selects anything that isn't a plain mapped column, and the size branch only assigns the column.
- [`42ada817c58`](https://github.com/jmchilton/galaxy/commit/42ada817c58) Add an _index_search helper for the new history index tests: replaces the repeated `self._get("histories", data=...)` calls in the tests this PR adds.

</details>

</details>

### P2 1: No E2E test for sorting by storage used (implementation verified)

This is a user-facing control, and its sibling `test_sort_by_name` has an E2E test. Vitest mocks `getMyHistories` and the API tests pick their own flags, so nothing shows that the real button sends a request the new server guard accepts. A wrong flag from the client would appear only as a 400 toast.

Added `test_sort_by_storage_used` to `lib/galaxy_test/selenium/test_histories_list.py`, in a new fresh-user class. It creates three histories in an order matching neither size order, then checks largest first and smallest first through `histories.sort_button`. `TestSavedHistories` isn't suitable because it shares one user with many empty histories, which could push a sized one off the page.

<details><summary>Evidence</summary>

Run with Playwright, headless, against a harness-started server on SQLite. Passes as written, and fails with the wrong order when the guard is temporarily changed to refuse every size sort.

</details>

Fixed on the review branch in [`52cdb4b0c40`](https://github.com/jmchilton/galaxy/commit/52cdb4b0c40).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P2 2: Size sort rejection tests pass without the guard (implementation verified)

`test_index_sort_by_size_requires_own_histories` asserts only a 400, and so does the 400 half of `..._for_admins`. Without `size` in `HistorySortByEnum` the request still gets a 400, from the literal check, so these assertions can't tell the new guard from a rejected value.

Both tests now also call `assert_error_message_contains(response, "Sorting by size requires")`.

<details><summary>Evidence</summary>

With `size` temporarily removed from the enum, both strengthened tests pass the status check and fail on the message: `Expected error message [Input should be 'create_time', 'name', 'update_time' or 'username' in ('query', 'sort_by')] to contain [Sorting by size requires]`.

</details>

Fixed on the review branch in [`b56fde2a953`](https://github.com/jmchilton/galaxy/commit/b56fde2a953).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P2 3: The new default page size is untested (implementation verified)

The description says omitting `limit` used to return every match and now returns 100. `LimitQueryParam` defaults to `None` and the payload accepts `None`, so only the route's `None` handling delivers this. `test_index_query_limit_is_capped` always sends `limit`, so it can't catch a regression.

Added `test_index_query_limit_defaults_to_100`: a fresh user with 101 histories, `limit` omitted, asserting 100 entries and `total_matches == "101"`.

<details><summary>Evidence</summary>

With `None` temporarily passed through to the payload, the test fails with `assert 101 == 100`.

</details>

Fixed on the review branch in [`980601a356c`](https://github.com/jmchilton/galaxy/commit/980601a356c).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: `HistoryList.vue` comment misstates the server rule (implementation verified)

The comment says the server sorts by size only for the user's "own, non-archived histories". The guard doesn't check `show_archived`, so `show_own=true&show_archived=true&show_published=false&sort_by=size` returns 200. The Archived tab lacks the option for a different reason: `GET /api/histories/archived` declares no `sort_by`, so the value `getArchivedHistories` sends is ignored.

Reworded to say the server sorts by size only for the user's own histories, and the archived endpoint ignores `sort_by`.

Fixed on the review branch in [`f4b628e5f44`](https://github.com/jmchilton/galaxy/commit/f4b628e5f44).

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

Fixed on the review branch in [`ffd7abf55ab`](https://github.com/jmchilton/galaxy/commit/ffd7abf55ab).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 3: The route filters nine fields for `None` when only `limit` needs it (implementation verified)

The route builds a `fields` dict and drops `None` values so that an omitted `limit` takes the payload default. `offset` defaults to 0, `show_archived` already defaults to `None` in the model, and `search` isn't `None` in this branch, so only `limit` needs this. The dict and comprehension hide which field matters.

The route now passes the fields directly and adds `limit` only when it was supplied.

<details><summary>Evidence</summary>

`test_index_query_limit_defaults_to_100` and `test_index_query_limit_is_capped` pass after the change.

</details>

Fixed on the review branch in [`bd47eb4d28c`](https://github.com/jmchilton/galaxy/commit/bd47eb4d28c).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 4: The size sort API test doesn't cover paging or the count (implementation verified)

The description cites stable paging, but `test_index_sort_by_size` never sends `limit` or `offset`, and never reads `total_matches`, which the list's pager uses, on the path that adds the extra column.

The test now requests `limit=2, offset=1` descending, a window that starts between the two tied empty histories, and asserts `[small, empty_second]` and `total_matches == "4"`.

<details><summary>Evidence</summary>

Passes on SQLite and Postgres 16.2. No mutation was run against this assertion specifically.

</details>

Fixed on the review branch in [`f991b537da8`](https://github.com/jmchilton/galaxy/commit/f991b537da8).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 5: The non-admin fallback of the own-only guard is untested (implementation verified)

`filter_own` is also true for a non-admin sending `show_own=False, show_published=False`, and no test covers that case returning 200. Narrowing `own_only` to `show_own` would go unnoticed.

`test_index_sort_by_size` now makes that request and asserts a 200 with the user's four histories.

<details><summary>Evidence</summary>

With `own_only` temporarily narrowed to `show_own`, the test fails with a 400: `Sorting by size requires listing only your own histories.`

</details>

Fixed on the review branch in [`d636e3787c3`](https://github.com/jmchilton/galaxy/commit/d636e3787c3).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 6: The "sorts by size, largest first" Vitest test doesn't test that (implementation verified)

`listedNames` reads back the order the mock returned, so the title overclaims. The E2E test in P2 1 covers both the request and the real order.

Dropped the test. If P2 1 is declined, keep it instead, rename it `requests a size sort, descending first`, and remove the `listedNames` assertion.

Fixed on the review branch in [`e7f28273ded`](https://github.com/jmchilton/galaxy/commit/e7f28273ded).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 7: `offers no size sort` queues mocks it never consumes (implementation verified)

The loop queues `mockResolvedValueOnce` on all three fetchers per case and leaves two unconsumed.

The test now maps `list` to its fetcher and mocks only that one. `HistoryList.test.ts` passes.

Fixed on the review branch in [`937b394fc71`](https://github.com/jmchilton/galaxy/commit/937b394fc71).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 8: Repeated index requests in the new API tests need a helper (implementation verified)

The PR adds seven `self._get("histories", data=...)` calls to `test_histories.py`, all needing `search`.

Added `_index_search(self, search="", **params)` and used it in the tests this PR adds. Older tests aren't migrated.

Fixed on the review branch in [`42ada817c58`](https://github.com/jmchilton/galaxy/commit/42ada817c58).

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
