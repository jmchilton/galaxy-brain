# galaxy#23731 - Add keyboard and screen-reader support to GPopover

- PR: https://github.com/galaxyproject/galaxy/pull/23731 (itisAliRH)
- Reviewed SHA: `58675142b3def102fd193779f113074abb5e9e20`
- Worktree: `~/projects/worktrees/galaxy/pr/23731`
- Scope: 9 files, +728/-33. User already approved from visual inspection; this is a double-check.
- Local run: `GPopover.test.ts`, `escapeStack.test.ts`, `CreatorViewers.test.ts`, `ToolsListCard.test.ts`
  all pass under node 22.20.0 (97 tests).

## Verdict

Solid. Approval stands. ARIA wiring, focus return, Escape and listener cleanup are correct. One small
mouse-user regression is worth a follow-up (confirmed with a throwaway probe test). The rest are low
or notes.

## What it does

- Hover popovers also open on keyboard focus (`:focus-visible` gate), stay open while pointer or focus
  is inside, and close on Escape (WCAG 1.4.13).
- Click popovers become `role="dialog"` non-modal disclosures: `aria-haspopup`/`aria-expanded`/
  `aria-controls` on trigger, accessible name from title / `ariaLabel` / trigger id, focus moved into
  the container on open, Tab past either end returns to trigger.
- New `packages/ui/src/utils/escapeStack.ts`: LIFO stack so one Escape closes only the top popover,
  skipping layers behind a modal `<dialog>`.
- PersonViewer/OrganizationViewer: bare icon trigger -> `GLink` button (was not keyboard-reachable).
- ToolsListCard: `aria-label` on icon-only button.

## Findings (by severity)

### 1. Medium - mouse click inside a hover popover makes it sticky
`client/packages/ui/src/components/GPopover.vue:508-511`

The popover's `focusin` listener sets `focusInside = true` unconditionally. The trigger's `focusin`
(`:501`) is gated on `isKeyboardFocus`, but this one is not. A mouse user who hovers a popover, clicks
a link or button in it, and moves the mouse away now finds it stays open until focus moves elsewhere
(`scheduleClose` bails at `:190`). On dev it closed on leave. I confirmed this with a throwaway test:
mouseenter trigger, then move to popover, focus the `<a>`, mouseleave, advance 5x the close delay, and
the popover is still shown.

Affected callers have focusable content in `triggers="hover"` popovers, e.g. `DatasetPopoverLink`,
`ToolLinkPopover`, `TemplateSummaryPopover`, `Workflow/Editor/Node.vue` (Recommendations), and
`HistoryStorageOperationsIndicator` (a `BLink`, which renders `href="#"`).

Fix: gate it the same way as the trigger:
```ts
listen(popoverEl.value, "focusin", (event) => {
    if (isKeyboardFocus(event.target)) {
        focusInside = true;
    }
    closeDelay.clear();
});
```
Add a test for this next to "stays open while focus moves into the popover".

### 2. Low - hover popovers bound with `show.sync` to a toggle button now invert on keyboard
- `client/src/components/Form/Elements/FormData/FormDataExtensions.vue:45,53`: `GButton :pressed.sync`
  and `GPopover :show.sync` share `localFormatsVisible` with the default `triggers="hover"`. Tabbing onto
  "accepted formats" now opens the popover and flips `aria-pressed` to true without any activation.
  Enter then closes it. (Mouse hover already had this coupling, so the keyboard now inherits it.)
- `client/src/components/ToolsList/ToolsListCard.vue:346,356`: same shape. Focus opens the popover, and
  Enter (`@click="showPopover = !showPopover"`) closes it.

Not a blocker. For these callers the natural fix is on the caller side: `triggers="click blur"`, or
drop the manual toggle. It's worth a line in the PR thread so nobody reads it as a GPopover bug later.

### 3. Low - `TABBABLE_SELECTOR` edge detection ignores visibility
`GPopover.vue:446`, used at `:535-551`. The last matched element may be hidden (`v-show`,
`display:none`) or `[tabindex]` on a disabled element. In that case `activeElement === edge` never
holds, and Tab from the real last control leaves the popover in DOM order instead of returning to the
trigger. With `blur` in the triggers, the focusout closes the popover, so the damage is small. No shared
tabbable helper exists in `client/` to reuse (I checked), so this is a filter tweak
(`el.offsetParent !== null` / `checkVisibility()`) if anyone cares.

