# WorkflowSelectPreferredObjectStore

Selected originator: `client/src/components/Workflow/Run/WorkflowSelectPreferredObjectStore.test.ts`. Baseline **1 test** → final **3 tests**.

The single combined case is split by behavior. One test covers the rendered options. A two-row `it.each` table covers selection: picking `object_store_1` with no preference set, and picking the Galaxy default while `object_store_1` is preferred. One `SELECTION` constant replaces the mixed `PREFERENCES` / `ROOT_COMPONENT.preferences` selector paths, and the error selector is named. The async mount helper takes the preferred ID, builds fresh `getLocalVue(true)` plugins per mount, flushes the initial store load, and drops the `as object` cast. Wrappers unmount automatically.

All original assertions are kept. The rendering test asserts the three option cards and the `__null__` default card. The original selection row asserts that the `object_store_1` select button exists, that clicking it renders no selection error, and the emitted event. The original final assertion, `emitted("updated")?.[0]?.[1]` is falsy, checked nothing: the component emits only an ID, so that slot was always undefined, and the optional chain also passed when nothing was emitted. It is now `toEqual([["object_store_1"]])`. That still implies the old claim (no second argument) and also proves the event fired with the selected ID. A mutation check, expecting `object_store_2`, fails as it should. The added default row checks that the preference prop is forwarded (the default's select button only shows when it isn't the current choice) and that the `__null__` sentinel is emitted as `null`.

`mount` stays. The wrapper is a thin pass-through, and every assertion needs the real `SelectObjectStore` → `SourceOptionCard` → `GCard` tree.

Reuse: this adopts the existing `setupSelectableMock`, `setupMockConfig`, navigation selectors and `getLocalVue`. No shared helper is added. Across sibling suites the only repetition is a find-then-click pair that sits next to `.exists()` assertions, and a helper would hide those assertions. Follow-up: `client/src/components/Tool/ToolSelectPreferredObjectStore.test.ts` is a near-verbatim twin with the same vacuous `[0][1]` assertion. It should get the same rewrite when it is selected.

Validation: 3 tests pass in shuffled order (seed `170101`, `NODE_OPTIONS=--no-webstorage`). Scoped ESLint (`--max-warnings 0`), Prettier and full `vue-tsc --noEmit` pass.

Guidance: none. Existing README advice covers scenario splitting, `it.each`, and emitted-event assertions.
