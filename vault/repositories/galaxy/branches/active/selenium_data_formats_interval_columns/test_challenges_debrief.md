# Test challenges debrief

Branch adds only E2E tests (no unit/API tests), so unit/mock challenges are N/A.

- `test_data_parameter_accepted_formats`: E2E is right layer (popover/collapse rendering of `extensions`). Selectors moved to `data-description` hooks. Kept. Sorted compare is exact (`["csv","tabular"]`), no OR/subset checks.
- `test_history_dataset_assign_interval_columns`: asserts defaults, save success alert, API metadata, and post-reload UI values - all exact equality. Goes red if Save is removed (API metadata unchanged). `comment_lines` deliberately not asserted (known out-of-scope bug). Kept.
- "Fail without branch changes": branch is missing-tests only; both tests cover existing behavior, so they pass on base by design (pitched as missing tests).
- writing_tests.md: uses `@selenium_test`, `@managed_history`, populators for setup (`new_dataset`, `get_history_dataset_details`), components via navigation.yml. Conforms.
- No new E2E needed beyond these.

Results (both backends, one at a time): tool form test pass Playwright/Selenium; interval test pass Playwright/Selenium.
