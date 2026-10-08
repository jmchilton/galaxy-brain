# issue_23979_playwright_headless_auto — implementation debrief

Fixes galaxyproject/galaxy#23979 off `dev` at `9fd083720a7`. Commits: fix + test `314fb64306f`, test setup refactor `fa1164bbc36`. Pushed to `jmchilton/galaxy`; no PR opened.

## Change

- `headless_selenium()` (`lib/galaxy_test/selenium/framework.py`): under `GALAXY_TEST_SELENIUM_HEADLESS=auto`, returns `True` for `GALAXY_TEST_DRIVER_BACKEND=playwright` before the Selenium-only `get_local_browser()` PATH probe. Mirrors the backend guard `use_virtual_display()` already has. Selenium behavior unchanged; explicit headless settings still win; remote still returns `False` first.
- New `test/unit/selenium/test_framework_headless.py` (7 tests): monkeypatches module settings, `driver_factory.Display`, and `driver_factory._which` via a small `HeadlessEnv` dataclass.

## Validation

- Red→green: before the fix, the Playwright `auto` cases with no drivers (raised) and geckodriver only (`False`, headed) failed; all 7 pass after. Test-challenge agent re-confirmed 2 red / 5 green against `HEAD~1` after its refactor.
- Real env check, no drivers on PATH: Playwright → `True`; Selenium → still raises the original error.
- ruff, isort, black, mypy (from `lib/`) clean; commit hooks passed.
- 3 pre-existing `TestConfiguredDriverSelenium` failures in `test_driver_factory.py` locally — no chromedriver on this machine; unrelated.
- No E2E run: CI sets `GALAXY_TEST_SELENIUM_HEADLESS: 1`, so E2E can't reach the bug's conditions.

## Review

Review agent (REVIEW_FOCUS.md): no must/should-fix. Confirmed no other headless resolution (`selenium/cli.py`, jupyter context, `availability.py`) shares the Selenium-only `auto` assumption; remote + Playwright unaffected (`ConfiguredDriver` already rejects remote Playwright).

Test challenge: [test_challenge_debrief.md](test_challenge_debrief.md). Kept all 7 tests; collapsed fixture + helper into `HeadlessEnv` (also the reviewer's readability nit).

## Not done

- **`run_tests.sh` doc line** (reviewer nit: note Playwright headless default in the Selenium help section). Dropped: editing `run_tests.sh` trips the pre-commit shellcheck hook on pre-existing warnings (SC2164 etc.) unrelated to this change, and `doc/source/dev/run_tests_help.txt` is already out of sync with the script. Worth a separate doc tidy if wanted.
- **Pure-function refactor** of `headless_selenium()` / `use_virtual_display()` taking settings as args (test-challenge suggestion; would remove the monkeypatching). Out of scope for a one-guard fix.
- **Fake PATH dir** instead of patching `_which`: more setup, no clarity gain.
