# Re-scope review debrief

Verdict: ship it, no bugs. Vitest red (3 fail on pre-fix panel) → green 13/13 independently confirmed. Acted on nit 2 (JS single backticks in the `hideIfFilteredOut` docstring); head `a03c7fd491e`.

Not acted on:
- Shared `itemMatchesFilters` covering the sub_items case: pre-existing edge, not a regression; keep the 26.2 fix minimal.
- Vitest title wording: cosmetic.
- Base: bug is identical on 26.0/26.1/26.2/dev; kept bundled on 26.2 since the privacy test needs 26.2. Question for John.

<details><summary>Full review</summary>

# Re-scope review

**Verdict: ship it. No real bugs.** The `HistoryPanel.vue` fix is correct, small, and fits a release branch. The vitest fails without the fix: I ran it against the pre-fix `HistoryPanel.vue` and got 3 red, 10 green. The E2E tightening checks the right thing. The client hooks follow the sibling conventions. The nits below are optional.

Scope reviewed: `630bccf56b7` (fix, `getClientFilters`, vitest), the 2-line E2E change in `test_history_panel.py::test_delete_undelete_and_purge_items`, and the hooks in `DatasetPermissionsForm.vue`, `DatasetAttributes.vue` and `navigation.yml` from `d1b206af67a`. I compared against `selenium_delete_items_dataset_privacy_alt_original_scope`.

## Evidence

- `vitest run src/components/History/HistoryView.test.js` on HEAD: 13/13 pass.
- **Red check:** I ran the same test file with HistoryView resolving `HistoryPanel.vue` from `630bccf56b7^`, using a scratchpad vite resolve plugin. The worktree was not touched. Exactly the 3 `kept=true` cases fail:
  - undelete with Include deleted: hid 1 missing
  - delete with Include deleted: hid 3 missing
  - unhide with Include hidden: hid 2 missing

  The 2 `kept=false` cases pass both ways. They guard against an over-fix that never hides anything; that guard works because the mocked PUT/DELETE returns `{}`, so the store item never changes.

## Correctness by filter combination

`hideIfFilteredOut` tests `{...item, ...change}` with the same predicate and filter list (`getClientFilters`) that the store uses. An item is hidden only if it would drop out of the filter. Every hidden case still gets un-hidden correctly, because the `historyItems` watcher re-shows any item still in the list whenever the computed re-runs.

| Case | Result |
|---|---|
| Default (`deleted:false visible:true`) delete | fails, so hidden. The computed reads `deleted`, so it re-runs on merge and the item drops out. Same as before. |
| `deleted:any` delete/undelete, `visible:any` unhide | passes, so not hidden. This is the fix. The item updates in place when `mergeArray` lands. |
| `deleted:true` (deleted only) undelete, `visible:false` unhide | fails, so hidden. Correct. |
| `visible:any` delete | `deleted:false` still applies, so hidden. Correct; covered by the vitest. |
| `related:N` | Stripped by `getClientFilters`, as in the store. Delete, undelete and unhide don't change relatedness, so it is correct to ignore it. |
| `testFilters` returns false on an undefined attribute (e.g. `extension:` on a collection) | Such an item can't be shown in the first place, because the store uses the same predicate. The only exception is the sub_items row below. |
| Parent shown only because a `sub_item` matches | The parent fails on its own, so it is hidden, exactly as before (it was always hidden). If the failing filter reads `deleted`/`visible`, the computed re-runs and re-shows it. If an earlier filter short-circuits, it stays hidden. That case is pre-existing and very unlikely, so it is not a regression. See nit 1. |
| Recursive collection delete | The collection row carries `deleted`, so it behaves like a dataset. Children are other hids and arrive on refetch. Unaffected. |
| `onDelete` catch | Still clears `invisibleHistoryItems[hid]`. That is a no-op when nothing was hidden, so it is fine. |
| `onUndelete`/`onUnhide` failure | No catch: pre-existing. The fix makes it better under `any` filters (the item never vanishes). Out of scope. |
| Bulk Selection delete/undelete | Doesn't go through `setInvisible`. `@hide-selection` has no emitter anywhere, so it is dead. Unaffected. |

