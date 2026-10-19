# tool_open_tool_shed_ids — implementation debrief

**STATUS: READY.**
- Branch `tool_open_tool_shed_ids` @ `5daa04de087`, pushed to `jmchilton`.
- One commit on dev (merge-base `df3932ed4ba`): 4 files, roughly +66/−18.
- [Previous debrief](earlier_drafts/1/implementation_debrief.md).

## What it does

Tool Shed tools have full ids like `toolshed.g2.bx.psu.edu/repos/…`. Three places failed to find them:
- **Panel search.** `searchObjectsByKeys` regex-escaped the query and then regex-matched it. It now matches plain substrings.
- **`tool_panel` link selectors.** They matched the URL-encoded href. They now match `data-tool-id`.
- **`tools_list` card selectors.** They used `#<prefix>-${tool_id}`, which is invalid CSS for a Tool Shed id (Playwright: `Unexpected token "/"`). They now use `[id="…"]`, the form the file already uses elsewhere.

## Changes since the last debrief (2026-10-11)

- Folded in the `tools_list` follow-up.
- Renamed the E2E file to `test/integration_selenium/test_tool_shed_tool_ids.py` (`TestToolShedToolIds`).
- Moved the install into `setUp`.
- Added `test_tools_list_card_by_tool_shed_guid`. It checks the card, the version and favorite buttons, and the help toggle and help. `open_tool_button` isn't checked because it's hidden for special-form tools.
- Ran a [review](subagents/normal_review_tools_list.md). Only one test was added, so there is no fresh test challenge.

## Choices

- **Origin.** Cherry-picked from `galaxy_ui_driver` (4a). Drop the commit there once this merges.
- **E2E instead of a selector unit test.** This hasn't changed ([test challenges](test_challenges_debrief.md)). **John decides:** keep E2E only (the [scope evaluation](scope_evaluation.md) leans this way), keep both, or keep only the unit test.
  - The E2E tests run only in the `integration_selenium` lane and skip when the Tool Shed is down.
  - To restore the unit test: `git show 953ad71c656 -- test/unit/selenium/`.
- **Test 1 stops at the panel link.** `compose_text_param` is special-form, so a panel click loads into the hidden `galaxy_main` frame.
- **Scope kept.** Adding the `tools_list` selectors is the same bug, Tool Shed ids in navigation selectors, and it reuses the same test setup.
- **Thermo-nuclear review skipped.** The branch is just over 50 added lines, mostly test, and doesn't touch plumbing.

## Follow-ups (not in this PR)

- A special-form (expression) tool clicked in the tool panel loads into the hidden `galaxy_main` frame, so the user sees nothing. This already happens on dev. File separately.
- In `has_playwright_driver.py:251` and `:485`, Playwright's `By.ID` builds `#{value}`, so an id with `.` or `/` breaks under Playwright only. Use the `id=` engine. No caller passes a tool id today.

## Evidence

- **vitest** `utilities.test.ts`: 25 passed. Red without the fix: 1 failed.
- **E2E**, Playwright backend, local client build, venv `bin` on PATH for `hg`:
  - `test_tool_shed_tool_ids.py`: 2 passed.
  - Red with the old `tools_list` selectors: CSS parse error on `tool_card`.
  - Red with the old `tool_panel` selectors, recorded earlier: it timed out.
- **Regression check:** `lib/galaxy_test/selenium/test_tool_discovery_view.py`, 8 passed.
- **Lint:** ruff, black and isort are clean.
- **Reviews:**
  - [normal review](subagents/normal_review.md)
  - [fold-in review](subagents/normal_review_tools_list.md)
  - [Codex](codex_review.md): ran at `7fd636774c9`, before the fold-in, and found nothing.
  - [screenshots](screenshot_debrief.md)
