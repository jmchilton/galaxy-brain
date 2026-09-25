Drops the 5 remaining `@selenium_only("Not yet migrated to support Playwright backend")` decorators from `lib/galaxy_test/selenium/test_history_panel.py`, so the whole file runs under the Playwright backend.

No source change was needed — the tests pass as written.

### Verification

`test_history_panel.py` under Playwright: **7 passed in 128s**, no failures and no skips. Two of the seven were already running under Playwright before this change; the other five are newly enabled.

### Why this one needed no porting

The file never reaches past the smart components into raw Selenium APIs. Its imports are `selenium_test`, `retry_assertion_during_transitions`, `SeleniumTestCase`, `edit_details` from `navigates_galaxy`, and the `UsesUploadActivity` mixin — no `By`, no `ActionChains`, no `self.driver`. Everything the tests do goes through `NavigatesGalaxy` and the component tree, which the `HasDriverProxy` already routes to whichever backend is configured.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
