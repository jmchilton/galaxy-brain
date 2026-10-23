# Polish E2E tests: selenium_history_filters_ftp_notice

Replaced the last raw history-filter selector with a nav target, dropped the `_show_hidden_content` sleeps, reused `history_panel_wait_for_and_select` in the new history-panel tests, and added screenshots to the three remote-files/FTP tests; all changed E2E tests pass on Playwright and Selenium.

Scope: `d83f7eaa13c..HEAD` (was `fa69613dd93`). Every change went in as a fixup and was autosquashed. The tree after the rebase matches the pre-rebase tree, and the Baseline commits keep their places. No tests or assertions were removed or weakened.

## Changes

- **Nav target `history_panel.search_reset`**: `'#current-history-panel .content-operations-filters [data-description="reset query"]'`, named to pair with `search`. `test_history_related_filter` now clicks it instead of `history_element(attribute_value="reset query", scope=...)`. It went into "Fix history_panel.search and add history_panel_filter".
- **`_show_hidden_content` sleeps** (`test_collection_builders.py`): I dropped both `sleep_for(UX_RENDER)` calls and fixed the stale "toggle" docstring.
  - `history_panel_filter` already waits for the input.
  - Every caller then waits for the hidden hids with a JOB_COMPLETION timeout.
  - All 8 tests pass on both backends, one green run each. This branch had not run the file under Selenium before. If `_show_hidden_content` flakes later, look at this change first.
  - Same commit as above.
- **Reused `history_panel_wait_for_and_select`** in place of the hand-rolled `multi_operations_show` + `muli_operation_select_hid` sequences. Each call also waits for the hid to be ok in the panel, which is slightly stricter. It went into the Baseline history-panel commit. The places changed:
  - the new `deleted:true` block of `test_delete_undelete_and_purge_items`
  - both selections in `test_hide_and_unhide_items`
  - #24380's part of the test was left alone.
- **Screenshots**, since no other test covers these views:
  - `upload_remote_files_ftp_help` in `test_ftp_directory_shows_upload_site`, in the FTP notice commit.
  - `upload_remote_files_long_name_wrapped` in `test_long_remote_file_name_stays_in_its_column`, taken after the measurement, in the long-name commit.
  - `upload_remote_files_subfolder_staged` in `test_upload_from_remote_file_source_folder`, in its Baseline commit. The test now stages, takes the screenshot, then calls `start()`.
  - I ran with `GALAXY_TEST_SCREENSHOTS_DIRECTORY` set and checked the PNGs.
    - The FTP one shows the notice naming `ftp://ftp.galaxyproject.com`.
    - The long-name one shows the name wrapped inside the Name column.
    - The subfolder one shows the staged `b` row, not the subfolder listing. `stage_remote_file` opens the folder and stages in one call. The long-name screenshot already covers the browser view.

## Not changed

- **`execute_script` with `label.closest("td")`** in the long-name test: the label comes from the smart component. Measuring layout needs JS, and the `td` lookup is relative to that element, so it's not a raw page selector.
- **`remote_files_ftp_help`, `remote_files_search`, `remote_files_current_folder`, `remote_files_browser_labels`**: these are already nav targets.
- **Other sleeps**: the branch's added and changed lines have none left. The remaining `sleep_for` calls predate this branch and sit in code it didn't touch: other `test_history_panel` tests, `upload_activity_helpers.py:845`, and `test_upload_ftp._upload_all`.

## Hash map

| Commit | Old | New |
| --- | --- | --- |
| Baseline tests: FilesDialog FTP notice names the FTP server | `a47703fbac1` | `a47703fbac1` (unchanged) |
| Fix history_panel.search and add history_panel_filter | `7a3e3616927` | `85cdc82cd75` |
| Add Selection menu undelete and hide history panel helpers | `23ceab15b7e` | `0ac901aa482` |
| Baseline tests: undelete and hide history items from filters and the Selection menu | `5469fdf39a8` | `4e6666a7ffe` |
| Search for each remote file before ticking it in Choose Remote Files | `3bc85d0a838` | `59fbd6cf757` |
| Let the upload helpers open remote file folders | `debacd25f69` | `febd77a0e5c` |
| Baseline tests: upload from a remote file source subfolder | `52f21d4f934` | `4e0ee7293d0` |
| Show the FTP upload notice in Choose Remote Files again | `aa820be92c4` | `ccaa1079c99` |
| Wrap long names in the remote files browser (head) | `fa69613dd93` | `eaad3563f8b` |

## Runs

Each suite ran once on each backend, Playwright first, never in parallel. All passed.

| Suite | Playwright | Selenium |
| --- | --- | --- |
| `test_history_panel.py` -k `test_delete_undelete_and_purge_items` or `test_hide_and_unhide_items` | 2 passed | 2 passed |
| `test_history_related_filter.py` + `test_collection_builders.py` | 9 passed | 9 passed |
| `test_upload_activity_remote_files.py` + `test_upload_ftp.py` + `test_upload_file_sources.py` | 8 passed | 8 passed |

- The last row includes every caller of the changed remote-file helpers.
  - `test_upload_multiple` stages 2 files through `stage_remote_files`, and the search before each tick doesn't break it.
  - It only calls `wait_for_history`, so it doesn't prove both files were uploaded. That test predates this branch. Asserting each hid there would be a cheap strengthening, but I left it out of scope.
- `uvx ruff check` and `ruff format --check` on the changed files: clean. The pre-commit hooks passed.
- No client rebuild was needed, because only `navigation.yml` changed on the client side and Python reads it from source.
