Run via Opus at default effort.

# Thermo-nuclear code quality review

I reviewed `git diff upstream/release_26.2...HEAD`: 11 files, +111/-16. I made one change, `f552bcc3656`, which simplifies the test setup. I found no structural regressions in the server fix. No file crosses 1k lines because of this branch: `framework.py` (1794 lines) and `populators.py` (5537 lines) were already past it, and this branch adds +36 and +4.

## Acted on
- **Test setup did not use the canonical helper (`f552bcc3656`).**
  - The E2E test built its library dataset by hand with the legacy multipart upload. That took an `open`/`read`/`seek(0)` sequence, then `create_dataset_request`, then `raw_library_contents_create`, then `wait_on_library_dataset`, plus a comment explaining how the dataset gets its name.
  - The API helper `_fetch_pasted_to_new_library` assembled the `/api/tools/fetch` payload itself, through the identity wrapper `_setup_fetch_to_folder`.
  - `LibraryPopulator.fetch_to_folder` already does both jobs, and `test_upload_activity.py` already calls it from Selenium. Both tests now use it, with pasted content.
  - The E2E test no longer reads a test-data file. It also now goes through the fetch path the UI upload uses, which is the path this branch fixes.
  - The earlier polish debrief kept the legacy upload because fetch was broken at the time. The re-scope fixed fetch, so that reason no longer holds.
- **Validation:**
  - API `test_libraries.py -k "download or fetched"`: 3 passed.
  - Unit `test_model_discovery.py` and `test_model_store.py`: 67 passed.
  - E2E `test_download_dataset_from_library`: passed under both Playwright and Selenium.
  - ruff, black and isort: clean.

## Declined
- **Moving `download_file_from` into the driver layer** (`has_driver.py` / `has_playwright_driver.py` behind the protocol).
  - The framework already owns `get_download_path()` and the `GALAXY_TEST_SELENIUM_REMOTE` skip, and `framework.py` and `navigates_galaxy.py` already branch on `backend_type`.
  - Splitting it across the protocol, both drivers and the proxy would add more layers than it removes, on a release branch.
- **A `LibraryDataset` helper that links both sides of the LD/LDDA reference.**
  - The two links are separate foreign keys, not a `back_populates` pair, because an LD keeps a history of LDDAs.
  - `HistoryDatasetAssociation.to_library_dataset_dataset_association` (model `__init__.py`) already uses the same "pass `library_dataset=` and then set `ld.library_dataset_dataset_association`" pattern. `discover.py` now matches it.
  - A helper would have to refactor that existing model code too, which is out of scope for `release_26.2`.
- **`download_library_datasets_raw(ld_ids: str)` taking a list.** The endpoint takes a comma-separated string, and both callers pass a single id. A list parameter would add a join without making anything clearer.
- **The `_setup_fetch_to_folder` identity wrapper in `test_libraries.py`.** It predates this branch and other tests still use it. This branch no longer calls it.
- **Splitting the Selenium half of `download_file_from` into its own method.** The function is about 30 lines with one backend branch and a short local predicate. Splitting it would add indirection without making it easier to read.

## Details
- The `library_datasets.py` change (`ldda.library_dataset.folder` → `ld.folder`) deletes an indirection rather than adding a fallback. It walks the object already in hand, so it is the simpler code as well as the fix for old rows.
- The `store/__init__.py` one-liner sits right next to the forward link it mirrors. That is the canonical spot for it, with no new branching.
- The one-character id fix in `FolderTopBar.vue` is minimal and correct for a release branch.
- The extra assertions in the unit and integration tests are narrow, and each one pins one of the three fix sites.
