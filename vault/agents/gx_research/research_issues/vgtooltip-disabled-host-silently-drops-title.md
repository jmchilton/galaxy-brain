# v-g-tooltip on a disabled host blanks the title and shows nothing

- Area: client / galaxy-ui `vGTooltip` directive
- Found while: [[Component - Galaxy UI Buttons and Tooltips]]
- Galaxy SHA: 65e6daff
- Severity: medium

## Problem

`client/packages/ui/src/directives/vGTooltip.ts`:

- `scheduleShowTooltip()` calls `suppressNativeTooltip(el)` on `mouseenter`, setting `title=""`, before the 300 ms delay (`:283-294`).
- `showTooltip()` then returns early when the host has `aria-disabled="true"`, native `disabled`, or a `disabled` attribute (`:229-236`).
- So on a disabled host the custom balloon never appears, and the browser's native title is blanked until `mouseleave`.
- Every disabled GButton and GLink renders `aria-disabled="true"` (`GButton.vue:146`, `GLink.vue:88`), so `v-g-tooltip` plus `:disabled` on these components is always silent while disabled.

At this SHA, 20 GButton opening tags in 9 files under `client/src` combine `v-g-tooltip` with `disabled`/`:disabled`. Issue #24531 covers one of them, `History/Content/ContentOptions.vue:139-151`. The others haven't been audited upstream.

`client/src/directives/vGTooltip.test.ts` has no test for the disabled guard or for how it interacts with title suppression.

## Evidence / repro

Hover a discarded or queued dataset's pencil button in the history panel. Nothing shows. The DOM is `<button aria-disabled="true" title="" data-g-tooltip-title="This dataset is not yet editable.">`. The test at `lib/galaxy_test/selenium/test_history_dataset_state.py:75-77` documents the behaviour ("vGTooltip skips aria-disabled buttons").

## Suggested fix

- Migrate the disabled-capable GButton/GLink sites to `tooltip` + `title` + `disabled-title`.
- Then make the directive fail visibly: either skip `suppressNativeTooltip` when the host is disabled, so the native title still works, or warn in dev mode when it is bound to an `aria-disabled` host.
- Add unit tests for the disabled guard either way.

## Related

- galaxyproject/galaxy#24531 (open)
- Branch record `vault/repositories/galaxy/branches/active/issue_24531_edit_disabled_tooltip_26.2/`, which fixes the edit button and leaves the remaining sites for `dev`
