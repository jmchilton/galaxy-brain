# PR #24846 initial review (default profile)

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5, effort low
- Reviewed commit: `00be733f7cc9a515c7a994399a80268b1892fda9` (base `release_26.2`)

## Verdict

Approve-worthy. Small, correct fix in the right place: the shared `Filtering.getFilterText`, not per-list workarounds. It reuses the existing `sourceFilterText` tokenization (`tokenize` / `isRawText`) and the autoFilterKey path's "plain text first" ordering. No bugs found. Only minor items below.

## Verification

- Ran with borrowed `node_modules` from a 26.2 worktree: `filtering.test.js`, all of `Workflow/List/`, `GridList.test.ts`, `FilterMenu.test.ts` and `ToolsList/`. 16 files, 219 tests, all pass.
- Red check: with base `filtering.ts`, the 3 new `filtering.test.js` tests and the new `WorkflowList.test.ts` test fail. With only base `WorkflowList.vue`, the new WorkflowList test fails (`filterText: "is:deleted"` instead of `"rna is:deleted"`). The tests pin both halves of the change.

## Blast radius (sibling callers)

The change applies to every `Filtering` with no `autoFilterKey` whenever `sourceFilterText` is passed. That covers more than the workflow lists the PR names:

- `GridList.vue` `validatedFilterText()` already passes `filterText.value`. Every Grid config (pages, visualizations, admin users/roles/groups/quotas/forms, published lists) builds `new Filtering(validFilters, undefined, false)` with no autoFilterKey, so `foo tag:bar` now sends `foo tag:bar` instead of `tag:bar`. Grid tag clicks (`setFilterValue`) also keep the typed words now.
- `FilterMenu.vue` `onSearch()` passes `props.filterText`, so advanced-search submit keeps plain words for all these lists.
- `ToolsList.vue` `applyFilter` non-picker path (`setFilterValue`) keeps free text. Its `applyFiltersToText(…, "")` calls are unaffected, since the source is empty.
- `CredentialsManagement.vue` (quoteStrings true) keeps raw tokens as typed, quotes included. It filters client-side, so nothing visible changes.
- autoFilterKey classes (`HistoryFilters`, `HistoriesFilters`, `historyList.ts`, `JobsList`) are untouched: the new branch is gated on `autoFilterKey === undefined`. `historyStore` calls without a source and is unaffected.

All of these look like improvements, not regressions. Plain-text-only queries already reached these backends unchanged, so the backends parse raw terms. The existing Grid/FilterMenu/ToolsList tests still pass.

## Findings

### P3 1: Comments in touched/sibling files now say `Filtering` drops free text

`CuratedWorkflowList.vue`, a file this PR edits, still has two comments describing the old behavior:

- `searchText()`: "rebuilding it from the parsed filters would drop any free text typed alongside them"
- `toggleCollection()`: "rebuilds the query from its parsed filters and so would drop free text and leave a `c:` term behind"

`ToolsList.vue` `applyFilter` has the same claim: "`Filtering` would drop the free text, fold words that follow a filter into its value and merge repeated filters".

After this PR the "drops free text" part is false. The other reasons still hold (a leftover `c:` term, folding words that follow an unquoted filter into its value, merging repeated filters), so the hand-edited workarounds remain justified. Suggested fix: drop the "free text" clause from these comments so nobody later removes a workaround or adds a new one for the wrong reason.

### P3 2: PR description/docstring understate scope (optional)

The PR description frames this as a workflow-list fix. The `filtering.ts` change also changes Grid lists, FilterMenu advanced search and ToolsList tag toggling, as listed above. Optional fixes:

- Add one line to the PR description so release-branch reviewers know Grid list searches change too.
- Extend the `getFilterText` `@param sourceFilterText` docstring, which today only mentions autoFilterKey and quoting, to say that without an `autoFilterKey` the source's plain words are kept.

## Non-findings / notes

- `CuratedWorkflowList.vue` `validatedFilterText()` has no direct test. The shared logic is covered by `filtering.test.js` and the WorkflowList test, and the call-site change is identical to `WorkflowList.vue`, so this is not worth a finding.
- Words typed after an unquoted `key:value` (`tag:qc rna` with `quoteStrings=false`) still fold into that filter's value. This is pre-existing parser behavior and out of scope.
- No security concerns.
