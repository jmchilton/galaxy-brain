### P2 1: A name filter can drop the user's own workflows (implementation verified)

`workflow:<name>` and the Workflow dropdown search can silently lose the user's own workflows, and with them their invocations. The visible lookup in `findWorkflowsByName` asks for own, shared and published workflows together, sorted by `update_time` and capped at 50. An explicit sort skips the index's own-first ordering, so on a server with many published workflows others' recently updated ones can fill every slot. `/api/invocations` only returns the user's runs, so those slots mostly can't match anything. The description states the 50-match cap, but not that everyone's published workflows share it.

<details><summary>Evidence</summary>

`test_index_name_lookups_used_by_invocation_filters` shows it on a real server: with an own and a newer published workflow of the same name, the client's lookup with `limit=1` returns only the published one. The new Vitest case failed on the reviewed commit with `expected [ 'published-0', 'published-1', …(48) ] to include 'own'`.

</details>

Give own and shared workflows their own lookup next to the published one, which keeps the cap and the use of the index APIs. A `search` parameter on `/api/invocations`, resolved in SQL with `parse_filters_structured` and `text_column_filter` as the index managers do, would remove the cap, the id lists and the repeated lookups altogether, if you'd rather go that way. It is a change of design, so it isn't on the review branch.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md), [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) and [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 2: Picking an item with no invocations removes the dropdown (implementation verified)

The table header holds the column filters, and `GridList` only renders it when there are rows. The dropdown lists recently updated items, many without invocations, so picking one closes the dropdown mid-selection and loses its search text and results. The Workflow and History filter buttons are gone until the filter is removed with its chip or the search box. A text filter with no match does the same.

Keep the table rendered when the grid has column filters and filter text, with the "Nothing found" message above it. Grids without column filters, and grids with no data and no filter, behave as before.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: a new `GridList.test.ts` case failed on the reviewed commit and passes with the fix.

</details>

### P2 3: "N runs" counts every user's runs and fetches them for other people's workflows (implementation verified)

`workflowOption.detail` reads the run count for every option, and `StoredWorkflow.invocation_counts()` has no user filter. An option can read "by alice · 1204 runs", then show no rows when picked, because the grid lists only the user's invocations. Each such row also sends a `/api/workflows/{id}/counts` request, against the workflows most expensive to count. A broad search can queue dozens of these, sharing the client's rate limiter with the grid fetch. `useWorkflowCardBadges` skips counts for workflows the user doesn't own, for this reason.

Only read the count when the user owns the workflow. This drops "1 run" from the expected text of the existing "describes workflows" test, which now also asserts no `/counts` request for the other user's workflow. Own workflows still send one request each, up to 20 per open and more for a broad search; a bulk counts endpoint would be the reusable next step, and the workflow cards could use it too.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md), [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the tightened test failed on the reviewed commit and passes with the fix. Request counts per dropdown open are read from the code, not measured in a browser, and latency is unmeasured.

</details>

### P2 4: Two Selenium steps pass even if the filters do nothing (implementation verified)

In `test_filter_by_workflow_and_history`, the history step picks H1 with W1 selected, but all of W1's runs are in H1, so the count is 2 either way. The name filter step expects 3 rows when the user has exactly 3 invocations, so an ignored filter passes too. The description lists both steps as coverage.

Run a third, differently named workflow, so these filters have a run to exclude: remove the workflow chips, pick H2 and expect 1 of 4, then expect 3 of 4 from the name filter. The same test can then cover the recent list, a pick removing a name filter (`clears`), and a filter matching nothing with the column filter still there. Chips get a parameterized `active_column_filter` selector in place of `.all()[0]`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the rewritten test passes on the Playwright backend at the branch head. It couldn't run on the Selenium backend here (`pyvirtualdisplay` isn't installed), and it wasn't run against the reviewed commit. Its last step depends on P2 2.

</details>

### P3 1: Stale grid responses can overwrite newer filter results (implementation verified)

`getGridData` has no guard against out-of-order responses. The gap is older than this PR, but name lookups make request times vary and picks aren't debounced, so a slow response for one filter can replace the rows of a newer one while the chips and filter text show the newer filter. `GridColumnFilter.search` in this PR already guards against this with `latestSearch`. Use the same pattern in `getGridData`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) and [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: a new out-of-order test failed on the reviewed commit (`expected 'slow-row' to be 'fast-row'`) and passes with the fix.

</details>

### P3 2: The admin invocations grid inherits filters that only cover the admin's items (implementation verified)

The admin route uses the same grid config, with `ownerGrid: false`, so it gets the search box and column filters too. That page lists every user's scheduling invocations, but the lookups run as the admin and return the admin's own workflows and histories. The filters then offer the wrong items and report "Nothing found" for rows that exist. The description scopes the feature to User → Workflow Invocations.

Use a config without `filtering` and `FieldEntry.filter` when `!ownerGrid`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: a new `GridInvocation.test.ts` case failed on the reviewed commit and passes with the fix.

</details>

### P3 3: Name filters re-resolve on every page and sort change (implementation verified)

`getData` awaits `resolveInvocationFilters` on each fetch, so paging through `workflow:x history:y` repeats every index lookup for unchanged text, and the matching ids can change between pages of one result. The grid uses only the ids from those responses, each full lookup measured about 100 statements, and P2 1 adds one lookup per workflow name.

Reuse the last resolved text until it changes or is a minute old. The time limit keeps a workflow created in the meantime from staying invisible. A server-side search (P2 1) would make this unnecessary.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: a new request-count test failed before the fix and passes with it. Statement counts are from the performance review on SQLite; latency is unmeasured.

