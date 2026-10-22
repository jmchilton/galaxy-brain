# faqs/galaxy/datasets_import_from_remote_files.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `14d970513f5` (`faq_server.sh main`). The server now has
a posix file source, "Galaxy test data", standing in for a usegalaxy.* repository. Imported `1.bed`
and `2.bed` from it. 7 tutorials embed this FAQ; 3 pass a `location` path (Genome Ark, ECMWF).

## GTN

- Added to `upload-tool-panel-button` (main): there's no **Upload Data** at the top of the tool
  panel; it's the Activity Bar's **Upload**.
- `remote-files-choose-remote` (version): 26.1's dialog had a **Choose from repository** button.
  26.2 has the Import Data panel's **Choose Remote Files**:
  - pick the source (or search "search file sources");
  - open folders, which a `location` path still maps onto (breadcrumbs show the path);
  - search "search files and folders" and tick the files;
  - **Add Selected Files (n)**: rows with Type and Reference;
  - **Start**.

  There's no **OK** and no **Close**. Fold in the typos: "in you history", "click on **OK**", and
  the broken intro "made available from a *Choose from repositories*".

## Galaxy

- Covered: `test/integration_selenium/test_upload_activity_remote_files.py`, which uses a posix
  source.
- Helper bug, fixed in `14d970513f5`: `stage_remote_file(s)` looked for each file on the browser's
  first page only. Galaxy's test-data source has 4 pages, so `1.bed` was never found. Each file is
  now searched for first, as the FAQ tells users to, and selections survive the search. Adds
  `upload_activity.remote_files_search`. The integration test is green under Playwright and
  Selenium. Not red-to-green: its fixture source has too few files to page.
- `faq_server.sh`: a posix "Galaxy test data" file source over `test-data`, which is also
  `library_import_dir`, and `faq-admin@example.org` as a replay admin.
- gxui: `upload-remote SOURCE FILES... [--ext]`.
