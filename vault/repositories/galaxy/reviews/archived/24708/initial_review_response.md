Good idea - lots of nits for your agent to work through if you'd like - I've reviewed them all and they seem valid. -John

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Opus 5.5 at medium effort.
- Review profile [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) was run via Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Opus 5.5 at low effort.
- Review profile [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) was run via Opus 5.5 at medium effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_reviews/reviewers/learning_galaxy.md) was run via Opus 5.5 at medium effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

The one-way risks are the widened public contract of `GET /api/invocations` (`workflow_id` and `history_id` become repeatable lists, changing their OpenAPI types) and the user-facing `workflow:`/`history:` filter vocabulary, which will be hard to change once people and scripts rely on them.

<details><summary>Risk Details</summary>

- `workflow_id` and `history_id` on `GET /api/invocations` change from `string | null` to `string[] | null` in the OpenAPI schema. A single value still works on the wire, but typed consumers of the schema must change, as the two in-tree grid configs did, and any-of semantics for repeated ids become a supported behavior.
- The list has no server-side size limit. Each history id adds its own access check, and one inaccessible history or missing workflow fails the whole request rather than dropping that id.
- A name filter sends up to 50 matches per lookup, across three lookups for each of workflows and histories, in a GET query string. A common word could produce several KB of URL and hit request-line limits on some deployments. This is fixable later without changing the contract, but the failure would appear only on large accounts.
- Name filters cap at 50 matches per lookup with no sign in the UI, so a broad name can silently omit invocations from the list.
- `workflow:<name>`, `history:<name>`, quoted exact matching and "unkeyed text is a workflow name" are new search semantics that users will learn. Changing them later breaks habits, though not stored data.
- `FieldEntry.filter` is a new generic `GridList` extension point. Its `{ key, clears, plural, search }` shape is easy to change now and gets harder as other grids adopt it.
- `build_invocations_query` keyword arguments are renamed to `stored_workflow_ids` and `history_ids`. All in-tree callers are updated; only out-of-tree callers would notice.

</details>

<details><summary>Risk Review Advice</summary>

Humans should decide whether repeated query parameters on a GET are the contract Galaxy wants for multi-id filtering, and whether it should carry a size limit before clients depend on it. Also confirm that failing the whole request on one bad id is the intended behavior, since a stale id in the filter text would then produce a grid error rather than a narrower result.

