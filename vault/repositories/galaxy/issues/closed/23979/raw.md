# Playwright E2E backend with default `headless=auto` raises unless chromedriver/geckodriver is on PATH

Agent-to-agent issue draft. Found 2026-10-06 by code reading while designing the Galaxy UI skill (`vault/projects/playwright/GALAXY_UI_SKILL_DESIGN.md`, was "prerequisite PR 3"; dropped from that project because gxui builds its driver via `GalaxySeleniumContextImpl` and never hits this path). Reproduced the same day. Pure test-framework bug; stands on its own.

## Symptom

With `GALAXY_TEST_DRIVER_BACKEND=playwright` and the defaults `GALAXY_TEST_SELENIUM_HEADLESS=auto`, `GALAXY_TEST_SELENIUM_BROWSER=auto`, `get_configured_driver()` fails before any browser launches, on a machine with no Selenium drivers and no `pyvirtualdisplay`, which is a normal Playwright-only setup:

```
Exception: Selenium browser is 'auto' but neither geckodriver or chromedriver are found on PATH.
```

Repro (any Galaxy checkout with Playwright deps, macOS, no chromedriver/geckodriver/Xvfb, no pyvirtualdisplay):

```sh
env -u GALAXY_TEST_SELENIUM_HEADLESS -u GALAXY_TEST_SELENIUM_BROWSER GALAXY_TEST_DRIVER_BACKEND=playwright \
  PYTHONPATH=lib python -c "from galaxy_test.selenium import framework as f; f.headless_selenium()"
```

Output on 2026-10-06: `playwright auto auto`, `use_virtual_display False`, then the exception above from `driver_factory.get_local_browser`.

## Cause

`lib/galaxy_test/selenium/framework.py` (unchanged on `origin/dev` `50c165d1792`):
- `get_configured_driver()` (~L1436) passes `headless=headless_selenium()` for both backends.
- `headless_selenium()` (L1450): when `GALAXY_TEST_SELENIUM_HEADLESS == "auto"`, it short-circuits on `driver_factory.is_virtual_display_available()` (only true if `pyvirtualdisplay` imports), else calls `driver_factory.get_local_browser(GALAXY_TEST_SELENIUM_BROWSER)`.
- `get_local_browser("auto")` (`lib/galaxy/selenium/driver_factory.py` ~L195) is Selenium-only: it probes PATH for `chromedriver`/`geckodriver` and raises if neither exists.
- The Playwright backend never needs those drivers: `get_playwright_browser_type("auto")` (driver_factory ~L225) maps `auto` → `chromium`, which runs headless with no display.
- `use_virtual_display()` (L1466) already guards on `using_selenium`; `headless_selenium()` lacks the equivalent guard.

## Why nobody notices

- CI and Selenium dev setups have chromedriver on PATH, so `auto` resolves to `CHROME` → headless `True`.
- The `galaxy-playwright` local-run recipe sets `GALAXY_TEST_SELENIUM_HEADLESS` explicitly (0/1), which skips the `auto` branch.
- Only someone running the Playwright backend with defaults on a Playwright-only machine hits it.

## Suggested fix

In `headless_selenium()`, under `auto`, return `True` when `GALAXY_TEST_DRIVER_BACKEND == "playwright"` before any Selenium probing (mirrors the `using_selenium` guard in `use_virtual_display()`). Alternatively resolve `auto` via `get_playwright_browser_type` for the Playwright backend. Unit test in `test/unit/selenium/` with PATH lacking both drivers (monkeypatch `driver_factory._which` / env) asserting `headless_selenium()` is `True` for Playwright and still raises (or behaves as today) for Selenium.

Small; good candidate to file as an issue and/or go straight to a gx_branches fix.
