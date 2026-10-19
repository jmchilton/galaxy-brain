# Test challenges debrief — PR #24269

Profile: gx_test_challenger. Model: claude-opus-5-5, medium effort. Reviewed commit `bb9621184d6f58668bc485d127a2c06528c7d57b` (merge-base `d57ebf638ac`).

Recommendations only; PR not edited.

## Tests in the PR

`client/src/components/BaseComponents/GButton.test.ts` — new `GButton.vue pressed` block (8 cases). Ran with node 22.20.0 alongside `src/style/tokensContract.test.ts` and `src/components/Markdown/Editor/CellAdd.test.js`: 3 files, 40 tests pass.

| Test | Verdict |
| --- | --- |
| pressed true → `aria-pressed="true"` | Keep. Behavioural (rendered DOM), red without the change. |
| pressed false → `aria-pressed="false"` | Keep. Pins the compat string cast (a bare `false` attr would be dropped). Red without the change. |
| pressed omitted → no `aria-pressed` | Keep. Guards the `withDefaults({ pressed: undefined })` choice; passes on base, but that is the point of a guard. |
| router-link root → no `aria-pressed` | Keep. |
| `aria-expanded` / `aria-haspopup` → no `aria-pressed`, class kept | Keep. Good: also asserts styling (`g-pressed`) and passthrough attr survive. |
| `aria-expanded` arriving later drops `aria-pressed` | Keep. Pins reactivity of `useAttrs()` in a computed — a real regression risk. Uses `global: withPlugins(localVue)` + wrapper component while the rest of the file uses `mountGButton`/`propsData`; minor idiom inconsistency, not worth a finding. |
| click emits `update:pressed` with toggled value | Keep. Baseline behaviour (passes on base); first coverage of the v-model contract. |

No mocks, no implementation-poking, no `vm` access. Nothing to drop. Follows client README guidance (DOM assertions over internals). `mount` over `shallowMount` is justified: GButton is a leaf whose root element is what's under test.

`tokensContract.test.ts` regex widened `\d00` → `\d[05]0` so half-step palette tokens aren't counted as non-palette. This adjusts the test to new data, but legitimately: grey-250 is a palette shade, and the parity check (package vs client value) still covers it. Not weakening.

## Gaps

1. **Consumer `aria-pressed` override untested.** PR description promises "An explicit `aria-pressed` from a consumer still wins." That rests on `:aria-pressed` being declared before `v-bind="{...$attrs}"` in the template — easy to break by reordering. One `it` in the pressed block: `mountGButton({ pressed: true, "aria-pressed": "mixed" })` → `"mixed"`.
2. **Call-site `?? false` fixes untested.** `CellAdd.vue` and `TextComment.vue` changed so closed/off toggles report `aria-pressed="false"`. `CellAdd.test.js` already mounts the real `GButton` + `Popper` with `attachTo`; extend "opens the popper when clicking the button" to assert `aria-pressed` is `"false"` before the click (red without `?? false`) and `"true"` after. TextComment has no direct unit test; covered by the E2E suggestion below in spirit, otherwise acceptable to leave.
3. **No E2E check of the user-facing a11y claim.** `lib/galaxy_test/selenium/test_editor_place_comments` already clicks `editor.tool_bar.toggle_bold` / `toggle_italic` (ToolBar.vue, `v-model:pressed`). Adding `assert ...get_attribute("aria-pressed") == "false"` before and `== "true"` after each click proves the real toolbar announces state through the full stack, at near-zero cost (no new test, no new selectors). Not run here.
4. **CSS changes (focus ring, GButtonGroup z-index/border, grey-250 fill) have no automated coverage.** happy-dom can't compute layout/stacking, so unit tests would be silly; a visual-regression harness doesn't exist for these. PR screenshots + manual steps are the appropriate evidence. No recommendation.

## Not challenged (for bug-check agent, not test findings)

Many other `:pressed="..."` bindings (e.g. `CellWrapper.vue`, `FolderTopBar.vue`) may pass `undefined` and so now announce no toggle state; PR fixed only the two it noticed. Not a test issue; flagged only for awareness.

## Test plan

- Add GButton.test.ts case for consumer `aria-pressed` override (P3).
- Extend CellAdd.test.js popper test with `aria-pressed` false→true assertions (P3).
- Add `aria-pressed` assertions to existing `test_editor_place_comments` Selenium test (P3).
