Follow-up from galaxyproject/galaxy#24487 (fix for #24469), requested by davelopez in his approving review: "The main tradeoff is losing the history selection when cancelling Auto/Advanced Build List. Should we open a follow-up issue for this?"

## Behavior now (release_25.1+, after #24487)
- History panel → select datasets → selected-content dropdown → "Auto Build List" / "Advanced Build List".
- `SelectionOperations.vue` `listWizard(advanced)`: copies `contentSelection` into `useCollectionBuilderItemSelection().setSelectedItems(...)`, emits `update:show-selection` false (new in #24487), routes to `/collection/new_list?advanced=...`.
- `ListWizard.vue` reads `selectedItems` from `stores/collectionBuilderItemsStore.ts`.
- Create → selection mode gone (the #24469 fix, desired).
- Cancel → user returns to history with selection mode off and their selection gone. Must reselect to retry / do something else. Before #24487 the selection survived (that stale-selection was the bug on the create path).

## Why not fixed in #24487
Reset happens on wizard open, not on create, because the wizard is a routed page and has no channel back to the history panel's selection state. Restoring on cancel needs cross-component state; out of scope for a 25.1 bugfix. Target dev.

## Possible approaches (rough)
1. Clear selection on successful create instead of on open: ListWizard signals success (store flag/event bus/collection store hook), history panel listens and exits selection mode. Cancel leaves selection intact naturally. Need to find how history panel selection state (`useSelectedItems` composable in HistoryPanel?) can be reached from outside.
2. Keep reset-on-open, but stash selection in collectionBuilderItemsStore (already holds it) and have the history panel re-hydrate selection when wizard cancels (route back without creation). Needs mapping item summaries back into the panel's selection Map + exiting/entering show-selection.
3. Accept as-is (cheap reselect) — close as wontfix.

Option 1 seems cleanest; verify panel selection ownership first.

## Tests
- Jest: SelectionOperations.test.js "Collection Building" block (now dropdown-driven, from davelopez's jmchilton/galaxy#97) asserts `update:show-selection` on wizard open — would change under option 1.
- Selenium: `lib/galaxy_test/selenium/test_collection_builders.py` `_assert_selection_cleared` after create; add cancel test asserting selection preserved.

Labels guess: kind/enhancement, area/UI-UX, area/dataset-collections.
