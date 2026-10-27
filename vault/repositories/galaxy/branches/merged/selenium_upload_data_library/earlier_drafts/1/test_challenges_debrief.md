# Test challenges debrief

Head is `763117605c8`, amended into the single Baseline tests commit and force-pushed to `jmchilton`. The branch is E2E only, so the unit-test, Vitest, mock and dataclass challenges don't apply.

## Changed

- **Library setup now goes through the API.** It used the admin import-dir UI (`create_new_library` + `populate_library_folder_from_import_dir`). Now it's `LibraryPopulator(self.api_interactor_for_logged_in_user()).new_library(...)` plus a `dataset_populator.fetch` into the library root folder, from a throwaway history.
  - Reason: `writing_tests.md` and the E2E writing note both say to use the API for setup and the UI only for the thing under test. The import-dir UI already has its own coverage in `test_library_contents.test_import_dataset_from_import_dir`.
  - This drops three private helpers (`_library_folder_contents`, `_wait_for_library_datasets_ok`, `_remove_library_dataset_restrictions`), the wait around the folder-contents 500 race, and the logout/`admin_login` dance. `fetch` waits for the job to be ok.
  - It also changes the setup of the upstream `test_upload_from_data_library`, which now imports as the session's non-admin user who uploaded the data, not as the admin.
- **Restriction removal stayed, behind `public=True`.** Fetch-created library datasets are access-restricted to the uploader's private role too. I checked this empirically: without it, the other-user test timed out waiting for the `1.bed` item. It's now an admin-key `remove_restrictions` post per library file, inline in `_create_and_populate_library(public=True)`, matching the API tests (`test_history_contents.py`).
- **Renamed `test_upload_from_data_library_as_regular_user` to `test_upload_from_data_library_as_other_user`.** With API setup, every test in the class runs as a regular user. What this test adds is a different non-admin importing a public dataset someone else uploaded.
- **The list test renames the current history to "library list current"** before reloading. Under Selenium, the long `@managed_history` name pushed the "Choose another" target-history link out of the overflow-hidden banner, so it wasn't clickable. Playwright was fine with it. The normal review reported Selenium passing with `@managed_history`. The likely reason is that the relogin left the current history as something other than the managed one; I haven't reproduced that.

## Kept / no change

- `stage_data_library_datasets` (one caller, but it's the sibling of the existing single-dataset stager and the single version delegates to it).
- **Coverage shift:** `test_upload_from_data_library` was the only admin-import case and now imports as a non-admin. The admin import path is no longer covered, which is open for a veto.
- `initial_implementation_debrief.md` and `subagents/normal_review.md` still describe the import-dir setup. This debrief supersedes them.
- No further E2E gaps worth adding for a tests-only baseline branch.
- Baseline rule: all 3 tests pass on `release_26.2` without other changes. The normal review's mutation check (imports going to the current history instead of the target) ran against the old setup. The logic it checks is unchanged by the setup swap, so I didn't rerun it.

## Findings (possible follow-ups, not fixed here)

- **Long history name hides the change link.** In the Upload Activity target-history banner (`UploadMethodView.vue` / `TargetHistorySelector.vue`), a long history name pushes the "Choose another" link out of view. It's a real UI bug.
- **Earlier findings no longer exercised.** The folder-contents 500 during import-dir imports and the duplicate hidden HDAs come from `initial_implementation_debrief.md`. The test no longer hits the first. The second still reproduces under API setup: the target history holds hidden HDAs at hids 1-4 plus the list at hid 5. Both are still worth filing.

## Verification

- `TestUploadActivityDataLibrary` (3 tests): passed under Playwright and under Selenium, each run once after the final change.
- `ruff`, `black` and `isort` are clean.

## Coordinator follow-up

Restored the admin coverage: `_create_and_populate_library` logs in as admin again before the API setup. The upstream `test_upload_from_data_library` imports as admin again, as it did on `release_26.2`, and the other-user test still registers a fresh non-admin. All 3 tests pass under Playwright and Selenium.
