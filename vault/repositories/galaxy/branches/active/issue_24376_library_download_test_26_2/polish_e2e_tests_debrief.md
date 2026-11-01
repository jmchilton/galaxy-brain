Run via Opus at default effort.

# Polish E2E tests debrief

I re-checked the branch's one E2E test after the re-scope and it needed no further polish, so this round has no commit.

The test is `test_library_contents.py::TestLibraryContents::test_download_dataset_from_library`. Neither it nor its client and framework support has changed since the previous polish (`63267ab1311`). The re-scope commits only touch server code and API, unit and integration tests. I reran the test against a restarted server that includes the LDDA back-reference fix; the result is in `screenshot_debrief.md`.

## Checklist
- **Selectors:** The test has no raw CSS or DOM selectors. It uses `libraries.folder.download_button` (`#download-btn`) from navigation.yml and the shared helpers `libraries_open_with_name` and `libraries_folder_select_datasets`.
- **Shared abstractions:** `download_file_from` (framework.py) and `libraries_folder_select_datasets` are already shared. The API setup (`new_library`, `create_dataset_request`, `raw_library_contents_create`, `wait_on_library_dataset`) is close to `LibraryPopulator.new_library_dataset`. I did not switch to that helper because it also restricts the new library to the user's private role. That restriction is irrelevant to the Download button and adds permission calls. The test also needs the file's bytes to compare against the zip, so it opens the file itself either way.
- **Sleeps:** The test has none. It waits with `wait_for_visible()` before the screenshot and polls for the finished download in `download_file_from`.
  - Not changed: the other tests in `test_library_contents.py` still have older `UX_RENDER` sleeps. They are outside this branch's diff, and this is a release branch.
- **Screenshots:** This is the only test of the folder Download button, and it takes `libraries_folder_download_selected`.
- **DOM decoration:** Fixing the id typo (`download--btn` to `download-btn`) gives the selector what it needs. A `data-description` attribute would match current conventions better. I left it out to keep the `release_26.2` client diff to one character, which was the same call as in normal review 1.
- **Client refactor:** Not applicable, because the target is a release branch.
- **Setup path:** Now that `/api/tools/fetch` library datasets download correctly, the setup could use fetch. I kept the legacy upload, as the test-challenge debrief did. The fetch path is covered by `test_download_fetched_dataset` in the API tests.
