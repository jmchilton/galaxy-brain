Removes `@selenium_only` from all 8 tests in
`lib/galaxy_test/selenium/test_collection_builders.py`, so the file runs under
the Playwright backend. No source change was needed - the tests pass as written.
The unused `selenium_only` import goes with them.

### Verification

Full file under the Playwright backend against a dev server: **8 passed**, no
failures, no skips.

This file uses `@managed_history`, so each test gets its own named history and
none of the cross-test state issues that affect some other Selenium test files
apply here.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
