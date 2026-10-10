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
