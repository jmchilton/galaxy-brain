Run via Opus at default effort.

# Polish E2E tests debrief

The branch's one E2E test was already mostly clean; the only polish was adding a `libraries_folder_download_selected` screenshot of the selected row and the Download button just before the click.

Commit: `63267ab1311` "Screenshot the selected row before the library folder download" (pushed to `jmchilton/issue_24376_library_download_test_26_2`). The test passes under Playwright with the change (1 passed, 103s).

## Checklist
- **Selectors:** No raw CSS/DOM selectors. The test uses `libraries.folder.download_button` from navigation.yml and the existing helpers `libraries_open_with_name` and `libraries_folder_select_datasets`.
- **Shared abstractions:** `download_file_from` (framework.py) is already a shared helper. Row selection reuses `libraries_folder_select_datasets`. Nothing else in the test repeats.
- **Sleeps:** The test has none. The old `sleep_for(UX_RENDER)` + `os.listdir` was already replaced by `download_file_from`'s completion poll. I added an explicit `wait_for_visible()` on the Download button before the screenshot.
  - Not changed: other tests in `test_library_contents.py` (e.g. `test_import_dataset_from_history`) still have pre-existing `UX_RENDER` sleeps. They are outside this branch's diff, and cleaning them up on a release-branch test fix would widen the scope.
- **Screenshots:** This is the only test of the folder Download button, so it now takes a screenshot (see `screenshot_debrief.md`).
- **DOM decoration:** The id typo fix (`download--btn` → `download-btn`) is all the selector needs. A `data-description` would follow current conventions better, but the minimal fix suits a `release_26.2` branch (same call as normal review 1).
- **Client refactor:** Not applicable. The target is a release branch, not dev.
