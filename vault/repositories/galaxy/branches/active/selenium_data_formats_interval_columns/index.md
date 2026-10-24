# selenium_data_formats_interval_columns

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:selenium_data_formats_interval_columns?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_data_formats_interval_columns)

## Status

READY: hardened; see [implementation debrief](implementation_debrief.md). Base `release_26.2` `d39f1172656`, head `222a113f31d`.

No PR.

No CI yet.

## Scope

Add missing E2E tests (missing tests are bugs, so `release_26.2`): tool form data field's accepted formats list, and assigning interval column metadata on a dataset's Attributes tab. Neither had E2E coverage on `release_26.2`.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) commits "Test a tool form data field's accepted formats list" and "Test assigning interval columns on a dataset's Attributes tab" (batch 9). On restack, drop both by subject.

Out of scope: Attributes save turning `comment_lines` 0 into blank (`set_edit` `payload.get(name) or None`); fixed elsewhere, not asserted here.

## Worktree

`~/projects/worktrees/galaxy/branch/selenium_data_formats_interval_columns/`. `.venv` and `client/node_modules` are symlinks into `galaxy_ui_driver_gxui`; never run `pnpm install` here. Client built in place (`static/dist`). Tests use a framework-managed server.
