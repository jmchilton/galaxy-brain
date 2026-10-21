# selenium_history_datatype_citations

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:selenium_history_datatype_citations?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_history_datatype_citations)

## Status

Implemented, hardening in progress; head `adea322053b`.

No PR.

No CI yet.

## Scope

E2E coverage for two pages that had none, framed as missing tests for 26.2. Base `release_26.2` (John, 2026-10-21).

- `test_history_panel.py::test_change_datatype_of_selected_items`: Selection menu > Change data type on two datasets. Adds a `data-description` on the modal, `history_panel.multi_operations.change_datatype_modal`, `history_panel_change_datatype_of_selected` (via `select_set_value`), and `history_panel_wait_for_hid_datatype`, which `test_collection_edit.py` now uses too.
- `test_history_options.py::test_export_tool_references`: History options > Export Tool References, both tabs. Adds `data-description`s on the menu item and APA/BibTeX tabs, a `citations` component, and `click_history_option_tool_references`. Expected references come from the history citations and configuration APIs, not hard-coded Galaxy citation text.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) (FAQ-loop commits "Test changing the data type of selected history items", "Test exporting a history's tool references") per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). Drop them from `galaxy_ui_driver` when it restacks onto a 26.2 that has them. This branch reworked both after review, so the `galaxy_ui_driver` copies differ.

## Worktree

`~/projects/worktrees/galaxy/branch/selenium_history_datatype_citations/`. `.venv` and `client/node_modules` are symlinks into `galaxy_ui_driver` / `galaxy_ui_driver_gxui`; client built in place (`static/dist`).
