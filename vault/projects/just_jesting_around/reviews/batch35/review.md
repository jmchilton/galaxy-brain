# Batch 35 review

Range `f9113edf20c..vitest_readability` (7 commits). Read only through `git show`.

## 3e7a66e8c3c Extend src/composables/upload/testHelpers/uploadFixtures.ts for client unit tests

Approved.

- `UploadFileRow` "renders the source URL from the item display info": `urlRowItem(makeUrlItem())` becomes `withUploadState(makeUrlItem())`. Same case, same assertions.

Findings: no existing queued-item builder anywhere in the client tests (grepped `createdAt:`, `status: "queued"`, `datasetIds: [`). The other `uploadFixtures` consumers go through `addUploadItem` or validate pre-queue items. Two real consumers (this file and uploadProgressUi). It sits next to the `make*Item` factories, typed `T & UploadState`. The added `datasetIds: []` is a required `UploadState` field the old copy left out, and `UploadFileRow` never reads it. The supporting edit only adopts the helper.

## a5f591d8f45 Improve readability of uploadProgressUi tests

Approved.

- "exposes the URL for paste-links / remote-files": the self-referential `"url" in item ? item.url : undefined` becomes literal expected URLs. The fixtures' default URLs are now passed explicitly. This is stronger: before, the expectation was computed from the input.
- "omits the URL for local-file uploads": unchanged.
- New: "omits the API URL of data-library uploads". This is the only case that fails if the `uploadMode` filter in `getUploadItemSourceUrl` is dropped, because local files have no `url`.

Findings: none.

## 8b640207929 Add tests/test-data/datasets.ts for client unit tests

Approved.

- PairCollectionCreator 3→3, PairedOrUnpaired 9→9, useHistoryDatasets 20→20, datasetListStore 9→9, CommandPalette datasets provider 9→9. Each adopter swaps its local cast builder for a thin wrapper over `getFakeDatasetSummary`, and no case or assertion changes.

