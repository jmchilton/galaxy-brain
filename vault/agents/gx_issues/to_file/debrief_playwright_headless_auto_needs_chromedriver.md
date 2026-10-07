# Debrief: playwright_headless_auto_needs_chromedriver

Prepared 2026-10-07. Source: `playwright_headless_auto_needs_chromedriver.md`. Proposal: `proposed_playwright_headless_auto_needs_chromedriver.md`.

## Research

- Repro rerun twice on dev `02a2e659909` (drafter + reviewer, scratch worktrees, PATH stripped, no `pyvirtualdisplay`): `get_configured_driver()` raises "neither geckodriver or chromedriver are found on PATH".
- PATH matrix: no driver → raises; geckodriver only → `headless_selenium()` False → Playwright launches headed Chromium (`launch(headless=headless)`, driver_factory L291; not browser-launched, read from code); chromedriver → True.
- Gap from #21102 (John's Playwright backend PR): guard added to `use_virtual_display()` only.
- Playwright CI sets `GALAXY_TEST_SELENIUM_HEADLESS: 1`, which is why CI misses it. No duplicate or fix.

## Rewrite

- Dropped vault/project-doc and agent chatter. Context cites 🔀 #21102.
- New PATH-case table. Alternatives: fix in `get_local_browser`; document the setting.
- Reviewer: table labeled "no `pyvirtualdisplay`", CI explanation corrected, L291 ref added.

## Leftover

- None blocking. Small; candidate for straight gx_branches fix. Assign John (his backend).
