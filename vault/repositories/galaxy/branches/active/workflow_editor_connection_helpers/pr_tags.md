- `kind/enhancement`: test-only. It adds missing E2E coverage, plus the helpers and the Playwright drag fix those tests need. No behavior change. This matches the sibling `selenium_dataset_tags_auto_detect`.
- `area/testing/selenium`

The labeler would also add `area/testing` (`lib/galaxy_test/**`, `test/**`) and `area/client` (`navigation.yml`). Both are dropped: `area/testing/selenium` already says it, and the client change is selectors only. `area/workflows/editor` is also left off because the editor itself doesn't change.
