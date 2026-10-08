# galaxy#23979 — Playwright E2E backend with default headless setting needs chromedriver/geckodriver

[Issue](https://github.com/galaxyproject/galaxy/issues/23979) · [issue draft](issue_draft.md) · [proposal](proposal.md) · [debrief](debrief.md)

Filed 2026-10-08 by Claude for John; assigned jmchilton. Gap from John's #21102 (Playwright backend).

`headless_selenium()` under `GALAXY_TEST_SELENIUM_HEADLESS=auto` probes Selenium drivers via `get_local_browser`: no drivers → raises; geckodriver only → headed Chromium. `use_virtual_display()` already has the backend guard; `headless_selenium()` doesn't. CI misses it because the Playwright job sets `GALAXY_TEST_SELENIUM_HEADLESS: 1`.

Next: small gx_branches fix — return `True` under `auto` for the Playwright backend; unit test in `test/unit/selenium/` with PATH lacking drivers.
