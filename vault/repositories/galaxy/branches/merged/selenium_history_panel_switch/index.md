# selenium_history_panel_switch

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:selenium_history_panel_switch?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_history_panel_switch)

## Status

Approved by John 2026-10-24; opened as draft PR [#24444](https://github.com/galaxyproject/galaxy/pull/24444) at `4f61d010c98` (title: first option; screenshot hosted on fork branch `pr-assets-selenium_history_panel_switch`). Base `release_26.2` `e3affe97eb8`.

Fork CI on `4f61d010c98` partly run (no failures as of 2026-10-24; E2E jobs queued); draft until CI is green.

## Polish

- [PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md), [debrief](polish_debrief.md).

## Scope

Add missing E2E test (missing tests are bugs, so `release_26.2`): switching histories via the history panel's Switch to history modal. Only `test_history_switch` (histories list card) existed.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) commit `8b84ce48e0f` "Test switching histories from the history panel's Switch to history modal" (FAQ batch 12). On restack, drop it by subject.

## Worktree

`~/projects/worktrees/galaxy/branch/selenium_history_panel_switch/`. `.venv` and `client/node_modules` are symlinks into `galaxy_ui_driver_gxui`; never run `pnpm install` here. Client built in place.
