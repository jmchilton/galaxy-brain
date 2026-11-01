# Alt: original_scope

Branch `issue_24376_library_download_test_26_2_alt_original_scope` (pushed to `jmchilton`, head `63267ab1311`).

It contains only the test fix for #24376:
- the `download--btn` → `download-btn` id typo fix,
- the `download_file_from()` E2E helper,
- the renamed, API-set-up library download E2E test with its screenshot.

The parent branch adds the server fix the scope evaluation recommended. Downloading or showing a library dataset created through `/api/tools/fetch` or imported from a model store returned HTTP 500, because the LDDA had no `library_dataset` back-reference. The parent adds two API regression tests, unit assertions, and the fixes in `discover.py`, `model/store/__init__.py` and `library_datasets.py` `download()`.

Use this alt if the server fix should go in a separate PR.
