# selenium_collection_build_convert

- [PR #24341](https://github.com/galaxyproject/galaxy/pull/24341)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_collection_build_convert)

## Status

Head `5b3d5f87c6b` (rebased onto `release_26.2` 2026-10-27, mvdbeek review 1 addressed, see [response](review_response_mvdbeek_1.md)); approved by mvdbeek. See [PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md), [polish debrief](polish_debrief.md), [implementation debrief](implementation_debrief.md), [rescope debrief](implementation_rescope_debrief.md), original scope [alt](alts/original_scope.md).

PR CI reds diagnosed unrelated 2026-10-22: Integration Selenium `test_user_file_source_ftp.py::test_create_and_use` fails across unrelated PRs 2026-10-21 (certifi, dependabot, oidc, backport-xdist); Mulled/Integration exit 100: apptainer PPA 503 in apt setup, tests never ran; failed jobs rerun. Playwright, other Integration Selenium tests, tool-form harness and linting green.

## Scope

E2E coverage for collection building and editing, framed as missing tests for 26.2, plus the converter fix the convert test turned up. Base `release_26.2` (John, 2026-10-21). Five commits:

1. Refactor: `history_panel_collection_edit(hid)` clicks that collection's pencil instead of the panel's first `.edit-btn`; change-datatype steps move into `NavigatesGalaxy.collection_edit_change_datatype`.
2. `test_collection_builders.py::test_build_list_keep_extensions`: Auto Build List with "Remove file extensions?" off keeps `.fasta`. Adds `list_wizard.remove_extensions` and `collection_builder_toggle_remove_extensions`.
3. `test_collection_edit.py::test_convert_datatype_simple_list`: first E2E collection conversion. Adds `collection_edit_convert` and `history_wait_for_new_collection`.
4. `test_collection_builders.py::test_build_list_advanced_rename_element`: Advanced Build List > Flat List, renames an element. Adds `list_wizard.element_name`/`element_name_input` and `collection_builder_rename_element`.
5. Fix: `SuitableConvertersTab.vue`'s Convert Collection button was always enabled (`selectedConverter == {}`); now disabled until a converter is selected. Red → green under Playwright.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) (FAQ-loop commits "Test building a list that keeps file extensions", "Test converting a collection's datatype from its edit view", "Test renaming an element in the advanced flat list builder") per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). On restack onto a 26.2 that has this branch, drop all three from `galaxy_ui_driver` by subject. The convert commit's patch differs from gxui's, so patch-id matching won't drop it.

Touches `test_collection_edit.py` next to [`selenium_history_datatype_citations`](../selenium_history_datatype_citations/index.md); the two merge cleanly.

## Worktree

`~/projects/worktrees/galaxy/branch/selenium_collection_build_convert/`.
- `.venv` and `client/node_modules` are symlinks into `galaxy_ui_driver` / `galaxy_ui_driver_gxui`. Never `pnpm install` here.
- The client is built in place (`static/dist`). Tests use a framework-managed server; another session holds 8080.
