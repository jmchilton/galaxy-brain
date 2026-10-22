# faqs/galaxy/datasets_import_from_data_library.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `913dfd7dfd6` (`faq_server.sh main`). Setup:
`faq-admin@example.org` made a library and imported `1.bed` and `2.bed` from `library_import_dir`.
Then, as a trainee, I ran Libraries > the library > tick both > **Add to History** > **as Datasets**
> **Select history** > **Import**, and the **as a Collection** branch (List > **Continue** > name >
build). 141 tutorials embed this FAQ. Three pass `astype="as a Collection"`, and one of them
(`variant-analysis/sars-cov-2-variant-discovery`) also passes `collection_type="List of Pairs"`.

## GTN

- `library-create-list-label` (main): step 8's **Create collection** is the builder's
  **Create list**, in 26.1 as well.
- Otherwise the steps match 26.2: Libraries in the Activity Bar, **Add to History** with
  **as Datasets** and **as a Collection**, **Select history** (or create new), **Collection type**,
  and **Import** or **Continue**.
- Not a FAQ problem: both dialogs preselect the first history Galaxy lists (the newest), not the
  current one. The FAQ already says to pick the history.

## Galaxy

- **Bug, fixed in `1d227e6fc4c`:** "as a Collection" ignored **Select history**. The list and its hidden
  element copies were built in the current history, while the builder said "From history:
  <picked>".
  - Cause: `useCollectionCreation` always sent the current history's id. The creators now pass
    their own `historyId`.
  - The dialog now also makes the picked history current, as its "create new" path and "as
    Datasets" already do. Without that, the list would land in the preselected newest history out
    of sight.
  - The bug was in 26.1 too.
  - Tests: red-to-green `test_library_collection_export_to_selected_history` plus a vitest. All 7
    library-to-collection tests pass under Playwright, and the new one passes under Selenium.
  - Queue an issue? See the report.
- **Gap, filled in `913dfd7dfd6`:** nothing tested "as Datasets", the path this FAQ teaches. Added
  `test_add_datasets_to_selected_history` with `libraries_folder_wait_for_datasets`,
  `libraries_folder_select_datasets` and `libraries_folder_add_to_history`, and the nav entries
  `import_to_history_select` and `selected_dataset_row`.
  - The dialog's progress bar starts at zero width, which reads as hidden, so the helper waits for
    the dialog itself to close. Waiting on the bar first made the test flaky. Now 3/3 under
    Playwright and green under Selenium.
- **26.2 private-by-default reaches libraries:** library imports take the importer's default dataset
  permissions (long-standing, `upload_common`). A new 26.2 admin defaults to private, so a training
  library they fill looks empty to trainees ("either empty or you do not have proper access
  permissions"). Usegalaxy.* admins are old accounts, so this is a new-server problem. Raised in the
  report, not filed. The replay turns the admin's default off first.
- Minor, not filed: in the builder, library elements show as `: 1` / `: 2`, with an empty hid before
  the name.
- gxui:
  - `library-new`, `library-import-dir` (admin);
  - `library-add-to-history LIBRARY DATASETS... [--history]`;
  - `upload-library LIBRARY DATASET`, 26.2's Import Data > Import from Data Library path.
