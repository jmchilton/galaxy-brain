# galaxy_ui_driver

Status: `branches_reference`.

Standing branch for Galaxy changes motivated by gxui.

[Tracking history](tracking_history.md)

Owned by the [Playwright project](../../../../../projects/playwright/GALAXY_UI_SKILL_DESIGN.md). Do not PR alone or polish. gxui stays the tip commit; Galaxy fixes go below it, one per commit. Restacking and force-with-lease pushes to jmchilton are a standing OK. The owning session handles the restack. Since 2026-10-09, commits are pulled out as their own PRs off dev, following [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). Merged commits are then dropped from the stack.

**Base is `release_26.2`, not dev** (John, 2026-10-20). The branch drives release 26.2 QA, so its `navigation.yml` and helpers must match 26.2. Rebased onto `release_26.2` `65132d40dac` at `6c1b6093964`, 27 commits. #24142 is on 26.2, so its commit was dropped. #24139 merged to dev only, so its commit stays. Pre-rebase tip: `jmchilton/galaxy_ui_driver_backup_20261020` (`381f47837e3`). Restacks go onto `release_26.2` until John says otherwise. The final gxui PR still targets dev, so rebase onto dev before opening it. Upstreamed PRs still come off dev. FAQ-loop commits go below gxui (`c31fcb13a8e`, `4d391ac7e36`, `8d36a3bd9f3`, `12c8ec3d7c7`, `2782db29ee2`, `f19d8ec90f8`, `a67081d346c`, `d58f510c7c0`, `a51d2b9ed4a`, `93b1f03b432`, `e31b6908bec`, `7bea524600b`, `b96ef661d45`, `cdc5c200548`, `00c72c7fa3c`, `a9b34ac894c`, `1a9b0ccb3c2`); tip `abe4446f5bc`.

**Restacked 2026-10-21 onto [`workflow_editor_connection_helpers`](../workflow_editor_connection_helpers/index.md)** (`8380a8c1026`, on `release_26.2` `7febcc1d683`). That branch is off 26.2 on John's call. 42 commits; tip `fddc4bda08a`. Pre-restack tip: `jmchilton/galaxy_ui_driver_backup_20261021` (`abe4446f5bc`).
- **Dropped:** `8db334d5c50` and `046111eba20`, superseded by #24317, which merged to 26.2. The `_workflow_card_named` unit tests went with them; #24317 covers that lookup with E2E tests.
- **Kept, re-resolved:** `ffbdb7ee11e` (now `ec9ae950924`), the colon-free search, now on #24317's `_workflow_card_action`. Its "every title contains" check uses the search term, so another workflow matching only the term can't stall the wait.
- **gxui editor verbs:** `workflow-connect`, `-disconnect` and `-remove-step` call `workflow_editor_try_connect`, `workflow_editor_destroy_connection` and `workflow_editor_remove_node` when the step's `node-label` is unique. Otherwise they use their id-based code, because unlabelled steps of one tool share a label.
- **Since (FAQ loop):** `755d9376924` tests a dataset's Datatypes-tab change; gxui gains `dataset-change-datatype` and `dataset-change-dbkey`. Then `46bac522e23` (paste upload Spaces→Tabs), `ec8601a9914` (dataset Convert) and `3e37b70c4e8` (`edit_dataset_dbkey` docstring); gxui gains `dataset-convert` and `upload-paste --dbkey/--space-to-tab`. 46 commits; tip `7c448d5a4ee`. (Pre-restack hashes; now `24fa0702f6d`, `f0f2a98992e`, `b1ebdb7b94c`; the docstring is folded into `2e597420f5f`.)

**Restacked 2026-10-22 onto `workflow_editor_connection_helpers` `9699ec45644`** (re-scoped and rewritten) by its workhorse session. `git rebase --onto 9699ec45644 8380a8c1026` was clean: 46 commits, tip `b271e13696c`, and the gxui unit tests pass (101). Pre-restack tip: `jmchilton/galaxy_ui_driver_backup_20261022` (`7c448d5a4ee`). The FAQ-loop hashes above are pre-restack; remap them.