The client side is cheap to walk back apart from the filter vocabulary. Check that the substring default, the unkeyed-text meaning and the "picked items narrowed by name" rule are ones the team would keep, and that `FieldFilter` is general enough for the next grid.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24708_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24708_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24708_review_0), from the reviewed commit [`86a724b7bf5e`](https://github.com/jmchilton/galaxy/commit/86a724b7bf5e37461797d823287e193afe61fff7), fixes each finding in `verified_review.md` with one commit. On the client it stops name filters losing the user's own workflows, keeps the column filters mounted when nothing matches, limits run counts to the user's own workflows, drops filters from the admin grid, ignores stale grid responses, reuses resolved names across page changes, handles punctuation and colons in names, moves column filter ids to `Filtering`'s `MultiTags`, and breaks the grid config and store import cycle. On the server it replaces the per-id history access check with one query. The remaining commits add or tighten tests: API failure paths, real-server lookups, Vitest races and marks, and a Selenium test whose history and name filter steps can now fail.

- [`b408f147087`](https://github.com/jmchilton/galaxy/commit/b408f147087df2573c83ea49c32705faa68f9aa8) Give own workflows their own slots in invocation name lookups: adds an own and shared lookup next to the published one (P2 1).
- [`27f9cafd2c0`](https://github.com/jmchilton/galaxy/commit/27f9cafd2c0d5e1377c643cb50e27f583a113f4b) Show invocation filter run counts only for own workflows: gates the `/counts` read on ownership and updates the existing test's expected text (P2 3).
- [`aacf9ce1be3`](https://github.com/jmchilton/galaxy/commit/aacf9ce1be3f429d37e4a12be5a25aa4d50b1749) Keep grid column filters mounted when a filter matches nothing: renders the table header with zero rows when a grid has column filters and filter text (P2 2).
- [`560592c7c3d`](https://github.com/jmchilton/galaxy/commit/560592c7c3dab9fce137bf74619f878573968866) Ignore stale grid responses: adds a latest-request guard to `getGridData` (P3 1).
- [`8c16f31669e`](https://github.com/jmchilton/galaxy/commit/8c16f31669ed931b197fa83ec07c16c393a43222) Don't offer invocation filters on the admin grid: adds `adminInvocationsGridConfig` and `GridInvocation.test.ts` (P3 2).
- [`91e1cee4743`](https://github.com/jmchilton/galaxy/commit/91e1cee4743d5ac86fef0fb7bb9245cf927add95) Reuse resolved invocation filters across page and sort changes: reuses the last resolved text for up to a minute (P3 3).
- [`5160242a7a4`](https://github.com/jmchilton/galaxy/commit/5160242a7a4268c217e7206b7480bd25be2975f7) Treat punctuation as word breaks in invocation name filters: splits unquoted names on what the index's terms can't take (P3 4).
- [`5da62a3ed7a`](https://github.com/jmchilton/galaxy/commit/5da62a3ed7a9c4200b7f3c9fec092762f070eb09) Reuse lodash and strings helpers in invocation filters: replaces local `plural` and `uniqueById` (P3 12).
- [`1a21effad99`](https://github.com/jmchilton/galaxy/commit/1a21effad9973776102b720d483e249b7f061866) Test column filter races, failures, debounce and state marks: adds Vitest cases only (P3 11).
- [`b2a4c5d30f3`](https://github.com/jmchilton/galaxy/commit/b2a4c5d30f3c8cb3b971515f2ca5c96c8fcdcfcb) Test unknown, duplicate and inaccessible ids on the invocation index: adds an API test, including `total_matches` (P3 9).
- [`c65a90fa238`](https://github.com/jmchilton/galaxy/commit/c65a90fa23852756bc803ef65385f848f6469ea1) Check invocation index history access with one query: uses `by_ids` plus `error_unless_accessible`, with an API test that deleted, purged and archived histories still work (P3 8).
- [`25eb4554fbf`](https://github.com/jmchilton/galaxy/commit/25eb4554fbf58486eca2d51b45dd8479a315aef5) Test the invocation filter name lookups against a real server: adds API tests for the workflow and history index queries (P3 10, and evidence for P2 1).
- [`7feac780b0d`](https://github.com/jmchilton/galaxy/commit/7feac780b0def4ec2b6f71f2dee8bfa8dc0cd260) Make invocation grid Selenium filter steps able to fail: adds a third workflow, more steps and a parameterized chip selector (P2 4).
- [`3120d9eed83`](https://github.com/jmchilton/galaxy/commit/3120d9eed8393eb269f13b5c9f23a3a56c157c33) Break the invocation grid config and store import cycle: moves the fetch to `configs/invocationsIndex.ts` and retargets a CommandPalette test mock (P3 7).
- [`6cadf548fa6`](https://github.com/jmchilton/galaxy/commit/6cadf548fa6c8644b85ef06bc8cb562acaf987b3) Keep quoted values with colons in one filter term: changes the `quoteStrings=false` regex in `Filtering.splitPairs` (P3 5).
- [`706dabef324`](https://github.com/jmchilton/galaxy/commit/706dabef32406bae308e56a98884146606334846) Use Filtering's MultiTags for grid column filter ids: replaces the comma format with repeated terms, and updates filter text expectations. As the last commit it can be dropped on its own, if the format in the description stays (P3 6).

</details>

</details>

### P2 1: A name filter can drop the user's own workflows (implementation verified)

`workflow:<name>` and the Workflow dropdown search can silently lose the user's own workflows, and with them their invocations. The visible lookup in `findWorkflowsByName` asks for own, shared and published workflows together, sorted by `update_time` and capped at 50. An explicit sort skips the index's own-first ordering, so on a server with many published workflows others' recently updated ones can fill every slot. `/api/invocations` only returns the user's runs, so those slots mostly can't match anything. The description states the 50-match cap, but not that everyone's published workflows share it.

<details><summary>Evidence</summary>

`test_index_name_lookups_used_by_invocation_filters` shows it on a real server: with an own and a newer published workflow of the same name, the client's lookup with `limit=1` returns only the published one. The new Vitest case failed on the reviewed commit with `expected [ 'published-0', 'published-1', …(48) ] to include 'own'`.

</details>

Give own and shared workflows their own lookup next to the published one, which keeps the cap and the use of the index APIs. A `search` parameter on `/api/invocations`, resolved in SQL with `parse_filters_structured` and `text_column_filter` as the index managers do, would remove the cap, the id lists and the repeated lookups altogether, if you'd rather go that way. It is a change of design, so it isn't on the review branch.

Fixed on the review branch in [`b408f147087`](https://github.com/jmchilton/galaxy/commit/b408f147087df2573c83ea49c32705faa68f9aa8).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md), [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) and [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 2: Picking an item with no invocations removes the dropdown (implementation verified)

The table header holds the column filters, and `GridList` only renders it when there are rows. The dropdown lists recently updated items, many without invocations, so picking one closes the dropdown mid-selection and loses its search text and results. The Workflow and History filter buttons are gone until the filter is removed with its chip or the search box. A text filter with no match does the same.

Keep the table rendered when the grid has column filters and filter text, with the "Nothing found" message above it. Grids without column filters, and grids with no data and no filter, behave as before.

Fixed on the review branch in [`aacf9ce1be3`](https://github.com/jmchilton/galaxy/commit/aacf9ce1be3f429d37e4a12be5a25aa4d50b1749).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: a new `GridList.test.ts` case failed on the reviewed commit and passes with the fix.

</details>

### P2 3: "N runs" counts every user's runs and fetches them for other people's workflows (implementation verified)

`workflowOption.detail` reads the run count for every option, and `StoredWorkflow.invocation_counts()` has no user filter. An option can read "by alice · 1204 runs", then show no rows when picked, because the grid lists only the user's invocations. Each such row also sends a `/api/workflows/{id}/counts` request, against the workflows most expensive to count. A broad search can queue dozens of these, sharing the client's rate limiter with the grid fetch. `useWorkflowCardBadges` skips counts for workflows the user doesn't own, for this reason.

Only read the count when the user owns the workflow. This drops "1 run" from the expected text of the existing "describes workflows" test, which now also asserts no `/counts` request for the other user's workflow. Own workflows still send one request each, up to 20 per open and more for a broad search; a bulk counts endpoint would be the reusable next step, and the workflow cards could use it too.

Fixed on the review branch in [`27f9cafd2c0`](https://github.com/jmchilton/galaxy/commit/27f9cafd2c0d5e1377c643cb50e27f583a113f4b).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md), [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the tightened test failed on the reviewed commit and passes with the fix. Request counts per dropdown open are read from the code, not measured in a browser, and latency is unmeasured.

</details>

### P2 4: Two Selenium steps pass even if the filters do nothing (implementation verified)

In `test_filter_by_workflow_and_history`, the history step picks H1 with W1 selected, but all of W1's runs are in H1, so the count is 2 either way. The name filter step expects 3 rows when the user has exactly 3 invocations, so an ignored filter passes too. The description lists both steps as coverage.

Run a third, differently named workflow, so these filters have a run to exclude: remove the workflow chips, pick H2 and expect 1 of 4, then expect 3 of 4 from the name filter. The same test can then cover the recent list, a pick removing a name filter (`clears`), and a filter matching nothing with the column filter still there. Chips get a parameterized `active_column_filter` selector in place of `.all()[0]`.

Fixed on the review branch in [`7feac780b0d`](https://github.com/jmchilton/galaxy/commit/7feac780b0def4ec2b6f71f2dee8bfa8dc0cd260).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the rewritten test passes on the Playwright backend at the branch head. It couldn't run on the Selenium backend here (`pyvirtualdisplay` isn't installed), and it wasn't run against the reviewed commit. Its last step depends on P2 2.

</details>

### P3 1: Stale grid responses can overwrite newer filter results (implementation verified)

`getGridData` has no guard against out-of-order responses. The gap is older than this PR, but name lookups make request times vary and picks aren't debounced, so a slow response for one filter can replace the rows of a newer one while the chips and filter text show the newer filter. `GridColumnFilter.search` in this PR already guards against this with `latestSearch`. Use the same pattern in `getGridData`.

Fixed on the review branch in [`560592c7c3d`](https://github.com/jmchilton/galaxy/commit/560592c7c3dab9fce137bf74619f878573968866).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) and [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: a new out-of-order test failed on the reviewed commit (`expected 'slow-row' to be 'fast-row'`) and passes with the fix.

</details>

### P3 2: The admin invocations grid inherits filters that only cover the admin's items (implementation verified)

The admin route uses the same grid config, with `ownerGrid: false`, so it gets the search box and column filters too. That page lists every user's scheduling invocations, but the lookups run as the admin and return the admin's own workflows and histories. The filters then offer the wrong items and report "Nothing found" for rows that exist. The description scopes the feature to User → Workflow Invocations.

Use a config without `filtering` and `FieldEntry.filter` when `!ownerGrid`.

Fixed on the review branch in [`8c16f31669e`](https://github.com/jmchilton/galaxy/commit/8c16f31669ed931b197fa83ec07c16c393a43222).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: a new `GridInvocation.test.ts` case failed on the reviewed commit and passes with the fix.

</details>

### P3 3: Name filters re-resolve on every page and sort change (implementation verified)

`getData` awaits `resolveInvocationFilters` on each fetch, so paging through `workflow:x history:y` repeats every index lookup for unchanged text, and the matching ids can change between pages of one result. The grid uses only the ids from those responses, each full lookup measured about 100 statements, and P2 1 adds one lookup per workflow name.

Reuse the last resolved text until it changes or is a minute old. The time limit keeps a workflow created in the meantime from staying invisible. A server-side search (P2 1) would make this unnecessary.

Fixed on the review branch in [`91e1cee4743`](https://github.com/jmchilton/galaxy/commit/91e1cee4743d5ac86fef0fb7bb9245cf927add95).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: a new request-count test failed before the fix and passes with it. Statement counts are from the performance review on SQLite; latency is unmeasured.

</details>

### P3 4: Unquoted names with punctuation match too much or nothing (implementation verified)

`nameSearch` emits `name:<word>` per word, but the index's keyed pattern only takes `[\w-]+` or a quoted value. `name:(PE)` and `name:#1` become raw text and match nothing, while `name:v1.2` parses as `name=v1`. So searching "RNA-seq (PE)" finds no workflow named that, in both the search box and the dropdown.

Split words on the characters the index can't take: `RNA-seq (PE)` becomes `name:RNA-seq name:PE`. A value with no word characters, like `++`, becomes one quoted term, so that it can't turn into an empty search matching everything. A server-side search would handle this as well.

Fixed on the review branch in [`5160242a7a4`](https://github.com/jmchilton/galaxy/commit/5160242a7a4268c217e7206b7480bd25be2975f7).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: `parse_filters_structured` run directly on these terms, and new `nameSearch` table rows failed on the reviewed commit and pass with the fix.

</details>

### P3 5: A quoted name containing a colon gives an "Invalid filters" alert (implementation verified)

The description says a quoted value is exact, but `workflow:'Foo bar: baz'` splits at `bar:` in `Filtering.splitPairs`, leaving `workflow` as `'Foo` and an invalid filter `bar`.

Have the `quoteStrings=false` regex keep a fully quoted value as one term. This is shared code, so the other grids using that mode get the fix as well; `filtering.test.js` still passes.

Fixed on the review branch in [`6cadf548fa6`](https://github.com/jmchilton/galaxy/commit/6cadf548fa6c8644b85ef06bc8cb562acaf987b3).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: a new test failed on the reviewed commit and passes with the fix.

</details>

### P3 6: `key:<id>,<id>` duplicates what `Filtering` already does with `MultiTags` (implementation verified)

The PR adds a comma format that `Filtering` doesn't know about, so `GridList.columnFilterSelection` and `invocationFilters.splitIds` each parse it by hand. A filter declared `type: "MultiTags"` already reads repeated `key:value` terms into an array and writes an array back, and the generic `FieldFilter` is better off on that path.

Declare `workflow_id` and `history_id` as `MultiTags`. The filter text becomes `workflow_id:a workflow_id:b`, which changes the format in the description, so this one is your call; the description and `FieldFilter`'s doc would follow. `FieldFilter.key` now has to be a `MultiTags` filter, as its doc says. On the review branch this is the last commit, so it can be dropped on its own.

Fixed on the review branch in [`706dabef324`](https://github.com/jmchilton/galaxy/commit/706dabef32406bae308e56a98884146606334846).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: Vitest passes with its filter text expectations updated to the new format, and the Playwright run of `test_filter_by_workflow_and_history` passes on top of it.

</details>

### P3 7: New import cycle silently loses the column filters in one load order (implementation verified)

`invocationFilters.ts` imports `invocationStore`, which imports `configs/invocations`, which reads `workflowColumnFilter` when it loads. If `invocationFilters` loads first, the grid config evaluates before those constants exist. Today that order only happens in `invocationFilters.test.ts`, where the fields end up with no `filter` and nothing notices. In a production bundle it would throw, should anything import that module first.

Move the plain fetch out of the grid config into `configs/invocationsIndex.ts`, and have the store use it, which also removes the store's dependency on the grid config. `CommandPalette/providers/invocations.test.ts` mocked the old `getData` for this path, so its mock moves to `fetchInvocations` with its assertions unchanged.

Fixed on the review branch in [`3120d9eed83`](https://github.com/jmchilton/galaxy/commit/3120d9eed8393eb269f13b5c9f23a3a56c157c33).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: a new load-order test failed on the reviewed commit (`expected [] to deeply equal [ { key: 'workflow_id', …`) and passes with the fix. The production throw is reasoned from ES module semantics, not observed.

</details>

### P3 8: History access check runs one query per id (implementation verified)

`InvocationsService.index` calls `get_accessible` in a loop, so a broad history name filter runs up to 150 selects, each with `History.update_time`'s correlated subquery.

Load them once with `by_ids`, compare lengths to keep the not-found error, and call `error_unless_accessible` per history.

Fixed on the review branch in [`c65a90fa238`](https://github.com/jmchilton/galaxy/commit/c65a90fa23852756bc803ef65385f848f6469ea1).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md), [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the API tests from P3 9 pass before and after the change, keeping the 403 and 404, and a new API test confirms deleted, purged and archived histories still return 200, as the name filter relies on. The 1 versus n statement counts are the performance review's SQLite measurement, not repeated here.

</details>

### P3 9: API test skips the new failure branches (implementation verified)

`test_invocation_filtering_by_several_workflows_and_histories` covers success only, so nothing exercises the new `len(found_ids)` check or the per-history access check, and a loop checking only the first id would pass.

Add a test for a repeated id (200), an unknown workflow or history among valid ones (404), another user's private history among the user's own (403), and `limit=1` across two workflows (`total_matches` of 2).

Fixed on the review branch in [`b2a4c5d30f3`](https://github.com/jmchilton/galaxy/commit/b2a4c5d30f3c8cb3b971515f2ca5c96c8fcdcfcb).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the new API test passes, so the PR's behavior on these paths is correct.

</details>

### P3 10: The "any state" lookups aren't checked against a real server (implementation verified)

The description promises name searches over deleted, hidden, archived and purged items, built from index calls with flags that depend on server rules. The only coverage is Vitest, whose handlers are keyed on the strings the client builds, and no API test sends `is:purged`, or `is:deleted` to the workflow index.

Add API tests in `test_workflows.py` and `test_histories.py` issuing the client's own queries. They pass, so the client's flag combinations do what the description says.

Fixed on the review branch in [`25eb4554fbf`](https://github.com/jmchilton/galaxy/commit/25eb4554fbf58486eca2d51b45dd8479a315aef5).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: both new API tests pass.

</details>

### P3 11: Column filter races, failures and some promised details have no tests (implementation verified)

`latestSearch` is `GridColumnFilter`'s only non-trivial logic and has no test, nor does the `Failed to load ...` path. "searches as you type" would pass with no debounce. The `hidden`, `archived` and `purged` marks, their precedence, and `historyColumnFilter.search("")` are also unasserted.

Add cases for each.

Fixed on the review branch in [`1a21effad99`](https://github.com/jmchilton/galaxy/commit/1a21effad9973776102b720d483e249b7f061866).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the new cases pass, and the race test fails when the `latestSearch` guard is removed.

</details>

### P3 12: Local `plural` and `uniqueById` repeat existing helpers (implementation verified)

`invocationFilters.ts` adds its own versions of `pluralize` from `utils/strings.ts` and lodash's `uniqBy`.

Use those instead.

Fixed on the review branch in [`5da62a3ed7a`](https://github.com/jmchilton/galaxy/commit/5da62a3ed7a9c4200b7f3c9fec092762f070eb09).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the existing `invocationFilters.test.ts` cases pass unchanged.

</details>
