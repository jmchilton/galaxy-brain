# Normal review: a11y follow-ups

Reviewed 2026-10-19 against the coordinator's initial uncommitted implementation diff. No code changes or Git mutations performed by this reviewer. Read the shared REVIEW_FOCUS.md before reviewing.

## Outcome

ChatInput's explicit `aria-label="Send message"` correctly names its icon-only GButton across empty, ready, busy, and disabled states. The existing busy/disabled behavior remains intact. Tests retain all existing assertions and add accessible-name regressions.

The classic Popper header close control is correctly changed from a mouse-only span into a native non-submit button with an explicit name. Explicitly hiding the decorative icon from accessibility APIs is appropriate. The outer `v-show` hides the entire popper when closed or disabled, including its new tab stop. Existing `.popper-close` delegated click handling remains compatible with the new button.

Two hardening points were sent to the coordinator, who accepted them:

1. Keyboard focus should return to the invoking control when activating the close button. The initial implementation simply hides the focused close button. Restore focus to the supplied `referenceEl`, or the first focusable control inside the generated reference wrapper, specifically when the close button held focus. Verify the behavior in a real browser, since synthetic DOM clicks do not model keyboard activation or hidden-focus behavior completely.
2. The reset CSS should also cover active state. Galaxy's global `base.scss` and `overrides.scss` extend every native button with Bootstrap's `.btn-secondary` rules. The generated `button:not(:disabled):not(.disabled):active` rule has higher specificity than `.popper-close[data-v]` and can override the transparent background/inherited color while pressed. Explicit scoped active styling should preserve the intended appearance while retaining a visible keyboard focus indicator.

These are improvements to the newly exposed titled-popover keyboard path; no existing production consumer regression was found. All ten production imports of this classic Popper currently omit the title prop, so the built-in header close control is presently exercised by component tests/stories. The supported titled API still merits correct focus handling.

## Surrounding integration checks

- `usePopper` clears pending hover timers and closes via delegated `.popper-close` clicks for click-trigger mode; the direct close handler supports other trigger modes.
- The Markdown editor's CellAdd uses a custom slotted `.popper-close` container. Component-scoped CSS does not apply the built-in close-button reset to that descendant slot container, and its delegated behavior remains unchanged.
- No changes were made to the shared GButton/GLink tooltip implementation or its positioning/component API.
- No assertion weakening was observed. The proposed accessible-name regressions are targeted at the actual rendered DOM.

## Validation limits

This was an independent source/integration review, not the sequential hardening challenge. The coordinator owns test execution and the accepted focus/CSS follow-up. This review does not claim to have validated those subsequent edits.
