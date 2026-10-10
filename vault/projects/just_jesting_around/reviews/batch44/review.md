# Batch 44 review

Range `b77cd65c227..da191dc1477`, four originator commits, one test file each, no helper commits, no production code.

## Improve readability of ZoomControl tests (b62f7affec2)

Approved.

Mapping (original single case "test zoom control"):
- `buttons.length === 3` -> "renders zoom out, reset and zoom in buttons…" (now the three aria-labels in order, plus `100%` text).
- click button 0 -> 0.9 -> `it.each` row "zoom out at zoom 1 emits 0.9".
- click button 1 -> 1 -> row "reset at zoom 1 emits 1".
- click button 2 -> 1.1 -> row "zoom in at zoom 1 emits 1.1".
- New: reset from 2 emits 1; zoom out disabled at `minZoom`, zoom in at `maxZoom`, no emission.

Findings:
- No lost sequence. The original never fed an emission back into `zoomLevel`, so every click ran against level 1; three fresh mounts at level 1 test the same thing. Each row checks the whole emission list (`[[expected]]`), which is stronger than reading by index.
- The disabled-case "no emission" check means something. GButton sets `aria-disabled`, not native `disabled`, so VTU's `trigger` still dispatches and GButton's `onClick` guard is what stops the emit.
- `vi.mock("app")` was dead, as the README's mocking section says. Removing it is correct.
- `minZoom`/`maxZoom` are reused from `@/utils/zoomLevels` instead of literals. Good.

## Improve readability of hoverBridge tests (fffc4ff6b83)

Approved.

Mapping:
- Far-edge table (top-start, right, left-end): same exit points, rects now come from `LAYOUTS`.
- Slow diagonal: `icon`/`wide` destructured from `LAYOUTS["bottom-start"]`, same values.
- Dead-spot table: `it.each(PLACEMENTS)`, same five layouts in the same order (key insertion order).
- `computeHoverGap` "spans the gap…" split into below (trigger/popover) and beside (`LAYOUTS.right`). Same inputs and polygons.
- "is empty when touch / diagonal" became an `it.each` with the same two rects.

Findings:
- I checked every rect literal against the original. All five pairs match exactly, as do the exit points and the expected polygons. The "10px apart" comment holds for all five layouts.
- `satisfies` with `keyof typeof LAYOUTS` gives typed placement rows. That is a real gain, and the `Object.keys` cast is the usual idiom.

## Improve readability of vSanitizeHtml tests (a6b3042e176)

Changes requested.

Mapping:
- Default profile / argument as profile: unchanged assertions. The profile is now passed by name.
- "treats null and undefined as empty" (two mounts, two calls) -> `test.each` with one exact call per case, plus a new rendered-output check.
- Non-string loop -> `test.each` (object, array, number). Each case keeps its rendered-output check. The vacuous `calls.every(html === "")` became an exact `[["", "default"]]`. `toHaveBeenCalledTimes(3)` became `toHaveBeenCalledOnce()` per case, plus a check on the warning's arguments. That is stronger and keeps the intent.
- Re-sanitize, unrelated re-render, v-if reuse and unmount: assertions unchanged. Dropping `await nextTick()` after `setProps` is fine, because `setProps` awaits a tick and the `[data-other]` text check shows the re-render happened.
- `afterEach(vi.restoreAllMocks)` is justified. The vitest config doesn't restore mocks globally, and the old trailing `mockRestore()` was skipped when an assertion failed.

Findings:
- **The file-level `eslint-disable vue/one-component-per-file` can be avoided.** The second host exists only for the v-if reuse case. Its template is just "directive element vs. same-tag plain element", and that fits into `mountWith`'s host with one more prop. Add `rich: { type: Boolean, default: true }` and render `<div v-if="rich" class="target" ${directive}="value" /><div v-else class="target">plain</div>`. The reuse case then becomes `mountWith("<b>rich</b>")`, then `setProps({ rich: false })`, then asserts `targetOf(wrapper).innerHTML` is `"plain"`. That leaves one `defineComponent` in the file, so the rule no longer fires and the disable goes. The scenario keeps the same-tag v-if/v-else pair it relies on. (An alternative is one module-level `Host` using a dynamic arg `v-sanitize-html:[profile]`. The `rich` prop is the smaller change.) Copying a disable from `vGTooltip.test.ts` adds one to a count the project wants to bring down, and here it isn't needed.
- Not in scope: `vNoSanitizeHtml.test.ts` has the same two warnings at base.

## Improve readability of WorkflowRunForm tests (da191dc1477)

Approved.

Mapping (9 to 9):
- Renders a form per step: same four assertions, with `CURRENT_HISTORY_ID` named.
- "renders nothing without a current history" -> "stops rendering when the current history goes away". It now first asserts the form rendered, which fixes an assertion that would pass if the form never rendered. Then it clears the store and checks the form is gone, as before.
- Simple form, replace params, submit (full `invokeWorkflow` payload plus `submissionSuccess`), new history (warning, disabled -> enabled, payload), client validation scroll, server validation scroll plus no `submissionError`, other errors: all assertions identical. Only ids are named and the helper is renamed `clickRun`.

Findings:
- Store seeding timing is unchanged. `initialState` is applied before mount, and the clear still happens after mount. Dropping `setActivePinia` is safe: `createTestingPinia` sets itself active, and the original's mount also ended with the test pinia active (installed last). `withPlugins` drops the default pinia from `localVue.plugins` instead of installing both. The component injects the same pinia either way, so this changes nothing.
- `findCardForm(wrapper, "Workflow Parameters" | "History Options")` matches the `FormCard` titles in `WorkflowRunForm.vue`. It replaces fragile `nth(…, 0/1)` lookups on FormDisplay. The FormCard, GButton and GAlert render paths are unchanged, and the `vi.mock` child stubs are unchanged.
- `withPlugins`, `nth` and `suppressDebugConsole` are existing helpers. The `seedCurrentHistory` rationale (actions are stubbed) holds. No new helper.
- Optional, not required: `.alert-warning` is only asserted present in the immutable case. A matching absence check in a default-mount case would pin it down, but the original didn't have one either.

## Driver follow-up

The requested fix was applied and folded into the vSanitizeHtml commit (`3a2d713c3ca`). `mountWith`'s host gained a `rich` prop with same-tag v-if/v-else targets, the reuse case uses it, and the file-level `eslint-disable` is gone. ESLint passes with `--max-warnings 0`, and 11 tests pass at that commit, shuffled. vue-tsc passes at the tip. WorkflowRunForm is now `3c6afc65dd2`.
