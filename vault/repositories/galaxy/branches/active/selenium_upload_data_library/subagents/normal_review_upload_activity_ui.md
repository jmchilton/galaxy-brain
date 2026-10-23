# Normal review: Upload Activity UI fixes (`078ff13cbc3..75f4fe30dea`)

**Top line:** approve, no code changes made. No functional bugs found. Head is still `75f4fe30dea`. Tooltip fix: keep it in this branch. One small UX regression from the CSS commit (stacked native tooltip) is parked for John, and the `useAccessibleHover` divergence is noted.

## Not acted on

- **Regression (minor, parked for John): native `title` on `TargetHistoryLink` stacks with GTooltips.** This was introduced by `55900c2dd7a`. `title` falls through to `TargetHistoryLink`'s root `<span>`. `GLink` (with `tooltip`) and the `(not current)` `v-g-tooltip` both suppress their own native title. This is confirmed from code: `GLink.vue` renders `:title="props.tooltip ? undefined : currentTitle"`, and the vitest asserts the title sits on the root span. So hovering the history name or `(not current)` shows the GTooltip and, with different text, the browser's native full-name tooltip. Native tooltips don't render headless, so there's no screenshot.
  - Recommendation: drop `:title` and its vitest. Both were added in this same unpublished commit, so this is rework of the fix rather than removing an established test. The cost is that the full name of a truncated history isn't shown on hover.
  - Alternative: add the name to `SwitchToHistoryLink`'s `linkTitle`. That touches a shared component.
  - Parked because it trades a duplicate tooltip against discoverability of the full name.
- **Sibling divergence: `useAccessibleHover`** (`GTooltip` in `GLink`/`GButton`) still shows on any focus, so a `GButton`/`GLink` tooltip on a modal opener will still linger. Aligning it would widen a shared-UI behavior change on a release branch. Better as a follow-up, or folded in if the tooltip commit is split out.
- **Nit:** `_assert_target_history_change_link_in_banner` hardcodes selectors in JS that duplicate `target_history_change_link` in `navigation.yml`. Harmless. There's a single caller, so it stays local; a shared helper isn't warranted.
- **Nit:** the `TargetHistorySelector` title vitest is close to trivial (it asserts an attribute). The E2E geometry check is the real coverage. Kept.

## Details

### Verification
- Vitest under the pinned node, using a temp config that aliases `@galaxyproject/galaxy-ui` to this worktree's `packages/ui/src/index.ts` (deleted afterwards):
  - `vGTooltip.test.ts` + `TargetHistorySelector.test.ts`: 28/28.
  - With `vGTooltip.ts` reverted to `078ff13cbc3`, "does not show a hover tooltip on pointer or programmatic focus" fails. So the alias is effective and the test is a real red-to-green.
- E2E not rerun: no code changed. The implementer ran `TestUploadActivityDataLibrary` green on both backends.

### Tooltip change (`2883161df27`): keep, split candidate
- **Gate is right.** `:focus-visible` is the browser's keyboard-modality heuristic. From memory, without rechecking, other tooltip libraries gate focus-open on focus-visible in a similar way.
  - **Verified** in headless Chromium with a plain `<dialog>` probe (not committed):
    - Opened and picked with Tab/Enter: the restored opener matches `:focus-visible`, so a keyboard user still gets the tooltip.
    - Opened and picked with mouse clicks: the opener doesn't match, so no tooltip.
  - Keyboard semantics hold: Tab still shows immediately, Escape and focusout still hide, and `.focus`-only tooltips (`FilterMenuInput`, `FilterMenuRanged`) are unaffected.
  - Engines without `:focus-visible` fall through to the old behavior via the try/catch.
  - Synthetic `focusin` without real focus still shows, so existing unit tests that `trigger("focusin")` keep passing.
- **Narrower alternatives are worse.**
  - Not restoring focus in `GModal`: native `<dialog>` restores it, and the WAI-ARIA dialog pattern requires focus return. Removing it is an a11y regression.
  - Blurring in `TargetHistorySelector`: this drops keyboard users' focus position and fixes only one opener. The same lingering tooltip affects every `v-g-tooltip` element that opens a `GModal`, and there are about 280 `v-g-tooltip` sites.
- **Blast radius:** every hover-mode `v-g-tooltip` in the client and in the Tool Shed frontend. The Tool Shed takes `@galaxyproject/galaxy-ui` as `file:../../../../client/packages/ui`, so the change is live on this branch, not gated on a publish.
  - Observable change: a click before the hover delay elapses shows the tooltip after the delay instead of instantly, and autofocus/programmatic focus no longer pops tooltips.
  - E2E tooltip helpers (`get_tooltip_text`) are hover-driven, so they're unaffected. This may reduce the `clear_tooltips()` workarounds sprinkled through `navigates_galaxy.py`.
- **Recommendation: keep it in this branch, as its own commit.** John's Fix-phase directive is to fix all found bugs here, and the fix is small and well tested.
  - Switch to a standalone galaxy-ui PR if `useAccessibleHover` should be aligned in the same change, or if release reviewers object to a shared-UI behavior change bundled with tests.

### CSS fix (`55900c2dd7a`)
- Correct and minimal:
  - `min-width: 0` down the flex chain to the `GLink`, with ellipsis and `nowrap` on the link.
  - `flex-shrink: 0` and `nowrap` on the change link.
  - Scoped to `TargetHistorySelector`, so `WorkflowAnnotation`'s use of `TargetHistoryLink` is untouched.
- The `(current)` indicator is a single unbreakable token, so it won't wrap.
- The comment is one line and fine.
- `title`: see "Not acted on".

### E2E assertions
- **Tooltip-absent check is not vacuous.** `select_target_history` waits for the modal to be absent or hidden. `<dialog>.close()` restores focus synchronously, and `focusin` showed the tooltip synchronously before the fix. The implementer saw red on both backends.
  - Hover can't produce a false failure here: the pointer was last over the modal item, not the change link.
- **Geometry check:** `getBoundingClientRect` works the same on Selenium and Playwright. It's needed because Playwright's actionability check ignores overflow clipping, so a click alone would not catch the bug.
- **`data_library_add_selected_enabled`** mirrors the existing `start_button_enabled` pattern (`:not([aria-disabled])`). Good reuse.

### Other
- Python: no new imports. Comments are one line each.
- Commit order matches the brief: Baseline tests, then the `start()` wait, then one commit per fix.
