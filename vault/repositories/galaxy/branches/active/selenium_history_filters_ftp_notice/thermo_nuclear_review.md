# Thermo-nuclear code quality review: selenium_history_filters_ftp_notice

I made one change: `test_upload_ftp._upload_all` now checks every staged file was uploaded. I found no structural regressions and no code-judo move that fits a 26.2 fix PR. I didn't change the other findings (listed below with reasons). Scope `d83f7eaa13c..HEAD`, reviewed at `3f9fa2cb20d`.

## Acted on

**Strengthened `_upload_all`** (`test_upload_ftp.py`), folded into "Search for each remote file before ticking it in Choose Remote Files":
- That commit's message says the selection survives each new search, and `test_upload_multiple` is the only multi-file caller of `stage_remote_files`.
- Before, the test called only `wait_for_history`, which passes even when a file was never staged.
- Now it waits for hids `1..n` to be ok and asserts that the history's dataset names are exactly `0.txt .. {n-1}.txt`.
- No assertion was removed.

## Not acted on

- **Rename `history_panel_hide_selected(unhide=True)` to `history_panel_unhide_selected()`.** A flag that inverts the operation is a mild smell. But gxui's `history-hide` verb (`galaxy_ui_driver_gxui` `gxui/verbs.py:514`) passes its own `unhide` flag straight through, so the flag API fits its real consumer. It also mirrors #24380's `history_panel_delete_selected(purge=...)`, which I left alone: it's #24380's API, and purge strengthens delete rather than inverting it.
- **`"gxftp://"` check duplicated in both callers of `FtpUploadHelp`.** This is the one code-judo candidate: the component could own the visibility rule (`:uri` prop, `v-if` inside), and FilesDialog's `showFTPHelper` ref could go. I deferred it because `showFTPHelper` and its set-on-`load()` timing predate the branch, and the 26.2 fix should stay a minimal extraction. Worth doing on dev.
- **`FtpUploadHelp.vue` lives in `FilesDialog/` but is imported from `Panels/Upload/`.** Cosmetic. The normal review already noted it.
- **File size.** `upload_activity_helpers.py` went from 1005 to 1052 lines and `RemoteFilesUpload.vue` from 1005 to 1010. Both were already over 1k on the base and on `release_26.2`, so nothing crosses the threshold. Splitting them is out of scope for 26.2. `upload_activity_helpers.py` is the better split candidate: the remote-files staging could become its own module.
- **`path` threaded through four pass-through signatures** (`RemoteFileUploadItem`, `_UploadStaging`, `UploadContext`, `RemoteFilesContext`). That layering predates the branch, and the new parameter follows it.
  - `stage_remote_files(path=)` has no caller on this branch, but gxui's upload verb uses it (`verbs.py:990`), so it isn't speculative.
  - Encoding the path in the label (`"subdir1/b"`) would delete the parameter. But it's magic parsing, and remote labels (e.g. Invenio record titles) can contain `/`.
- **The swallowed `TimeoutAssertionError` in `_search_remote_files`.** This is a silent fallback, but it's deliberate: Invenio advertises server search and ignores the query. Codex's review settled it and recorded the residual risk. The client exposes no cleaner "search settled" signal (`isBusy` doesn't cover the debounce window).
- **Shared "every listed label contains the query, stale-safe" helper.** `_remote_labels_match` and release_26.2's `_workflow_card_named` repeat about 6 lines of the same pattern. Pulling them into one helper would touch an unrelated workflow helper in a fix PR; leave it for a follow-up.
- **`_show_hidden_content` is now a one-line wrapper.** I kept it: it has 4 callers and names the intent.

<details>
<summary>Full review</summary>

**History panel (`85cdc82`, `0ac901a`, `4e6666a`)**
- The `history_panel.search` fix gives the selector real consumers (`history_panel_filter`, `test_history_related_filter`, `test_collection_builders`). It removes two raw `history_element(..., scope=".content-operations-filters")` lookups, a net reduction in ad-hoc selectors.
- `history_panel_confirm_selected_operation` is the right primitive. Delete, purge, undelete, hide and unhide differ only in the `data-description` option, and SelectionOperations.vue uses the same keys. The build-list callers of `selected content menu` open builders, not confirm dialogs, so they stay outside it.
- The tests use the base's `_wait_for_history_item_states` and `history_panel_wait_for_and_select`, with no new bespoke waits.

**Remote files helpers (`519f7e8`, `baa08b2`)**
- `open_remote_folder` is the right unit. Both `stage_remote_file(s)` paths and the two new tests use it, so the "click the source label" code that was duplicated before is gone.
- `_search_remote_files` and `_select_remote_file` keep the debounced-search race in one place.
- `_remote_labels_match` uses `exception_indicates_stale_element`, the canonical cross-backend check.
- The selection model is keyed by id (`selectionModel.add`, `RemoteFilesUpload.vue`), independent of `browserItems`. So searching between ticks keeps earlier selections, and the strengthened `_upload_all` now pins that.

**FTP notice (`65fbe58`)**
- The `FtpUploadHelp.vue` extraction is clean: `useConfig` moved with it, and the `id="helper"` attribute falls through for FilesDialog. RemoteFilesUpload gains one `v-if` and one import, with no new state.

**Long names (`2bdb5e8`)**
- Two scoped CSS properties next to the existing rule; no new structure.

**Runs (one at a time)**
- `test_upload_ftp.py` (3 tests): Playwright 3 passed, Selenium 3 passed.
- `uvx ruff check` and `ruff format --check`: clean. Pre-commit hooks passed on the rebase.
- No Vue change, so no client rebuild. `git diff 3f9fa2cb20d HEAD` is the 4 added lines in `test_upload_ftp.py`.

</details>

## Hash map

| Commit | Old | New |
| --- | --- | --- |
| Baseline tests: FilesDialog FTP notice names the FTP server | `a47703fbac1` | `a47703fbac1` (unchanged) |
| Fix history_panel.search and add history_panel_filter | `85cdc82cd75` | `85cdc82cd75` (unchanged) |
| Add Selection menu undelete and hide history panel helpers | `0ac901aa482` | `0ac901aa482` (unchanged) |
| Baseline tests: undelete and hide history items from filters and the Selection menu | `4e6666a7ffe` | `4e6666a7ffe` (unchanged) |
| Search for each remote file before ticking it in Choose Remote Files | `59fbd6cf757` | `519f7e8739d` |
| Let the upload helpers open remote file folders | `0900eb95943` | `baa08b28110` |
| Baseline tests: upload from a remote file source subfolder | `8acf9a7d0cd` | `38efba63f5b` |
| Show the FTP upload notice in Choose Remote Files again | `6ec8d3762f4` | `65fbe586a79` |
| Wrap long names in the remote files browser (head) | `3f9fa2cb20d` | `2bdb5e887ea` |
