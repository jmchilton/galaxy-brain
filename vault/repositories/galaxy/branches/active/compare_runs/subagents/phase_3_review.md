# Phase 3 review debrief

Verdict: approve with small fixes, no blockers, no access findings. Acting on all four bugs (prefs key from props + single fetch, retryable fetch, subworkflow/pause row detail — already in the phase 4 brief, stale collection popover), the reuse items (drop transpose helpers, shared state-icon component, direct `GalaxyApiPaths` query indexing, expose GTable `detailsShowing` instead of mirroring expansion if the `packages/ui` change stays small), the three test tightenings and the nits.

Not acted on yet:
- A shared `totalMatches(response)` helper is added for comparisons, but migrating the ~10 existing `total_matches` parsers is left to the baseline-refactor step of hardening.
- Unbounded `comparison-display` localStorage map — capped only if cheap; otherwise a design question.

<details><summary>Full review</summary>

# Phase 3 (client) review: raw

Reviewed commits `055ecabe52b`, `d8c5f063464`, `34a50e9f1f4` and `abcb7d2be5d` in `/Users/jxc755/projects/worktrees/galaxy/branch/compare_runs`. Line numbers are from `abcb7d2be5d`. Since that commit there is no drift in `Comparison/`, `ItemPopoverLink.vue` or `api/comparisons.ts`.

vitest, run read-only: `src/components/Comparison`, `ItemPopoverLink.test.ts` and `DatasetPopoverLink.test.ts` give 8 files and 77 tests, all passing.

## Verdict

**Approve with small fixes.** This is a solid phase.
- The table is genuinely props-driven, and expansion is lazy.
- Popovers fetch only on hover or focus, and they get unique DOM ids.
- Types alias the generated schema.
- `WorkflowInvocationStep.vue` changes by 5 lines.
- Tests mostly pin real behaviour against a fixture taken from the real API.

There are no blocking bugs. Four small correctness or UX bugs need fixing (below), plus a handful of reuse and abstraction nits.

## Bugs (small)

1. **The first open double-fetches, and preferences set early are lost.**
   - Location: `StepRunsTab.vue:31-38` and `useComparison.ts:63-69`.
   - `storageKey` is derived from `table.value.query`, so the first request always uses the unsaved prefs `{}`. When the response lands, the key resolves. Any stored `meta:*` cell display then changes `params`, which fires a second request. Meanwhile, metadata cells flash "loading…" and transpose flips after first paint.
   - Anything the user changes before the first response is dropped when the key switches.
   - The stored workflow is already in memory on the invocation page: `WorkflowInvocationState.vue:97` gates its tabs on `workflowStore.getStoredWorkflowByInstanceId(invocation.workflow_id)`.
   - **Fix:** restore the plan's `storedWorkflowId?` prop.
     - `StepAllRunsTab` passes `useWorkflowStore().getStoredWorkflowIdByInstanceId(invocation.workflow_id)`, which reads the store and fetches nothing.
     - `StepRunsTab` computes `storageKey` from props: the stored id plus `stepLabel`.
     - Fall back to the response-derived key only when the stored id is unknown.
     - Keep `instance=true` for the request if wanted.
   - This also removes debrief deviation 6.
   - **Test:** seed the user local storage with `{ "step_runs:<sw>:second_cat": { columnDisplay: { "output:out_file1": "meta:data_lines" } } }`, mount, and assert `requests.length === 1` with `metadata_elements=data_lines`. That test also covers key scoping. No test currently exercises persistence or key scoping at all.

2. **A failed fetch can't be retried.**
   - Location: `useComparison.ts:27`.
   - `lastParams = serialized` is set before the request, so after an error, identical params are deduped forever.
   - `reload` is returned but `StepRunsTab` never uses it, and there is no retry affordance.
   - **Fix:** reset `lastParams = undefined` in the `catch` when `controller === own`, or add a "Retry" `GButton` in the error alert (`StepRunsTab.vue`, the `v-if="error"` alert) that calls `reload`. Ideally do both.

3. **Row detail says "no job for this step yet" for labelled subworkflow and pause steps, forever.**
   - Location: `ComparisonRowDetail.vue:59`.
   - The tab does render for subworkflow and pause steps (see open question 7 in the debrief).
   - **Fix:**
     - When `row.subworkflow_invocation_id` is set, render a link to `/workflows/invocations/{id}`, labelled "Open subworkflow run", instead of the alert. `ComparisonMetaCell` already builds this link, so share it.
     - Reserve "not run yet" for rows whose step is actually missing: `row.state`, or the cells being `not_run_yet`.
     - Add one RowDetail test.

