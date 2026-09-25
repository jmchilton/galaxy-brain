Removes `@selenium_only` from all 9 remaining tests in
`lib/galaxy_test/selenium/test_history_panel_collections.py`, so the whole file
runs under the Playwright backend. No source change was needed - the tests pass
as written. The unused `selenium_only` import goes with them.

The file already had 3 tests running under Playwright; this takes it to 12.

### Verification

Run locally against a dev server, full file, Playwright backend: **9 passed, 3
failed**.

The 3 failures are `test_mapping_collection_states_running`,
`test_output_collection_states_running` and `test_list_display` - the three tests
that were *already* running under Playwright before this change, all marked
`@flakey`. They fail identically under `GALAXY_TEST_DRIVER_BACKEND=selenium`, so
they are backend-agnostic and untouched by this PR. CI sets
`GALAXY_TEST_SKIP_FLAKEY_TESTS_ON_ERROR=1` in both `playwright.yaml` and
`selenium.yaml`, which turns them into skips on either backend.

Every one of the 9 tests unlocked here passes.

### Note for anyone reproducing locally

Do not pass `GALAXY_TEST_END_TO_END_CONFIG` for a full-file run of this file. A
context config that sets `login_email` maps to `GALAXY_TEST_SELENIUM_USER_EMAIL`,
and `SeleniumTestCase.login()` then logs every test into one shared user with one
shared history instead of calling `register()` per test. These tests deliberately
create errored datasets, and `test_collection_job_details` asserts the whole
history is ok via `wait_for_fetched_collection` ->
`wait_for_history(assert_ok=True)`, so it fails on a history polluted by its own
predecessors. CI leaves the variable unset and gets an empty history per test.
That mode produced 2 extra failures here that were nothing to do with Playwright.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
