# Debrief

- Source: davelopez's review of #24487 (open, release_25.1) for #24469.
- Verified on `pr24487`: `listWizard()` emits `update:show-selection` false on open; `selectedItems.ts` watch resets selection when show-selection goes false; modal builders clear only via `@created-collection` → `createdCollection`; `ListWizard.vue` has no cancel control (leaving = navigation); `onCreate` sets `collectionCreated`.
- Selection handoff store is `useCollectionBuilderItemSelection` in `stores/collectionBuilderItemsStore.ts` (not the `collectionBuilderItemsStore` fetch cache). Reviewer corrected this in the proposal.
- Proposal: clear on success via store signal, mirroring modal builders. Alternatives (rehydrate on return, accept) documented.
- Duplicate search: none found.
- Review: one subagent round. Premise confirmed, one store-name fix.
- Unresolved: #24487 still unmerged; on dev, `listWizard()` doesn't emit and `setSelectedItems(historyId, selection)` signature differs. File after #24487 merges forward; recheck Tests section against dev then.
