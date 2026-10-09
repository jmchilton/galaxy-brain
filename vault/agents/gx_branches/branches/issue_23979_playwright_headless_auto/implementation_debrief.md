# issue_23979_playwright_headless_auto — implementation debrief

Fixes galaxyproject/galaxy#23979 off `dev` at `9fd083720a7`. Single commit `cc60064cc75`, pushed to `jmchilton/galaxy`; no PR opened.

## Change

- `headless_selenium()` (`lib/galaxy_test/selenium/framework.py`): under `GALAXY_TEST_SELENIUM_HEADLESS=auto`, returns `True` for `GALAXY_TEST_DRIVER_BACKEND=playwright` before the Selenium-only `get_local_browser()` PATH probe. Mirrors the backend guard `use_virtual_display()` already has. Selenium behavior unchanged; explicit headless settings still win; remote still returns `False` first.
- No test. A 7-case unit test (`test/unit/selenium/test_framework_headless.py`) was written, went red→green, and passed a test challenge, but John judged it overkill for a 3-line guard (2026-10-08); dropped and branch force-pushed to the fix alone. Earlier pushed SHAs `314fb64306f`/`fa1164bbc36` carried it.

## Validation

- Real env check, no drivers on PATH: Playwright → `True`; Selenium → still raises the original error.
- Commit hooks (black, ruff, flake8) passed; mypy from `lib/` clean.
- No E2E run: CI sets `GALAXY_TEST_SELENIUM_HEADLESS: 1`, so E2E can't reach the bug's conditions.

## Review

Review agent (REVIEW_FOCUS.md): no must/should-fix. Confirmed no other headless resolution (`selenium/cli.py`, jupyter context, `availability.py`) shares the Selenium-only `auto` assumption; remote + Playwright unaffected (`ConfiguredDriver` already rejects remote Playwright).

## Not done

- **`run_tests.sh` doc line** (reviewer nit: note Playwright headless default in the Selenium help section). Dropped: editing `run_tests.sh` trips the pre-commit shellcheck hook on pre-existing warnings (SC2164 etc.) unrelated to this change, and `doc/source/dev/run_tests_help.txt` is already out of sync with the script.
