# Collection attributes store — iteration 03

Selected originator: `client/src/stores/collectionAttributesStore.test.ts`.

Baseline and final: **2 passing cases**. All **8 original assertions** remain, with stricter loading booleans and an exact request count/collection ID. One assertion adds the immediate `null` result for a cache miss; final count is **9**. Both scenarios retain the same collection ID and complete attributes payload.

The suite was already small. Names now describe cache-miss loading and cache-hit behavior. The endpoint handler returns the typed attributes directly; a separate request spy records its path parameter, removing an unnecessary mock-return indirection. The cache-hit test flushes queued promises before checking that no request occurred, so a mistakenly scheduled asynchronous fetch cannot satisfy that check prematurely.

Reuse: use the existing `stores/testUtils.ts` `setupTestPinia()` helper (also consumed by object-store instance/template and user tool credentials suites). Inspected `datasetCollectionStore.test.ts`, `jobMetricsStore.test.ts`, and the existing test-data directory. This is the only test consumer of `DatasetCollectionAttributes`; sibling collection summaries/details have different shapes. A shared attributes factory or generic cache-test harness would add indirection without a concrete second consumer. No supporting file edits are needed.

Guidance: existing readable-scenario, reusable-fixture, typed-MSW, and isolated-Pinia guidance applies. No new README rule recommended: the async-negative-assertion timing observation is an application of existing async guidance, rather than a sufficiently specific new best practice.

Validation: baseline and final `NODE_OPTIONS=--no-webstorage pnpm exec vitest run src/stores/collectionAttributesStore.test.ts --maxWorkers=1` passed. Focused ESLint and Prettier checks passed. No production changes, assertion removals, shared metadata changes, or new dependencies.
