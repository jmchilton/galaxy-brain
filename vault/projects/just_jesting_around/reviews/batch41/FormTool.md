# FormTool

Selected originator: `client/src/components/Workflow/Editor/Forms/FormTool.test.js`. Baseline **2 tests** → final **4 tests** (the rules-payload case is split into three).

The mount moves out of the `describe` into a module-level `mountFormTool(inputs)` that follows the sibling `FormDefault.test.js`. A fresh testing Pinia (actions still unstubbed) goes through `withPlugins(localVue, pinia)` instead of a top-level `pinia` option next to a spread `localVue`. The helper awaits `flushPromises()` after mount; this replaces the version case's trailing flush, which ran after its last assertion. `enableAutoUnmount(afterEach)` cleans up. The component stays fully `mount`ed with the original `ToolFooter` stub, `workflowId` provide, `/api/configuration` and `/api/webhooks` handlers, and `@/api/schema` mock. `textInput()` / `rulesInput()` return fresh objects per mount, because FormTool's `inputs` computed mutates them.

Version switching: the index-based `dropdowns.at(1)` / `at(0)` text checks become one assertion on the full item list (`Switch to 3.0`, `Switch to 2.0`, `Selected 1.0`). That keeps the order the indexes implied and adds the current-version item. Destructured `switchTo3` / `switchTo2` are clicked in the original order, and each emitted `onSetData` payload is checked with `toMatchObject` on the same `tool_version` / `tool_id` values.

Rules input: the single case, whose sections were labelled by comments ("Leak fixed", "#18741 preserved", "Regression guard"), becomes three named cases under `with a rules input`. They cover nested mapping/rule entries carrying no UI-only keys, the rules input staying runtime-editable and not connectable, and a sibling text input still being a connectable `RuntimeValue`. Every original assertion is kept. The inputs are read from the rendered `FormDisplay`'s `inputs` prop (the same array) instead of `wrapper.vm.inputs`.

Config: after review, the plain-object `useConfig` mock became `setupMockConfig({ enable_tool_source_display: false })`, as the README asks. The old mock claimed `isConfigLoaded: true` while the composables that read `.value` saw it as not loaded, so FormTool ran `toolTrainingMaterial`'s not-loaded early return by accident. That path is now covered where it belongs: a new `toolTrainingMaterial.test.ts` case checks training material is requested only once the configuration has loaded (separate commit, before this one).

Reuse: `withPlugins` and the FormDefault mounting pattern; no new helper.

Validation: 4 tests pass shuffled (seed `410101`, `NODE_OPTIONS=--no-webstorage`). ESLint, Prettier and full client vue-tsc pass. Per-file coverage at the batch base and the tip, after the config-mock change: no statement or branch lost.

Guidance: none.
