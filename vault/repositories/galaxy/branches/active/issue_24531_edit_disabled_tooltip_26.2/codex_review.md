# Codex review

Codex found one defect. I confirmed it and fixed it (folded into the fix commit).

- **P1 (CONFIRMED):** `get_tooltip_text` looked up `aria-describedby` with `find_element_by_id`. vGTooltip sets `aria-describedby` on mount (`vGTooltip.ts:421-423`), but only appends its balloon to the page after the hover delay. On Selenium, hovering a directive tooltip button such as display would raise `NoSuchElementException` before the balloon wait began. Playwright hid this because a missing id doesn't raise there. **Fix:** a non-raising `find_elements_by_selector("#<id>.g-tooltip")`, which also replaces the class-token check.

Codex did not run the E2E tests. Its coverage notes say it reviewed only the changed regions of the large driver files.
