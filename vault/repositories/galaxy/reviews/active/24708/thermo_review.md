# Thermo-nuclear review: galaxyproject/galaxy#24708

- Profile: `thermo_review`
- Model: Opus 5.5 (claude-opus-5-5)
- Effort: medium
- Reviewed commit: `86a724b7bf5e37461797d823287e193afe61fff7` (base `dev`, merge-base `e922a682376`)
- Code read only, not run.

## Verdict

No P1s. The `FieldFilter` extension and the repeated-id API are sound. Name filtering, though, can return wrong results on servers with many published workflows, and fixing that on the server also removes most of `invocationFilters.ts`'s complexity. The multi-id filter text also adds a comma format that `Filtering` already covers with `MultiTags`. No file crosses 1k lines (`GridList.vue` is 678).

## Findings

### P2 1: A name filter can hide the user's own invocations; resolve names on the server

`workflow:<name>` can drop the user's own invocations from the grid without any message. The first lookup in `findWorkflowsByName` uses `showPublished: true`, sorted by `update_time` and capped at 50, and `index_query` ORs own, shared and published workflows together. On a server with many published workflows, `rna` (or any common word, since unkeyed text is a workflow name) can fill all 50 slots with other people's recently updated workflows. The user's older workflow is then never sent to `/api/invocations`.

The PR says name searches go through the existing index APIs, and that is the cause, so raising the cap only moves the problem. No other grid config translates its text search on the client. The filterable siblings pass `search` straight to their index (`configs/pages.ts:37`, `configs/visualizations.ts:27`), and managers parse it with `parse_filters_structured` (`managers/pages.py:190`).

<details><summary>Details</summary>

All of this exists only because the name is resolved on the client:

- `findWorkflowsByName` / `findHistoriesByName` fan-out in the text filter path. An invocation's workflow or history row can be joined whatever its deleted, hidden, purged or shared state, so the "one kind per call" explanation no longer applies.
- `NAME_MATCH_LIMIT` and its silent truncation.
- `combine()`. Narrowing picked ids by name is plain `AND` in SQL (`stored_workflow_id IN (...) AND name ILIKE ...`), so the behavior the PR describes is kept with no code.
- The `null` return from `resolveInvocationFilters` and the `[[] as WorkflowInvocation[], 0] as const` short circuit in `getData`. They exist because the server reads an empty id list as "no filter".
- Up to 150 ids per kind in one URL, and on the history side up to 150 `get_accessible` calls per request from the loop in `InvocationsService.index`.

</details>

Add `search` to `InvocationIndexQueryPayload` and `/api/invocations`, and apply it in `build_invocations_query`. Keep `workflow_id` / `history_id` as the repeated id params for picked items. `resolveInvocationFilters` then becomes a synchronous split of the filter text into ids plus a passed-through search.

<details><summary>Details</summary>

```python
parsed = parse_filters_structured(search, {"workflow": "workflow", "history": "history"})
# join Workflow -> StoredWorkflow and History once, whichever filters need them
stmt = stmt.where(text_column_filter(StoredWorkflow.name, term))  # workflow:
stmt = stmt.where(text_column_filter(History.name, term))         # history:
```

`text_column_filter` (`lib/galaxy/model/index_filter_util.py:22`) already gives the PR's quoted-exact / unquoted-substring behavior. `build_invocations_query` joins `Workflow` and `History` conditionally today, so those joins need folding into one decision per table. The column dropdown still needs its index lookups, so `findWorkflowsByName` / `findHistoriesByName` stay for that path only. Unkeyed text and per-word splitting (`nameSearch`) need mapping onto the parser's raw-text terms.

This changes the PR's stated "at most 50 matches per lookup" limit. It removes a limitation; it doesn't reverse a design goal.

</details>

### P2 2: Use `Filtering`'s multi-value support instead of a new comma format

The PR adds a `key:<id>,<id>` format to the filter text. It is joined in `onColumnFilter` and split twice, in `GridList.columnFilterSelection` and `invocationFilters.splitIds`. `Filtering` doesn't know about this format, so every reader has to re-parse a plain string.

