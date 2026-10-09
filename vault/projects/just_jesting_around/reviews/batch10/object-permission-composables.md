# Object permission composables review

Selected originator: `client/src/components/PageEditor/object-permission-composables.test.js`. Baseline and final: six passed.

The three cache-arrival cases now form a named table with reference and mapping keys visible together. Exact empty/one-element arrays replace separate length/index assertions without weakening them. A small local `createHistoryReferences()` setup retains direct calls to these context-free composables. Unneeded async declarations and three levels of nested descriptions are removed.

The markdown input and expected job ID remain unchanged. Mixed-source histories still require exactly three members without imposing a new ordering guarantee. Deduplication retains all three input sources and requires exactly the one original history ID. Each scenario gets fresh refs; dependent cache arrival before/after checks stay within their own case.

Reuse inspected: the ObjectPermissions consumer and neighboring PageEditor test inventory. Only this selected suite directly invokes the reference initialization helpers. The setup consists of two calls unique to this API; no second consumer justifies a shared setup helper. Existing composable testing guidance already covers direct invocation and named case tables. No README or marginal advice addition.

Evidence: `/private/tmp/jest_readability_batch10_components_baseline.json` and `_final.json` (final shuffle seed 100041; combined DatasetView/object refs: 30 passed, one original skip). Scoped ESLint and Prettier checks pass.

Validation used the existing worktree and dependencies with `NODE_OPTIONS=--no-webstorage`. Source edits stay in the four selected suites; no supporting suite or new shared helper was needed.
