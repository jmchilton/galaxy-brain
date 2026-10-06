# playwright_remote_debugging_port — implementation debrief

Branch `playwright_remote_debugging_port` @ `da5054d39f3`, one commit off dev `253a4cb0b9c`,
2 files, +46/−2. Pushed to `jmchilton`. No PR.

Prerequisite PR 2 of the Galaxy UI skill (`vault/projects/playwright/GALAXY_UI_SKILL_DESIGN.md`).
Independent of PR 1 (`selenium_context_timeout_handler`); either can merge first.

## What it does

`ConfiguredDriver(..., remote_debugging_port=N)` and `get_playwright_driver(...)` pass
`--remote-debugging-port=N` to Chromium's `launch(args=...)`. An external CDP client
(`playwright-cli attach --cdp=http://127.0.0.1:N`) can then drive the page Galaxy's test
abstractions opened. Spike S1 showed nothing else is needed: the default `launch` + `new_page`
context is visible over CDP, no persistent context required.

- Default `None`: launch args are empty, so existing behaviour is unchanged.
- Rejected with `ValueError` for the Selenium backend and for Firefox/WebKit, before any browser
  starts, rather than silently ignored.
- Stored in `config`, so `to_dict()` / `from_dict()` round-trip it and a context YAML's `driver:`
  block can set it (`GalaxySeleniumContextImpl` once PR 1 lands).

## Tests (`test/unit/selenium/test_driver_factory.py`)

Red first (`TypeError: unexpected keyword argument`), then green:
- `test_playwright_remote_debugging_port_exposes_page` — headless Chromium on an unused port,
  navigate to the `basic.html` fixture, read `/json/list` over HTTP, assert the page's URL is a
  target. Also asserts `to_dict()` carries the port.
- `test_playwright_remote_debugging_port_requires_chromium`, `test_selenium_remote_debugging_port_raises_error`
  — no browser needed.

Full `test/unit/selenium/` locally: 516 passed, 1 skipped, 3 failed. The 3 failures are
`TestConfiguredDriverSelenium` raising "neither geckodriver or chromedriver are found on PATH" —
local environment, unrelated (same code path as dev). ruff, isort, pre-commit clean; mypy reports
only pre-existing errors in the file, none on changed lines.

## Not done

- No env var / `framework.py` plumbing (e.g. to attach playwright-cli to a running E2E test). Small
  follow-up if wanted; the gxui daemon passes the port directly.