`Filtering` already has this concept. A filter declared `type: "MultiTags"` parses repeated `key:value` tokens into an array (`utils/filtering.ts:517`) and writes an array back as repeated tokens (`:603`), and `setFilterValue` toggles a single value in or out (`:878`). Despite the name, that path holds no tag-specific logic, and `ToolsList.vue:185` declares it.

Declare `workflow_id` and `history_id` with `type: "MultiTags"`. `rawFilters.value[key]` and `filters.workflow_id` then arrive as arrays, so the join and both splitters go, and `GridList.applyFilter` can do the checkbox and chip toggles. The `clears` keys and the Clear button still need a remove. The filter text becomes `workflow_id:a workflow_id:b`, so the PR's description and the `GridList.test.ts` expectation change. I read this path but did not run it.

### P2 3: Move column filter state out of `GridList.vue` into a composable and a chips component

The PR pitches `FieldFilter` as generic, but its state lives inline in `GridList.vue`, already a busy component: `setFilters`, `columnFilterNames`, `columnFilterSelection`, `activeColumnFilters`, `onColumnFilter`, `removeColumnFilterOption`, plus the chip markup. Those functions are only about column filters and don't interact with paging, operations or batch logic. The selection is also held in two places: ids in the filter text, labels in `columnFilterNames`.

Extract `useGridColumnFilters({ fields, filterClass, filterText, rawFilters })` and a `GridColumnFilterChips.vue`, leaving `GridList.vue` with one composable call and two template tags. Any two-pass remove-then-set that survives P2 2 belongs on `Filtering`, which owns the filter text format, rather than in `setFilters`.

### P3 1: Reuse existing helpers for `plural` and `uniqueById`

`invocationFilters.ts` adds local versions of what the client already has. `plural()` wraps `pluralize` from `utils/strings.ts` (`visualizationsShared.ts` uses it), differing only by prepending the count. `uniqueById()` is `uniqBy(lists.flat(), "id")` from lodash, which `utils/filtering.ts` already imports from.

### P3 2: `FieldFilter` can be declared without the `filtering` it depends on

A `FieldFilter` needs two more declarations to work: `GridConfig.filtering`, and a `validFilters` entry for its `key`. Without `filtering`, `GridList` still renders the dropdown and `setFilters` silently returns. Without a valid `key`, `applyFiltersToText` drops the value. Nothing in the types or at runtime flags either mistake, which matters for an abstraction offered to other grids.

Gate rendering on `filterClass`, and have the composable from P2 3 raise a `console.error` or throw when `filter.key` isn't in `filterClass.validFilters`. That keeps the failure visible to the next grid author.

### P3 3: Evaluate `FilterOption.detail` once per row

The template calls `option.detail?.()` three times for each option (`GridColumnFilter.vue`, in the `<small>` block). The function form exists so the run count can update from `useKeyedCache`, and each read hits the store. Extract a small `GridColumnFilterOption.vue` with one `computed`, or a single template binding, so each row computes it once.

Reading that count also triggers one `/api/workflows/{id}/counts` request per uncached row (`keyedCache.ts:61`), so a broad search can send up to 150 requests. Limiting the rows the dropdown lists would cap that.

### P3 4: Finish the singular-to-plural rename on the backend

`InvocationIndexQueryPayload.workflow_id` and `history_id` are now `list[int]` but keep singular names, giving `stored_workflow_ids=invocation_payload.workflow_id` in the service. The HTTP param has to stay singular for compatibility; the payload is internal, so `workflow_ids` / `history_ids` costs little.

`index_workflow_invocations` keeps a separate `HistoryIdQueryParam` and wraps it as `[history_id] if history_id is not None else None`, so sibling invocation routes now differ. Switching it to `HistoryIdsQueryParam` removes both the conditional and the extra alias. This does widen that route's API.

## Checked, no finding

- No file crosses 1k lines. `lib/galaxy/managers/workflows.py` and `api/workflows.py` were already over and grew only slightly.
- The manager and service changes are direct `IN` conversions with no new special-case branches. The `by_stored_id=not instance` simplification is correct inside `if ... instance`.
- The raw `<input>` in `GridColumnFilter.vue` needs a ref for focus. `GFormInput` comes from `@galaxyproject/galaxy-ui`, and I didn't check whether it forwards one, so not raised.
- The hand-rolled `latestSearch` race token could use `computedAsync` (used in 4 client files), but the saving is small, so not raised.
