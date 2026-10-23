# selenium_history_filters_ftp_notice

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:selenium_history_filters_ftp_notice?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_history_filters_ftp_notice)

## Status

Implemented; hardening in progress. Base [#24380](../selenium_delete_items_dataset_privacy/index.md) head `d83f7eaa13c` (itself on `release_26.2`); head `6890643f6e0`.

No PR.

No CI yet.

## Base

Stacked on `selenium_delete_items_dataset_privacy` (#24380, open, approved): the undelete/hide tests extend its `test_delete_undelete_and_purge_items` and use its helpers. Rebase onto `release_26.2` once #24380 merges; open the PR after that.

## Scope

All of `galaxy_ui_driver`'s FAQ-loop batch 7 except gxui, plus the prerequisites it needs (John, 2026-10-23: "everything in one"). Two 26.2 client fixes, test helpers and E2E coverage:

1. Baseline vitest: FilesDialog's FTP notice names `ftp_upload_site`.
2. `history_panel.search` fix (selector never matched) + `history_panel_filter`; used by `test_collection_builders` and `test_history_related_filter`.
3. Selection menu helpers: `history_panel_confirm_selected_operation`, `history_panel_undelete_selected`, `history_panel_hide_selected`.
4. Baseline E2E: undelete from Selection menu under `deleted:true`; new `test_hide_and_unhide_items` (Selection menu hide/unhide, Unhide icon under `visible:hidden`).
5. `stage_remote_file(s)` searches before ticking.
6. `open_remote_folder` + `path=`; `test_upload_from_remote_file_source_folder`.
7. **Fix (26.2 regression):** Choose Remote Files shows the FTP server notice again (`FtpUploadHelp.vue`, shared with FilesDialog); `test_ftp_directory_shows_upload_site`, red before.
8. **Fix:** long remote file names wrap; `test_long_remote_file_name_stays_in_its_column`, red before.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md): `77ebe032746`, `28eb02432cd`, `391dd82665d`, `de467e6fcb9`, `bcaec710b18`, `0cd9f75f9d1`, plus prerequisites `14d970513f5` and `073889a2872` (hide/unhide). On restack, drop all eight by subject. `073889a2872`'s `include_hidden` bits and `391dd82665d`'s helpers are already on #24380. `77ebe032746`'s `history_panel_filter_text` hunk was left behind with `32e12d33af7`.

## Worktree

`~/projects/worktrees/galaxy/branch/selenium_history_filters_ftp_notice/`. `.venv` and `client/node_modules` are symlinks into `galaxy_ui_driver_gxui`; never run `pnpm install` here. Client built in place (`static/dist`). Tests use a framework-managed server. For Selenium, put chromedriver on `PATH` and leave `GALAXY_TEST_SELENIUM_HEADLESS` unset.
