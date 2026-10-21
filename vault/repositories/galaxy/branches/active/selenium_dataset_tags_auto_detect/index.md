# selenium_dataset_tags_auto_detect

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:selenium_dataset_tags_auto_detect?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_dataset_tags_auto_detect)

## Status

In progress. Base `release_26.2`.

No PR.

No CI yet.

## Scope

Missing E2E tests for 26.2, two commits:

1. `test_history_panel.py::test_item_name_tag_propagates_to_tool_output` tags one history item `#plus` from its Add Tags button and checks a cat1 output inherits the tag. Adds `history_panel_item_add_tags`, `content_item.tag_area_button` / `tag_area_input`, and `tags_add_from_button`, now shared with `history_panel_add_tags`.
2. `test_dataset.py::test_history_dataset_auto_detect_metadata` edits a BED's comment lines, then checks the Attributes tab's Auto-detect re-detects them. Before this, only the Datatypes tab's Auto-detect had a test. Adds `edit_dataset_attributes.auto_detect_metadata_button` (a sibling selector, no client change) and `metadata_input(name)`.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) (FAQ-loop commits "Test tagging a history item and its name tag reaching a tool output" and "Test re-detecting metadata with Auto-detect on the Attributes tab"), per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). On restack onto a 26.2 that has this branch, drop both commits from `galaxy_ui_driver`.

## Worktree

`~/projects/worktrees/galaxy/branch/selenium_dataset_tags_auto_detect/`. `.venv` and `client/node_modules` are symlinks into `galaxy_ui_driver_gxui`; never run `pnpm install` here. The client is built in place (`static/dist`). Tests use a framework-managed server.
