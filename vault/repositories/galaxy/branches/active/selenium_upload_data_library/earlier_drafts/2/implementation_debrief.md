# Implementation debrief

**STATUS: READY**

The branch is tests-only, on `release_26.2` (merge-base `d2d1dcd883c`), with head `344dc3d6b17`. It answers davelopez's #24399 comment: before this branch, 26.2 had exactly one Upload Activity "Import from Data Library" E2E test, an admin importing one dataset into the current history. The route doesn't have the #24399 bug, because `DataLibraryUpload` passes `targetHistoryId` through.

## Commits

1. **Baseline tests: API library setup and multi-dataset staging.**
   - Adds `LibraryPopulator.remove_library_dataset_restrictions`; the existing caller in `api/test_history_contents.py` now uses it.
   - Adds the `start_button_enabled` nav target.
   - `stage_data_library_datasets`.
   - Tests build their library through the API, after an admin UI login.
2. **Baseline tests: import as a regular user, and into a list in a picked history.**
   - A non-admin imports a public library dataset.
   - Two datasets become a list in a non-current target history; the current history must stay empty.
3. **Baseline tests: subfolder navigation and select-all.** These fold into the list test. It also fixes the `data_library_select_all` selector, which was broken on 26.2.
4. **`start()` waits for Start to be enabled** before clicking. This applies to every `UploadContext` caller.

## Scope

The first scope evaluation recommended expanding the branch, so the scope was widened to commits 3-4. The original scope is kept as alt `selenium_upload_data_library_alt_original_scope` (`aa8326448f9`). After that, the branch was fully re-hardened:
- normal review: clean
- test challenge: 1 helper reuse
- polish: no-op
- Codex: 0 findings
- thermo: 1 small cleanup
- baseline refactor: no-op
- second scope evaluation: **keep as is**

## Tests

- `TestUploadActivityDataLibrary` passes 3/3 on Playwright and on Selenium at head.
- The full `test_upload_activity.py` passes on both backends; a few failures from the local environment (CDN lookup, missing test file, dropped browser session) passed on rerun.
- In `test_uploads.py`, 17 of 18 pass. `test_rules_example_5_matching_collections` fails on the pre-change helpers too.
- Left to CI: the inline workflow-run upload tests, because the local server has no test toolbox.

## Decisions for John

- Ship as one PR, or split the `start()` hardening into its own PR? See the decompositions in `scope_evaluation.md`.
- When this merges forward to dev, take dev's version of the `data_library_select_all` line (dev commit `e971fc43a4d`).

## Follow-ups (separate branches)

- `GET /api/folders/{id}/contents` returns 500 for a folder with no description, and also while an import is running.
- A library-to-list import leaves duplicate hidden HDAs.
- A long history name hides the target-history change link.
- A tooltip lingers over the target-history banner.
- The "Add Selected" button has the same click-while-disabled race as Start had.
- Dev helper refactor: move `start()`/`cancel()` into `UploadContext` and harden the inline `start()`.
- `test_upload_activity_collection.py:77` should use the helper `start()`.
