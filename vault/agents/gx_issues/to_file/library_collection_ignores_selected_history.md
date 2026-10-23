# Library "Add to History > as a Collection" ignores the selected history

Source: FAQ review batch 5 (GTN `faqs/galaxy/datasets_import_from_data_library.md`, 141 tutorials),
`vault/projects/playwright/training_findings/26.2/faqs/galaxy/datasets_import_from_data_library.md`.
Fix and tests: branch `library_collection_selected_history_26.1` (base `release_26.1`, head `4189977901c`);
first found on `galaxy_ui_driver` (`1d227e6fc4c`).

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

- `useCollectionCreation(historyId?: () => string)` uses `historyId?.() || current`.
  `useCollectionCreator` passes `() => props.historyId` (now a required prop).
- `import-collection.js`'s existing-history path now also calls `setCurrentHistory(picked)`, as its
  create-new path and the "as Datasets" dialog already do. Otherwise the list lands in the
  preselected history out of sight. The select defaults to the first history listed, which is the
  newest, not necessarily the current one.
- `ListWizard` (Auto/Advanced Build List) had the same cause: it built in the current history, not the
  one the selection came from. It now builds in the selection's history.
- Tests: red-to-green E2Es `test_library_to_collections.py::test_library_collection_export_to_selected_history`
  and `test_collection_builders.py::test_build_list_in_viewed_history`, green under Playwright and
  Selenium; a new baseline E2E for Add to History > as Datasets.

## Scope note

The change reaches every creator, including the history panel's builders. A creator opened with a
`historyId` that isn't the current history, such as from an owned non-current history's view page
(the Selection menu is hidden in Multiview), now builds there instead of in the current history. That
seems right, since the source items are in that history, but it is a behavior change.

## Duplicates

No GitHub search done yet.
