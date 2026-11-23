# Test challenges debrief: #24708

- Profile: `gx_test_challenger`
- Model: Opus 5.5 (`claude-opus-5-5`)
- Effort: medium
- Reviewed commit: `86a724b7bf5e37461797d823287e193afe61fff7`
- Mode: review. Nothing was edited or run. Everything below is a recommendation from reading the code. PR CI (including the Playwright job) is green at this commit.

## Summary

The layers are well chosen: there is an API test, a Selenium test and Vitest on the client logic. Three gaps matter:

1. The Selenium test's history-filter and name-filter steps pass whether or not those filters work.
2. Nothing checks against a real server the deleted, hidden, archived and purged lookups the PR promises. Vitest only pins query strings against hand-keyed MSW responses, and no API test sends `is:purged`, or `is:deleted` to the workflow index.
3. The API test covers only success paths, so the new "unknown id" and per-history access branches are untested.

## Selenium: `test_filter_by_workflow_and_history`

The fixtures are one user (`ensure_registered`), W1 with 2 runs in H1, and W2 with 1 run in H2. W1 and W2 share a name. The user has exactly 3 invocations.

| Step | Assertion | Distinguishes the behavior? |
| --- | --- | --- |
| Pick W2 | 1 row, filter text | Yes |
| Add W1 | 3 rows, 2 chips | Yes (1 to 3) |
| Remove W2 chip | 2 rows, filter text | Yes |
| Pick H1 with W1 still picked | 2 rows, 1 history chip | **No.** All W1 runs are in H1, so the count is 2 before and after. Only the chip proves anything, and that is client state, not filtering. |
| `workflow:'<name>'` in the search box | 3 rows, 0 workflow chips | **No.** The name matches both workflows, and they are all the user's invocations, so an ignored filter also shows 3. Zero chips is also trivially true, because `_inline_search_for` clears the box. |

An implementation that dropped `history_id` from the request, or never resolved `workflow:` names, would pass. The PR description lists both steps as coverage.

Also not exercised end to end:

- the recent list shown before typing
- picking while a name filter is set (`clears`)
- removing the last chip
- a filter that matches nothing

### Recommended test shape

Add one differently named workflow so the filters have something to exclude. This adds one short run and about 15 lines:

```python
# W1: 2 runs in H1, W2: 1 run in H2 (same name); other: 1 run in H1
other_workflow_id = self.workflow_populator.run_workflow(
    WORKFLOW_RENAME_ON_INPUT, history_id=first_history_id, assert_ok=True, wait=True
).workflow_id
# (rename W1 and W2 as today; `other` keeps its own name)
self._assert_showing_n_invocations(4)

# open the dropdown: recent list before typing
invocations.column_filter_toggle(key="workflow_id").wait_for_and_click()
self._assert_n_elements(invocations.column_filter_options(key="workflow_id"), 3)
# search, pick W2 (1), add W1 (3), remove W2 chip (2): as today

# remove the last chip, then a history filter that really narrows
invocations.active_column_filters(key="workflow_id").all()[0].click()
self._assert_showing_n_invocations(4)
invocations.column_filter_toggle(key="history_id").wait_for_and_click()
invocations.column_filter_search(key="history_id").wait_for_and_send_keys(history_name)
invocations.column_filter_option(key="history_id", id=second_history_id).wait_for_and_click()
self._assert_showing_n_invocations(1)

# a name filter excludes `other`, and picking in the column removes it
self.published_grid_search_for(f"workflow:'{workflow_name}'")
self._assert_showing_n_invocations(3)
invocations.column_filter_toggle(key="workflow_id").wait_for_and_click()
invocations.column_filter_option(key="workflow_id", id=first_workflow_id).wait_for_and_click()
self._assert_showing_n_invocations(2)
self._assert_filter_text(f"workflow_id:{first_workflow_id}")

# nothing matches
self.published_grid_search_for("workflow:no-such-workflow")
self._assert_showing_n_invocations(0)
```

Adjust the sketch when writing it:

- Name the second history so the search finds it (`history_name` currently names only the first).
- `_assert_showing_n_invocations(0)` has to work for an empty grid. Check `invocation_index_table_elements`, because the table may not render.
- Check that the workflow dropdown state doesn't intercept the later clicks.

The chip's `data-description` has no id, so the test has to rely on `.all()[0]` order. Adding the id (`grid active column filter ${key} ${id}`) gives a parameterized selector and lets the test say which chip it removes. This matches practice 11 in the E2E guide. It is optional.

## Real-server coverage of the "any state" lookups

`findWorkflowsByName` and `findHistoriesByName` are the riskiest logic in the PR. They fan out to three index calls with differing flags, relying on server rules:

- Workflow `show_shared` defaults from the flags in `index_query`, and combining it with `show_hidden` is rejected.
- `is:deleted` is parsed from the search text after those defaults are set.
- History `is:deleted` and `is:purged` are cleared when `show_published` or `show_shared` is set.

The Vitest tests key MSW responses on the exact strings the code builds (`mockIndexes`, including the invented `+hidden` key). They prove the client sends what the client was written to send, not that the server returns those items.

Existing real-server coverage:

- `test_histories.py:305` sends `is:deleted`, without a name term or `show_archived`.
- `test_workflows.py` `test_index_deleted` and the hidden test use `show_deleted` and `show_hidden`, not `is:deleted` or a name term.
- No API test sends `is:purged` or workflow `is:deleted`.

### Recommended tests

Put the coverage on the API, where it is cheap:

