# selenium_multiview_copy

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:selenium_multiview_copy?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_multiview_copy)
- [PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [polish debrief](polish_debrief.md)

## Status

Polishing (`branches_need_polish`) on head `4352a0f4ff6`, base `release_26.2`. See [implementation debrief](implementation_debrief.md), [rescope debrief](implementation_rescope_debrief.md), original scope [alt](alts/original_scope.md).

No PR.

Fork CI: green so far; Integration Selenium red was a client cache miss (rerun), Playwright queued. No Selenium E2E workflow on the fork.

## Scope

Multiview columns and switch buttons get real per-history hooks (`data-history-id`, `data-description`), and `navigation.yml` points `multi_history_panel` at them (4c). Dead `current_label`/`switch_history` selectors dropped. New `multi_history_copy_item` drags an item from one history's column onto another's (5e). E2E tests `test_history_multi_view.py::TestHistoryMultiView::test_copy_dataset_between_columns` and `test_switch_to_history_from_column`. Fix: `historyDragDrop.ts` `&&` → `||` so dataset-only/collection-only drops refresh the target column (bug since #18699), with baseline-first `historyDragDrop.test.ts`.

Red → green: Playwright `test_history_multi_view.py` 6/6; vitest 6/6. Hook tests time out with their Vue hook reverted; the copy test and 2 vitest cases fail under `&&`. Nothing on `release_26.2` used the old `#history-column-<id>` selectors.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). A dev-only merge keeps 4c/5e on `galaxy_ui_driver` until it restacks onto a base that has them; its `navigation.yml` still has `history_column`.

## Worktree

`~/projects/worktrees/galaxy/branch/selenium_multiview_copy/` has `selenium_standalone_package` checked out (another session), so polishing used `~/projects/worktrees/galaxy/branch/selenium_multiview_copy_polish/`.
