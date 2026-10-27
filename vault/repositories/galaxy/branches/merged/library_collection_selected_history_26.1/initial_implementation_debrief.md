# Initial implementation debrief

Extracted from `galaxy_ui_driver` onto `release_26.1` (`d808b6425b8`). Two commits:

1. `71257628d70` Baseline tests: E2E for library Add to History > as Datasets into a picked history (from `913dfd7dfd6`), plus helpers `libraries_folder_wait_for_datasets` / `_select_datasets` / `_add_to_history` and selectors `import_to_history_select`, `selected_dataset_row`; vitest pinning `useCollectionCreation`'s current-history fallback.
2. `07f9517dcc7` Fix (from `1d227e6fc4c`): `useCollectionCreation(historyId?)`, `useCollectionCreator` forwards `props.historyId`, library collection dialog makes the picked history current before import. E2E `test_library_collection_export_to_selected_history` + vitest for the picked history.

## Adaptations for 26.1

- 26.1 lacks `select_by_visible_text` (added in 26.2 with the Playwright integration suite). Tests and helper pick the history by id via the smart component's `select_by_value`; helper arg renamed `history_name` → `history_id`.
- `navigation.yml`: kept 26.1's `.custom-control` checkbox selectors (source had 26.2's `.g-checkbox`).

## Left out

- `162dfdb49b4` (collection upload hid count): `lib/galaxy/selenium/upload_activity_helpers.py` and `start_for_uploaded_hids` don't exist on 26.1; 26.2/dev's private `_start_and_wait_for_uploaded_hids` has the same miscount but no collection caller. Stays on galaxy_ui_driver.

## Verification (local, Galaxy 8095 + Vite 5185)

- Red: vitest picked-history case failed without fix; E2E failed without fix ("Timed out ... waiting on the list in the selected history") under Playwright.
- Green: both new E2Es pass under Playwright and Selenium; `test_library_to_collections.py` 7/7 (Playwright); `src/components/Collections/` vitest 30/30.

## Notes

- Bug also on 25.1 and 26.0 (`useCollectionCreation()` takes no history there). 26.0's `import-collection.js` is the older object-literal shape, so no clean cherry-pick.