**Minimal for 26.2:** yes. There is +10 lines of logic, and the store change is a pure extraction with identical behavior.

**Base:** the bug is identical on `release_26.0`, `26.1`, `26.2` and `dev`, since all of them call `setInvisible(item)` in the same three places. The policy would point at 26.0 for a standalone fix. Bundling it here on 26.2 is defensible, because the privacy test needs 26.2. Splitting the fix into a 26.0 client PR (decomposition 4 in `scope_evaluation.md`) is still an option for John.

## Tests

- The vitest is a good table and lives in the existing `HistoryView.test.js` mount scaffolding, so no new harness was needed.
- The E2E change (`wait_for_hid_visible(1)` plus `delete_button.wait_for_visible()` straight after Undelete) is the discriminating one. `wait_for_hid_visible` alone could pass on the stale DOM before Vue re-renders. The delete button only appears once the item is shown in its undeleted state, which the pre-fix code never reached under Include deleted.
- No assertion was weakened. The later filter-toggle checks are kept.

## Client hooks

- `title-link-class="dataset-edit-permissions-tab"` mirrors `dataset-edit-datatype-tab` in the same file and the `CollectionEditView` tabs.
- `data-description` on `BFormCheckbox` plus `'[...] + label'` matches existing nav entries (`dataset_checkbox`, `collection_checkbox`, `paste_links_row_deferred_label`). BFormCheckbox passes attrs to the `<input>`, and the `custom-control-label` is its next sibling.
- `DatasetPermissionsForm` is also used by `HistoryDatasetPermissions.vue` and `UserDatasetPermissions.vue`. The switch label is hardcoded "Make new datasets private", so the description is accurate in all three.

## Nits (optional)

1. **Reuse:** the per-item predicate still lives in two forms: the store's inline `testFilters || sub_items.some(...)`, and the panel's `testFilters` call. A shared `itemMatchesFilters(filters, item)` in `HistoryFilters.js` would mean both sides agree by construction, including the sub_items edge above. It is not required for correctness, and a smaller extraction is better on a release branch. Diff if wanted:

   ```diff
   --- a/client/src/components/History/HistoryFilters.js
   +export function itemMatchesFilters(filters, item) {
   +    return (
   +        HistoryFilters.testFilters(filters, item) ||
   +        Boolean(item.sub_items?.some((subItem) => HistoryFilters.testFilters(filters, subItem)))
   +    );
   +}
   --- a/client/src/stores/historyItemsStore.ts
   -                if (!HistoryFilters.testFilters(filters, item)) {
   -                    // filters don't pass on the item, but they might pass on any of its sub_items
   -                    if (
   -                        !item.sub_items ||
   -                        !item.sub_items.some((subItem) => HistoryFilters.testFilters(filters, subItem))
   -                    ) {
   -                        return false;
   -                    }
   -                }
   +                if (!itemMatchesFilters(filters, item)) {
   +                    return false;
   +                }
   --- a/client/src/components/History/CurrentHistory/HistoryPanel.vue
   -    if (!filterClass.testFilters(getClientFilters(filterText.value), { ...item, ...change })) {
   +    if (!itemMatchesFilters(getClientFilters(filterText.value), { ...item, ...change })) {
   ```

   I lean toward leaving it as is for 26.2.
2. The `hideIfFilteredOut` docstring uses RST double backticks (` ``item`` `), while the new `getClientFilters` JSDoc uses single ones. Use single backticks in TS/JS.
3. The vitest title renders as "delete with show active filter keeps item shown: false". Something like `"%s under %s filter -> item kept: %s"` reads better. Cosmetic.

</details>