**Folded in 2026-10-22: `galaxy_ui_driver_editor_refs`** (`df78f64ec31`). Its branch, worktree and remote branch were deleted by mistake, then restored at `df78f64ec31`: that branch is being upstreamed, so leave it alone. `77b5ea69434` dropped (superseded by `workflow_editor_connection_helpers`' re-scope, same API). Kept: `ecb87b41894` → `f40b5bf8832` (`tool_open` short-id search) and `c5e788cad37` → `2e597420f5f` (docstrings), below gxui, and the gxui `fixup!`. The re-scope lacked docstrings on `workflow_editor_remove_node`/`destroy_connection` (they were in `77b5ea69434`), so the REGISTRY test failed for `workflow-disconnect` and `workflow-remove-step`; added them, and folded `edit_dataset_dbkey`'s docstring (`84b7ac2ee74`), into `2e597420f5f`. gxui unit tests pass (158); `test_run_tool_verify_contents_by_peek` and `test_refused_connection_and_removed_step` green under Playwright. 47 commits over `9699ec45644`; tip `748500e4b6b`.

**Since (FAQ loop, 2026-10-22):** `cac01c0884a` (delete/undelete/purge items), `961cab38f9f` (`edit_dataset_auto_detect_datatype`) and `e4bca1128c1` (Make new datasets private + Permissions tab); docstrings folded into `2e597420f5f` (was `fb122be45c8`). `2e597420f5f` differs from editor_refs' `c5e788cad37` by the `edit_dataset_dbkey`, `workflow_editor_remove_node`, `workflow_editor_destroy_connection` and `make_history_private` docstrings: keep them when that branch merges. gxui gains `dataset-delete`, `dataset-undelete`, `history-delete [--purge]`, `dataset-detect-datatype`, `dataset-permissions`, `history-make-private`, `preferences-new-datasets-private`. 50 commits; tip `2e5ed648b97`.

**Then (FAQ loop batch 4, 2026-10-22):** `073889a2872` (hide/unhide items; `history_panel_confirm_selected_operation` now backs `history_panel_delete_selected`), `1c8ea1d9a31` (Copy Link) and `54bddee5432` (Datasets list). gxui gains `history-hide [--unhide]`, `dataset-copy-link`, `datasets-list [--search]`. 53 commits; tip `fa8cfda6c7c`.

**Extracted 2026-10-22:** `cac01c0884a` and `e4bca1128c1` → [`selenium_delete_items_dataset_privacy`](../selenium_delete_items_dataset_privacy/index.md) (hardened, re-scoped with a HistoryPanel fix). On restack, drop both by subject. That branch adds `history_panel_item_unhide`/`history_panel_include_hidden`, so reconcile `073889a2872` with them. `961cab38f9f` stays.

**Then (FAQ loop batch 5, 2026-10-22):** the docstrings for `libraries_index_create` and `populate_library_folder_from_import_dir` were folded into `2e597420f5f`, so every later hash changed; the hashes above are remapped. New commits:
- `32e12d33af7`: Show Related Items toggles off.
- `162dfdb49b4`: a collection upload counts as one hid.
- `14d970513f5`: remote files are searched before being ticked.
- `1d227e6fc4c`: client fix. A library "as a Collection" import now goes to the picked history.
- `913dfd7dfd6`: library "as Datasets" test and helpers.

gxui gains `dataset-related`, `upload-url --dbkey/--collection/--collection-type`, `upload-remote`, `upload-library`, `library-new`, `library-import-dir` and `library-add-to-history`. `history-wait` now fails on a collection whose populate failed. 58 commits; tip `6c434fc3a15`.

The extraction drop above is not done yet. These restacks kept `cac01c0884a`/`e4bca1128c1`, because gxui's delete and permissions verbs build on them; that is waiting on John. `selenium_delete_items_dataset_privacy`'s records cite the pre-remap hashes (`d0d92741f74`, `ea0bc576e38`).

**Extracted 2026-10-22:** `1d227e6fc4c` (library collection picked history) and `913dfd7dfd6` (library "as Datasets" test) → [`library_collection_selected_history_26.1`](../library_collection_selected_history_26.1/index.md) (hardened, re-scoped with a ListWizard fix). On restack, drop both by subject; gxui's `library-add-to-history` uses `libraries_folder_add_to_history`, whose 26.1 version takes `history_id` (not `history_name`) and `screenshot_name`. `162dfdb49b4` stays here.

**Then (FAQ loop batch 6, 2026-10-23):** two new commits below gxui. Nothing was restacked, so neither extraction drop is done yet.
- `c184ed00be2`: tests Resume Paused Jobs and adds its `data-description`. It uses `cac01c0884a`'s undelete helpers.
- `0cf8353fc84`: tests purging deleted datasets from the Storage Dashboard and adds a `data-description` on the cleanup cards.

gxui gains `history-resume-paused` and `datasets-purge-deleted`. 60 commits; tip `6e95ac5a804`.

**Extracted 2026-10-23:** `c184ed00be2` and `0cf8353fc84` were moved to [`selenium_resume_paused_purge_deleted`](../selenium_resume_paused_purge_deleted/index.md), which was hardened and re-scoped. On restack, drop both by subject. That branch renames the purge helper to `storage_dashboard_cleanup(operation, screenshot_prefix=None)` (no wrapper), so rebind `datasets-purge-deleted` to `storage_dashboard_cleanup("deleted_datasets")`. The purge helper there also waits for `:not(.g-disabled)` buttons and adds `navigate_to_storage_dashboard`.

**Then (FAQ loop batch 7, 2026-10-23):** six new commits below gxui. The restack only autosquashed; no extraction drop is done yet.
- `77ebe032746`: fixes `history_panel.search`, which had no callers and never became visible. Adds `history_panel_filter`, used by `history_panel_filter_text` and the collection builders.
- `28eb02432cd`: `deleted:true` plus Selection menu **Undelete** in `test_delete_undelete_and_purge_items`; adds `history_panel_undelete_selected`.
- `391dd82665d`: `visible:hidden` plus the item Unhide icon in `test_hide_and_unhide_items`. Its `history_panel_item_unhide` and `unhide_button` match `selenium_delete_items_dataset_privacy`'s exactly.
- `de467e6fcb9`: `open_remote_folder` and `path=` on `stage_remote_file(s)`, plus a posix subfolder integration test.
- `bcaec710b18`: **26.2 client regression fix.** Choose Remote Files lost the FTP server notice; adds the shared `FtpUploadHelp.vue` and an integration test.
- `0cd9f75f9d1`: CSS; long remote file names wrap.

gxui gains `dataset-rename`, `dataset-unhide`, `history-undelete`, `history-filter` and `upload-remote --path`. 66 commits; tip `7e323178dc0`.

**Extracted 2026-10-23:** batch 7's six commits plus `14d970513f5` (remote file search) and `073889a2872` (hide/unhide) → [`selenium_history_filters_ftp_notice`](../selenium_history_filters_ftp_notice/index.md), stacked on `selenium_delete_items_dataset_privacy`. On restack, drop all eight by subject. With the earlier extractions, 14 commits now wait to be dropped.
- That branch is hardened and was re-scoped. It keeps the helper names `history_panel_filter`, `history_panel_confirm_selected_operation`, `history_panel_undelete_selected`, `history_panel_hide_selected` and `open_remote_folder`, so gxui's verbs bind unchanged.
- `history_panel_filter_text` (`32e12d33af7`, which stays here) should read `components.history_panel.search`. `FtpUploadHelp` now takes a `uri` prop.

**Then (FAQ loop batch 8, 2026-10-23):** `865d70395e8` tests picking several local files in one chooser selection (`set_file_input` takes a list, `stage_local_files`). gxui: `upload-file` takes several paths; `history-delete --purge` shows already-deleted hids with `deleted:any` first. 67 commits; tip `8d36c6dcdf8`.

**Then (FAQ loop batch 9, 2026-10-24):** `3dfeb7f18a2` tests a tool form data input's accepted formats list (`tool_form_accepted_formats`). `bcabe015080` tests assigning interval columns on the Attributes tab (`edit_dataset_attribute_fields`, `edit_dataset_set_metadata_select`). gxui: `tool-accepted-formats`, `dataset-attributes`, `dataset-set-metadata`. 69 commits; tip `b6305d0adee`.

**Then (FAQ loop batch 10, 2026-10-24):** `7ee70847cf8` tests archiving the current history (`history_panel_archive`, `navigate_to_archived_histories`). gxui: `history-archive`, `histories-archived`, `history-copy-datasets`. 70 commits; tip `492577ebcbb`.

**Then (FAQ loop batch 11, 2026-10-24):** `316dbcf7610` tests importing another user's shared history (`navigate_to_history_view`, `history_view_import`). `4dc3afa5d26` tests purging all histories from the list (`histories_purge_all`). gxui: `history-import`, `histories-purge-all`, `history-export`. 72 commits; tip `8408408ab05`.

**Extracted 2026-10-24:** `316dbcf7610` and `4dc3afa5d26` → [`selenium_history_import_purge`](../selenium_history_import_purge/index.md) (hardened, re-scoped). On restack, drop both by subject and rebind gxui `history-import` to the top-level `copy_history_modal` (replaces `history_view.copy_modal`; `history_view_import` is otherwise the same).

**Then (FAQ loop batch 12, 2026-10-24):** `8b84ce48e0f` tests switching histories from the history panel's Switch to history modal (`history_panel_switch_to`). gxui: `history-switch` now uses the modal; new `history-multiview`, `histories-delete`, `histories-restore`. 73 commits; tip `b6077811fd5`. Extraction restack above not yet done.

**Then (FAQ loop batch 13 redo, 2026-10-24):** `faq_server.sh` now runs Jupyter/RStudio ITs in Docker behind gx-it-proxy. `4b54438b1c2` tests the Interactive Tools panel (Running status, stop) with stubbed entry points; adds `interactive_tools_panel` selectors/helpers and moves `test_entry_point_sse.py`'s stub setup into `_base_interactive_tools.py`. `5e84f0ebadb` fixes `entryPointStore.updateEntryPoints` dropping a newly started IT while others are active (bug since `742a46dbed3`, all releases; queued as gx_issues `interactive_tools_panel_drops_new_entry_point`), with vitest + `test_interactive_tools_panel_shows_second_tool`; extract the two together. gxui: `interactive-tools`, `interactive-tool-wait/open/stop`. 75 commits; tip `3293319e399`. Extraction restack still not done.

**Worktree (2026-10-20).** Another session put the standing worktree (`branch/galaxy_ui_driver`) on `custom_build_from_fasta`. `galaxy_ui_driver` is checked out in `branch/galaxy_ui_driver_gxui` (shares the standing worktree's `.venv` by symlink). Run `faq_server.sh` and `gxui` with `GALAXY_ROOT`/`GXUI_GALAXY_ROOT` set to it.
