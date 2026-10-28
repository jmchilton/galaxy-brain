The disabled edit (pencil) button on a history item never shows its "This dataset is not yet editable." tooltip, so users get no hint why it does nothing.

For a dataset in `discarded`, `new`, `upload`, `queued`, `running` or `waiting` state, hovering the pencil shows nothing: no tooltip balloon and no native browser `title`. The neighboring buttons on the same item show their tooltips normally. The rendered button looks like this:

```html
<button type="button" aria-disabled="true" title="" data-g-tooltip-title="This dataset is not yet editable." class="g-button ... edit-btn ...">
```

The text is there, but nothing ever displays it.

<details><summary>Why</summary>

- `ContentOptions.vue` renders the button as `<GButton v-g-tooltip.hover :disabled="editDisabled" :title="localize(editButtonTitle)">`.
- `vGTooltip.showTooltip` (`client/packages/ui/src/directives/vGTooltip.ts`) returns early when the element is `disabled`, has a `disabled` attribute, or has `aria-disabled="true"`. A disabled GButton renders as a plain `<button>` (even with `href`) carrying `aria-disabled="true"`.
- The directive also blanks the native `title` (moving it to `data-g-tooltip-title`), so the browser's own tooltip is gone too.
- GButton deliberately keeps hover working when disabled (comment in `GButton.vue`: dropping `pointer-events: none` so the `disabledTitle` tooltip shows). That works through GButton's own `tooltip` + `disabled-title` props, not through `v-g-tooltip`.

</details>

## Context

Bug discovered while working on 🎯 #24377 (history item button checks in `test_history_dataset_state.py`); that test now asserts `aria-disabled="true"` on the edit button instead of hovering for the disabled title. Not a 26.2 regression: the directive's disabled guard came with the v-b-tooltip → v-g-tooltip migration, and on 26.1 the button was a disabled `BButton` link, which Bootstrap gives `pointer-events: none`, so hover never fired.

## Proposed Approach

Switch the edit button in `ContentOptions.vue` to GButton's established disabled-tooltip pattern (`tooltip`, `title="Edit attributes"`, `disabled-title="This dataset is not yet editable."`, used in ~23 components under `client/src`) and drop the `editButtonTitle` computed. Then audit the other `v-g-tooltip` + `:disabled` GButton uses (~20 across 9 components) for the same silent tooltip.

## Alternative Approaches

Changing `vGTooltip` to show on `aria-disabled` elements would fix every call site at once, but it changes behavior app-wide and duplicates what GButton's `disabled-title` already does; fixing call sites keeps one disabled-tooltip mechanism.

<details><summary>Alternatives In Detail</summary>

### Alternative: Let vGTooltip show for aria-disabled elements

<details><summary>Description</summary>

#### Details

Keep the early return for native `disabled`, but allow `aria-disabled="true"` elements (which still receive hover) to show the tooltip.

#### Why the proposed approach is preferred

GButton already owns the disabled-title behavior. Two mechanisms for the same thing invites drift, and an app-wide change needs an audit of every `v-g-tooltip` + `disabled` site anyway.

</details>

</details>

<details><summary>Test impact</summary>

The Selenium helpers (`tooltip_balloon` in `navigation.yml`, `_clear_tooltip`/`get_tooltip_text` in `lib/galaxy/selenium/navigates_galaxy.py`) assume a balloon added on show and removed on hide. GTooltip renders an always-mounted `.g-tooltip` that is `sr-only` while hidden, so a hover assertion on the disabled title needs a GTooltip-aware helper.

</details>
