# Component - History Panel Selection and Collection Builders (Client)

Client-side flow for selecting history items and building collections from them: `useSelectedItems` and `showSelection` ownership in `HistoryPanel.vue`, `SelectionOperations.vue` events (`reset-selection`, `update:show-selection`), the `CollectionCreatorIndex` modal path (`buildDatasetListAll`, `created-collection`, `hide-on-create`), and the Auto/Advanced Build List path (`listWizard()` -> `useCollectionBuilderItemSelection` store -> `/collection/new_list` `ListWizard.vue`). Include which builders reset selection on completion, the history-id handling (current vs selected history), and the Selenium helpers/selectors (`history_panel_build_list_*`, `selection_count`). Leave out collection backend semantics (see `Component - Collection API`).

## Why

Three recent branches (#24469 selection reset, library_collection_selected_history_26.1, selenium_collection_build_convert) each re-derived this flow from code. `PR 19377 - Collection Types and Wizard UI` covers the wizard's introduction but not selection state or event wiring.

## Requested by

- vault/repositories/galaxy/branches/active/issue_24469_collection_build_reset_selection_25.1/brain_research.md: needed the selection-reset event flow across HistoryPanel, SelectionOperations and ListWizard.

## Debrief

- **Created** `vault/research/Component - History Panel Selection and Collection Builders.md`, verified against Galaxy `origin/dev` @ `65e6daff`.
- **Covered**:
  - `useSelectedItems` state and watchers, including the rule that `showSelection=false` always clears the selection.
  - The `HistoryPanel` / `HistoryOperations` / `SelectionOperations` / `SelectionStatus` event wiring.
  - Build-entry gating, and a table of which actions end selection mode. On `dev` neither build path resets the selection.
  - The `CollectionCreatorIndex` modal path. "Build Dataset List" builds from the filter rather than the selection, and the modal emits `created-collection` twice.
  - The `listWizard()` -> store -> `/collection/new_list` -> `ListWizard` hand-off, including the `__vkey__` force remount.
  - History-id handling. #24399 is on `dev`: collections land in the panel's history, which isn't necessarily the current one.
  - The Selenium helper and selector map.
- **Unmerged work**: #24487 merged to `release_25.1` on 2026-10-30 but isn't on `dev`. The note describes the `dev` baseline and gives the #24487 design (a store `collectionsCreated` counter that resets on create) in a separate "Pending" section, including caveats for the merge forward.
- **Correction to the request**: there is no history-panel `selection_count` selector. The one in `navigation.yml` is the workflow editor's `tool_bar.selection_count`. The note gives the selectors to use instead.
- **Cross-refs**: backlinks added in `PR 19377 - Collection Types and Wizard UI` and `Component - E2E Tests - Writing`. `Component - Collection API`, `Component - Collection Creation API` and `Component - Auto Pairing` are linked one-way, which triggers advisory backlink warnings.
- **Research issues filed** in `research_issues/`:
  - `selection-operations-dead-event-wiring.md`
  - `history-multi-operations-dead-selenium-selectors.md`
  - `collection-creator-index-missing-extended-collection-type.md`
- **Out of scope**:
  - Collection backend semantics.
  - The internals of the individual builders and auto-pairing.
  - The library and workflow-form callers of `CollectionCreatorIndex`.
  - The cancel/restore-selection follow-up from the 24469 incubator.
