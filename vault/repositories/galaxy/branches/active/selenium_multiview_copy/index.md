# selenium_multiview_copy

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:selenium_multiview_copy?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_multiview_copy)

## Status

Implemented on `dev`, head `7da1f5881d7`.

No PR.

CI not yet observed.

## Scope

Multiview columns and switch buttons get real per-history hooks (`data-history-id`, `data-description`), and `navigation.yml` points `multi_history_panel` at them (4c). New `multi_history_copy_item` drags an item from one history's column onto another's (5e). New E2E test `test_history_multi_view.py::TestHistoryMultiView::test_copy_dataset_between_columns`.

Red → green: green under Playwright and Selenium; the whole Multiview file passes under Playwright. With 4c's Vue hooks reverted, the copy test times out on `.history-column[data-history-id=…]`. Nothing on dev used the old `#history-column-<id>` selectors.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). A dev-only merge keeps 4c/5e on `galaxy_ui_driver` until it restacks onto a base that has them.
