# Tracking history

Imported from the branch agent on 2026-10-09; this preserves the recorded decisions and evidence. CI has not been refreshed by this migration.

- Branch `issue_23979_playwright_headless_auto` (`cc60064cc75`, off dev) — Description: Playwright E2E with default `GALAXY_TEST_SELENIUM_HEADLESS=auto` no longer probes PATH for chromedriver/geckodriver (raised with neither, headed Chromium with geckodriver only); 3-line backend guard in `headless_selenium()` mirroring `use_virtual_display()`, no test (John: test is overkill); fixes #23979; blockers: no CI seen yet. [Implementation debrief](implementation_debrief.md).
