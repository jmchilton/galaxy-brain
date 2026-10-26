# Component - History Panel Selection and Collection Builders (Client)

Client-side flow for selecting history items and building collections from them: `useSelectedItems` and `showSelection` ownership in `HistoryPanel.vue`, `SelectionOperations.vue` events (`reset-selection`, `update:show-selection`), the `CollectionCreatorIndex` modal path (`buildDatasetListAll`, `created-collection`, `hide-on-create`), and the Auto/Advanced Build List path (`listWizard()` -> `useCollectionBuilderItemSelection` store -> `/collection/new_list` `ListWizard.vue`). Include which builders reset selection on completion, the history-id handling (current vs selected history), and the Selenium helpers/selectors (`history_panel_build_list_*`, `selection_count`). Leave out collection backend semantics (see `Component - Collection API`).

## Why

Three recent branches (#24469 selection reset, library_collection_selected_history_26.1, selenium_collection_build_convert) each re-derived this flow from code. `PR 19377 - Collection Types and Wizard UI` covers the wizard's introduction but not selection state or event wiring.

## Requested by

- vault/repositories/galaxy/branches/active/issue_24469_collection_build_reset_selection_25.1/brain_research.md: needed the selection-reset event flow across HistoryPanel, SelectionOperations and ListWizard.
