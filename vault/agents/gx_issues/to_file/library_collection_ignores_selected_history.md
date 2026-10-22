# Library "Add to History > as a Collection" ignores the selected history

Source: FAQ review batch 5 (GTN `faqs/galaxy/datasets_import_from_data_library.md`, 141 tutorials),
`vault/projects/playwright/training_findings/26.2/faqs/galaxy/datasets_import_from_data_library.md`.
Fix and test on `galaxy_ui_driver`: commit "Create a library collection in the history picked for it"
(`1d227e6fc4c` at tip `6c434fc3a15`).

## Repro

1. In a data library folder, tick datasets and choose Add to History > as a Collection.
2. Under "Select history", pick a history that isn't the current one. Leave the collection type as
   List and click Continue.
3. The builder header says "From history: <picked>". Name the list and click Create list.

Result: the list and its hidden element copies land in the **current** history, and the picked one is
untouched. The bug is on 26.1 and 26.2/dev, verified by reading `release_26.1`'s
`useCollectionCreation.ts` and reproduced live on 26.2.

## Cause

`client/src/components/Collections/common/useCollectionCreation.ts` `createPayload` always sends
`history_id: currentHistoryId.value || "current"`.
- The list, pair and list-of-pairs creators all receive a `historyId` prop, through
  `CollectionCreatorIndex`, and the library dialog passes the picked id there.
- `useCollectionCreator` never forwards that prop to `useCollectionCreation`.

The dialog's "or create new" path works only by accident: it makes the new history current first.

## Fix on the branch

- `useCollectionCreation(historyId?: () => string | undefined)` uses `historyId?.() || current`.
  `useCollectionCreator` passes `() => props.historyId`.
- `import-collection.js`'s existing-history path now also calls `setCurrentHistory(picked)`, as its
  create-new path and the "as Datasets" dialog already do. Otherwise the list lands in the
  preselected history out of sight. The select defaults to the first history listed, which is the
  newest, not necessarily the current one.
- Tests:
  - vitest `useCollectionCreation.test.ts`;
  - red-to-green E2E
    `test_library_to_collections.py::test_library_collection_export_to_selected_history`, green
    under Playwright and Selenium. The other 6 tests in that file still pass, under Playwright only.

## Scope note

The change reaches every creator, including the history panel's builders. A creator opened with a
`historyId` that isn't the current history, such as from Multiview or the history view page, now
builds there instead of in the current history. That seems right, since the source items are in that
history, but it is a behavior change. `test_collection_builders.py`: 10/10 green under Playwright.

## Duplicates

No GitHub search done yet.
