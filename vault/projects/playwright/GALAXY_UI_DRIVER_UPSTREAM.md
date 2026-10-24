# galaxy_ui_driver upstreaming

Long-running task (John, 2026-10-09): break `galaxy_ui_driver` down and land its Galaxy fixes in
dev. Replaces the old "decide what to pull out at the end" rule.

## Rules

- Each PR comes off dev and holds one theme from the commits below the gxui tip.
- Prefer PRs that grow E2E coverage. A fix or abstraction lands with a Selenium/Playwright test
  that uses it, so the suite becomes its regression test and the PR has a non-gxui motivation.
- **`galaxy_ui_driver` sits on `release_26.2` for now** (John, 2026-10-20). It drives 26.2 QA,
  so its `navigation.yml` has to match the release. Once a PR merges, restack onto
  `release_26.2` and drop its commits if 26.2 has them. A dev-only merge keeps its commit, as
  #24139 does. gxui stays the tip.
- **The final gxui PR targets dev.** Rebase onto dev before opening it.
- Commits only gxui motivates (CDP port, storage state) go up with gxui. They don't get
  separate PRs.
- Branch records, PR descriptions and opening follow `vault/agents/gx_branches/`.

## Breakdown (John, 2026-10-09)

Easiest first. Commit numbers follow the queue in `GALAXY_UI_SKILL_DESIGN.md` ("Prerequisite
PRs").

**1. Two standalone fixes, in parallel.** Both merged: [#24142](https://github.com/galaxyproject/galaxy/pull/24142)
and [#24139](https://github.com/galaxyproject/galaxy/pull/24139). The 2026-10-20 rebase onto `release_26.2`
dropped #24142's commit. #24139's commit stays because it is on dev only.
[`tool_open_tool_shed_ids`](../../repositories/galaxy/branches/merged/tool_open_tool_shed_ids/index.md),
[`playwright_timeout_retry_once`](../../repositories/galaxy/branches/merged/playwright_timeout_retry_once/index.md).
- **Tool Shed ids in `tool_open`** (4a). A real tool panel bug: searching by a Tool Shed id finds
  nothing. The `tools_list` card selectors (invalid CSS for a Tool Shed id) were folded in on
  2026-10-11. Tested by vitest and by `integration_selenium` E2E tests that install a real Tool Shed
  tool, in the same way `test_workflow_repository_tool_update.py` already does.
- **Retry a Playwright timeout once** (7b). Its own PR because it changes timing for every
  caller of `retry_call_during_transitions`. A stuck Playwright action now fails after 2 action
  timeouts, not 12. The PR says upfront that it partly reverts `2825bb09e42` ("Try to fix transiently failing
  test?", 2026-03-22), which made Playwright timeouts retryable. That commit's CI run is gone and
  John isn't worried about the flake returning: the change justifies itself.

**2. Coverage PRs.** Implemented 2026-10-20 on `release_26.2`: John wants them in the release, framed
as missing tests (a bug). Each brings the fixes its test needs, tests green under both backends
and red without each fix. Queued in `MY_BRANCHES.md`; no PRs yet.

| Branch | Commits | Coverage added |
|---|---|---|
| [`workflow_editor_run_cancel`](../../repositories/galaxy/branches/active/workflow_editor_run_cancel/index.md) | 4b, 7h, 7j | run from the editor's Run activity, pick a non-default dataset in the simplified run form, cancel |
| [`workflow_open_exact_title`](../../repositories/galaxy/branches/merged/workflow_open_exact_title/index.md) | 7c, 7g | open and run a workflow whose title prefixes a newer one's |
| [`workflow_editor_second_subworkflow`](../../repositories/galaxy/branches/merged/workflow_editor_second_subworkflow/index.md) | 7d | insert two subworkflows from the editor's Workflows panel |

- **7i moved to step 4.** On 26.2 the list search opens `X: Y`, `X:Y` and `tag:Y` titles without
  it (dev's `filtering.ts` is the same); it only works around test.galaxyproject.org's older client.
- **Follow-up.** `workflow_run_setup_inputs` drops `type: File` inputs, so existing
  `workflow_run_specify_inputs` callers select nothing and pass on the form's preselected dataset.

**3. Area PRs.** Implemented 2026-10-20 on `dev` (enhancements, so not 26.2). New tests are
green under both backends and red without their change. Queued in `MY_BRANCHES.md`; no PRs yet.

| Branch | Commits | Tests |
|---|---|---|
| [`selenium_tool_form_helpers`](../../repositories/galaxy/branches/active/selenium_tool_form_helpers/index.md) | 6a, 6a′, 6b, 6c, 7a, 7e, 7f | new E2E: fill an editor step's form (7a), describe a rerun form (6c); `test_tool_form.py` 29/29 |
| [`selenium_multiview_copy`](../../repositories/galaxy/branches/active/selenium_multiview_copy/index.md) | 4c, 5e | 5e's copy E2E, red without 4c's hooks; Multiview file green |
| [`selenium_standalone_package`](../../repositories/galaxy/branches/active/selenium_standalone_package/index.md) | 5a, 5b, 5c, 5d, 7k, 7l, 7n + consumer | `GalaxySeleniumContext` includes `UsesUploadActivity`; new E2E uploads through a standalone context; upload/extraction spot checks |

- The consumer commit drops every test class's own `UsesUploadActivity` mixin (MRO), and 7k
  picked up dev's newer `test_workbook_mapping.py` import. gxui's `GxuiContext` can drop its mixin
  once this merges.
- These merge to dev only, so their commits stay on `galaxy_ui_driver` until it restacks onto a
  base that has them.

FAQ-loop commits ([HARDEN_AGAINST_FAQ.md](HARDEN_AGAINST_FAQ.md)) land below gxui too. So far:
- `baa2c07eaf7`: a docstring on `NavigatesGalaxy.register` (`inspect.getdoc` showed
  `ABC.register`'s). Fold it into the `galaxy.selenium` PR.
- `2c99b9abcfd`: coverage for `account_create`. It adds `register(via_masthead=True)`, an
  `inactivity_box` component and `test_user_activation.py` (register, banner, resend, activate). A
  standalone coverage PR candidate, like step 2. It is green under Playwright only so far.
- `861c6136d84`: coverage for `activity_bar_how_to_enable`. `test_activity_bar.py` hides and shows
  an activity from the More panel; adds `activity_bar` components. Coverage PR candidate; green under
  Playwright only.
- `f4918b8d62d`: renames `preferences.activity` to `activity_bar.more`. It edits
  `upload_activity_helpers.py`, which `eafc0dae2e6` creates, so it goes with the `galaxy.selenium`
  PR, or with `861c6136d84` if that lands first, touching the older caller.
- `107c3b899f8`: coverage for `analysis_add_custom_build`. `test_custom_builds.py` makes a build
  from a history fasta; adds `custom_builds` components, and `len`/`linecount` plus the
  `fasta -> len -> linecount` converters to the framework datatypes. Coverage PR candidate. Green
  under Playwright only; `test_datatypes.py` API tests still pass.
- `0ae9e0dba9d`: `tool_form_fill` switches a dataset field to collection mode for a collection hid
  and fails when the selection doesn't land (was a silent no-op). Test in `test_tool_form.py`, red
  without the fix. `tool_form_fill` came from 6a, so this goes with `selenium_tool_form_helpers`.
- `e8be936ba74`: coverage for `analysis_jobs_not_running`. `test_user_activation.py` checks that an
  inactive user's upload fails with "Action requires account activation."; adds
  `upload_activity.progress_row_error(row)` and the `UsesUploadActivity` mixin on that class. Goes
  with `2c99b9abcfd`.
- `b75d7100d6f`: coverage for `analysis_troubleshooting`. `test_dataset_error_report.py` opens a red
  dataset's error page from its bug icon and submits a report (mock SMTP + `error_email_to`); adds
  `dataset_error`, `email_report` and `content_item.error_button` components, an
  `email-report-result` class on `EmailReportForm`'s result alert, and two helpers. Coverage PR
  candidate; green under Playwright only.
- `42209a18086`: coverage for `bulk_change_datatype`. `test_history_panel.py` changes two selected
  datasets' data type from the Selection menu; adds a `data-description` on the modal, a
  `multi_operations.change_datatype_modal` component and `history_panel_change_datatype_of_selected`.
  Extracted with `424a8a9ec90` into
  [`selenium_history_datatype_citations`](../../repositories/galaxy/branches/active/selenium_history_datatype_citations/index.md)
  (`release_26.2`, 2026-10-21), widened to Change Database/Build through a shared `operation_modal` /
  `history_panel_change_selected`. On restack, drop both commits and point gxui's
  `history-change-datatype` verb at the new helper.
- `424a8a9ec90`: coverage for `cite-tools-used-in-a-history`. `test_history_options.py` opens
  History options > Export Tool References and checks both tabs; adds `data-description`s on the
  menu item and tabs, a `citations` component and `click_history_option_tool_references`. In
  `selenium_history_datatype_citations` (see above).
- `2840bad41aa`: coverage for `collections_autobuild_list`. `test_collection_builders.py` builds a
  list with "Remove file extensions?" off and checks identifiers keep `.fasta`; adds a
  `list_wizard.remove_extensions` component and `collection_builder_toggle_remove_extensions`.
  Coverage PR candidate; green under Playwright only, red without the toggle.
- `9bd925d19a1`: renames `history_panel_muli_operation_select_hid` to `..._multi_...` (3 callers).
  Goes with whichever PR lands `42209a18086`'s caller, or alone.
- `ad16fdd6a66`: coverage for `collections_convert_datatype` (and `collections_change_datatype`).
  `test_collection_edit.py` converts a fasta list with "Convert FASTA to Tabular"; adds convert-tab
  components, `collection_edit_convert`, and moves the test's change-datatype steps into
  `collection_edit_change_datatype`. `history_panel_collection_edit(hid)` replaces the bare
  `.edit-btn` `collection_menu_edit_attributes`, which relied on the collection being the first item. Adds
  `history_wait_for_new_collection(after_hid)` (also used by `bd01a6af21b` and gxui). Coverage
  PR candidate; green under Playwright only (file 3/3).
- `42335f0f1d8`: coverage for `collections_build_list`. `test_collection_builders.py` builds a list
  through Advanced Build List > Flat List and renames an element; adds `list_wizard.element_name`/
  `element_name_input` and `collection_builder_rename_element`. Pairs naturally with `2840bad41aa`.
  Green under Playwright only.
- `2840bad41aa`, `ad16fdd6a66` and `42335f0f1d8` were extracted into
  [`selenium_collection_build_convert`](../../repositories/galaxy/branches/active/selenium_collection_build_convert/index.md)
  (`release_26.2`, 2026-10-21). It also adds a refactor commit and a fix for Convert Collection always
  being enabled. On restack, drop all three by subject; the convert commit's patch differs.
- `bd01a6af21b`: coverage for `collections_force_mapping_over`. `test_tool_form.py` nests a list with
  Apply rules through the Column > Basename and column definition menus (other Apply rules tests set
  the rule source JSON), then checks Sort collection maps over the `list:list`. Adds
  `rule_builder_add_column_basename`. Needs `ad16fdd6a66`'s `history_wait_for_new_collection`.
  Extracted into
  [`selenium_apply_rules_nest_menus`](../../repositories/galaxy/branches/active/selenium_apply_rules_nest_menus/index.md)
  (`release_26.2`, 2026-10-21; green under both backends). It carries its own byte-identical copy of the wait
  helper and widens to baseline asserts on the GTN rules examples plus a column-selector target for the
  single-column rule builder helpers. On restack, drop the commit.
- `639d18429fa`: coverage for `datasets_add_tag`. `test_history_panel.py` tags an expanded dataset
  `#plus` from its Add Tags button, then checks a cat1 output shows `#plus`. Adds
  `history_panel_item_add_tags` and `content_item.tag_area_button` / `tag_area_input` (same names as
  `history_panel.*`). Green under Playwright and Selenium. Standalone.
- `a7669dbb0be`: coverage for `dataset_tool_errors_metadata`. `test_dataset.py` edits a BED's comment
  lines, then checks the Attributes tab's Auto-detect re-detects them (only the Datatypes tab's was
  tested). Adds `edit_dataset_attributes.auto_detect_metadata_button` (sibling selector, no client
  change) and `metadata_input(name)`. Green under Playwright and Selenium. Standalone.
- `639d18429fa` and `a7669dbb0be` were extracted together into
  [`selenium_dataset_tags_auto_detect`](../../repositories/galaxy/branches/active/selenium_dataset_tags_auto_detect/index.md)
  (`release_26.2`, 2026-10-21, green under both backends). It shares the tag loop as
  `tags_add_from_button` and adds a success-alert helper. It also gives the Attributes tab's
  Auto-detect button an id, so `auto_detect_metadata_button` targets
  `#dataset-attributes-autodetect-metadata`; the alt branch keeps the sibling selector. On restack, drop both by
  subject.
- `24fa0702f6d`: coverage for `datasets_change_datatype`. `test_dataset.py` sets a txt dataset to
  `bed` from the Datatypes tab's New Type and Save (only Auto-detect, the Selection menu and the
  collection view were tested). Adds `edit_dataset_datatype` and
  `edit_dataset_attributes.datatype_save_button` (Auto-detect's previous sibling; a client id would be
  cleaner, as on `selenium_dataset_tags_auto_detect`). Green under Playwright and Selenium. Standalone.
- `f0f2a98992e`: coverage for `datasets_create_new_file`. `test_upload_activity.py` pastes
  space-separated text with the row's Spaces→Tabs ticked and checks the tabs and 3 columns. Adds
  `UploadMetadata` `space_to_tab`, `UploadItem.set_space_to_tab` and
  `upload_activity.row_space_to_tab_checkbox`/`_label` (by title; a client test id would be cleaner).
  Green under Playwright and Selenium. Standalone.
- `b1ebdb7b94c`: coverage for `datasets_convert_datatype`. `test_dataset.py` converts a tsv to csv from
  the Datatypes tab's Convert to Datatype (only the collection view's Convert tab was tested). Adds
  `edit_dataset_convert` and `edit_dataset_attributes.conversion_dropdown`, `conversion_option`,
  `convert_button`. Green under Playwright and Selenium. Standalone.
- `f40b5bf8832` (from `galaxy_ui_driver_editor_refs`, folded in 2026-10-22): `tool_open` searches a
  Tool Shed tool by its short id, which older servers' panel search (test.galaxyproject.org) matches;
  the link is still picked by full id. Follows the merged `tool_open_tool_shed_ids`. Touches every
  test that opens a tool; `test_tool_form.py` spot check green under Playwright. Ask John before
  upstreaming: it only helps older servers.
- `2e597420f5f` (same fold-in): one-line docstrings on the `NavigatesGalaxy` methods gxui verbs back
  onto (incl. `edit_dataset_dbkey`, `workflow_editor_remove_node`, `workflow_editor_destroy_connection`,
  `make_history_private`). gxui's REGISTRY test requires them. Goes with the gxui PR.
  When `galaxy_ui_driver_editor_refs` merges, don't drop this by subject: it differs from their
  `c5e788cad37` by those four docstrings. Keep them or the REGISTRY test fails on four verbs.
- `cac01c0884a`: coverage for `datasets_deleting`. `test_history_panel.py` deletes an item by its
  trash button, deletes and purges from the Selection menu (with the confirm), then undeletes after
  Include deleted; none had E2E. Adds `history_panel_item_delete`/`_undelete`,
  `history_panel_delete_selected(purge)`, `history_panel_include_deleted`,
  `content_item.undelete_button`, `history_panel.include_deleted_button`. Green under Playwright and
  Selenium. Standalone.
- `961cab38f9f`: `edit_dataset_auto_detect_datatype`, lifted from
  `test_history_dataset_auto_detect_datatype` (`datasets_detect_datatype`) for gxui. Small refactor;
  goes with the gxui PR or a dataset-helpers PR.
- `e4bca1128c1`: coverage for `datasets_data_privacy_features`. `test_personal_information.py`
  registers a user, turns Make new datasets private off and on, and checks a new history's dataset's
  access roles through the API and the Permissions tab. Neither page was tested, and 26.2 flips the
  default to private. Adds `user_preferences_set_new_datasets_private`, `edit_dataset_permission_roles`
  and preferences/permissions selectors (the switch by `name`; a client test id would be cleaner).
  Green under Playwright and Selenium. Coverage PR candidate for 26.2.
- `cac01c0884a` and `e4bca1128c1` were extracted into
  [`selenium_delete_items_dataset_privacy`](../../repositories/galaxy/branches/active/selenium_delete_items_dataset_privacy/index.md)
  (`release_26.2`, 2026-10-22). It was hardened and re-scoped to fix a HistoryPanel bug the delete
  test found: undelete or unhide under Include deleted/hidden hid the item. It also adds client test
  hooks for the privacy selectors and its own `history_panel_item_unhide`, `history_panel_include_hidden`
  and `include_hidden_button`, which overlap `073889a2872`. `961cab38f9f` stays here. On restack, drop
  both commits by subject and reconcile `073889a2872` with the new helpers. Parked on a scope decision.
- `073889a2872`: coverage for `datasets_hidden`. `test_history_panel.py` hides two items from the
  Selection menu (with the confirm) and unhides one after Include hidden; neither had E2E. Hide,
  unhide, delete, undelete and purge share one confirm, so `history_panel_delete_selected`'s body
  becomes `history_panel_confirm_selected_operation(option)`. Adds `history_panel_hide_selected(unhide)`,
  `history_panel_include_hidden`, `history_panel.include_hidden_button`. Needs `cac01c0884a`; ship
  them together. Green under Playwright and Selenium.
- `1c8ea1d9a31`: coverage for `datasets_download_datasets` and `datasets_download_using_command_line`.
  `test_dataset.py` checks the Download href and the Copy Link clipboard are the same
  `/api/datasets/{id}/download` link. Adds `content_item.copy_link_button` (by `aria-label`; a client
  test id would be cleaner) and `history_panel_item_copy_link`. Standalone.
- `54bddee5432`: coverage for `datasets_finding_datasets`. New `test_datasets_list.py`: a fresh user's
  datasets from two histories, latest first, then the name search. Adds the `datasets` component,
  `navigate_to_datasets_list`, `datasets_list_rows`, `datasets_list_search`. Standalone.
- `32e12d33af7`: coverage for `datasets_icons`. `test_history_related_filter` checks a second Show
  Related Items click clears the filter. Adds `history_panel_item_show_related` and
  `history_panel_filter_text`. Standalone.
- `162dfdb49b4`: helper bug (`datasets_import_via_link`). `start_for_uploaded_hids` counted one hid
  per file for a collection upload. The bug predates the branch (upstream's private
  `_start_and_wait_for_uploaded_hids`), so this needs 394738015d8's rename, or a rebased copy.
  `test_upload_pair` asserts `[1]`.
- `14d970513f5`: helper bug (`datasets_import_from_remote_files`). `stage_remote_file(s)` searches for
  each file, so paged sources work. Adds `upload_activity.remote_files_search`. Standalone.
- `1d227e6fc4c`: **client bug fix**, also in 26.1. Library "Add to History > as a Collection" ignored
  Select history. `useCollectionCreation` now takes the creator's `historyId`, and the dialog makes
  the picked history current. Red-to-green E2E plus a vitest. Standalone. A candidate for a
  release-branch PR.
- `913dfd7dfd6`: coverage for `datasets_import_from_data_library`. Adds
  `test_add_datasets_to_selected_history`, the `libraries_folder_*` helpers, and the
  `import_to_history_select` and `selected_dataset_row` nav entries. Standalone.
- `c184ed00be2`: coverage for `datasets_job_status`.
  - Adds `test_resume_paused_job`, `click_history_option_resume_paused_jobs` and
    `data-description="resume paused jobs"` (a client change).
  - Needs `history_panel_include_deleted` and `history_panel_item_undelete` from
    `selenium_delete_items_dataset_privacy`, so it lands after that branch or is rebased onto it.
- `0cf8353fc84`: coverage for `datasets_purging_datasets`.
  - Adds `test_purge_deleted_datasets_from_storage_dashboard`,
    `storage_dashboard_purge_deleted_datasets`, the `storage_dashboard.cleanup` nav entries and a
    `data-description` on the cleanup cards (a client change).
  - Standalone.
- `c184ed00be2` and `0cf8353fc84` were extracted together into
  [`selenium_resume_paused_purge_deleted`](../../repositories/galaxy/branches/active/selenium_resume_paused_purge_deleted/index.md)
  (`release_26.2`, 2026-10-23). It differs from the source commits in three ways:
  - The paused-job test undeletes through the API, so it doesn't depend on
    `selenium_delete_items_dataset_privacy`.
  - It was re-scoped: `storage_dashboard_cleanup(operation)` replaces
    `storage_dashboard_purge_deleted_datasets`, and a test for the deleted and archived histories
    cleanups was added.
  - It adds `navigate_to_storage_dashboard`.

  On restack, drop both commits by subject and rebind gxui's `datasets-purge-deleted` to
  `storage_dashboard_cleanup("deleted_datasets")`.
- `77ebe032746`: helper fix (`datasets_undelete`). `history_panel.search` never became visible and
  had no callers. It now targets the filter text input; adds `history_panel_filter(text)`, used by
  `history_panel_filter_text` and `test_collection_builders._show_hidden_content`. Standalone, but
  `history_panel_filter_text` comes from `32e12d33af7`.
- `28eb02432cd`: coverage for `datasets_undelete`. `test_delete_undelete_and_purge_items` filters
  `deleted:true` and undeletes from the Selection menu; adds `history_panel_undelete_selected`. Needs
  `77ebe032746` and the delete test (`selenium_delete_items_dataset_privacy`).
- `391dd82665d`: coverage for `datasets_unhidden`. `test_hide_and_unhide_items` filters
  `visible:hidden` and clicks the item's Unhide icon. Its `history_panel_item_unhide` and
  `content_item.unhide_button` are identical to `selenium_delete_items_dataset_privacy`'s, so drop
  them when reconciling. Needs `073889a2872`.
- `de467e6fcb9`: helper abstraction (`datasets_upload_from_genomeark`). `open_remote_folder(source,
  path)` and `path=` on `stage_remote_file(s)`; waits out the debounced search before clicking a
  folder. `test_upload_from_remote_file_source_folder`. Needs `14d970513f5`.
- `bcaec710b18`: **client regression fix**, 26.2 only (`datasets_upload_ftp`). Choose Remote Files
  dropped `FilesDialog`'s FTP server notice. Adds the shared `FtpUploadHelp.vue` and
  `test_ftp_directory_shows_upload_site`; queued as `gx_issues/to_file/remote_files_upload_ftp_help_missing.md`.
  Uses `de467e6fcb9`'s `open_remote_folder`. A `release_26.2` PR candidate.
- `0cd9f75f9d1`: client fix (`datasets_upload_from_genomeark`): long remote file names wrap instead of
  running under Details. CSS only; queued as `remote_files_upload_long_names_overlap.md`. Standalone,
  and a `release_26.2` PR candidate.
- Batch 7 (`77ebe032746`, `28eb02432cd`, `391dd82665d`, `de467e6fcb9`, `bcaec710b18`, `0cd9f75f9d1`)
  and the prerequisites `14d970513f5` and `073889a2872` were extracted together into
  [`selenium_history_filters_ftp_notice`](../../repositories/galaxy/branches/active/selenium_history_filters_ftp_notice/index.md)
  (2026-10-23). It is stacked on #24380 and goes onto `release_26.2` once that merges. It differs from
  the source commits:
  - Helpers that duplicate #24380's are dropped, the tests are rewritten in #24380's style, and the
    FTP and long-name fixes both have red-to-green E2E tests.
  - It was re-scoped. `FtpUploadHelp` takes `uri` and skips the log-in sentence when no
    `ftp_upload_site` is set. The data library browser (library and item names) gets the same wrap,
    through an `upload-browser-label` mixin.

  On restack, drop all eight commits by subject.
- `865d70395e8`: coverage for `datasets_upload` (batch 8). `set_file_input` takes a list;
  `stage_local_files` picks several files in one chooser selection; `test_upload_files_from_one_selection`.
  Standalone.
- `3dfeb7f18a2`: coverage for `datatypes_understanding_datatypes` (batch 9). `tool_form` data-input
  accepted formats selectors, `tool_form_accepted_formats`, `test_data_parameter_accepted_formats`.
  Standalone.
- `bcabe015080`: coverage for `datatypes_tabular` (batch 9). Attributes tab field reader
  `edit_dataset_attribute_fields`, `edit_dataset_set_metadata_select`,
  `test_history_dataset_assign_interval_columns`. Standalone.
- `7ee70847cf8`: coverage for `histories_archive` (batch 10). Archive selectors,
  `history_panel_archive`, `navigate_to_archived_histories`, `test_history_archive.py`. Standalone.
- `316dbcf7610`: coverage for `histories_import` (batch 11). `history_view` import selectors,
  `navigate_to_history_view`, `history_view_import`, `test_import_shared_history`. Standalone.
- `4dc3afa5d26`: coverage for `histories_find_purge` (batch 11). `histories.select_all`,
  `bulk_purge_button`, `histories_purge_all`, `TestHistoriesPurge`. Standalone.

**4. gxui** with 2 (CDP port), 7m (storage state) and 7i (colon-free workflow search).

## Starting a PR

- Pick the commit off the current `galaxy_ui_driver` by subject; hashes change on every restack.
- Branch off a freshly fetched `origin/dev` and cherry-pick it there. Re-run its tests on the new
  base.
- Step 1 branches: `tool_open_tool_shed_ids` (4a, "Let tool_open find Tool Shed tools by id") and
  `playwright_timeout_retry_once` (7b, "Retry a Playwright timeout once during transitions, not
  ten times"). Neither needs an E2E run, so a per-branch worktree under `WORKTREES.md` is fine.
- Hand off per `vault/agents/_shared/GX_IMPLEMENTATION_HANDOFF.md`: branch record, a
  `MY_BRANCHES.md` line, push to `jmchilton`. Note in the record that the commit comes from
  `galaxy_ui_driver` and gets dropped from it on merge.

## Open questions

- Is the standalone-selenium PR too big? 7k alone moves about 1,000 lines.