Findings:
- Reuse: no HDA factory existed before this. `tests/test-data/` has only `getFakeCollectionSummary` (HDCA), user/history factories and unrelated domains, and no `src/**` test-utils, testData, fixtures or `__mocks__` file builds an `HDASummary`. The factory follows `collections.ts` (id-derived fields, `Partial<>` overrides) and removes four `as unknown as HDASummary` / `as HDASummary` casts.
- Fields the factory fills in: the creators read none of the new fields (`type_id` and `model_class` aren't read under `components/Collections/` either). The palette provider reads `id`, `name`, `extension`, `state` and `history_id`. The test keeps those explicit, including the `"txt · ok"` subtitle inputs and `history_id: "history_1"`. `datasetListStore` reads `id` and `name`, and `history_content_type: "dataset"` (used to separate the collection row) is still set. In useHistoryDatasets, both sides of the `toEqual` round-trip come from the same builder, and `history_id` matches the suite's `history-1`. No assertion's meaning changes.
- Optional, not blocking: `Collections/common/useElementReconciliation.test.ts` still has `fakeDataset(id, hid, name)` with `as unknown as HDASummary`. It is the same signature as ListCollectionCreator's wrapper. "Presence-only checks" doesn't really justify the cast, and the full factory would serve. It can go in a later lane.

## f0659f1cf0d Improve readability of ListCollectionCreator tests

Approved.

- "keeps the user's list when initialElements changes…": both `["b","a"]` checks, the identity check and the no-toast check are kept (via `inListIds`).
- "drops a dataset that left the history…": final `["a"]`, toast count and exact message kept. Adds a precondition `["a","b"]` check.
- "drops a dataset that is still there but no longer usable…": the same, with the `state: "error"` override kept.

Findings: `selectIntoList` now throws on a missing option. Before, `option?.trigger` skipped it silently, which was a real weakness. IDs, hids and names stay visible at each call site. `mount` is justified because the tests click the FormSelectMany options. Only this one file is in the commit.

## 7308a07d5c2 Add tests/vitest/effectScope.ts for client unit tests

Approved.

- useHistoryDatasets 20→20, Lint 3→3, useHistoryGraph 12→12, useScrollEdges 1→1. Each drops its hand-rolled scope list or `let scope` plus its `afterEach` (or inline `stop()`) for `runInTestScope`, and nothing else changes.

Findings:
- Reuse: there is no existing scope helper (`tests/vitest/helpers.js` exports none, and there is no `withSetup` or `mountComposable`). Four adopters plus the originator. `selectedItems` and `useNotificationSSE` reuse a `beforeEach` scope, which is a different shape, so leaving them out is right.
- Every call happens inside an `it` body (checked useHistoryGraph and Lint), as `onTestFinished` requires.
- Ordering (`onTestFinished` runs after all `afterEach` hooks, including `useServerMock`'s `resetHandlers()`, `vi.restoreAllMocks()` and VTU auto-unmount): no state can leak between tests. `onTestFinished` is part of the same test's run and completes before the next test's `beforeEach`. The only change is a short window inside the same test's teardown where effects are still live after the mocks are restored. Nothing mutates reactive state in that window, and stopping a scope never cancelled in-flight requests anyway, so that exposure is the same as before. Unmounting Lint before its `lintData` scope stops is harmless. The upside: stops now run even when an assertion fails (useScrollEdges), and a second call in one test no longer orphans the first scope (useHistoryGraph).
- useHistoryDatasets.test.ts appearing in both this commit and 8b640207929 is fine. Each touch is adoption-only for a different helper and is listed in that commit's `Test-File` trailer. The one-file rule covers originator commits.

## e5ecca1f6a4 Improve readability of useHistoryGraphData tests

Approved.

- "fetches immediately on mount" becomes "fetches the history graph with the limit as soon as it is called": 1 call, `h1`, limit `"100"`.
- "omits seed_src / seed_id": both null, plus exactly 1 call (from the squashed fixup).
- "includes seed_src and seed_id": `hda` / `d-7`, plus exactly 1 call (fixup).
- "refetches when historyId changes": 1 call, `h2`.
- "refetches when limit changes": `"250"`, and it now also asserts exactly 1 call.
- "exposes refetch()": 1 call, now with args, awaiting the returned promise (per the README).
- "sets graphData on success and clears error" becomes "exposes the graph with no error once the first fetch succeeds": `not.toBeNull()` is strengthened to `toEqual(EMPTY_GRAPH)`. The "clears error" half was never exercised, because error starts null. It now has its own case: an error, then a successful refetch.
- "keeps loading false on refetch": the misnamed one-shot `vi.fn` snapshot becomes a `flush: "sync"` watcher that records every `loading` change. It keeps the intent and is stricter.
- "sets error and clears graphData when the API replies with an error" is kept with `ref("missing")` (`toMatch` becomes `toBe`). The vacuous "clears" half is now a real case: a loaded graph, then a failing refetch, ends with null.
- New: loading is true while the first fetch is in flight.

Findings: the per-test `respondWithGraph()` spy records plain values, which removes `as unknown as URLSearchParams` and `as never`. The `scope_type: "recent"` addition is schema-required and unread. The same real composable and MSW endpoint are exercised, and nothing new is mocked. Previously its immediate watcher was never stopped; it now runs in `runInTestScope`. I checked each replacement against `useHistoryGraphData.ts` and each one targets the branch it names.

## c95f3f6f519 Improve readability of DescribeObjectStore tests

Approved.

- The three cases become one `it.each` table with all three span counts per row (default 1/0/0, id 0/1/0, name 0/0/1). The id row's default count is newly checked.
- `wrapper.vm.isPrivate` falsy/truthy is now the exact `isPrivate` prop on `ObjectStoreRestrictionSpan` (only one is rendered per branch), which also drops a `wrapper.vm` read.
- `wrapper.vm.storageInfo.object_store_id === "foobar"` (a prop echo, so vacuous) is replaced by `.display-os-by-id b` = `foobar`, plus the name case showing `my cool storage` and no `foobar`.
- The `[markdown]` stub attribute is now `ConfigurationMarkdown`'s `markdown` prop.
- `loading-span-stub` count of 0 becomes the no-quota text plus no `BSpinner`, for each fixture.

Findings:
- The `loading-span-stub` check really was vacuous. The current template has no `LoadingSpan` (its only loading UI is the `BSpinner` inside the `quota.enabled` block), so the count could never be non-zero. The replacement keeps the "not stuck loading" intent. With these no-quota fixtures, the spinner check is mostly implied by the text check, since the text is the `v-else` of the block that holds the spinner. It still fails if a spinner appears outside that block, so it isn't vacuous. Keeping three rows for one behavior mirrors the original's per-case check and is acceptable.
- Pinia is now actually installed through `withPlugins` instead of only being activated. It is the same testing store with stubbed actions, so no behavior boundary changes. The fixtures are unchanged. The leftover `async` mount helper and shared `let wrapper` are removed.
- The uncovered quota-enabled branch is noted as a follow-up and is out of scope.

## Commit shape

Each helper commit comes before its originator (3e7a66e→a5f591d, 8b64020→f0659f1, 7308a07→e5ecca1). Each originator holds exactly one test file. There are no production changes (`uploadFixtures.ts` is a test-only helper) and no process-referencing comments in the code.