</details>

### P3 4: Unquoted names with punctuation match too much or nothing (implementation verified)

`nameSearch` emits `name:<word>` per word, but the index's keyed pattern only takes `[\w-]+` or a quoted value. `name:(PE)` and `name:#1` become raw text and match nothing, while `name:v1.2` parses as `name=v1`. So searching "RNA-seq (PE)" finds no workflow named that, in both the search box and the dropdown.

Split words on the characters the index can't take: `RNA-seq (PE)` becomes `name:RNA-seq name:PE`. A value with no word characters, like `++`, becomes one quoted term, so that it can't turn into an empty search matching everything. A server-side search would handle this as well.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: `parse_filters_structured` run directly on these terms, and new `nameSearch` table rows failed on the reviewed commit and pass with the fix.

</details>

### P3 5: A quoted name containing a colon gives an "Invalid filters" alert (implementation verified)

The description says a quoted value is exact, but `workflow:'Foo bar: baz'` splits at `bar:` in `Filtering.splitPairs`, leaving `workflow` as `'Foo` and an invalid filter `bar`.

Have the `quoteStrings=false` regex keep a fully quoted value as one term. This is shared code, so the other grids using that mode get the fix as well; `filtering.test.js` still passes.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: a new test failed on the reviewed commit and passes with the fix.

</details>

### P3 6: `key:<id>,<id>` duplicates what `Filtering` already does with `MultiTags` (implementation verified)

The PR adds a comma format that `Filtering` doesn't know about, so `GridList.columnFilterSelection` and `invocationFilters.splitIds` each parse it by hand. A filter declared `type: "MultiTags"` already reads repeated `key:value` terms into an array and writes an array back, and the generic `FieldFilter` is better off on that path.

Declare `workflow_id` and `history_id` as `MultiTags`. The filter text becomes `workflow_id:a workflow_id:b`, which changes the format in the description, so this one is your call; the description and `FieldFilter`'s doc would follow. `FieldFilter.key` now has to be a `MultiTags` filter, as its doc says. On the review branch this is the last commit, so it can be dropped on its own.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: Vitest passes with its filter text expectations updated to the new format, and the Playwright run of `test_filter_by_workflow_and_history` passes on top of it.

</details>

### P3 7: New import cycle silently loses the column filters in one load order (implementation verified)

`invocationFilters.ts` imports `invocationStore`, which imports `configs/invocations`, which reads `workflowColumnFilter` when it loads. If `invocationFilters` loads first, the grid config evaluates before those constants exist. Today that order only happens in `invocationFilters.test.ts`, where the fields end up with no `filter` and nothing notices. In a production bundle it would throw, should anything import that module first.

Move the plain fetch out of the grid config into `configs/invocationsIndex.ts`, and have the store use it, which also removes the store's dependency on the grid config. `CommandPalette/providers/invocations.test.ts` mocked the old `getData` for this path, so its mock moves to `fetchInvocations` with its assertions unchanged.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: a new load-order test failed on the reviewed commit (`expected [] to deeply equal [ { key: 'workflow_id', …`) and passes with the fix. The production throw is reasoned from ES module semantics, not observed.

</details>

### P3 8: History access check runs one query per id (implementation verified)

`InvocationsService.index` calls `get_accessible` in a loop, so a broad history name filter runs up to 150 selects, each with `History.update_time`'s correlated subquery.

Load them once with `by_ids`, compare lengths to keep the not-found error, and call `error_unless_accessible` per history.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md), [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the API tests from P3 9 pass before and after the change, keeping the 403 and 404, and a new API test confirms deleted, purged and archived histories still return 200, as the name filter relies on. The 1 versus n statement counts are the performance review's SQLite measurement, not repeated here.

</details>

### P3 9: API test skips the new failure branches (implementation verified)

`test_invocation_filtering_by_several_workflows_and_histories` covers success only, so nothing exercises the new `len(found_ids)` check or the per-history access check, and a loop checking only the first id would pass.

Add a test for a repeated id (200), an unknown workflow or history among valid ones (404), another user's private history among the user's own (403), and `limit=1` across two workflows (`total_matches` of 2).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the new API test passes, so the PR's behavior on these paths is correct.

</details>

### P3 10: The "any state" lookups aren't checked against a real server (implementation verified)

The description promises name searches over deleted, hidden, archived and purged items, built from index calls with flags that depend on server rules. The only coverage is Vitest, whose handlers are keyed on the strings the client builds, and no API test sends `is:purged`, or `is:deleted` to the workflow index.

Add API tests in `test_workflows.py` and `test_histories.py` issuing the client's own queries. They pass, so the client's flag combinations do what the description says.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: both new API tests pass.

</details>

### P3 11: Column filter races, failures and some promised details have no tests (implementation verified)

`latestSearch` is `GridColumnFilter`'s only non-trivial logic and has no test, nor does the `Failed to load ...` path. "searches as you type" would pass with no debounce. The `hidden`, `archived` and `purged` marks, their precedence, and `historyColumnFilter.search("")` are also unasserted.

Add cases for each.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the new cases pass, and the race test fails when the `latestSearch` guard is removed.

</details>

### P3 12: Local `plural` and `uniqueById` repeat existing helpers (implementation verified)

`invocationFilters.ts` adds its own versions of `pluralize` from `utils/strings.ts` and lodash's `uniqBy`.

Use those instead.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the existing `invocationFilters.test.ts` cases pass unchanged.

</details>
