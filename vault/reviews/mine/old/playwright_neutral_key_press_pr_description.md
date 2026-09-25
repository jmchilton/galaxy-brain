# Shared keyboard gestures for Selenium and Playwright

Keyboard-driven tests currently reach through Selenium ActionChains, preventing them from running under Playwright. Add backend-neutral `press()` and `active_element()` gestures, route the existing Enter/Escape/Backspace helpers through `press()`, and migrate `test_aria_connections_menu` to the shared interface.

Use one `Key` vocabulary with standard browser key values and one maintained Selenium encoding table. Remove `PlaywrightKeys` and its separate translation table; derive the legacy `send_keys()` lookup from the Selenium table, preserving Return compatibility. Make COMMAND an alias of META and use `MODIFIER_KEYS` to reject invalid or duplicate modifiers before browser interaction. `press()` accepts named keys and single printable characters, focuses a supplied element once, and holds modifiers across the sequence so multi-Tab presses behave consistently.

This also fixes the Selenium page-level key helper's missing `perform()` and backward tabbing's missing Shift release.

Validated on `92c508f315f`: 61 pure key-vocabulary unit tests, 482 passed / 1 skipped across the full `test/unit/selenium/` browser suite (Selenium, Playwright, and proxy fixtures), `test_aria_connections_menu` green under both backends, and a Selenium regression batch over the element-level Enter/Escape callers (`test_history_rename_cancel_with_escape`, `test_tags`, `test_pick_value_add_tags_pja`) green. mypy and ruff clean; the two `HasElementLocator` mypy errors are pre-existing on dev.

The page-level Escape caller, `test/integration_selenium/test_workflow_run_target.py::TestWorkflowRunTargetSelectNewSeleniumIntegration::test_execution_in_current_history`, could not be run locally: `integration_selenium` starts its own Galaxy, which serves `/static/dist/*` that this `GALAXY_SKIP_CLIENT_BUILD=1` worktree never builds, so it fails in setup with a `ClientBuildException` before reaching the test. That is an environment limit, not a result — CI is the check. The mechanism it depends on is covered directly by `test_send_escape_to_page` under both backends.
