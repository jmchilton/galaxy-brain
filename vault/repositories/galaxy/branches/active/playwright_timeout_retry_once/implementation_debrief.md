# playwright_timeout_retry_once — implementation debrief

Branch `playwright_timeout_retry_once` @ `e821e302da4`, a single commit on `dev` @ `df3932ed4ba`, cherry-picked unchanged from `galaxy_ui_driver` (`85b98379685`). 2 files, +45.

## Change

`2825bb09e42` ("Try to fix transiently failing test?", 2026-03-22) added `_exception_indicates_playwright_timeout` to `exception_seems_to_indicate_transition`. Since then `retry_call_during_transitions` (attempts=10) treats a Playwright `TimeoutError` the same as a stale element. But a Playwright timeout has already spent a whole action timeout in Playwright's own retrying. A stuck action therefore costs 11 action timeouts: one covered click in the workflow editor took five to thirteen minutes.

This commit counts Playwright timeouts separately and re-raises on the second one, so a stuck action fails after 2 action timeouts. Stale, not-clickable and intercepted errors keep every attempt. It is a partial revert: the retry from `2825bb09e42` survives, but only once. It changes timing for all 24 `@retry_during_transitions` callers.

## Tests

- New file `test/unit/selenium/test_retry_during_transitions.py`. A stale element gives 12 calls; a Playwright timeout gives 2. Both pass.
- Red check: with the old `navigates_galaxy.py`, the Playwright case fails (1 failed, 1 passed).
- `test/unit/selenium/` in full: 517 passed, 1 skipped, 3 failed. All 3 failures were in `test_driver_factory.py` because chromedriver wasn't on PATH. With chromedriver from selenium-manager prepended, that file passes (19 passed).
- ruff and black are clean. No E2E run: CI covers it.
