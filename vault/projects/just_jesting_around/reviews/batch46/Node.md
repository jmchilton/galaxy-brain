# Workflow Editor Node

Selected originator: `client/src/components/Workflow/Editor/Node.test.ts`. Baseline and final: **8 tests**.

`mountNode(mounter, propsData, connections)` took three positional arguments; it now takes an options object (`mounter`, `props`, `connections`, `toolRecommendations`). It uses VTU2 options: `props`, and `global: { ...withPlugins(localVue, pinia), provide }` in place of top-level `propsData`/`pinia`, so the default Portal stubs are kept. The testing Pinia (stubbed actions, so `setMaximized` stays a spy) and the connection-store `$patch` are still set up before mount. The two recommendation cases used try/finally to toggle the mocked Galaxy config. Now `mountNode({ toolRecommendations })` sets it before every mount, since Node reads it once at setup. `enableAutoUnmount(afterEach)` replaces the one explicit `unmount()`. Selectors are named constants; the "fa-wrench is the tool icon" comments became `TOOL_ICON`/`SUBWORKFLOW_ICON`. `nth()` replaces `.at(0)!`.

`Node as any` hid a lint warning (`no-explicit-any`; the original file failed `--max-warnings 0` too). The cast is gone. The tool and subworkflow steps are complete typed `Step` literals (after review; a `partialStep` cast helper was dropped), and the scroll stub is typed `as UseScrollReturn`. `MISSING_TOOL_STEP` keeps its string `errors`, which matches the server: `ToolModule.get_errors` returns `"Tool is not installed"`. `NewStep.errors` is typed `string[] | null`, though, so that fixture needs an `as unknown as Step` with a one-line reason. The fixture data is unchanged.

Every case and assertion remains. "test attributes" became "renders an active tool node, then the subworkflow icon and label after the step changes". It keeps the tool → subworkflow `setProps` walk, and adds an `is-active` class check that explains its `activeNodeId: 0` input; that check was shown to fail with `activeNodeId: 1`.

Reuse: `withPlugins`, `nth`, `enableAutoUnmount`, the existing `mockOffset` and `testDatatypesMapper`. 14 files mock `@/app`, but each one's config differs and two (`FormTool`, `ToolCard`) are owned by other lanes, so there's no shared Galaxy-instance mock yet.

Validation: 8 pass shuffled (seed `460101`); ESLint (now warning-free), Prettier and full `vue-tsc` pass. Coverage: no losses; auto-unmount adds a line each in `NodeInput.vue`, `NodeOutput.vue` and `relativePosition.ts`.

Guidance: none. Follow-up: `NewStep.errors` in `stores/workflowStepStore.ts` should probably be `string | null` (production type, not changed here).
