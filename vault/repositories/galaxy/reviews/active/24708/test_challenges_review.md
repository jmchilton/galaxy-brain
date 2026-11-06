# Test challenges review: #24708

- Profile: `gx_test_challenger`
- Model: Opus 5.5 (`claude-opus-5-5`)
- Effort: medium
- Reviewed commit: `86a724b7bf5e37461797d823287e193afe61fff7`

Test plan and per-test notes: [test_challenges_debrief.md](test_challenges_debrief.md). Findings come from reading the code; no tests were run.

No P1s. The test layers are well chosen. The gaps are below.

## P2 1: Selenium history and name filter steps pass even if the filters do nothing

In `test_filter_by_workflow_and_history`, two steps can't fail on the behavior they claim to cover.

- Picking H1 with W1 still picked asserts 2 rows, but all of W1's runs are in H1, so the count is 2 before and after.
- `workflow:'<name>'` asserts 3 rows, but both workflows have that name and the user has exactly 3 invocations, so an ignored filter also shows 3. The zero-chips assertion is also trivially true, because `published_grid_search_for` clears the box first.

Fix: run one more workflow with a different name, so the filters have something to exclude. Remove the last workflow chip, then pick H2 and assert 1 row. The name filter then asserts 3 of 4. While there, cover the end-to-end gaps at little cost: the recent list before typing, picking while a name filter is set (`clears`), and a name that matches nothing. A sketch is in the debrief.

## P2 2: Deleted, hidden, archived and purged lookups aren't checked against a real server

The description promises that name searches cover "visible (own, shared and published), deleted and hidden workflows, and active, archived, deleted and purged histories". These are built from three index calls per lookup, with flags that depend on server rules. For example, workflow `show_shared` is defaulted from the flags before `is:deleted` is parsed, and history `is:deleted` and `is:purged` are cleared when `show_published` or `show_shared` is set.

The only coverage is `invocationFilters.test.ts`, whose MSW handlers are keyed on the exact strings the client builds, so it can't detect a query the server treats differently. No API test sends `is:purged`, or `is:deleted` to the workflow index, and none of the existing `is:deleted` or `show_hidden` tests combine them with a `name:` term.

Fix: add API tests that create these same-named items and issue the client's exact queries, in `test_workflows.py` and `test_histories.py`. Add one Selenium assertion that a deleted workflow still appears in the column search, marked `deleted`. Then slim the two "looks up ..." Vitest tests to the dedupe behavior only they can show.

## P2 3: API test skips the new failure branches for several ids

`test_invocation_filtering_by_several_workflows_and_histories` is all success paths. Two branches are new and untested: `len(found_ids) != len(set(stored_workflow_ids))` in `build_invocations_query`, and the per-id `get_accessible` loop in the service.

Fix: extend the test to assert:

- `workflow_id=[real, unknown]` returns 404
- `workflow_id=[real, real]` returns 200 with the normal result
- `history_id=[own, another user's private history]` returns the same access error as a single id (expected 403)
- optional: `instance=true` with two ids

## P3 1: Add a helper for `GET invocations`

`GET invocations` with a query is now issued from `_assert_invocation_for_url_is`, `WorkflowPopulator.history_invocations` and a closure in the new test. Add `WorkflowPopulator.invocations(**query)`, which asserts 200 and returns the JSON, and use it from `history_invocations` and the new test.

## P3 2: `GridColumnFilter` stale-response guard and error path are untested

`latestSearch` is the component's only non-trivial logic, and the `Failed to load ...` path has no test. Add a stale-response test using the existing `client/tests/vitest/deferred.ts` (resolve the newer search first, and assert the older one doesn't overwrite it), plus a rejected-search test.

## P3 3: The "debounced search" test doesn't check debouncing

"searches as you type" advances 300 ms and then asserts the call, so an immediate search would also pass. Assert `filter.search` was still called only once before advancing the timer.

## P3 4: Narrow `GridList.test.ts` "column filter handling" once Selenium covers `clears`

The test repeats the Selenium flow (pick, filter text, chips, remove chip). Don't drop it: for now it is the only cover for `clears`, and for the option working on a non-invocation grid. After P2 1, trim it to generic-grid wiring and add the untested fallback that shows the raw id for an id with no known name.

## P3 5: Fill small Vitest gaps for promised details

- `hidden`, `archived` and `purged` marks aren't asserted, nor is the purged > deleted > archived precedence in `historyOption`. Use `it.each`.
- `historyColumnFilter.search("")` has no test, though it is a separate path from the workflow one.
- The stated limit of 50 (`NAME_MATCH_LIMIT`) isn't asserted.

## P3 6: Assert `total_matches` for a multi-id request

The description's reason for repeating the parameter is "one paginated request", and the grid pager relies on `total_matches`. Add `limit=1` with two workflow ids and assert one row and `total_matches == 2`.

## P3 7: Give chips a parameterized selector

`active_column_filters` has no id, so the test removes a chip with `.all()[0]` and a comment explaining the order. Adding the id to the chip's `data-description` and a `${id}` selector states the intent directly and matches the E2E guide's parameterized selector practice.
