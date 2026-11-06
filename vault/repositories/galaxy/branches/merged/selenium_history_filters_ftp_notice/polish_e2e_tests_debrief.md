# Polish E2E tests: selenium_history_filters_ftp_notice (round 2, after re-scope)

This round dropped the last redundant sleep in branch-touched code (`_upload_all`), made `libraries_folder_create` wait for its POST, and switched the data-library long-name test to a smart-component click. All changed E2E tests pass once each on Playwright and Selenium.

Scope: `d83f7eaa13c..HEAD`, done fresh. Round 1 is in `earlier_drafts/1/`.
- Both changes went in as fixups and were autosquashed. Tree identical before and after each rebase. Baseline commits keep their places.
- No tests or assertions removed or weakened.

## Changes

- **`_upload_all` sleep** (`test/integration_selenium/test_upload_ftp.py`): dropped the `sleep_for(UX_RENDER)` before `wait_for_history()`.
  - `wait_for_history` already waits for non-empty `contents_active` plus a terminal state.
  - The per-hid `history_panel_wait_for_hid_ok` loop this branch added runs after it.
  - Round 1 left the sleep alone as pre-existing. This branch now changes the function, so it's in scope.
  - Folded into "Search for each remote file before ticking it in Choose Remote Files", the commit that added the hid loop.
- **`libraries_folder_create` waits for the save** (`navigates_galaxy.py`). It now ends with `save_folder_btn.wait_for_absent_or_hidden(wait_type=DATABASE_OPERATION)`.
  - This mirrors `libraries_index_create`.
  - `LibraryFolder.vue` sets `editMode = false` when the POST resolves, and that removes the button.
  - Before the fix, `test_long_data_library_names_stay_in_their_column` called `self.home()` straight after the save click. That could cancel the folder POST.
  - The only other caller is `test_library_contents::test_sub_folder`. It passes on both backends.
  - Folded into "Wrap long names in the data library browser too", where the test that needed it was added.
- **Smart-component click**: in the same test, `library_label.click()` on the held element became `upload.data_library_library_label(label=library_name).wait_for_and_click()`. Same fixup.

## Not changed

- **UI setup for the library and folder** in the data-library long-name test: the brief's "use API for setup" doesn't fit.
  - `LibraryPopulator` exists, but Selenium tests use the session-based `SeleniumSessionDatasetPopulator`, and nothing wires in a library populator.
  - There's no folder-create populator.
  - The sibling `_create_and_populate_library` also uses the UI.
- **`_search_remote_files` timeout fallback**: a commented `except TimeoutAssertionError: pass` for sources that ignore the query. It's a bounded wait with a reason, so it meets the rule.
- **`execute_script` with `label.closest("td")`** in `assert_label_within_its_column`: measuring layout needs JS, and the lookup is relative to the smart component's element.
- **Breadcrumb xpath targets** (`remote_files_breadcrumb_link`, `remote_files_current_folder`): `BreadcrumbNavigation.vue` has no data attributes. Text-based xpath in `navigation.yml` is acceptable, and adding client attributes isn't worth it here.
- **Other `sleep_for` calls**: they predate this branch and sit in code it didn't touch, such as `upload_activity_helpers.py` ~845 and older `test_history_panel` tests.
- **Screenshots**: every new test already takes one. I checked `upload_data_library_long_name_wrapped`, which shows the long folder name wrapped inside the Name column. The round-1 screenshots are unchanged.

## Hash map

| Commit | Old | New |
| --- | --- | --- |
| Baseline tests: FilesDialog FTP notice names the FTP server | `a47703fbac1` | unchanged |
| Fix history_panel.search and add history_panel_filter | `85cdc82cd75` | unchanged |
| Add Selection menu undelete and hide history panel helpers | `0ac901aa482` | unchanged |
| Baseline tests: undelete and hide history items from filters and the Selection menu | `4e6666a7ffe` | unchanged |
| Search for each remote file before ticking it in Choose Remote Files | `519f7e8739d` | `5301068fd65` |
| Let the upload helpers open remote file folders | `baa08b28110` | `fe91d52b20e` |
| Baseline tests: upload from a remote file source subfolder | `38efba63f5b` | `266a8298801` |
| Move FilesDialog's FTP upload notice into FtpUploadHelp | `3cb2cd26015` | `40d192c4a2e` |
| Show the FTP upload notice in Choose Remote Files again | `9d9ebbd00d3` | `8ff9be8bfe0` |
| Wrap long names in the remote files browser | `b3c2164b9df` | `42ae8cacce2` |
| Let FtpUploadHelp decide when it shows | `ee7e1a1b5bb` | `a3ad8110c11` |
| Wrap long names in the data library browser too (head) | `3d7daa91867` | `fab6bdc8394` |

## Runs

- I rebuilt the client at HEAD first. The bundle (19:44) was older than the head commit's `DataLibraryUpload.vue` change.
- Runs were one at a time, never in parallel. Playwright: headless, timeout multiplier 2. Selenium: headed, local chromedriver.

Full pass, after the `_upload_all` fixup:

| Suite | Playwright | Selenium |
| --- | --- | --- |
| `test_history_panel.py` -k `test_delete_undelete_and_purge_items or test_hide_and_unhide_items` | 2 passed | 2 passed |
| `test_history_related_filter.py` | 1 passed | 1 passed |
| `test_collection_builders.py` | 8 passed | 8 passed |
| `test_upload_activity.py` -k `data_library` | 2 passed | 2 passed |
| `test_upload_activity_remote_files.py` | 3 passed | 3 passed |
| `test_upload_ftp.py` | 3 passed | 3 passed |
| `test_upload_file_sources.py` (caller of the changed remote-file helpers) | 2 passed | 2 passed |

Rerun after the `libraries_folder_create` fixup:

| Suite | Playwright | Selenium |
| --- | --- | --- |
| `test_upload_activity.py` -k `data_library` | 2 passed | 2 passed |
| `test_library_contents.py` -k `test_sub_folder` (other helper caller) | 1 passed | 1 passed |

Checks: `ruff check` is clean. The pre-commit hooks passed on both fixups. Running `uvx ruff format --check` on `navigates_galaxy.py` flags three older lines this branch didn't touch. That's a ruff version difference, not part of this change.
