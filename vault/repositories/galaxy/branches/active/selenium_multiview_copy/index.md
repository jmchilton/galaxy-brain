# selenium_multiview_copy

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:selenium_multiview_copy?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_multiview_copy)
- [PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [polish debrief](polish_debrief.md)

## Status

Rebased onto `release_26.2` (was `dev`), re-scoped to include the `historyDragDrop.ts` single-type drop fix; head `20b3266c03d`. Re-hardening in progress. Original scope: [alt](alts/original_scope.md); [rescope debrief](implementation_rescope_debrief.md).

No PR.

Fork CI on `13374adf3e4` queued; the fork runs Playwright but no Selenium E2E workflow.

## Scope

Multiview columns and switch buttons get real per-history hooks (`data-history-id`, `data-description`), and `navigation.yml` points `multi_history_panel` at them (4c). Dead `current_label`/`switch_history` selectors dropped. New `multi_history_copy_item` drags an item from one history's column onto another's (5e). E2E tests `test_history_multi_view.py::TestHistoryMultiView::test_copy_dataset_between_columns` and `test_switch_to_history_from_column`.

Red → green: both tests green under Playwright, as is the whole Multiview file (6/6). Each times out with its Vue hook reverted. Nothing on dev used the old `#history-column-<id>` selectors.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). A dev-only merge keeps 4c/5e on `galaxy_ui_driver` until it restacks onto a base that has them; its `navigation.yml` still has `history_column`.

## Worktree

`~/projects/worktrees/galaxy/branch/selenium_multiview_copy/` has `selenium_standalone_package` checked out (another session), so polishing used `~/projects/worktrees/galaxy/branch/selenium_multiview_copy_polish/`.