4. **`ItemPopoverLink` shows stale collection details if `itemId` changes on a live instance.**
   - Location: `ItemPopoverLink.vue:46-48,63`.
   - `collection` is never reset, so `ensureDetails` returns early and shows the old item.
   - Current call sites rarely reuse an instance, because the GTable is keyed by run ids. The component is pitched as reusable, though.
   - **Fix:** `watch(() => [props.itemId, props.itemSrc], () => { collection.value = undefined; collectionError.value = undefined; });`.

## Reuse and abstraction

- **`total_matches` parsing (`api/comparisons.ts:32`).**
  - `parseInt(response.headers.get("total_matches") ?? "0", 10) || 0` is now copied about ten times:
    - `api/datasets.ts:63`
    - `api/pages.ts:98`
    - `api/visualizations.ts:66`
    - `api/histories.ts:239,329,413`
    - `api/histories.archived.ts:51`
    - `Grid/configs/invocations*.ts`
    - `HistoryDatasetPicker.vue:199`
  - Export one `totalMatches(response)` from `@/api` (e.g. `src/api/index.ts` or a small `src/api/paging.ts`) and use it here. Migrating the other copies is optional, but this is the reusable piece this branch could leave behind. The plan made the same "no sixth copy" argument server-side for `get_count`.
- **`QueryOf<P>` conditional type (`api/comparisons.ts:16-20`).** Existing modules index directly: `GalaxyApiPaths["/api/pages"]["get"]["parameters"]["query"]` (`pages.ts:25`, `histories.archived.ts:8`). Prefer `NonNullable<GalaxyApiPaths[".../step_runs"]["get"]["parameters"]["query"]>` for consistency. This is a nit.
- **`transpose()`, `untranspose()` and `TransposedTable` (`comparisonUtils.ts:57-77`).**
  - `transposed.cells[key][i]` is just `table.rows[i].cells[key]`.
  - `ComparisonTable.vue:263` already has `row` in scope, and GTable's `lineItems` do the real transposition.
  - `untranspose` has no production caller; it exists only for the round-trip test.
  - Drop all three, use `row.cells[item.column.key]` at line 263, and keep the "uniform grid" assertion as a ComparisonTable transposed-render test (one exists already).
  - The plan asked for a round-trip test, so this is a judgement call. Today, though, it is code that exists to be tested.
- **Expansion state mirrored outside GTable (`ComparisonTable.vue:131-145`).**
  - GTable holds `expandedRows` by index but does not expose it to slots, so the component keeps a parallel `Set` by run id just to drive `aria-expanded` and the caret.
  - It works, and the `:key` remount keeps the two in sync. The reusable fix is in-repo, though: GTable's `cell(...)` slot already passes `toggleDetails`, so add `detailsShowing: isRowExpanded(index)` in `packages/ui/src/components/GTable.vue:870-875`. The same slot props are used by `PasteContentUpload.vue:347`, which has the same workaround.
  - That deletes `expanded`, `toggleRow` and the `watch`. Optional, but it is the "leave an abstraction behind" option.
- **State icons.**
  - `ItemCell.vue:23` and `ComparisonMetaCell.vue` each hand-roll `FontAwesomeIcon` + `iconClasses[state as GraphStepState]`.
  - `InvocationStepStateDisplay.vue` and `JobState.vue` use the same map, so this is defensible. But dataset states elsewhere render from `History/Content/model/states.ts` `STATES`.
  - At minimum, factor the icon+text into one tiny component used by both cells, and use `statePlaceholders` for the text, as `InvocationStepStateDisplay` does. Consistency nit.
- **The "props-only" claim.** Data flows only through props and emits. The component is not store-free, though:
  - `ListHeader` calls `useUserStore()` unconditionally.
  - `ItemPopoverLink` uses `datasetStore`.
  - It still needs pinia, so say "props-driven", not "store-independent", in the debrief and PR.
- **`BPagination`** in `StepRunsTab`. There is no G* pagination component, and GTable's `currentPage`/`perPage` only slice local items. It has 24 existing consumers, and the plan asked for it. Fine.
- **`DatasetPopoverLink` wrapper.** It's good that `StorageOperationRunView` is unchanged. No Selenium or navigation selector referenced `storage-run-item-dataset-*` or `.dataset-details-popover`.
  - The conditional `dataset-details-popover` class (`ItemPopoverLink.vue:113`) survives only so `DatasetPopoverLink.test.ts:125,137,142` keep their selector.
  - Switch those three to `.item-details-popover` and drop the conditional class. Nit.