### 4. Low / note - Escape handling now lives in three places
- `GTooltip` via `useAccessibleHover` (`packages/ui/src/composables/accessibleHover.ts:45`): keydown on
  the trigger only.
- `GDropdown.vue:230`: component keydown plus `stopPropagation`.
- GPopover: document keydown plus the new `escapeStack`.

These don't conflict: GDropdown stops propagation, and tooltip plus popover both closing on one press is
fine. `escapeStack` is a genuinely reusable piece (small, tested, exported from `utils/`), so it's the
one to converge on. A follow-up could put GTooltip on it so a hovered (not focused) tooltip also
dismisses on Escape per 1.4.13. The PR doesn't need to do that.

Also a note: bootstrap-vue `BModal` is not a `<dialog>`, so `isBehindModal` (`:299`) doesn't see it. A
hover popover left open behind a BModal closes on the same Escape that closes the modal. That's
harmless.

### 5. Note - interactive content in hover popovers is still keyboard-unreachable
Hover popovers stay `role="tooltip"` and are relocated to the end of `<body>`, so keyboard users can now
open them on focus but can't Tab into links inside (e.g. "Do not show this again" in
`HistoryStorageOperationsIndicator`). This is pre-existing, and the PR's split (click = dialog, hover =
tooltip) is the right model. The fix is per-caller: move interactive-content popovers to click. This
could be a follow-up issue.

### Tests
- The new GPopover specs are behavior-focused and not trivial. They cover focus-visible gating,
  persistence, focus return, Escape ordering across modal/stack, dialog naming and attribute restore on
  unmount. Nothing was weakened.
- `:focus-visible` and `:modal` are mocked via `vi.spyOn(el, "matches")` because happy-dom lacks them
  (`GPopover.test.ts:626`, and the modal tests). That's reasonable, but it means the two browser-dependent
  gates are never exercised for real. One Playwright test is worth adding as a follow-up, not a blocker:
  Tab to a PersonViewer button, press Enter, check focus is in the dialog, press Escape, check focus is
  back on the trigger. Optionally, Tab onto a hover trigger opens it.
- `ToolsListCard.test.ts:100` (asserts a static `aria-label` string) is borderline trivial, but harmless.
- `CreatorViewers.test.ts:43`: fine. `title` containing "details" is a loose assertion, but OK.

### Comments
The comments are dense with WCAG SC references, but they explain *why* and match the existing GPopover
style. There are no obvious or redundant comments worth flagging.

## Draft GitHub comment (follow-up, not a verdict)

```
*Posted by Claude (AI assistant) on behalf of jmchilton - not personally authored.*

Follow-up double-check after the approval - nice work, the ARIA/focus wiring and the escape stack look right. A few things, none blocking:

1. **Mouse click inside a hover popover makes it sticky.** The popover's own `focusin` handler sets `focusInside = true` unconditionally (GPopover.vue ~L508), while the trigger's is gated on `:focus-visible`. So a mouse user who clicks a link/button inside a hover popover (DatasetPopoverLink, ToolLinkPopover, Node recommendations, ...) and moves away now sees it stay open until focus goes elsewhere; on dev it closed on leave. Gating it the same way fixes it:
   ```ts
   listen(popoverEl.value, "focusin", (event) => {
       if (isKeyboardFocus(event.target)) {
           focusInside = true;
       }
       closeDelay.clear();
   });
   ```
2. **`show.sync` + toggle callers invert on keyboard.** `FormDataExtensions` (`:pressed.sync` and `:show.sync` on the same value, default hover trigger) and `ToolsListCard` (manual `@click` toggle + `triggers="hover"`) now open on Tab and close on Enter; for FormDataExtensions tabbing flips `aria-pressed` without activation. Probably a caller-side fix (`triggers="click blur"`), fine as follow-up.
3. **Tab edge detection** (`TABBABLE_SELECTOR`) doesn't filter hidden elements, so a hidden last match means Tab leaves the popover in DOM order instead of returning to the trigger. Minor.
4. Tests mock `:focus-visible` / `:modal` since happy-dom lacks them - reasonable, but a single Playwright check (Tab to a PersonViewer button, Enter, Escape, focus back on trigger) would cover the real-browser paths.

`escapeStack` looks like the right shared piece to eventually move GTooltip's Escape handling onto, too.
```
