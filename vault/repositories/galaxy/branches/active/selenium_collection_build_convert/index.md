# selenium_collection_build_convert

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:selenium_collection_build_convert?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_collection_build_convert)

## Status

Hardening in progress. Base `release_26.2`. See [initial implementation debrief](initial_implementation_debrief.md).

No PR.

No CI yet.

## Scope

E2E coverage for collection building and editing, framed as missing tests for 26.2. Base `release_26.2` (John, 2026-10-21). Three commits:

1. `test_collection_builders.py::test_build_list_keep_extensions`: Auto Build List with "Remove file extensions?" off keeps `.fasta`. Adds `list_wizard.remove_extensions` and `collection_builder_toggle_remove_extensions`.
2. `test_collection_edit.py::test_convert_datatype_simple_list`: first E2E collection conversion. Change-datatype steps move into `NavigatesGalaxy.collection_edit_change_datatype`; adds `collection_edit_convert` and `history_panel_collection_edit(hid)`, which clicks that collection's pencil instead of the panel's first `.edit-btn`.
3. `test_collection_builders.py::test_build_list_advanced_rename_element`: Advanced Build List > Flat List, renames an element. Adds `list_wizard.element_name`/`element_name_input` and `collection_builder_rename_element`.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) (FAQ-loop commits "Test building a list that keeps file extensions", "Test converting a collection's datatype from its edit view", "Test renaming an element in the advanced flat list builder") per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). On restack onto a 26.2 that has this branch, drop all three from `galaxy_ui_driver`.

Touches `test_collection_edit.py` next to [`selenium_history_datatype_citations`](../selenium_history_datatype_citations/index.md); the two merge cleanly.

## Worktree

`~/projects/worktrees/galaxy/branch/selenium_collection_build_convert/`.
- `.venv` and `client/node_modules` are symlinks into `galaxy_ui_driver` / `galaxy_ui_driver_gxui`. Never `pnpm install` here.
- The client is built in place (`static/dist`). Tests use a framework-managed server; another session holds 8080.
