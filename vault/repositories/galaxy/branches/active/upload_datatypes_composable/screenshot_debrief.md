Screenshots not relevant for this change

The branch adds UI only on error paths, and existing E2E infrastructure can't produce those errors. On the success path, every affected screen renders the same lists, in the same order, with the same defaults as `24c5e0c6530`. Checked at worktree HEAD `962f6092f11`; no tests run, no worktree commits.

## Success path: no visual difference

- **Upload dbkey list** (`useUploadConfigurations`): before, the raw genomes were sorted with `dbKeySort(default_genome)`. Now the store sorts them with `dbKeySort("?")` and the composable re-sorts a copy with `dbKeySort(default_genome)`. The comparator puts the default first and orders everything else by `text`, so the second sort fully determines the order. Only entries with identical `text` could swap. `ready` still waits for config.
- **Upload datatypes**: the old loader and the store both call `getUploadDatatypes(false, AUTO_EXTENSION)`. The list is identical, with Auto-detect first.
- **Library import-from-directory picker** (`DirectoryDatasetPicker`): before, it sorted the store array by `id` in place and preselected the `?` item. Now it shows an `id`-sorted copy, and `currentDbKey` falls back to the `?` item. The final order and selection are the same. The one difference is timing: dbkeys now load at setup instead of after datatypes. The in-place sort fix only changes the order other screens see after the picker has been visited.
- **CollectionEditView Database/Build and Datatypes tabs**: the same `LoadingSpan`, followed by `DatabaseEditTab`/`ChangeDatatypeTab` with the same store-backed lists. The old providers read the same stores.
- **SelectionOperations Change Database/Build modal**: on success it shows the same `SingleItemSelector`. The new `:ok-disabled="selectedDbKey == null || !!dbKeysError"` stays false because `selectedDbKey` starts as `{id: "?"}` and `resetDbKey` sets it back to that.
- **LibraryDataset genome_build row**: shows the same selector when there is no error.

## Error states: can't be driven by E2E

- Every new `GAlert` (and the disabled OK button) needs `/api/datatypes` or `/api/genomes` to fail.
- Selenium has no request interception.
- `lib/galaxy/selenium/has_playwright_driver.py` has no route or intercept helper (`grep route|intercept` finds only an unrelated pointer-events comment). No test under `lib/galaxy_test/selenium` uses `page.route`. The `@playwright_only("Uses Playwright-specific network interception")` in the E2E Writing note is only a docstring example.
- Making a real test server fail these endpoints isn't practical. This matches the analysis in `test_challenges_debrief.md`.
- The error rendering is covered by vitest: `CollectionEditView.test.ts`, `DirectoryDatasetPicker.test.ts`, `SelectionOperations.test.js` and `LibraryDataset.test.js`.

## Existing E2E tests on these screens

None of these take screenshots of the changed elements:
- `test_collection_edit.py`: `test_change_dbkey_simple_list` and `test_change_datatype_simple_list` drive both CollectionEditView tabs. They take no screenshots.
- `test_library_contents.py::test_import_dataset_from_import_dir` drives `DirectoryDatasetPicker` through `populate_library_folder_from_import_dir`. Its screenshots (`libraries_show_details*`) are of the dataset details afterwards, not the picker.
- `test_history_dataset_state.py::test_dataset_change_dbkey` uses the dataset edit form, not the SelectionOperations modal or the upload dbkey selector.

A success-path screenshot added to any of these would just show the unchanged baseline, so I didn't bootstrap the worktree.

## Future option

If the Playwright driver gets a reusable `page.route` helper, a `@playwright_only` test could route `/api/genomes` to a 500 and screenshot the alert in CollectionEditView. That would be a separate infrastructure change.
