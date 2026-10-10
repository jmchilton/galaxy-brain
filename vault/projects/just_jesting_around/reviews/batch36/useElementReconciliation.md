# useElementReconciliation

Selected originator: `client/src/components/Collections/common/useElementReconciliation.test.ts`. Baseline and final: **11 tests**.

The local `fakeDataset(id, hid, name)` built a four-field object cast through `as unknown as HDASummary`. It now wraps `getFakeDatasetSummary({ id, hid, name })` from `@tests/test-data/datasets`, the same one-line positional wrapper ListCollectionCreator and PairCollectionCreator use. The cast and the `HDASummary` import are gone. The three values every message depends on (`hid`, `name`, and `id` for matching) stay visible at each call site.

Every case, input and assertion is unchanged. The composable reads only `id`, `hid` and `name`; the extra factory fields (state, extension, flags) are never read, so no scenario's meaning shifts. The test bodies were already scenario-named and local, so nothing else needed restructuring.

Reuse: adopts the existing shared `getFakeDatasetSummary`; no new helper or supporting edit. This closes the batch 35 follow-up.

Validation: 11 tests pass shuffled (seed `360101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and full `vue-tsc --noEmit` pass.

Guidance: none. The README already says to reuse existing test-data factories.
