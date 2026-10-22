# selenium_delete_items_dataset_privacy

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:selenium_delete_items_dataset_privacy?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_delete_items_dataset_privacy)

## Status

BLOCKED on a scope decision (see [implementation debrief](implementation_debrief.md)); re-scoped and re-hardened; base `release_26.2`, head `b2722375165`.

## Scope

Missing 26.2 E2E coverage, plus the HistoryPanel bug it found (re-scoped; test-only version is [an alt](alts/original_scope.md)). Five commits:

1. **Baseline tests: Make new datasets private preference.** `test_personal_information.py::test_new_datasets_private_switch` checks that the Preferences switch persists, and that the API and the dataset Permissions tab agree on roles. Adds client test hooks (`data-description` on the switch, a Permissions tab class).
2. **`history_panel_item_delete` helper.** `test_rerun_deleted_dataset` uses it.
3. **Extract `getClientFilters` / `itemPassesFilters`** from `historyItemsStore` into `HistoryFilters.js`. Pure refactor.
4. **Fix: keep history items shown after delete/undelete/unhide if they still match the filter.** Before, with Include deleted or Include hidden on, the item vanished until the filter changed. The vitest is in `HistoryView.test.js`, red before the fix.
5. **E2E:** trash button, Selection > Delete and Delete (permanently), Include deleted, Undelete, and Unhide under Include hidden.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) (FAQ-loop commits `d0d92741f74`, `ea0bc576e38`) per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). `53ab472b46d` (`edit_dataset_auto_detect_datatype`) left behind: gxui-only motivation and it conflicts with #24347's rewrite of the same lines. On restack onto a 26.2 that has this branch, drop `d0d92741f74` and `ea0bc576e38` by subject; `d0d92741f74`'s helper now lands via "Add history_panel_item_delete helper" (patches differ: hardened, and 26.2's `history_panel_muli_operation_select_hid` spelling).

Merges cleanly (`git merge-tree`) with `selenium_history_datatype_citations`, `selenium_dataset_tags_auto_detect`, `selenium_collection_build_convert`, `selenium_apply_rules_nest_menus`, `selenium_multiview_copy`.

## Worktree

`~/projects/worktrees/galaxy/branch/selenium_delete_items_dataset_privacy/`. `.venv` and `client/node_modules` are symlinks into `galaxy_ui_driver_gxui`; never run `pnpm install` here. Client built in place. Tests use a framework-managed server.
