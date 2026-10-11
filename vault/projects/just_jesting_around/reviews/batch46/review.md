# Batch 46 review

Range `e1ccfc2131e..vitest_readability`: three originator commits, one test file each, no helper commits, no production changes. DataDialog was abandoned over a real production bug (`watch(() => history)` resolves to `window.history`). The abandon record is sound, and nothing for it is in the range.

## Improve readability of Node tests (`4ab6dbbdf75`)

Changes requested.

Mapping (8 → 8):
- "test attributes" → "renders an active tool node, then the subworkflow icon and label…". It keeps the tool icon ×1, the `setProps` to subworkflow, sitemap ×1, wrench ×0 and the title "step label". It adds `is-active` on the root, which explains the `activeNodeId: 0` input.
- Missing tool with connections: error text, no `rounded-bottom`, one NodeInput `{input1, valid:false}`, one NodeOutput `{out_file1, valid:false}`. All kept; `nth()` replaces `.at(0)!`.
- Missing tool without connections: `rounded-bottom`, no `.node-body`. Kept.
- Recommendations popover `interactive`: kept. The try/finally became `toolRecommendations: true`, and `mountNode` sets the flag before every mount, so no state leaks.
- Enter on the recommendations button: `onActivate` undefined, then header Enter gives `[[0]]`. Kept. The manual `unmount()` became `enableAutoUnmount(afterEach)`. That's not redundant, since `setup.ts` doesn't enable it globally.
- Three double-click cases: kept verbatim, with selector constants.

Boundaries: unchanged. The adapter mapped the old top-level `pinia` to `global.plugins` with replacement, so `withPlugins(localVue, pinia)` is equivalent. Portal/PortalTarget stubs still come from `getLocalVue()`. `setActivePinia` and the connection-store `$patch` still run before mount, and actions stay stubbed, so `setMaximized` is still a spy.

Cast count: `as any` 1 → 0, `as unknown` 0 → 1, plus new `as UseScrollReturn` and the `step as Step` inside `partialStep`.
- `MISSING_TOOL_STEP … as unknown as Step` is the least-bad option. The string matches the server, an array would render as JSON in `{{ errors }}`, and the reason is stated. The real fix is the `NewStep.errors` type, which the notes already list as a follow-up.
- `MOCK_SCROLL as UseScrollReturn` is acceptable. Node reads only `x`/`y`, and a full `UseScrollReturn` (arrivedState, directions, measure) would be noise.
- `partialStep` isn't least-bad. It's a cast funnel: `Partial<Step>` → `Step` lets any fixture drop required fields silently, and it hides from the cast count. `TOOL_STEP` lacks only `name`, `input_connections` and `tool_state`, and `SUBWORKFLOW_STEP` also lacks `id`. The title is `label || name`, so adding `name` changes no assertion.

Reuse: `withPlugins`, `nth`, `mockOffset` and `testDatatypesMapper` are adopted. `createTestStep` in `Editor/test_fixtures.ts` doesn't fit these fixtures:
- It returns `NewStep`, where `id` is optional, so it would still need a cast to `Step`.
- Its default `outputs` isn't empty.
- Its position is `{left: id*200, top: 100}`.
- It takes no `content_id`.

I agree there should be no shared `@/app` mock while each consumer's config differs.

Findings:
1. Delete `partialStep` and write the fixtures as complete typed literals:
   - `TOOL_STEP: Step`: add `name: "tool_id"`, `input_connections: {}` and `tool_state: {}`.
   - `SUBWORKFLOW_STEP: Step`: add the same three fields plus `id: 0`.

   Keep `MISSING_TOOL_STEP … as unknown as Step` and its comment. A plain `as Step` won't compile, because a string isn't comparable to `string[] | null`. Nothing breaks:
   - `setMaximized` is asserted with `toHaveBeenCalledWith(TOOL_STEP, true)`, which compares by deep equality, so the extra fields still match.
   - The title is `label || name`, and no assertion reads the tool step's title.
   - The subworkflow label still wins.
2. Not blocking: `props?: Record<string, unknown>` gives up the prop typing that dropping `Node as any` bought. Leave it unless typing it is cheap.

## Improve readability of VegaWrapper tests (`dd1cede660c`)

Approved.

Mapping (4 → 6):
- On mount: `toHaveBeenCalled()` → exactly one call with `(chartContainer, BAR_SPEC, { renderer: "svg" })`, plus `new-view` emitted `[[mockView]]`.
- Embed failure: the `.alert-danger` exists check plus `text()` contains → the alert's exact text `Error: Invalid spec`. `find().text()` throws when the alert is missing, so the existence check survives.
- Unmount: finalize called → called exactly once (mount doesn't finalize because `vegaView` starts null).
- Spec change: call count grew → exactly two embeds, the last with `LINE_SPEC` into the container, and the old view finalized once.
- New: a resize with `fillWidth` calls `width(640)` and `runAsync` once; with `fillWidth: false`, `width` isn't called. The positive case proves the setup reaches the callback, so the negative case isn't vacuous.

Boundaries: the same two module mocks (`vega-embed`, `@vueuse/core`); nothing new mocked. `as any` 3 → 0, and the only new cast is `{} as ResizeObserver` for the unused observer argument. `chartContainer` and `resizeContainer` serve only this file and stay local. Not sharing a mock with `BarChart.test.ts` is justified. Wrappers still aren't unmounted between tests, as before, and that doesn't affect any assertion.

## Improve readability of agentTypes tests (`ef8caa4bc3e`)

Approved.

Mapping (16 → 19): `getAgentIcon` keeps the known case, and its unknown/undefined/empty cases became three `it.each` rows that check `toBe(faRobot)`. `getAgentLabel`: the three-label case became three rows; the raw-value case is kept; undefined and empty became two rows. `formatModelName`: all seven original input→output pairs are rows, including trailing slash, undefined and empty. `getAgentResponseOrEmpty`: the provided case keeps `toBe` identity, and its fixture is now typed `AgentResponse` (dropping `as const`). The five field checks on the empty case became one `toEqual` on the full object, which matches the implementation's literal exactly and also catches extra keys. No assertion was lost.

## Driver follow-up

The requested fix was applied: `partialStep` is gone, and `TOOL_STEP` and `SUBWORKFLOW_STEP` are complete typed `Step` literals (`name`, `input_connections` and `tool_state` added, plus `id` for the subworkflow step). The only cast left is the documented `MISSING_TOOL_STEP` one. Folded into the Node commit (`d49bea20fac`); 8 tests pass at that commit, shuffled; vue-tsc passes at the tip; per-test coverage shows no loss.
