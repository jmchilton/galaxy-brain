# selenium_data_formats_interval_columns

- [PR #24439](https://github.com/galaxyproject/galaxy/pull/24439)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_data_formats_interval_columns)

## Status

`ready`: head `c811d58bf30` on `release_26.2`; dannon's two review nits applied 2026-11-02 ([response](review_response_dannon_1.md)).

[#24439](https://github.com/galaxyproject/galaxy/pull/24439) approved by dannon; drafted reply awaits John.

CI running on `c811d58bf30`.

## Scope

Add missing E2E tests (missing tests are bugs, so `release_26.2`): tool form data field's accepted formats list, and assigning interval column metadata on a dataset's Attributes tab. Neither had E2E coverage on `release_26.2`.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) commits "Test a tool form data field's accepted formats list" and "Test assigning interval columns on a dataset's Attributes tab" (batch 9). On restack, drop both by subject.

Out of scope: Attributes save turning `comment_lines` 0 into blank (`set_edit` `payload.get(name) or None`); fixed elsewhere, not asserted here.

## Worktree

`~/projects/worktrees/galaxy/branch/selenium_data_formats_interval_columns/`. `.venv` and `client/node_modules` are symlinks into `galaxy_ui_driver_gxui`; never run `pnpm install` here. Client built in place (`static/dist`). Tests use a framework-managed server.
