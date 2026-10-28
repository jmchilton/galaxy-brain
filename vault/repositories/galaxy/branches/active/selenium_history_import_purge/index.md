# selenium_history_import_purge

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:selenium_history_import_purge?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_history_import_purge)

## Status

`ready`: polished, head `509236eca45` on `release_26.2`; rebased 2026-10-28 (one `navigates_galaxy.py` add/add conflict, kept both).

[#24440](https://github.com/galaxyproject/galaxy/pull/24440) undrafted 2026-10-24 (tick).

CI rerunning after force-push; prior run's only red was unrelated Integration `test_pulsar_embedded_extended_metadata::test_runtime_environment_warning`.

## PR

[Description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md).

## Scope

Add missing E2E tests (missing tests are bugs, so `release_26.2`): importing another user's shared history from its history view, and purging all histories from the histories list. Neither had E2E coverage on `release_26.2`.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) commits "Test importing another user's shared history" and "Test purging all histories from the histories list" (FAQ batch 11). On restack, drop both by subject; gxui's `history-import` must use the top-level `copy_history_modal` (replaces `history_view.copy_modal` and the stale `multi_history_panel.copy_history_modal`).

## Worktree

`~/projects/worktrees/galaxy/branch/selenium_history_import_purge/`. `.venv` and `client/node_modules` are symlinks into `galaxy_ui_driver_gxui`; never run `pnpm install` here. Client built in place. Tests use a framework-managed server.
