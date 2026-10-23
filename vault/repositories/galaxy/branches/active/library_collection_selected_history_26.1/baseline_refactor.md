I added one refactor commit (`c4f44684748`) between the Baseline tests commit and the fix. It pulls the dialog's target-history lookup out of `import-collection.js` and moves the test-helper cleanup out of the fix commit. The final tree is byte-identical to the old HEAD `430487e9aa6`.

New history:

1. `84a8115a1d3` Baseline tests: add library datasets to a picked history (unchanged, still first)
2. `c4f44684748` Refactor library collection dialog's target-history lookup
3. `c57876ad7b5` Create a library collection in the history picked for it (same commit message as `430487e9aa6`)

## Refactor commit

- **`import-collection.js`**
  - The create-new-or-take-picked history choice moves out of `showCollectionBuilder` into `resolveTargetHistoryId`, and both paths reach `collectionImport` through one promise chain.
  - The picked-history path still does **not** make that history current; the fix does that.
  - The unused `this.select_collection_history` attribute is gone.
  - Two small changes to the picked-history path, both named in the commit message:
    - `collectionImport` now runs one microtask later.
    - A throw there is now caught and shown as a toast instead of escaping, as on the create-new path.
- **`test_library_to_collections.py`**
  - `admin_login` moves from `prepare_library_for_data_export` into its callers.
  - Rows are now ticked by name via the Baseline commit's `libraries_folder_select_datasets` instead of by row index.

## What stays in the fix commit

- The `useCollectionCreation(historyId)` / `useCollectionCreator` change and its vitest.
- In `import-collection.js`: renaming `resolveTargetHistoryId` to `makeTargetHistoryCurrent` and adding the `setCurrentHistory` call. That diff is now about 4 lines, down from a 30-line restructure. The neutral name keeps the refactor commit from carrying a name that wasn't true yet.
- The `history_id` param on `prepare_library_for_data_export`, the `export_to_history_history_select` selector and the new E2E test, since only the new test uses them.

## Tests

- **Refactor commit:**
  - Vitest on `Collections/` and `Libraries/`: 47/47.
  - `test_library_to_collections.py` under Playwright: 6/6 (all the tests at that commit).
  - Selenium: `test_library_collection_export` and `test_export_pairs_list`, one for each changed helper path. Both passed.
- **Fix commit:**
  - Vitest: 48/48.
  - `test_library_collection_export_to_selected_history`: passed under Playwright and Selenium.
  - Whole-file Playwright 7/7 was already recorded at this exact tree (see `thermo_nuclear_review.md` and `polish_e2e_tests_debrief.md`), so I didn't rerun it.
- `git diff 430487e9aa6 HEAD` is empty.
- Old HEAD is kept on the local branch `library_collection_selected_history_26.1_pre_refactor_backup`. Nothing has been pushed.
