# playwright_timeout_retry_once — implementation debrief

Branch `playwright_timeout_retry_once` @ `7682a9a4e09`, a single commit on `dev` @ `df3932ed4ba`, cherry-picked from `galaxy_ui_driver` (`85b98379685`). After review, the test was amended to import the `PlaywrightTimeoutException` alias from `has_playwright_driver` and to use `pytest.raises`, and its expected 12 calls are now written as `10 + 2`, with a comment. 2 files, +45.

## Change

`2825bb09e42` ("Try to fix transiently failing test?", 2026-03-22) added `_exception_indicates_playwright_timeout` to `exception_seems_to_indicate_transition`. Since then `retry_call_during_transitions` (attempts=10) treats a Playwright `TimeoutError` the same as a stale element. But a Playwright timeout has already spent a whole action timeout in Playwright's own retrying. A stuck action therefore costs 12 action timeouts (the first call plus `attempts + 1` retries): one covered click in the workflow editor took five to thirteen minutes.

This commit counts Playwright timeouts separately and re-raises on the second one, so a stuck action fails after 2 action timeouts. Stale, not-clickable and intercepted errors keep every attempt. It is a partial revert: the retry from `2825bb09e42` survives, but only once. It changes timing for every caller of `retry_call_during_transitions`: the 24 `@retry_during_transitions` methods, `retry_assertion_during_transitions`/`retry_index_during_transitions` (about 80 uses), `open_toolbox` and two tests. It also covers Galaxy's own `wait_for_*` timeouts, because `has_playwright_driver.py:591-642` re-raises them as Playwright `TimeoutError`. Say so in the PR description.

## Tests

- New file `test/unit/selenium/test_retry_during_transitions.py`. A stale element gives 12 calls; a Playwright timeout gives 2. Both pass.
- Red check: with the old `navigates_galaxy.py`, the Playwright case fails (1 failed, 1 passed).
- `test/unit/selenium/` in full: 517 passed, 1 skipped, 3 failed. All 3 failures were in `test_driver_factory.py` because chromedriver wasn't on PATH. With chromedriver from selenium-manager prepended, that file passes (19 passed).
- ruff and black are clean. No E2E run: CI covers it.

## Review (2026-10-10)

The review found no blockers: the counter logic is correct, and every retry helper goes through `retry_call_during_transitions`, so none needs the same change.

The fixes it suggested are amended in. The re-run gave 2 passed, and the red check still fails without the fix.

Left alone, pre-existing:
- The `previous_attempts > attempts` off-by-one.
- `_exception_indicates_playwright_timeout`'s in-function import of private `playwright._impl._errors`. The import is needed because Playwright is optional at runtime; `playwright.sync_api.TimeoutError` is the same class.
- Selenium `TimeoutException` is still not retried.
