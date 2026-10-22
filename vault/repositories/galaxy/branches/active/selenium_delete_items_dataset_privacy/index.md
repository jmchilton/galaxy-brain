# selenium_delete_items_dataset_privacy

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:selenium_delete_items_dataset_privacy?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_delete_items_dataset_privacy)

## Status

Implemented and hardening; base `release_26.2`.

## Scope

Missing E2E tests for 26.2, three commits:

0. Refactor: `history_panel_item_delete` helper; `test_tool_form`'s rerun test uses it.
1. `test_history_panel.py::test_delete_undelete_and_purge_items`: trash button, Selection > Delete, Selection > Delete (permanently), Include deleted, Undelete. Adds `history_panel_item_undelete`, `history_panel_delete_selected`, `history_panel_include_deleted`, `content_item.undelete_button`, `history_panel.include_deleted_button`.
2. `test_personal_information.py::test_new_datasets_private_switch`: Preferences > Set Dataset Permissions for New Histories switch and the dataset Permissions tab. Adds `user_preferences_new_datasets_private`, `user_preferences_set_new_datasets_private`, `edit_dataset_permission_roles` and their components.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) (FAQ-loop commits `d0d92741f74`, `ea0bc576e38`) per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). `53ab472b46d` (`edit_dataset_auto_detect_datatype`) left behind: gxui-only motivation and it conflicts with #24347's rewrite of the same lines. On restack onto a 26.2 that has this branch, drop `d0d92741f74` and `ea0bc576e38` by subject; `d0d92741f74`'s helper now lands via "Add history_panel_item_delete helper" (patches differ: hardened, and 26.2's `history_panel_muli_operation_select_hid` spelling).

Merges cleanly (`git merge-tree`) with `selenium_history_datatype_citations`, `selenium_dataset_tags_auto_detect`, `selenium_collection_build_convert`, `selenium_apply_rules_nest_menus`, `selenium_multiview_copy`.

## Worktree

`~/projects/worktrees/galaxy/branch/selenium_delete_items_dataset_privacy/`. `.venv` and `client/node_modules` are symlinks into `galaxy_ui_driver_gxui`; never run `pnpm install` here. Client built in place. Tests use a framework-managed server.
