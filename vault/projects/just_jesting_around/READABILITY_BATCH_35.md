# Readability batch 35

Four originators drawn with seed `2610935` from 369 eligible entries. Helper commits come first, then one test per commit, then one range review. [Manifest](readability_batch_35.yml).

## Originators

| Selected test | Result | Cases |
| --- | --- | ---: |
| uploadProgressUi | Uses the new `withUploadState`. The expected URL is now a literal; it used to be computed from the input. New case: a data-library item has a `url` but must not expose it. A probe that removed the upload-mode filter fails only this case. [Review](reviews/batch35/uploadProgressUi.md). | 3 → 4 |
| ListCollectionCreator | Uses the new `getFakeDatasetSummary` in place of cast dataset literals. [Review](reviews/batch35/ListCollectionCreator.md). | 3 → 3 |
| useHistoryGraphData | Runs in `runInTestScope`; it ran unscoped before. The confusing `stopWatch` snapshot is now a `flush: "sync"` watcher that expects no `loading` change during refetch. Three cases added: an error then a successful refetch clears the error, loading is true during the first fetch, and a failing refetch clears a loaded graph. The last one is the real version of a null check that could never fail, which is kept. A `truncated.scope_type` fixture field removes an `as never`. [Review](reviews/batch35/useHistoryGraphData.md). | 9 → 12 |
| DescribeObjectStore | The three display variants are a table, plus three no-quota rows and three named cases. Vacuous checks replaced, each probed red: a `loading-span-stub` count of 0 (the template has no LoadingSpan) became "no-quota text shown, no `BSpinner`". `vm.storageInfo.object_store_id`, which echoed the prop, is now the rendered bold id or name. `vm.isPrivate` is now the child `ObjectStoreRestrictionSpan`'s prop. [Review](reviews/batch35/DescribeObjectStore.md). | 3 → 9 |

## Reuse and follow-through

New or extended shared helpers, with supporting suites that adopt them (counts unchanged):
- [`withUploadState`](reviews/batch35/withUploadState.md) in `src/composables/upload/testHelpers/uploadFixtures.ts` builds a queued `UploadItem`. Adopted by UploadFileRow. All 7 `uploadFixtures` consumers pass at the tip (84 cases).
- [`getFakeDatasetSummary`](reviews/batch35/getFakeDatasetSummary.md) is new in `tests/test-data/datasets.ts`: a complete typed `HDASummary`, modelled on `getFakeCollectionSummary`. Adopted by PairCollectionCreator, PairedOrUnpairedListCollectionCreator, useHistoryDatasets, datasetListStore and the CommandPalette datasets provider. Every asserted field stays explicit through overrides.
- [`runInTestScope`](reviews/batch35/runInTestScope.md) is new in `tests/vitest/effectScope.ts`. It runs a composable in an `effectScope` and stops it via `onTestFinished`, even when the test fails. Adopted by useHistoryDatasets, Lint, useHistoryGraph and useScrollEdges. Three of those had hand-written scope lists plus `afterEach`. useScrollEdges stopped its scope only after its assertions, so a failing assertion skipped the stop.

useHistoryDatasets is in two helper commits, one per helper; the review accepted that. Scopes now stop after `afterEach` in a test's teardown, which the review checked cannot leak across tests.

README: one sentence in Composable Testing points to `runInTestScope` for composables that create watchers or computeds.

Follow-ups:
- DescribeObjectStore's quota-enabled branch (spinner, then `QuotaUsageBar`) has no coverage.
- `useElementReconciliation.test.ts` has a cast `fakeDataset(...)` that could use `getFakeDatasetSummary`.

## Validation and review

95 cases across 13 suites pass: 28 selected, 67 supporting. The selected baseline was 18. Each commit's tests pass at that commit, shuffled with seed `350101`. Full client vue-tsc passes at the tip; ESLint, Prettier and hooks pass. The implementer's fixup restoring `toHaveBeenCalledTimes(1)` on two useHistoryGraphData seed cases, where it had weakened `calls[0]` to "any call", was squashed before review. [Independent review](reviews/batch35/review.md) approved all seven commits and found no existing helper the new ones duplicate.

Commits: `3e7a66e8c3c` (withUploadState + UploadFileRow), `a5f591d8f45` (uploadProgressUi), `8b640207929` (datasets factory + 5 suites), `f0659f1cf0d` (ListCollectionCreator), `7308a07d5c2` (runInTestScope + 4 suites), `e5ecca1f6a4` (useHistoryGraphData), `c95f3f6f519` (DescribeObjectStore), `3c66a971847` (README).
