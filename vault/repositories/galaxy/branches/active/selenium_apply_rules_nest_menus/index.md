# selenium_apply_rules_nest_menus

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:selenium_apply_rules_nest_menus?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_apply_rules_nest_menus)

## Status

Hardening in progress. Base `release_26.2`.

No PR.

No CI yet.

## Scope

E2E coverage for Apply rules driven through the rule builder menus, framed as a missing test for 26.2. One commit: `test_tool_form.py::test_run_apply_rules_nest_from_menus` nests a list through Column > Basename and the list-identifiers mapping (every other Apply rules test sets the rule source JSON), then checks Sort collection maps over the `list:list`. Adds `rule_builder_add_column_basename` and `history_wait_for_new_collection`.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) (FAQ-loop commit "Test nesting a list with Apply rules from the rule builder menus") per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). On 26.2 it uses `tool_set_value(..., expected_type="data_collection")` in place of dev-only `tool_form_fill`. On restack onto a 26.2 that has this branch, drop the commit from `galaxy_ui_driver`.

`history_wait_for_new_collection` is a byte-identical copy of the one in [`selenium_collection_build_convert`](../selenium_collection_build_convert/index.md); the branches merge cleanly in either order (`git merge-tree`). Whichever lands second carries no net change for it.

## Worktree

`~/projects/worktrees/galaxy/branch/selenium_apply_rules_nest_menus/`. `.venv` and `client/node_modules` are symlinks into `galaxy_ui_driver` / `galaxy_ui_driver_gxui`; never `pnpm install` here. Client built in place (`static/dist`). Tests use a framework-managed server.
