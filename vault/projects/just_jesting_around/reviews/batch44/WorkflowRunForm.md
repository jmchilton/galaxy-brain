# WorkflowRunForm

Selected originator: `client/src/components/Workflow/Run/WorkflowRunForm.test.ts`. Baseline and final: **9 tests**.

The suite was already well structured: module-level `vi.mock` stubs for the step and form children, a `findStep` helper and one case per behaviour. The edits make its inputs easier to read. Magic ids get names: `RUN1_WORKFLOW_ID` (as `WorkflowRun.test.js` calls it), `RUN1_HISTORY_ID`, and `CURRENT_HISTORY_ID` with a note that the store falls back to it as the only stored history. A one-line note records run1.json's step layout. `mountForm({ canMutateCurrentHistory })` replaces a positional boolean. `withPlugins(localVue, pinia)` replaces the hand-built `plugins` spread and the explicit `setActivePinia`, since installing the testing Pinia makes it active. The fixture is copied with `structuredClone`, not a JSON round trip. The `as object` cast on `mount` is gone; vue-tsc accepts it. `wrapper.vm.$nextTick()` became `nextTick()`. `findCardForm(wrapper, title)` finds the `FormDisplay` inside the `FormCard` with that title, so the tests no longer pick "the first" or "the second" FormDisplay by position. `run` is now `clickRun`, the two class selectors live in `SELECTORS`, and arrange/act/assert are separated.

Seeding timing is unchanged. The store is seeded through `initialState` before mount. The no-history case still empties `storedHistories` after mount. `seedCurrentHistory` doesn't fit here: this Pinia stubs actions, so `setHistory` would be a no-op, and turning stubbing off would run actions the original kept stubbed. The `vi.mock` child stubs are unchanged. FormCard, GButton and GAlert render as before.

Every original assertion survives. Strengthened: "renders nothing without a current history" is now "stops rendering when the current history goes away" and first checks that the form rendered. Before, it would pass if the form had never rendered at all. Removing the store clear fails it. Two other titles changed: "asks to switch to the simple form" (it emits `showSimple`, it doesn't switch), and "sends results to a new history when the current one is immutable" (it mounts with `canMutateCurrentHistory: false`). Emitting the parameter change into the History Options form instead of Workflow Parameters fails that case, so `findCardForm` targets the right card.

Reuse: `getLocalVue`, `withPlugins`, `nth`, `suppressDebugConsole` from `@tests/vitest/helpers`. No new helper.

Validation: 9 tests pass shuffled (seed `440101`, `NODE_OPTIONS=--no-webstorage`). Per-file coverage is identical at base and tip (`WorkflowRunForm.vue` 83/94 statements, 49/64 branches; `model.js`, `historyStore.ts`, `userStore.ts` unchanged). ESLint, Prettier and full client vue-tsc pass.

Guidance: none. The inline `currentUser: { id: "user_id" }` and stored history `{ id, name }` are partial objects in untyped `initialState`. They are local to this file, so they were left as they were.
