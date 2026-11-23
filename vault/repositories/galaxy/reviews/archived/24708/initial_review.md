# Initial review: galaxyproject/galaxy#24708

- Profile: `default` (`_shared/reviewers/default.md`)
- Model: Opus 5.5 (`claude-opus-5-5`)
- Effort: medium
- Reviewed commit: `86a724b7bf5e37461797d823287e193afe61fff7` (diff `origin/dev...86a724b7bf5e`, merge-base `e922a682376`)

## Verdict

Needs changes, no P1s. The backend change is small, typed and correct: all `build_invocations_query` and `InvocationIndexPayload` callers are updated, and no imports are buried. The risk is in the client. The client-side name-to-id join loses the user's own workflows on servers with many published workflows, the new dropdown unmounts when a pick matches nothing, and the admin grid inherits filters it cannot use.

How this was checked: by reading code, plus running the shipped tokenizer regex in node and `lib/galaxy/util/search.py` directly. The worktree has no `client/node_modules` and no `.venv`, and other reviewers share it, so no Vitest, API or Selenium test was run. Unverified points are marked.

## P2 (should fix)

### P2 1: Name filters can drop the user's own workflows, because others' published workflows fill the 50-match cap

`findWorkflowsByName` (`client/src/components/Grid/configs/invocationFilters.ts:80-89`) runs its visible lookup with `showPublished: true`, `sortBy: "update_time"`, `limit: 50`. An explicit `sort_by` takes the `apply_sort_column` branch of `WorkflowsManager.index_query` (`lib/galaxy/managers/workflows.py:353-359`), so the server's own-first ordering (`desc(StoredWorkflow.user == user)`, used only when `sort_by` is None) is skipped.

On a server like usegalaxy.org, `workflow:rna` can return 50 recently updated workflows from other people. A user's own older matching workflow then falls off the list, and its invocations are silently missing with no truncation notice. The `/api/invocations` query is already restricted to the user, so those 50 slots go to ids that mostly cannot match. The Workflow dropdown search has the same problem.

The PR description states the 50-match cap. It doesn't state that the cap is shared with everyone's published workflows, which is what makes it harmful here.

Related costs of the same client-side join:

- `getData` re-runs up to 6 index requests on every page or sort change, because it calls `resolveInvocationFilters` each time. The id set can change between pages of one result.
- The query string can reach 150 workflow ids plus 150 history ids, at about 29 bytes each. That is about 4.3 KB per filter kind, past gunicorn's default 4094-byte `limit_request_line` and nginx's default 8 KB header buffer when both are set. Not reproduced; limits are from their documented defaults, and I found no Galaxy override.

Suggested fix, smallest first:

1. Split the lookup so own and shared (`showPublished: false`) gets its own 50 slots, and published gets a separate lookup.
2. Better, and it leaves a reusable abstraction: accept a name search on `/api/invocations` and resolve it in SQL with the existing `parse_filters_structured` / `text_column_filter` helpers, as `index_query` already does. That removes the cap, the repeated lookups and the URL growth, and the client only passes `search` through.

Option 2 would change a stated design choice, so it is a judgment call for the author. Option 1 is the minimum.

### P2 2: Picking an item with no invocations removes the dropdown and its header

`<thead>`, and so `GridColumnFilter`, sits inside the `<template v-else>` at `client/src/components/Grid/GridList.vue:490-494`. That branch renders only when `isAvailable` (`totalRows > 0`) and there are no invalid filters.

The dropdown lists the 20 most recently updated workflows or histories, and many of those will have no invocations. Picking one gives zero rows, so the table unmounts, the open dropdown disappears, and its search text and results are lost. Picks are OR-combined, so this is a dead end mid-selection: the user wanted A or B, but after picking a zero-run A, B can't be added until A is removed with its chip. A picked history and workflow that don't overlap, or a text filter with no match, likewise removes the column filter controls.

The "0 runs" hint doesn't prevent this, and the Selenium and Vitest tests only pick items that have runs.

Suggested fix: keep the table header rendered when the grid has column filters and zero rows, showing "Nothing found" in the body, and add a `GridList.test.ts` case where `getData` returns `[[], 0]` after a pick and asserts the filter toggle still exists.

### P2 3: Stale grid responses can overwrite newer filter results

`getGridData` (`GridList.vue:237-267`) has no guard against out-of-order responses, and `watch([currentPage, filterText, ...])` (`:394`) fires it on each change. The gap exists on `dev`, but this PR makes it much easier to hit:

- Column picks update `filterText` with no debounce, and the dropdown stays open for more picks.
- Name filters add several lookups before the list request, so requests for different text can take very different times.

If the request for `workflow_id:A` returns after the one for `workflow_id:A,B`, the rows show A only while the chips and filter text say A and B.

`GridColumnFilter.search` in this same PR already guards against this with `latestSearch`, so the fix is the same pattern in `getGridData`: drop any response whose request id isn't the latest. Add a `GridList.test.ts` case that resolves two `getData` calls out of order.

### P2 4: The admin invocations grid inherits filters scoped to the admin's own items

`GridInvocation.vue:87-96` uses `invocationsGridConfig` for the admin route too (`client/src/entry/analysis/routes/admin-routes.ts:60-69`, `ownerGrid: false`). That page lists every user's scheduling invocations. Adding `filtering` and `FieldEntry.filter` to the shared config gives that page the search box and column filters as well, and the PR description scopes this feature to User → Workflow Invocations.

