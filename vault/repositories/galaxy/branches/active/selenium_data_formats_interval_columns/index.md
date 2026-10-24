# selenium_data_formats_interval_columns

- [PR #24439](https://github.com/galaxyproject/galaxy/pull/24439)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_data_formats_interval_columns)

## Status

Polished, ready for final review; see [polish debrief](polish_debrief.md), [PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md). Base `release_26.2` `d39f1172656`, head `2a5656f8f8b`.

Draft PR [#24439](https://github.com/galaxyproject/galaxy/pull/24439), opened 2026-10-24 at John's request; undraft when CI is green.

Fork CI pending on `2a5656f8f8b`.

## Scope

Add missing E2E tests (missing tests are bugs, so `release_26.2`): tool form data field's accepted formats list, and assigning interval column metadata on a dataset's Attributes tab. Neither had E2E coverage on `release_26.2`.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) commits "Test a tool form data field's accepted formats list" and "Test assigning interval columns on a dataset's Attributes tab" (batch 9). On restack, drop both by subject.

Out of scope: Attributes save turning `comment_lines` 0 into blank (`set_edit` `payload.get(name) or None`); fixed elsewhere, not asserted here.

## Worktree

`~/projects/worktrees/galaxy/branch/selenium_data_formats_interval_columns/`. `.venv` and `client/node_modules` are symlinks into `galaxy_ui_driver_gxui`; never run `pnpm install` here. Client built in place (`static/dist`). Tests use a framework-managed server.
