# VegaWrapper

Selected originator: `client/src/components/Common/VegaWrapper.test.ts`. Baseline **4 tests** → final **6 tests**.

The `vega-embed` mock is now imported statically and read through `vi.mocked(embed)`, so the per-test `await import("vega-embed")` and the `as any` casts are gone; the mock view lives in `vi.hoisted`. A `mountVegaWrapper(props)` helper mounts with `BAR_SPEC` and flushes. `chartContainer` names the element the chart is embedded into.

All four original scenarios remain, with stronger checks. Mount: `toHaveBeenCalled()` became exactly one call with the chart container, the spec and `{ renderer: "svg" }`, plus the `new-view` emission carrying the view. Error: the `.alert-danger` exists check and the `toContain` became the alert's exact text (`Error: Invalid spec`). Unmount: `finalize` called exactly once. Spec change: the `toBeGreaterThan(initialCallCount)` became exactly two embeds, the last with the new spec and container, and the old view finalized once.

Added two cases for the resize-observer callback, which the original mocked but never exercised: the view takes the container's width when `fillWidth` is on, and is left alone when it is off. `VegaWrapper.vue` coverage rises from 24 lines / 9 branches to 26 / 15.

Reuse: `BarChart.test.ts` also mocks `vega-embed`, but its view needs signals, scales and data; a shared mock would serve neither well.

Validation: 6 pass shuffled (seed `460101`); ESLint, Prettier and full `vue-tsc` pass. No coverage loss.

Guidance: none.
