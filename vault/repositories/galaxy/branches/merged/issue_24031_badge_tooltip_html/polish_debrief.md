# Polish debrief: issue_24031_badge_tooltip_html

Polished 2026-10-10. Branch now at `1a0b0fa24e6` (one polish commit on top of `7893845ae2b`). Description: [pr_description.md](pr_description.md). Titles: [pr_titles.md](pr_titles.md).

- **CI:** fork CI on `7893845ae2b` was still running when polish started, with no failures (Client API Testing green). Not yet checked on `1a0b0fa24e6`.
- **Checklist (GENERAL.md):** every item passes; the human-read item is left for John.
- **Branch change (`1a0b0fa24e6`):** acted on the checklist's minor notes.
  - Split the badge `it.each` into three explicit tests. This removes the conditional assertion, the always-true `toContain("")` and the redundant `unmount()`.
  - Added a one-line jsdom reason under both `@vitest-environment` pragmas.
  - All 3 badge tests fail with dev's production files. 30 tests pass across 4 suites on Node 22.20.0; eslint and prettier are clean.
  - The checklist wasn't rerun after this; the change only strengthens the tests it had already passed.
- **Strengthening round:** description-only fixes.
  - The test counts are now correct: on dev, 7 of the 8 new tests fail. 6 fail at the bug's assertions; the stock-only badge test fails only on the new `<p>` wrapper.
  - The screenshot caveat moved next to the hero image.
  - Links are described as styled but not clickable.
  - New highlighted sentences answer two questions: admins already had raw HTML on dev, and why jsdom rather than the `sanitizeHtml` stub.
  - Exact count added: 2 of about 290 `v-g-tooltip` uses are `.html`.
  - Added a Context section: regression from #19521, found during the `vitest_story_play` play tests.
- **Left over:**
  - A real "before" screenshot, using the preserved harness on dev's files. Optional; the table shows the before text.
  - Scope questions for John:
    - Sanitize with the `links` profile, as `ConfigurationMarkdown` does? DOMPurify's defaults keep admin `<style>` and form tags.
    - Add a hover / `aria-label` assertion to `test_objectstore_selection.py`?
    - Restore an interactive popover so admin links are clickable again (they were before 25.0)?
    - Tighten `vitest_story_play`'s tag-tolerant tooltip regex once this merges?
    - JobInformation's `aria-label` overrides the span's visible text. That predates this branch.

## Second pass: approved scope additions (2026-10-10)

John approved three additions after the first polish:
1. `links` sanitizing for badge messages.
2. Clickable links via a popover.
3. An E2E hover check.

For jsdom he said "IF we can drop a dependency … remove the dependency", which I read as keep the directive fix but drop jsdom.

- **Commits:**
  - `a3147d22149`: popover, `links` sanitizing, `interactive` prop, jsdom dropped, E2E test.
  - `ac407009418`: E2E test finds the popover through its trigger's `aria-controls`.
  - `54f50d01d3a`: E2E test saves a screenshot.
  - `25c077e8323`: the popover gets an accessible name, and badges inside hover popovers are non-interactive.
- **Rerunning the checklist** found two failures, both fixed in `25c077e8323`:
  - The dialog popover had no accessible name.
  - Badges in `TemplateSummary` and `ShowSelectedObjectStore` would have nested an interactive popover inside a hover popover.
  - It also suggested ARIA assertions, the default cursor and a comment rewording; all done.
- **Verification:**
  - The E2E test passes on both Playwright and Selenium against a client built from `25c077e8323`.
  - 585 client tests pass, and eslint, prettier and vue-tsc are clean.
  - The worktree was bootstrapped for this (`.venv`, built client).
- **Description** rewritten for the popover version. The hero screenshot now comes from the E2E test on a real Galaxy page; the harness captures are obsolete. The Agentic Checks entries note that those reviews covered the earlier tooltip version.
- **Not repeated:** the strengthening round. POLISH_BRANCH allows only one.
- **Still open:**
  - A "before" screenshot.
  - Tightening `vitest_story_play`'s tooltip regex.
  - JobInformation's `aria-label` overriding visible text, which predates this branch.
