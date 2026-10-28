# Review 1 debrief

The reviewer found no bugs, so I made no changes. The review was read-only: no tests were run.

Not acted on:
- The helper doesn't clear a GTooltip still showing from an earlier hover. Each GTooltip belongs to its own button, so this is harmless.
- Selenium's `find_element_by_id` raises when `aria-describedby` points to a missing id. That's an edge case, since the attribute is removed on unmount.
- The review says `vGTooltip.ts` never sets `aria-describedby`. That's wrong: it does, at `vGTooltip.ts:423`, with the `g-tooltip-N` balloon id. The helper picks out GTooltip by its `data-show` attribute rather than by id prefix, so this doesn't matter.

<details><summary>Review</summary>

- **Verdict:** no real bugs; ready.
- **Selenium/Playwright parity:** the helper only uses `get_attribute`, `find_element_by_id` and `.text`, which both backends implement. It waits for `data-show=true` before reading `.text`.
- **Other Selenium callers:** `_assert_title_buttons` hovers the enabled edit button ("Edit attributes") through the new path, and the text matches. No Selenium tooltip assertions exist on the four converted audit buttons.
- **Layout and clicks:** GTooltip renders inside the button with `pointer-events: none` and is positioned by a transform, so clicks and layout are unaffected.
- **Skipped audit sites** (bulk-delete loading titles, GCard data-driven actions): agreed, follow-up material.
- **Python imports:** nothing new added.

</details>
