# selenium_history_datatype_citations

- [PR #24329](https://github.com/galaxyproject/galaxy/pull/24329)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_history_datatype_citations)

## Status

Polished; opened as draft on John's request, waiting on CI; head `c277d04f05d`. See [PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md), [polish debrief](polish_debrief.md), [implementation debrief](implementation_debrief.md), [rescope debrief](implementation_rescope_debrief.md), original scope [alt](alts/original_scope.md).

Draft [#24329](https://github.com/galaxyproject/galaxy/pull/24329), title "[26.2] Add browser tests for bulk Change data type, Change Database/Build and Export Tool References", labels `kind/enhancement`, `area/testing/selenium`.

PR CI on `c277d04f05d` queued (no reds on `50dc4ccb773`, which differs only in assert messages). Locally, every new test passes under both Playwright and Selenium.

## Scope

E2E coverage for three pages that had none, framed as missing tests for 26.2. Base `release_26.2` (John, 2026-10-21). Four commits:

1. `history_panel_wait_for_hid_datatype` helper; `test_collection_edit.py` uses it.
2. `test_history_panel.py::test_change_datatype_of_selected_items`: Selection menu > Change data type. Adds a `data-description` hook on the modal, a generic `history_panel.multi_operations.operation_modal` (keyed by the menu item's data-description) and `history_panel_change_selected(operation, value)`.
3. `test_change_dbkey_of_selected_items`: Selection menu > Change Database/Build. Adds a modal hook and `history_panel_wait_for_hid_dbkey`.
4. `test_history_options.py::test_export_tool_references`: History options > Export Tool References, both tabs. Adds hooks on the menu item and tabs, a `citations` component and `click_history_option_tool_references`. Expected references come from the history citations and configuration APIs.

Red → green: every new test times out without its Vue hook and passes with it.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) (FAQ-loop commits "Test changing the data type of selected history items", "Test exporting a history's tool references") per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md).
- On restack onto a 26.2 that has this branch, drop both commits from `galaxy_ui_driver`.
- gxui's `history-change-datatype` verb must then switch to `history_panel_change_selected("change data type", …)`.

## Worktree

`~/projects/worktrees/galaxy/branch/selenium_history_datatype_citations/`.
- `.venv` and `client/node_modules` are symlinks into `galaxy_ui_driver` / `galaxy_ui_driver_gxui`. Never `pnpm install` here.
- The client is built in place (`static/dist`).
- Local dbkey tests need `tool-data/shared/ucsc/builds.txt`, copied from the sample; it is gitignored.
