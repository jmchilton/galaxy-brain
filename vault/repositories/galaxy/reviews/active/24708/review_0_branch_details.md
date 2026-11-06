Branch `pr_24708_review_0`, from the reviewed commit `86a724b7bf5e`, fixes each finding in `verified_review.md` with one commit. On the client it stops name filters losing the user's own workflows, keeps the column filters mounted when nothing matches, limits run counts to the user's own workflows, drops filters from the admin grid, ignores stale grid responses, reuses resolved names across page changes, handles punctuation and colons in names, moves column filter ids to `Filtering`'s `MultiTags`, and breaks the grid config and store import cycle. On the server it replaces the per-id history access check with one query. The remaining commits add or tighten tests: API failure paths, real-server lookups, Vitest races and marks, and a Selenium test whose history and name filter steps can now fail.

- `b408f147087` Give own workflows their own slots in invocation name lookups: adds an own and shared lookup next to the published one (P2 1).
- `27f9cafd2c0` Show invocation filter run counts only for own workflows: gates the `/counts` read on ownership and updates the existing test's expected text (P2 3).
- `aacf9ce1be3` Keep grid column filters mounted when a filter matches nothing: renders the table header with zero rows when a grid has column filters and filter text (P2 2).
- `560592c7c3d` Ignore stale grid responses: adds a latest-request guard to `getGridData` (P3 1).
- `8c16f31669e` Don't offer invocation filters on the admin grid: adds `adminInvocationsGridConfig` and `GridInvocation.test.ts` (P3 2).
- `91e1cee4743` Reuse resolved invocation filters across page and sort changes: reuses the last resolved text for up to a minute (P3 3).
- `5160242a7a4` Treat punctuation as word breaks in invocation name filters: splits unquoted names on what the index's terms can't take (P3 4).
- `5da62a3ed7a` Reuse lodash and strings helpers in invocation filters: replaces local `plural` and `uniqueById` (P3 12).
- `1a21effad99` Test column filter races, failures, debounce and state marks: adds Vitest cases only (P3 11).
- `b2a4c5d30f3` Test unknown, duplicate and inaccessible ids on the invocation index: adds an API test, including `total_matches` (P3 9).
- `c65a90fa238` Check invocation index history access with one query: uses `by_ids` plus `error_unless_accessible`, with an API test that deleted, purged and archived histories still work (P3 8).
- `25eb4554fbf` Test the invocation filter name lookups against a real server: adds API tests for the workflow and history index queries (P3 10, and evidence for P2 1).
- `7feac780b0d` Make invocation grid Selenium filter steps able to fail: adds a third workflow, more steps and a parameterized chip selector (P2 4).
- `3120d9eed83` Break the invocation grid config and store import cycle: moves the fetch to `configs/invocationsIndex.ts` and retargets a CommandPalette test mock (P3 7).
- `6cadf548fa6` Keep quoted values with colons in one filter term: changes the `quoteStrings=false` regex in `Filtering.splitPairs` (P3 5).
- `706dabef324` Use Filtering's MultiTags for grid column filter ids: replaces the comma format with repeated terms, and updates filter text expectations. As the last commit it can be dropped on its own, if the format in the description stays (P3 6).
