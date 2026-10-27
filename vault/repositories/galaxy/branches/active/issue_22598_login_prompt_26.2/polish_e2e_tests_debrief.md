# Polish E2E tests debrief

Replaced raw login-form selectors in `test_login_returns_to_redirect` with new `Locators` entries and added before/after screenshots; test passes.

- Tool Shed Playwright tests use `Locators` (lib/tool_shed/test/base/playwrightbrowser.py), not Galaxy's navigation.yml; added `login_input`, `login_password_input` (scoped to `.login-form`), documented in base README.
- Added explicit wait on login button visibility before filling; no sleeps existed.
- Screenshots: `login_with_redirect`, `login_redirect_landing` (via `TOOL_SHED_TEST_SCREENSHOTS`).
- No DOM decoration or client refactor needed: LoginForm already has stable `name` attrs and `.login-form` class. Branch targets release_26.2, so no client refactor anyway.
- Not covered by E2E: the Changelog/Contents anonymous login prompt (afa049f39cf); out of scope for polishing existing tests.
- Run: `TOOL_SHED_TEST_OMIT_GALAXY=1 PYTHONPATH=lib <deployment_test_fixes_26_2 venv>/bin/python -m pytest lib/tool_shed/test/functional/test_frontend_login.py -k test_login_returns_to_redirect` → 1 passed.
- Commit: see worktree HEAD ("Use Locators and screenshots in shed login redirect E2E test"), not pushed.
