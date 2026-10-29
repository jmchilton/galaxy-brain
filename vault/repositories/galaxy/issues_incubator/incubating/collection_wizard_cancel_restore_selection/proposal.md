Leaving the Auto/Advanced Build List wizard without creating a list discards the user's history selection.

1. History panel → select some datasets.
2. Selected-content dropdown → **Auto Build List** (or **Advanced Build List**).
3. Leave the wizard without creating anything (navigate back to the center panel, open another page, etc.).
4. History panel is out of selection mode and the selection is gone; the user must reselect to retry or do anything else with those datasets.

Expected: selection survives until a collection is actually created, as it did before 🔀 #24487 (only the create path should clear it).

## Context

A follow-up to 🔀 #24487 (fix for 🎯 #24469), raised in review: the fix clears the selection when the wizard *opens*, because the wizard is a routed page (`/collection/new_list`) with no channel back to the history panel's selection state. The modal builders don't have this problem: they emit `created-collection` and `SelectionOperations.vue` exits selection mode only then. `ListWizard.vue` has no explicit cancel; leaving is just navigation, so "clear on success" is the only signal available.

## Proposed Approach

Clear on successful create instead of on open, matching the modal builders. `ListWizard.vue`'s `onCreate` signals success through shared state (e.g. a flag/counter in `useCollectionBuilderItemSelection` (`stores/collectionBuilderItemsStore.ts`), which already carries the selection into the wizard); the history panel (or `SelectionOperations.vue`) watches it and calls `update:show-selection` false. Drop the emit added to `listWizard()` in #24487.

<details><summary>Tests</summary>

- Jest: `SelectionOperations.test.js` "Collection Building" block currently asserts `update:show-selection` on wizard open; flip to assert it is *not* emitted on open and is emitted on the success signal.
- Selenium: `test_collection_builders.py` keeps `_assert_selection_cleared` after create; add a test that opens the wizard, navigates away, and asserts the selection is preserved.

</details>

## Alternative Approaches

Restoring the selection after the fact, or accepting the loss, are both possible; clearing on success is simpler and reuses the pattern the modal builders already follow.

<details><summary>Alternatives In Detail</summary>

### Alternative: Keep reset-on-open, rehydrate on return

<details><summary>Description</summary>

#### Details

The store already holds the selected items; when the user returns without creating, the history panel re-enters selection mode and repopulates its selection map from the store.

#### Why the proposed approach is preferred

There is no "returned without creating" event to hook, and mapping store items back into `useSelectedItems` state (plus range/anchor state) is more code and more fragile than not clearing in the first place.

</details>

### Alternative: Accept as-is

<details><summary>Description</summary>

#### Details

Reselecting is cheap for small selections.

#### Why the proposed approach is preferred

Large or filtered selections are not cheap to rebuild, and this regresses behavior users had before #24487.

</details>

</details>
