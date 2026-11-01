# Implementation re-scope debrief

## Why
- While moving the E2E test's setup to the API, the test-challenge step found a server bug. Library datasets created through `/api/tools/fetch` have no `ldda.library_dataset` back-reference.
- The cause is in `discover.py`: it builds the LDDA with `# library_dataset=ld,` commented out, which has been the case since 2019 (`03c2f70efaf`, an unexplained refactor).
- As a result, the library zip download (the endpoint behind the Download button this branch tests) returns HTTP 500 for such datasets, and so does `GET /api/datasets/{id}?hda_ldda=ldda`.
- The scope evaluation (`earlier_drafts/1/scope_evaluation.md`) recommended expanding to fix it.

## What changed
- **Alt branch:** the original scope is preserved as `issue_24376_library_download_test_26_2_alt_original_scope` (`63267ab1311`), described in `alts/original_scope.md`.
- **`b8a71a90c34`:** API regression tests `test_download_fetched_dataset` and `test_show_fetched_ldda`. Both failed with 500 before the fix.
- **`25224faf2ba`:** the fix.
  - `discover.py` passes `library_dataset=ld`.
  - The model-store import (`store/__init__.py`) also sets `ldda.library_dataset = ld`. It had the same gap; extended-metadata fetches and store imports go through it.
  - `library_datasets.py` `download()` walks `ld.folder`, so rows created before the fix also download.
  - The unit assertions in `test_model_discovery.py` pin the import side.
- **`9593bbfbd8d`:** more pins: the `test_model_store.py` round trip, the `test_extended_metadata.py::test_fetch_data_library` show, and a `parent_library_id` assertion.

## Validation
- The library API suites `test_libraries`, `test_folder_contents`, `test_library_contents` and `test_folders` pass: 78 passed, 2 skipped.
- `test_model_discovery.py` and `test_model_store.py` pass.
- The extended-metadata integration test passes.
- Each of the three fixes was confirmed to be needed by its own test:
  - discover.py → `test_show_fetched_ldda`
  - store import → the unit assertions
  - `ld.folder` → old rows (the download test passes with the `ld.folder` change alone)

## Review
- `subagents/normal_review_2_rescope.md`: nothing must be fixed; I acted on the test suggestions.
- Known limitation for the PR text: LDDAs created before the fix still lack the link. That breaks `LDDA.to_dict` and `can_access_library_item`, and `check_folder_contents` leaves them out (it fails closed). Fixing those rows needs a backfill (SQL given in the review debrief) or a dev-side migration.
