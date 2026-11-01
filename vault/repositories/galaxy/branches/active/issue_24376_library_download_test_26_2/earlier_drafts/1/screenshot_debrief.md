Run via Opus at default effort.

# Screenshot debrief

Screenshots successfully obtained.

The only UI change is the Download button's id typo fix, which isn't visible. The relevant view is the library folder with a dataset selected and the Download button showing, so `test_download_dataset_from_library` now captures it (commit `63267ab1311`).

| File | Test | Shows |
| --- | --- | --- |
| `screenshots/libraries_folder_download_selected.png` | `test_library_contents.py::TestLibraryContents::test_download_dataset_from_library` (Playwright) | Library folder `download_library…` with `1.txt` (txt) selected; toolbar shows Folder, Datasets, Add to History, **Download**, Delete, Details. |

Checked: the image looks as expected. The row and header checkboxes are ticked and the Download button is rendered and enabled.

Notes:
- The right-hand history panel shows an `import_from_history…` history left over from an earlier test run by the same shared admin user. It is unrelated to this test and harmless.
- I recorded with Playwright only, using `GALAXY_TEST_TIMEOUT_MULTIPLIER=5` and the host's library and font workarounds from the session scratchpad. The first attempt passed with no setup-phase timeouts.
- The existing `libraries_dataset_import` screenshot (from `test_import_dataset_from_history`) does not cover the Download button, so I did not re-record it.