- `test_workflows.py`: create same-named workflows, delete one (`DELETE workflows/{id}`, as `test_delete` does), hide one (`update_workflow_fields(id, {"hidden": True})`). Then assert with `workflow_populator.index_ids` for each of the client's three queries:
  - `search="name:<n>", show_published=True`
  - `search="name:<n> is:deleted", show_published=False`
  - `search="name:<n>", show_hidden=True, show_published=False`
- `test_histories.py`: create same-named histories that are deleted (`delete_history`), purged (`purge_history`) and archived (`archive_history`). Query with the client's flags (`show_own=True, show_published=False, show_shared=False, show_archived=True`) and `name:<n>`, `name:<n> is:deleted`, `name:<n> is:purged`.
- Selenium, one assertion: after deleting W2 by API, the column search still lists it, and its option text contains `deleted`.

`.github/workflows/client-api-test.yaml` only runs the `galaxy-api-client` package's Vitest suite, so it is not a shortcut to a live server.

Once those exist, slim the two "looks up ..." Vitest tests to what only they can show: results are combined and deduped by id (`visible` appears in two responses). Drop the query-string `toHaveBeenCalledWith` assertions, or keep one if the mapping is judged worth pinning.

## API: `test_invocation_filtering_by_several_workflows_and_histories`

This is a good test: fresh user, set equality, and it includes the single-value and intersection cases. Challenges:

- **Untested new branches.** `build_invocations_query` has a new `len(found_ids) != len(set(ids))` check, and the service has a new per-id `get_accessible` loop. Add:
  - `workflow_id=[real, unknown]` returns 404. The check exists to catch this, and a query that only used `.in_()` would silently return 200.
  - `workflow_id=[real, real]` returns 200 with the normal result. `set()` is there for this case.
  - `history_id=[own, another user's private history]` returns the single-id access error (expected 403). A loop that checked only the first id would pass every current test.
  - Optional: `instance=true` with two instance ids, because the comprehension was rewritten and the existing test (`test_workflows.py:11846`) uses one id.
  - For the unknown id, confirm a value that decodes. `test_workflows.py:9746` uses `1234567890abcdef`.
- **Pagination.** The description's reason for repeating the parameter is "one paginated request". Add `limit=1` and assert one row and `total_matches == 2`.
- **Helpers.** `GET invocations` is now issued from `_assert_invocation_for_url_is`, `WorkflowPopulator.history_invocations` and this test's closure. Add a `WorkflowPopulator.invocations(**query)` helper that asserts 200 and returns the JSON, and have `history_invocations` and this test use it.

## Vitest: each test challenged

`GridColumnFilter.test.ts`: keep all four. Its one mock is the `search` prop, which is the right boundary.

- "lists selected items first": keep. Not covered by E2E (order, checked state, detail line, badge). Reaching for `.font-weight-bold` is a little brittle, but only a nit.
- "searches as you type": keep, but the name overstates what it shows. The description says "debounced", yet the test never checks that no call happened before 300 ms, so an immediate search would pass. Add `expect(filter.search).toHaveBeenCalledTimes(1)` before advancing the timer.
- "unchecks and clears": keep. The Clear button isn't in E2E.
- "says when nothing matches": keep.
- Missing: the `latestSearch` guard is the component's only non-trivial logic and has no test. Use `client/tests/vitest/deferred.ts`: start search A, start search B, resolve B and then A, and assert B's results remain. The error message path is also untested: reject the search and assert `Failed to load workflows`.

`GridList.test.ts` "column filter handling": narrow it, don't drop it.

- It repeats the Selenium flow (pick, filter text, chips, remove chip), but it is also the only cover for `clears` until the Selenium change lands, and the only cover that `FieldEntry.filter` works on a non-invocation grid.
- Once Selenium covers `clears`, trim this test to generic-grid wiring: a picked item reaches `getData`, the chip text, and the fallback that shows the raw id for an id with no known name (`known[id] ?? { id, name: id }`, reached when the filter text is typed by hand; currently untested).

`configs/invocationFilters.test.ts`:

- `nameSearch` table: keep. A pure function with real quoting rules.
- "passes picked ids through without lookups": keep.
- "looks up visible, deleted and hidden workflows" and "looks up active, deleted and purged histories": slim after the API tests exist (above).
- "returns null when a name matches nothing" and "narrows picked ids": keep. These are the client's real logic.
- "lists the most recently updated own workflows": keep. There is no matching test for `historyColumnFilter.search("")`, which is a separate code path with no `showArchived`.
- "describes workflows..." and "describes histories...": keep and complete. The description promises `hidden`, `archived` and `purged` marks, but only `deleted` and `by <owner>` are asserted, and `historyOption` has a purged > deleted > archived precedence. Add rows for these, using `it.each`.
- `NAME_MATCH_LIMIT` isn't asserted, though the description states the limit of 50. Add it to one `objectContaining`.

`configs/invocations.test.ts`:

- "sends every matching workflow id and the picked history ids": keep. It is the one test of array serialization through the typed client.
- "skips the invocation request when a name matches nothing": keep. A request count can't be observed from E2E.

## Considered, no change recommended

- `lib/galaxy/agents/operations.py` has no test for the changed call, but it is a typed one-line wrap.
- `invocationsHistory.ts` and `invocationsWorkflow.ts` are wrapped in a list and checked by types.
- `index_workflow_invocations` is covered by `workflow_populator.workflow_invocations` in many existing tests.
- Backend unit tests for `build_invocations_query` are not needed. The API test is the right layer.
- Selenium clicking `input[data-description=...]`: `GCheckbox` renders a real, visible input, so this should work on the Selenium backend as well as Playwright. `selenium.yaml` only runs on schedule or dispatch, so PR CI doesn't confirm that.
- No suspected security findings.
