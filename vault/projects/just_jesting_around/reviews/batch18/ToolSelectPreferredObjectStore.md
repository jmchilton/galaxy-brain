# ToolSelectPreferredObjectStore

Selected originator: `client/src/components/Tool/ToolSelectPreferredObjectStore.test.ts`. Baseline **1 test** → final **3 tests**.

This applies the batch 17 `WorkflowSelectPreferredObjectStore` rewrite to its Tool twin. The two test files now differ only in the component, the prop name (`toolPreferredObjectStoreId`) and the `describe` label. The combined case is split into a rendering test and a two-row `it.each` selection table. One `SELECTION` constant replaces the mixed `PREFERENCES` / `ROOT_COMPONENT.preferences` paths, and the error selector is named. The async mount helper takes the preferred ID, builds fresh `getLocalVue(true)` plugins per mount, flushes the initial store load, and drops the `as object` cast. Wrappers unmount automatically.

All original assertions are kept. The rendering test asserts three option cards and the `__null__` default card. The `object_store_1` row asserts the select button exists, that clicking it renders no selection error, and the emitted event. The original `emitted("updated")?.[0]?.[1]` falsy check was vacuous: the component emits only an ID, and the optional chain also passed when nothing was emitted. It is now `toEqual([["object_store_1"]])`, which still implies no second argument and proves the event fired with the selected ID. A mutation check expecting `object_store_2` fails as it should. The added default row checks that the preference prop reaches `SelectObjectStore` (the default's select button only shows when it isn't the current choice) and that `__null__` is emitted as `null`.

`mount` stays. The component is a thin pass-through and every assertion needs the real `SelectObjectStore` → `SourceOptionCard` → `GCard` tree.

Reuse: adopts the existing `setupSelectableMock`, `setupMockConfig`, navigation selectors and `getLocalVue`. No shared helper. A helper that generates both suites from a component and prop name would hide the scenario names and inputs behind a factory, to save about 40 lines across two files. The duplication comes from two near-identical production wrappers; the tests just mirror them. If those wrappers are ever merged, the tests merge with them.

Validation: 3 tests pass in shuffled order (seed `180101`, `NODE_OPTIONS=--no-webstorage`). Scoped ESLint (`--max-warnings 0`), Prettier and full `vue-tsc --noEmit` pass.

Guidance: none. Existing README advice covers scenario splitting, `it.each` and emitted-event assertions.