## Tests

The tests are strong overall:
- the distinct-id test was seen red first;
- no fetch before hover;
- the expansion count via a stub;
- the page-change collapse;
- `data-pk` order;
- `step_label` encoding;
- the metadata refetch;
- the `total_matches` summary and page-3 offset;
- the lazy and disabled tab.

Gaps:
- **No test for persisted preferences or local-storage key scoping.** See bug 1.
- **No test for the transposed current-run highlight.** GTable does support field-level `cellClass`/`headerClass` (`GTable.vue:769,850`), so it works. It is unpinned, though: assert `comparison-current-cell` on the `r{index}` cells and header with `transpose: true`.
- **`ComparisonCell.test.ts:133` "never reveals anything about an inaccessible item"** only asserts a class exists. Assert `text() === "— no access"` (or the badge text) and that no `ItemPopoverLink` or `code` is rendered, or rename it.
- **`ItemPopoverLink.test.ts:107`, `toContain("3")`, is loose**, because any 3 matches (hid 4? 2026?). Assert the `CollectionDescription` phrase, e.g. `"a list with 3"` per that component's output.
- `missingText` reasons are tested twice, in `comparisonUtils.test.ts` and `ComparisonCell.test.ts`. Keep the component one, which also checks the badge and title, and drop the util duplicate. Nit.
- No test covers the error-then-retry path (bug 2).

## Domain checks

| Check | Result |
|---|---|
| Props-driven table | Yes. Emits only; no fetch inside. Needs pinia; see above. |
| Transposed correctness | Lines = visible meta fields plus visible data columns. Runs across, anchored by the run link in the header. Current-run cells and header are highlighted. No expansion in transposed mode, which is documented. |
| No N×M polling | `GenericItem` and `JobDetailsTabs` sit only in the `row-details` slot, which mounts only when expanded (tested). HDA popovers read `storedDatasets` passively and fetch on mouseenter/focus. HDCA popovers fetch `view=collection` on hover or focus only. |
| Accessibility | The transpose button has `aria-pressed`. The column menu has an `aria-label`. Items are `menuitemradio` + `aria-checked`; fallthrough overrides GDropdownItem's `role="menuitem"`, so this is valid. Expand buttons have `aria-expanded` + `title`. The disabled tab shows visible explanatory text. Nits below. |
| Local-storage key scoping | `useUserLocalStorage` hashes the user. The key is `step_runs:<stored id>:<label>`, so it is correct once resolved. It resolves late (bug 1). The `comparison-display` map grows without bound across workflows and labels (nit; cap or LRU later). |
| Pagination | Uses `total_matches`, with `limit` 25 and `offset`. Page resets on label or workflow change. The summary uses `page`, not the loaded table's offset, so it briefly shows the next page's range over the old rows while loading. Use `table.query.offset`. |
| Current-run highlight | The row class goes through `TableItemClassMeta`, plus a "this run" badge (tested). |
| Missing reasons, incl. `inaccessible` | All five reasons have text and a title (tested). |
| DatasetPopoverLink storage-run usage | Unchanged. The B2 tests were adjusted, not weakened. |
| `?step_label=` row links | Encoded (tested). |
| `WorkflowInvocationStep.vue` | +5 lines, one import and one element. Good. |
| Schema types | Everything is aliased from `components["schemas"]`. No hand-rolled duplicates. |

## Nits

- `ItemPopoverLink.vue:93-101`: the no-route `role="button"` span has no Enter/Space handler. Either drop `role="button"` and keep the focusable span, or give it `aria-haspopup="dialog"`. Today it is reachable only from tests.
- The expand `GButton` relies on `title` for its name. Add `:aria-label` too, because `title` is not reliably announced.
- `ComparisonColumnHeader`: use `GDropdownItem`'s existing `active` prop for the selected option, so it shows visually as well as through `aria-checked`.
- `MetadataCell` shows "loading…" whenever the element isn't in `query.metadata_elements`, including after a failed refetch. Showing "—" when not loading and not requested would be more honest. Depends on bug 2.
- `missingText`'s `default` branch also catches unknown future reasons as "no output". Use an exhaustive `switch` with a `never` check so new `MissingReason` values fail type-check.
- Phase 4 is already planning to select rows by `data-pk`, the run id. That's fine; there's no need for a new `data-run-id`.

## Access findings

None. There is no `v-html` or `innerHTML` in the new code, and every value, name, label and history name renders through mustache or attribute bindings. `step_label` is `encodeURIComponent`-ed in `runLink`. History and invocation ids are server-encoded ids. No security note was filed.

</details>
