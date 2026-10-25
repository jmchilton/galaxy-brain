# Review 2 (post re-scope) - issue_24377_history_item_buttons_26.2

Range: `origin/release_26.2...HEAD` (5 commits); focus on 558610640ca, 85ae6af42b4, 7098c59bf59.

## Verdict

Ship it. No real bugs found. The `g-collapse-shown` marker is correct for every path the history panel exercises, the helper change is safe for all `wait=True` callers, and the discarded-test `aria-disabled` check is the right call given the queued tooltip bug. Only nits below.

Verified locally: `GCollapse.test.ts` + `MarkdownGalaxy.test.js` (existing `.g-collapse` consumer) pass under node 22.20.0 (16/16).

## GCollapse state analysis (558610640ca)

`isShown` is reset to false in the sync `isOpen` watcher on every toggle, set true in `onMounted` when mounted open, and set true in `onTransitionEnd` only when `e.target === el && isOpen`. Cases:

- **Rapid toggles / close-then-reopen mid-transition**: sync watcher clears the flag; the reopen sets height `0px` then rAF `scrollHeight`, so a height transition runs and its `transitionend` (target el, isOpen true) sets the flag. The interrupted close transition gets `transitioncancel`, not `transitionend`. Correct.
- **Open-then-close before end**: flag already false; the close `transitionend` takes the `else` branch, never sets it. Correct.
- **Child `transitionend` bubbling**: blocked by the existing `e.target !== el` guard. Correct.
- **Prop vs v-model / accordion close**: all go through `isOpen`, so the sync watcher covers them. `closeSelf` on a `:visible`-driven member doesn't change `isOpen` (pre-existing accordion limitation, not affected here).
- **Mounted open** (e.g. history item re-mounted while expanded): `onMounted` sets the flag immediately. Correct.
- **Zero-duration / no-op transition** (the only way to get stuck false): happens if `scrollHeight` is 0 at rAF time, transitions are disabled, or the element isn't rendered. For history items it can't be 0: the `GCollapse` in `ContentItem.vue` has `class="px-2 pb-2"`, so scrollHeight includes ~8px of padding even before `DatasetDetails` loads, and computed height still goes `0px -> Npx`. No global `prefers-reduced-motion`/`transition: none` rule targets `.g-collapse` (only the opt-in `.no-transition` class). So no history item body should fail to get the marker. Note the same no-transition case already left the panel clipped at `height: 0px; overflow: hidden` before this branch, so the marker doesn't make that worse. A hang there would point to a real UI bug.
- **Race in `ContentItem`**: `DatasetDetails` mounts on `contentActive` and loads async. The transition targets the loading-state height, then `transitionend` sets `height: auto; overflow: visible`, so later content grows freely. Marking "shown" at that point is right: what tests need is "no longer clipped", not "content loaded", and the button waits cover the rest.

## Helper safety (85ae6af42b4)

- `${_} > .g-collapse-shown`: the `GCollapse` is a direct child of `.content-item` in `ContentItem.vue:433`, so the child combinator matches and won't match a nested collapse.
- All `history_panel_click_item_title(..., wait=True)` callers (and `history_panel_ensure_showing_item_details`, `hda_click_primary_action_button`) target expandable datasets. Collections and `accessible === false` items would already hang on `details.wait_for_visible()` before this change, so the change adds no new hang. Non-wait callers (`navigates_galaxy.py:554,667`, `test_tool_form.py`) are unaffected.
- The close path is unchanged.

## Test changes (7098c59bf59)

- Discarded: the title buttons (display, delete) and the info action button are asserted with tooltips. The disabled edit button is asserted via `aria-disabled == "true"`. Given that `vGTooltip` skips aria-disabled elements (queued as a separate issue), asserting the tooltip would either fail or lock in the bug. The `aria-disabled` assertion pins the real behaviour (edit unavailable for discarded) and doesn't depend on the bug. Right call.
- Deferred: default title buttons (edit enabled for `deferred`, consistent with `editDisabled` in `ContentOptions.vue:53`) plus info. Good.
- `BUTTON_TOOLTIPS` now matches `ContentOptions.vue` (`View`, `Edit attributes`, `Delete`). The `PARTIAL_TOOLTIP_BUTTONS` split for the size-suffixed download tooltip reuses the existing `assert_tooltip_text_contains`. Good reuse.

## Vitest quality

The tests are adjacent to the component, test behaviour through rendered classes (no `wrapper.vm`), have one behaviour each with descriptive names, and follow the sibling `GCheckbox.test.ts` style. They are not trivial: test 2 is the red-to-green core. Optional additions (not required):
- a child `transitionend` must not mark it shown (guard regression);
- a close-transition `transitionend` must not mark it shown.

## Nits

1. The test comment reads as intended behaviour, but it is the queued bug. Suggest:
```diff
-        # disabled buttons show no tooltip
+        # vGTooltip skips aria-disabled buttons, so check the state, not "This dataset is not yet editable."
```
2. `GCollapse.vue` comment: the marker is a generic "fully expanded" state, not test-only. Suggest:
```diff
-// True once fully open (after the open transition), so tests can wait out the animation
+// True once the open transition has ended and content is no longer clipped
```
3. (Optional) `history_panel_ensure_showing_item_details` returns early if `.details` is displayed, even mid-expand (clipped). This gap predates the branch and is harmless today because callers reach it after a `wait=True` click or from a settled state. Could make `history_panel_item_showing_details` also require `details_expanded`, but out of scope.
4. (Optional) Coupling `navigation.yml` to a galaxy-ui class name is acceptable: the class is now a de facto public hook of the in-repo package. Worth a one-line mention in the PR body so galaxy-ui maintainers don't rename it.
