`pr_24706_review_0` branches from the reviewed commit `5006c8fbfe3` and is mostly test work: it adds an E2E test for the "Storage used" sort, makes the rejection tests tell the new guard from a literal validation error, and covers the default page size, paging, `total_matches` and the non-admin fallback. It also corrects the `HistoryList.vue` comment, moves the `SELECT DISTINCT` handling of computed sort columns into `apply_sort_column`, and reduces the route's `None` filtering to `limit`. Each commit addresses one finding, and server behavior is unchanged.

- `f4b628e5f44` Correct the HistoryList comment on the size sort restriction: says the server restricts the sort to the user's own histories and the archived endpoint ignores `sort_by`.
- `b56fde2a953` Assert the error message in the size sort rejection tests: both rejection tests now fail if `size` leaves `HistorySortByEnum`.
- `980601a356c` Test the default page size of GET /api/histories in search mode: 101 histories with `limit` omitted give 100 entries and `total_matches == "101"`.
- `f991b537da8` Cover paging and total_matches in the size sort API test: requests a window that starts between the two tied empty histories.
- `d636e3787c3` Test the size sort when a non-admin falls back to their own histories: `show_own=False, show_published=False` as a non-admin returns the user's four histories, and its lines sit after those of the paging commit.
- `52cdb4b0c40` Add an E2E test for sorting the history list by storage used: clicks the real button against the real server guard and checks the order in both directions.
- `e7f28273ded` Drop the Vitest test that claims to check size order: it read back the mock's order, and depends on the E2E commit for coverage.
- `937b394fc71` Mock only the fetcher each list uses in the size sort option test: stops queueing one-time responses that are never consumed.
- `bd47eb4d28c` Pass the history index query fields directly: only `limit` is now omitted when `None`, so it takes the payload default.
- `ffd7abf55ab` Let apply_sort_column select computed sort columns: the helper now selects anything that isn't a plain mapped column, and the size branch only assigns the column.
- `42ada817c58` Add an _index_search helper for the new history index tests: replaces the repeated `self._get("histories", data=...)` calls in the tests this PR adds.
