# Selenium tooltip helpers can't read GTooltip (GButton/GLink `tooltip` prop)

- Area: E2E test framework (`navigation.yml`, `NavigatesGalaxy`)
- Found while: [[Component - Galaxy UI Buttons and Tooltips]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

The generic tooltip helpers recognise only the `v-g-tooltip` balloon (`.g-tooltip-d`) and legacy bootstrap `.tooltip`:

- `client/src/utils/navigation/navigation.yml:14-18`: `tooltip_balloon: '.tooltip, .g-tooltip-d'`, with `tooltip_inner` and `tooltip_balloon_with_text` keyed on the same classes.
- `lib/galaxy/selenium/navigates_galaxy.py:3335-3346`: `get_tooltip_text` waits for `tooltip_balloon` to become visible. `assert_tooltip_text[_contains]` (`:3369-3379`) wraps it.
- `navigates_galaxy.py:2102-2104`: `clear_tooltips` waits only for `.g-tooltip-d`.

GButton/GLink with the `tooltip` prop, and direct `<GTooltip>` users, render `div.g-tooltip`, which none of these selectors match. That node stays mounted the whole time the reference has a title: it is `sr-only` and toggled through `data-show` (`client/packages/ui/src/components/GTooltip.vue:113-130`). An absence-based wait like `_clear_tooltip` (`:3320-3333`) could never succeed on it.

So a test that calls `assert_tooltip_text` on a button times out if someone switches the button from `v-g-tooltip` to `tooltip`/`disabled-title`, even though the user-visible behaviour improved.

## Evidence / repro

Call `assert_tooltip_text` on any GButton rendered with `tooltip`, for example `Tool/Buttons/ToolFavoriteButton.vue`. `tooltip_balloon.wait_for_visible()` times out. The only GTooltip-aware read at this SHA is ad hoc: `workflow_editor_try_connect` follows `aria-describedby` to `tooltip_by_id` (`navigates_galaxy.py:1439-1440`).

## Suggested fix

In `get_tooltip_text`, after hovering, read the element's `aria-describedby`. If it resolves to a `.g-tooltip`, wait for `data-show="true"` and return its text. Otherwise fall back to the balloon path. Have `clear_tooltips` also wait for no `.g-tooltip[data-show="true"]`.

## Related

- Branch record `vault/repositories/galaxy/branches/active/issue_24531_edit_disabled_tooltip_26.2/`. Its unmerged change adds exactly this fallback.
- galaxyproject/galaxy#24531
