# ZoomControl

Selected originator: `client/src/components/Workflow/Editor/ZoomControl.test.js` (the editor's `ZoomControl.vue` re-exports `Graph/ZoomControl.vue`). Baseline **1 test** → final **7 tests**.

The single "test zoom control" case clicked all three buttons on one wrapper and read emissions by index, so each assertion depended on the clicks before it. It is now a `mountZoomControl(zoomLevel)` helper, a rendering case, and an `it.each` table of button, starting level and emitted level, each on a fresh mount. Buttons are found by `aria-label` through `SELECTORS` rather than by position, and each click checks the full emission list (`[[level]]`), so a stray second emission fails.

Removed dead mock: `vi.mock("app")`. A throwing factory in its place leaves the original suite green; the same factory under `@/utils/zoomLevels` fails on import. ZoomControl imports nothing app-like, so nothing in the test depended on it.

Every original assertion survives: three buttons (now their labels, in order); zoom out at 1 emits 0.9, reset emits 1, zoom in emits 1.1. Added: the reset button shows `100%`; reset from 2 emits 1 (reset at 1 couldn't tell "emit the default" from "emit the current level"); zoom out is disabled at `minZoom` and zoom in at `maxZoom`, with no emission on click. Changing the expected percentage, the zoom-in level or the disabled row's level fails the matching case.

Reuse: `getLocalVue`; `minZoom`/`maxZoom` from `@/utils/zoomLevels` instead of literals. `emittedArg` is no longer needed. No new helper.

Validation: 7 tests pass shuffled (seed `440101`, `NODE_OPTIONS=--no-webstorage`). Per-file coverage: `Graph/ZoomControl.vue` unchanged at 13/13 statements; `zoomLevels.ts` unchanged; `GButton.vue`, `clickableElement.ts` and `currentTitle.ts` rise (disabled path); nothing drops. ESLint, Prettier and full client vue-tsc pass.

Guidance: none.
