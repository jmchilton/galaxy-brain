# Disabled history item edit button never shows its "not yet editable" tooltip

Agent-to-agent draft. Found 2026-10-22 by the gx_workhorse while implementing #24377 (branch `issue_24377_history_item_buttons_26.2`, base `release_26.2`). Check against `dev` before filing.

## Symptom

A history dataset whose state is `discarded`, `new`, `upload`, `queued`, `running` or `waiting` has a disabled edit (pencil) button. `ContentOptions.vue` gives it the title `"This dataset is not yet editable."` (`editButtonTitle`/`editDisabled`). Hovering it shows nothing: no custom tooltip and no native `title`. The user gets no hint about why the button does nothing.

Reproduced in a browser test: hovering `.edit-btn` on a discarded dataset never produces a `.g-tooltip-d` balloon (Playwright, `release_26.2` `fe7b52529a0`). The other title buttons on the same item do.

## Cause

- The button is `<GButton v-g-tooltip.hover :disabled="editDisabled" :title="localize(editButtonTitle)">`.
- `vGTooltip.showTooltip` (`client/packages/ui/src/directives/vGTooltip.ts` ~229-234) returns early when the element is `disabled`, has a `disabled` attribute, or has `aria-disabled="true"`. GButton renders `aria-disabled="true"` when disabled.
- The directive also blanks the native `title` (`suppressNativeTooltip`; DOM shows `title=""` with `data-g-tooltip-title="This dataset is not yet editable."`). So the browser's own tooltip is gone too.
- This conflicts with 7db6679d6aa (2026-06-14, "Show GButton disabled title by dropping pointer-events: none"). The comment in `GButton.vue` (~303) says hover must keep working so the `disabledTitle` tooltip shows. That works through GButton's own `tooltip` + `disabled-title` props (GTooltip). It doesn't work through `v-g-tooltip`.

## History

This isn't new in 26.2. The directive's disabled guard dates to dac29ace29a (2026-02, v-b-tooltip → v-g-tooltip). On `release_26.1` the button was a natively disabled `BButton`, which fires no mouse events at all.

## Fix options

1. In `ContentOptions.vue`, switch the edit button to the established pattern (about 27 uses in `client/src`):
   - replace `v-g-tooltip.hover` with GButton's `tooltip` prop
   - use `title="Edit attributes"` and `:disabled-title="'This dataset is not yet editable.'"`
   - this drops the `editButtonTitle` computed
2. Make `vGTooltip` show for `aria-disabled` elements, but not for native `disabled` ones. This applies app-wide, so audit the other `v-g-tooltip` + `disabled` call sites.
3. Audit the other `v-g-tooltip` + `:disabled` GButton uses for the same silent-tooltip problem.

## Test impact

The Selenium framework's `tooltip_balloon` (`navigation.yml`: `.tooltip, .g-tooltip-d`) and `_clear_tooltip`/`get_tooltip_text` (`lib/galaxy/selenium/navigates_galaxy.py` ~2962-2989) assume a balloon that is added on show and removed on hide. GTooltip renders an always-mounted `.g-tooltip`, which is `sr-only` while hidden. Option 1 therefore needs a tooltip helper that understands GTooltip before `test_history_dataset_state.py::test_dataset_state_discarded` can hover-assert the disabled title. That test currently asserts `aria-disabled="true"` on the edit button instead, with a comment.