The lookups run as the admin: `/api/histories` with `show_own`, and `/api/workflows` for own, shared and published. So the dropdown offers the admin's own items, and name filters resolve to those ids or to `null`. For invocations of other users, which is the point of that page, the filters show "Nothing found" or wrong-looking empties even though matching rows exist.

Suggested fix: use a filterless config when `!ownerGrid` (spread `invocationsGridConfig` and drop `filtering`, strip `filter` from `fields`).

### P2 5: "N runs" counts every user's invocations and diverges from the workflow card's guard

`workflowOption.detail` (`invocationFilters.ts:156-160`) calls `getInvocationCountByWorkflowId` for every option, including other people's shared and published workflows. That reaches `StoredWorkflow.invocation_counts()` (`lib/galaxy/model/__init__.py:9142-9154`), which has no user filter.

So an option can read "by alice · 1204 runs", and picking it shows no rows, because the grid is limited to the current user's invocations. That defeats the purpose of the hint, which is telling same-named workflows apart.

The sibling path, `useWorkflowCardBadges.ts:29-36`, deliberately skips counts for shared workflows, with the comment "only fetch counts for cards that can display them". `getItemById` also fetches on read, so one name search can queue up to 150 `/counts` requests against an unscoped count.

Suggested fix: only read the count when `matchesCurrentUsername(workflow.owner)`, already computed a few lines above. Update the "describes workflows by run count, owner and state" test to assert no count for a foreign workflow.

## P3 (minor)

### P3 1: Unquoted names with punctuation match too much or nothing

`nameSearch` emits `name:<word>` for each word, but the server's keyed pattern takes only `[\w-]+` or a quoted value (`lib/galaxy/util/search.py:43`). Running `parse_filters_structured` then `filter_terms` directly gave:

| Input | Parsed result | Effect |
| --- | --- | --- |
| `name:(QC)` | `RawTextTerm('name:(QC)')` | matches nothing |
| `name:#1` | `RawTextTerm('name:#1')` | matches nothing |
| `name:v1.2` | `name=v1` (`.2` dropped) | also matches v1.3 |
| `name:C++` | `name=C` | matches nearly everything |

Names like "RNA-seq (PE)" or "VGP v1.2" are common, and this applies to both the search box and the dropdown search. A server-side name search (P2 1 option 2) would remove the problem; otherwise extend the keyed pattern or add a contains-style filter that accepts punctuation.

### P3 2: Two gaps in "exact when quoted"

With `quoteStrings=false`:

- A name with a space before a word ending in a colon breaks up. I ran the tokenizer regex on `workflow:'Foo bar: baz'` and got `["workflow:'Foo", "bar: baz'"]`, which by my reading of `getValidFilters` gives an "Invalid filters" alert for key `bar`.
- A bare `'RNA seq'` loses its quotes in `validatedFilterText` (`GridList.vue:364-366`) and becomes substring `name:RNA name:seq`. The exact-match rule for lone quoted text is gated on `quoteStrings` in `Filtering.tokenize`.

The PR documents only the keyed quoted form, so the second is a surprise rather than a contradiction. Consider teaching `splitPairs` not to split inside quotes, or add a test pinning the behavior.

### P3 3: New import cycle

`invocationFilters.ts` imports `@/stores/invocationStore`, which imports `configs/invocations`, which imports `./invocationFilters` and reads `workflowColumnFilter` at module-evaluation time in `fields`.

The production entry paths load in a safe order. `invocationFilters.test.ts` imports `invocationFilters` first, which is the unsafe order, where `invocations.ts` evaluates before those constants initialize. Not run here, since there are no client deps, and the PR's CI shows no failures, so it may only be masked by the test transform.

Suggested fix: move the plain `/api/invocations` fetch out of the grid config (the store and `InvocationScrollList` only pass `""` as `search`) into `@/api/invocations`, which also removes the store's existing dependency on a grid config.

### P3 4: Per-id access check

`InvocationsService.index` (`lib/galaxy/webapps/galaxy/services/invocations.py`) calls `get_accessible` in a loop, one lookup per history id. That can be up to 150 per grid load or page change with a name filter. `by_ids` exists on the manager base (`lib/galaxy/managers/base.py:451`), so load once and check each with `error_unless_accessible`.

### P3 5: API test misses the changed failure paths

`test_invocation_filtering_by_several_workflows_and_histories` covers only happy paths. Add cases for:

- One unknown workflow id among valid ones (the new `len(found_ids)` 404).
- One inaccessible history among accessible ones (the access-check loop).
- Several ids with `instance=true` (the new list comprehension).

### P3 6: `key:<id>,<id>` is parsed in two places

`GridList.columnFilterSelection` and `invocationFilters.splitIds` each split and filter the same format, which `FieldFilter` documents as owned by the grid. Export one helper from the grid config module and use it in both.

## Noted, no action

- `workflow_id: [workflowId]` updates in `invocationsWorkflow.ts` and `invocationsHistory.ts`, the `[workflow_id]` wrap at `/api/workflows/{id}/invocations`, and `agents/operations.py` are all consistent. A single `workflow_id=<id>` query keeps working, and the API test asserts it.
- `FieldEntry.filter` / `FilterOption` is a reasonable reusable abstraction built on `GDropdown`, `GDropdownForm` and `GCheckbox`. The nearest existing option is `vue-multiselect`, used by `FormSelect` and, with async search, `UserSharing`. I didn't compare them in depth, but it wouldn't obviously fit a header-button dropdown with two-line checkbox rows, so I'm not flagging it.
- Page position isn't reset on a filter change (`currentPage` stays). That's existing `GridList` behavior, not introduced here.
- No suspected security findings. Non-admin results stay restricted to the current user, and history ids are still access-checked.
