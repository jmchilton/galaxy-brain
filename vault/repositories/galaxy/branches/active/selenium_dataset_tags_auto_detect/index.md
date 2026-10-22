# selenium_dataset_tags_auto_detect

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:selenium_dataset_tags_auto_detect?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_dataset_tags_auto_detect)

## Status

Polished; ready for final review. Base `release_26.2`, head `0f23fc4cf5a`. See the [implementation debrief](implementation_debrief.md) and [polish debrief](polish_debrief.md).

No PR. [Description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md).

Fork CI green so far; Playwright, Integration and docs still running (2026-10-21).

## Scope

Missing E2E tests for 26.2, five commits:

1. `tags_add_from_button` pulls the Add Tags typing loop out of `history_panel_add_tags`, which now uses it.
2. `TestDataset._click_and_assert_success_alert` replaces the inline success-alert checks in three existing tests.
3. The Attributes tab's Auto-detect button gets `id="dataset-attributes-autodetect-metadata"` (re-scope).
4. `test_history_panel.py::test_item_name_tag_propagates_to_tool_output` tags one history item `#plus` from its Add Tags button and checks that a cat1 output inherits it. Adds `history_panel_item_add_tags` and `content_item.tag_area_button` / `tag_area_input`.
5. `test_dataset.py::test_history_dataset_auto_detect_metadata` edits a BED's comment lines, then checks that the Attributes tab's Auto-detect re-detects them. Only the Datatypes tab's Auto-detect was tested before. Adds `edit_dataset_attributes.auto_detect_metadata_button` and `metadata_input(name)`.

The version with no client change, which uses a sibling selector, is kept as [an alt](alts/original_scope.md).

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) (FAQ-loop commits "Test tagging a history item and its name tag reaching a tool output" and "Test re-detecting metadata with Auto-detect on the Attributes tab"), following [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). On restack onto a 26.2 that has this branch, drop both commits from `galaxy_ui_driver`.

Merges cleanly (`git merge-tree`) with `selenium_history_datatype_citations`, `selenium_collection_build_convert`, `selenium_apply_rules_nest_menus` and `selenium_multiview_copy`.

## Worktree

`~/projects/worktrees/galaxy/branch/selenium_dataset_tags_auto_detect/`. `.venv` and `client/node_modules` are symlinks into `galaxy_ui_driver_gxui`; never run `pnpm install` here. The client is built in place (`static/dist`). Tests use a framework-managed server.
