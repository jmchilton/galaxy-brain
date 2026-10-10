# #24035 — GButton/GLink tooltips get read into the accessible name

https://github.com/galaxyproject/galaxy/issues/24035. Filed 2026-10-10, assigned to jmchilton.

[Proposal as posted](proposal.md) · [Debrief](debrief.md) · [Source draft](issue_draft.md)

## Summary

`GButton.vue` and `GLink.vue` nest `GTooltip` inside the `<button>`/`<a>` (Vue 2 single-root leftover, `TODO: make tooltip a sibling in Vue 3`). The `sr-only` tooltip text joins the accessible name, and `aria-describedby` reads it again as the description. About 74 call sites with visible text are affected. Nested since #19946 (25.0); `GLink` copied it in #20063.

## Next

Extract `GPopover`'s `relocate()` (#21959, `closest("dialog") ?? body`) into a shared composable and use it in `GTooltip`. Bind `hidden` while the tooltip isn't showing, and add an `aria-label` fallback for icon-only controls, checked on `nextTick` after the tooltip moves. Red first: the repro vitest in the issue plus the dialog and `hidden` guard tests. The fix sketches and guards in the debrief's scratchpad are gone, so rebuild them from the proposal. `GTooltip.test.ts` needs its lookup retargeted to `[role=tooltip]` (assertions untouched).

Found by the just_jesting_around play lane (`vitest_story_play`). Once fixed, `GButton.stories.ts`'s `labelled()` regex should stop tolerating the tooltip suffix.

## Related

- #24031: same lane, `v-g-tooltip` `.html` `aria-label`.
- Unfiled: `v-g-tooltip` sets `aria-label` from tooltip text even on buttons with visible text, so the tooltip replaces the visible label (WCAG 2.5.3). See debrief Leftover.
