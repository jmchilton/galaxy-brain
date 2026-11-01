Run via Opus at default effort.

# Screenshot debrief

Screenshots successfully obtained.

The only UI change is the Download button's id typo fix, which isn't visible. The re-scope's server fix (the LDDA back-reference) doesn't change any UI. The relevant view is still the library folder with a dataset selected and the Download button showing. `test_download_dataset_from_library` already captures that view, so I needed no test changes. I re-recorded it at `7771e277294` after restarting this worktree's Galaxy server, so the run includes the server fix.

| File | Test | Shows |
| --- | --- | --- |
| `screenshots/libraries_folder_download_selected.png` | `test_library_contents.py::TestLibraryContents::test_download_dataset_from_library` (Playwright) | The library folder `download_library…` with `1.txt` (txt, "uploaded txt file") selected. The toolbar shows Folder, Datasets, Add to History, **Download**, Delete and Details. |

I checked the image and it looks as expected. The row and header checkboxes are ticked, and the Download button is rendered and enabled. The test passed in 71s, and its zip-content assertions passed against the fixed server.

Notes:
- The restarted servers came up on Galaxy :8091 and Vite :5181 instead of :8090/:5180. The script chose them because the old ports were not free yet, and it records the ports in `.venv/e2e.env`.
- The first run hit the known setup-phase `Page.goto` timeout while the fresh Vite server warmed up. The retry passed.
- The history panel shows an `import_from_history…` history left over from an earlier test run by the shared admin user. It has nothing to do with this test.
- I recorded with Playwright only, using `GALAXY_TEST_TIMEOUT_MULTIPLIER=5` and the host's library and font workarounds from the session scratchpad.
- The previous round's screenshot is in `earlier_drafts/1/screenshots/`. The new one shows the same view.
