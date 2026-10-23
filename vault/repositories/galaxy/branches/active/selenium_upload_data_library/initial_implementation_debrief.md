# Initial implementation debrief

Base `release_26.2` (`d2d1dcd883c`); head `ebb04e04362` on `jmchilton`. One "Baseline tests" commit, +74/-4 in `test_upload_activity.py` and `upload_activity_helpers.py`.

## Already on release_26.2

`TestUploadActivityDataLibrary.test_upload_from_data_library`: an admin imports one library dataset into the current history. That's the only E2E coverage of `DataLibraryUpload.vue`.

## Added

- `test_upload_from_data_library_as_regular_user`: an admin builds the library, then a freshly registered non-admin imports through the activity. That's davelopez's "regular users go through the new activity" route.
- `test_upload_list_from_data_library_to_target_history`: two library datasets are built as a list into a non-current target history. It asserts name, type and element identifiers, and that the current history stays empty. It's the 26.2-route analogue of the #24399 bug and passes on 26.2: `DataLibraryUpload` passes `targetHistoryId` into `useCollectionCreation`.
- `stage_data_library_datasets` (multi-select from one library); the single-dataset helper delegates to it.
- Library setup now waits until the imported datasets are `ok`.

## Findings while writing

- **Restricted imports:** admin import-dir imports through the old library UI are restricted to the admin's private role, so a regular user sees an empty folder. The test removes the restrictions via the API; that's setup, not product behavior under test.
- **Folder listing 500:** `GET /api/folders/{id}/contents` returns 500 while an import is still adding datasets (`library_folder_contents.py:_serialize_library_dataset`, `ldda` is None). This is a server race; the test waits around it. Possible follow-up bug.
- **Duplicate hidden copies:** a 2-element list from library datasets leaves 4 hidden HDAs in the target history (library copies at hids 1-2, element copies at hids 3-4, the list at hid 5). The test looks the list up by type rather than hid. Possible follow-up.
- **Selector timing:** the target-history "change" link only renders once the history store knows of more than one history, so the test reloads after creating the target history via the API (same as `test_target_history_change`).

## Verification

All 3 `TestUploadActivityDataLibrary` tests pass under Playwright and Selenium against a local 26.2 server (gunicorn 8092 + Vite 5181).

## Not pulled in

- #24399 commits: old LibraryFolder UI on 26.1, unrelated; they arrive via the forward merge.
- `galaxy_ui_driver` `162dfdb49b4` (collection upload hid count): it fixes `_start_and_wait_for_uploaded_hids`, which these tests don't use.
