# Initial implementation debrief

Extracted FAQ-loop batch 7 from `galaxy_ui_driver` onto #24380's head `d83f7eaa13c` (John: one branch, everything). The source commits were reworked, not cherry-picked as-is.

## Changes from the source commits

- `77ebe032746`: dropped the `history_panel_filter_text` hunk. That function comes from `32e12d33af7`, which isn't on the base. Also switched `test_history_related_filter`'s raw lookup to `components.history_panel.search`, so the fixed selector has a second consumer.
- `073889a2872` + `28eb02432cd` + `391dd82665d`:
  - Helpers moved into their own commit. Dropped `include_hidden_button`, `history_panel_include_hidden`, `unhide_button` and `history_panel_item_unhide`, because #24380 already has them.
  - Tests rewritten in #24380's style (`@managed_history`, `_wait_for_history_item_states`, the `muli` spelling).
  - Strengthened: the item undeleted under `deleted:true`, and the one unhidden under `visible:hidden`, must leave the list (the other side of #24380's keep-if-still-matching fix). Every item's API state is checked at each step.
- `de467e6fcb9`: on 26.2 the helpers live in `galaxy_test/selenium/upload_activity_helpers.py`, so the import of `exception_indicates_stale_element` now comes from `galaxy.selenium.has_driver`.
- `bcaec710b18`:
  - Added a "Baseline tests" vitest (the FilesDialog notice must name `ftp_upload_site`), because the old test only checked that `#helper` exists.
  - Hoisted `FTP_UPLOAD_SITE` in `test_upload_ftp.py`.
  - The QA session never ran the test red; it's red now (below).
- `0cd9f75f9d1`: no test before. Added `test_long_remote_file_name_stays_in_its_column`, which checks the label's right edge against its `td`.

## Red → green

- FTP: on a bundle built before the Vue change, `Timeout waiting on CSS selector [.remote-files-upload [data-description="ftp upload help"]] to become visible.` (the FTP listing loaded). Green after the rebuild.
- Long names: on the old bundle, `AssertionError: file name runs 733.921875px past the Name column`. Green after the CSS change.

## Runs (Playwright and Selenium, one at a time)

- `test_history_panel.py` `test_delete_undelete_and_purge_items`, `test_hide_and_unhide_items`, and `test_history_related_filter.py`: green on both backends.
- `test_collection_builders.py` (8 tests): green under Playwright.
- `test_upload_activity_remote_files.py` and `test_upload_ftp.py` (6 tests): green on both backends.
- Vitest `FilesDialog/` and `Panels/Upload/` (87 tests): green.
