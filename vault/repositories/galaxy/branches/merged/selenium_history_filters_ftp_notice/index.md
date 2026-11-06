# selenium_history_filters_ftp_notice

- [PR #24458](https://github.com/galaxyproject/galaxy/pull/24458)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_history_filters_ftp_notice)

## Status

PR #24458 approved by dannon; review addressed per [review_response_dannon_1.md](review_response_dannon_1.md). Base: `release_26.2` (`f03ab3f7a35`). Head: `4df4bd8d160`.

PR #24458 open, not draft, approved by dannon.

Fork CI pending on `4df4bd8d160`; FilesDialog vitest (28), `test_hide_and_unhide_items` and remote-files/FTP/file-source Selenium (8) passed locally.

## Base

Rebase 2026-10-26 onto `release_26.2` `7a7c1576f94`; old head `540a46e8c79`. Conflicts only in `test_upload_activity.py`: kept upstream's new data-library tests and API-based `_create_and_populate_library` (dropped its own admin login, since driver setup logs in admin); kept this branch's long-name test, now `@requires_new_library`. Selenium not rerun.

Re-polish 2026-10-25: admin login moved into driver setup before managed history creation; clean rebase onto `release_26.2` `849c2573cb0`, client import lint fixed, and annotations added. Head `540a46e8c79`; previous polished head `cca66ef7a78`.

Polish 2026-10-25: isort fixup folded into `Let the upload helpers open remote file folders`, rebased clean onto `release_26.2` `39084b89e8f`; old head `23e404c6c86`.


Was stacked on `selenium_delete_items_dataset_privacy` (#24380, merged 2026-10-24). Its undelete/hide tests extend #24380's `test_delete_undelete_and_purge_items` and use #24380's helpers.

Rebased 2026-10-25 onto `release_26.2` (`e3affe97eb8`), dropping #24380's commits (`--onto origin/release_26.2 d83f7eaa13c`); old head `2c983d1b49a`. One conflict in `FilesDialog.vue`: kept the RDM root alert and `rdmUriRoots` from `release_26.2`, plus this branch's `FtpUploadHelp`; restored the `GAlert` import the RDM alert still uses. FilesDialog vitest passes (21).

## Scope

All of `galaxy_ui_driver`'s FAQ-loop batch 7 except gxui, plus the prerequisites it needs (John, 2026-10-23: "everything in one"). It touches history test helpers and Upload Activity browsers:

- **History panel test helpers and coverage.**
  - Fixes `history_panel.search`, whose selector never matched.
  - Adds `history_panel_filter` and the Selection menu helpers for undelete and hide/unhide.
  - Baseline E2E: undelete under `deleted:true`, and the new `test_hide_and_unhide_items`.
- **Remote-files upload helpers.**
  - Searches for each file before ticking it. The search waits out the debounce and tolerates sources that ignore the query.
  - Adds `open_remote_folder` and `path=`.
  - Baseline subfolder-upload E2E.
- **Fix: FTP notice** (missing since Upload Activity landed in 26.0). Choose Remote Files shows the FTP server notice again.
  - The notice is the shared `FtpUploadHelp.vue`, which also renders in FilesDialog and itself checks for `gxftp://`.
  - Without an `ftp_upload_site`, it skips the log-in sentence.
  - The E2E and the vitest were red before the fix.
- **Fix: long names.** Long unbroken names wrap in the remote files and data library browsers.
  - The rule is the shared `upload-browser-label` mixin, and the column check is `assert_label_within_its_column`.
  - The E2Es were red before the fix.
- `libraries_folder_create` now waits for the save to finish.

The original scope is kept as [an alt](alts/original_scope.md).

The commits come from [`galaxy_ui_driver`](../../active/galaxy_ui_driver/index.md): `77ebe032746`, `28eb02432cd`, `391dd82665d`, `de467e6fcb9`, `bcaec710b18` and `0cd9f75f9d1`, plus the prerequisites `14d970513f5` and `073889a2872`. When restacking, drop all eight by subject. `32e12d33af7` stays on `galaxy_ui_driver`; its `history_panel_filter_text` should switch to `components.history_panel.search`.

## Worktree

`~/projects/worktrees/galaxy/branch/selenium_history_filters_ftp_notice/`
- `.venv` and `client/node_modules` are symlinks into `galaxy_ui_driver_gxui`. Never run `pnpm install` here.
- The client is built in place (`static/dist`, HEAD).
- Tests use a framework-managed server. For Selenium, put chromedriver on `PATH` and leave `GALAXY_TEST_SELENIUM_HEADLESS` unset.
