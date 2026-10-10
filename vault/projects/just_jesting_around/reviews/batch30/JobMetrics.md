# JobMetrics

Selected originator: `client/src/components/JobMetrics/JobMetrics.test.js`. Baseline and final: **2 tests**.

A local `mountJobMetrics(jobMetricsByJobId)` builds the testing Pinia, installs it with `withPlugins` (replacing the legacy top-level `pinia` option and the `setActivePinia` call nothing needed), mounts with `props`, and flushes. Its one-line doc says why the store is seeded: the testing store stubs `fetchJobMetricsForJobId`, so nothing is fetched. The `axios` mock goes; its comment claimed it answered the component's requests, but the store uses `GalaxyApi` and the stubbed action never calls it. The seeded state now names only `jobMetricsByJobId`; the empty HDA/LDDA maps were the store defaults. Selector constants and auto-unmount are added, and the describe drops the file path.

The first test was named "should not render a div if no plugins found in store" but asserted the info alert's text; it is now named for that message. Its assertion stays, the old `$nextTick` becomes the shared `flushPromises`, and it also checks no plugin table renders. The grouping test keeps the same three metrics inline, and its five assertions (two tables, titles `core`/`extended`, two and one rows) become one `toEqual` over `{ title, rows }` per table, so the order and count are still exact. It also checks the no-metrics alert is absent.

`mount` stays: the no-metrics check reads GAlert's own `.alert-info` markup, and the other children (Heading, AwsEstimate, CarbonEmissions) do not render or fetch with these metrics.

Reuse: `getLocalVue`/`withPlugins`; no new helper. The store's own fetch behaviour is covered by `src/stores/jobMetricsStore.test.ts`.

Validation, from `client/`: 2 tests pass shuffled (seed `300101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and `vue-tsc --noEmit` pass.

Guidance: none.
