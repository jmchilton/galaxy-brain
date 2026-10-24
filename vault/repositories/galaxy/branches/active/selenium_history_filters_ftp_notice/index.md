# selenium_history_filters_ftp_notice

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:selenium_history_filters_ftp_notice?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_history_filters_ftp_notice)

## Status

READY. Re-scoped once and hardened twice; see the [implementation debrief](implementation_debrief.md). Base: [#24380](../selenium_delete_items_dataset_privacy/index.md) head `d83f7eaa13c`, which is on `release_26.2`. Head: `2c983d1b49a`.

No PR yet. It can open once #24380 merges.

No CI yet.

## Base

The branch is stacked on `selenium_delete_items_dataset_privacy` (#24380, open, approved). Its undelete/hide tests extend #24380's `test_delete_undelete_and_purge_items` and use #24380's helpers. When #24380 merges, rebase onto `release_26.2`, then open the PR.

## Scope

All of `galaxy_ui_driver`'s FAQ-loop batch 7 except gxui, plus the prerequisites it needs (John, 2026-10-23: "everything in one"). It is 14 commits and touches 16 files, +296/−48:

- **History panel test helpers and coverage.**
  - Fixes `history_panel.search`, whose selector never matched.
  - Adds `history_panel_filter` and the Selection menu helpers for undelete and hide/unhide.
  - Baseline E2E: undelete under `deleted:true`, and the new `test_hide_and_unhide_items`.
- **Remote-files upload helpers.**
  - Searches for each file before ticking it. The search waits out the debounce and tolerates sources that ignore the query.
  - Adds `open_remote_folder` and `path=`.
  - Baseline subfolder-upload E2E.
- **Fix (26.2 regression): FTP notice.** Choose Remote Files shows the FTP server notice again.
  - The notice is the shared `FtpUploadHelp.vue`, which also renders in FilesDialog and itself checks for `gxftp://`.
  - Without an `ftp_upload_site`, it skips the log-in sentence.
  - The E2E and the vitest were red before the fix.
- **Fix: long names.** Long unbroken names wrap in the remote files and data library browsers.
  - The rule is the shared `upload-browser-label` mixin, and the column check is `assert_label_within_its_column`.
  - The E2Es were red before the fix.
- `libraries_folder_create` now waits for the save to finish.

The original scope is kept as [an alt](alts/original_scope.md).

The commits come from [`galaxy_ui_driver`](../galaxy_ui_driver/index.md): `77ebe032746`, `28eb02432cd`, `391dd82665d`, `de467e6fcb9`, `bcaec710b18` and `0cd9f75f9d1`, plus the prerequisites `14d970513f5` and `073889a2872`. When restacking, drop all eight by subject. `32e12d33af7` stays on `galaxy_ui_driver`; its `history_panel_filter_text` should switch to `components.history_panel.search`.

## Worktree

`~/projects/worktrees/galaxy/branch/selenium_history_filters_ftp_notice/`
- `.venv` and `client/node_modules` are symlinks into `galaxy_ui_driver_gxui`. Never run `pnpm install` here.
- The client is built in place (`static/dist`, HEAD).
- Tests use a framework-managed server. For Selenium, put chromedriver on `PATH` and leave `GALAXY_TEST_SELENIUM_HEADLESS` unset.
