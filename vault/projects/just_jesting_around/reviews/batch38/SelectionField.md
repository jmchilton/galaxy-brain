# SelectionField

Selected originator: `client/src/components/SelectionField/SelectionField.test.js`. Baseline and final: **7 tests**.

Three file-level module mocks are gone:
- **History store.** The fake `defineStore("history")` exposed only a `currentHistoryId` ref. Now the real `historyStore` runs: `createTestingPinia` `initialState` stores a `getFakeHistorySummary` under `history123`, and `setCurrentHistoryId` selects it. `storedCurrentHistoryId` isn't returned by the store, so `initialState` can't seed it.
- **Event store.** The mock's `getDragItems` always returned the dragged item. Now the drag case calls the real `setDragData` before `dragenter`, and the real `getDragItems` reads it back. Actions run unstubbed.
- **`./services`.** `serveDatasets({ datasets, errorMessage })` serves `/api/datasets` through `useServerMock`, so the real `getDataset` and its error handling run. It records each request's `history_id` and `qv`.

`mountSelectionField(props)` returns the wrapper and the event store. The `withPlugins(localVue, pinia)` helper, as in WorkflowInvocationOverview, replaces the global `beforeEach` that built the fake store. The real-time debounce wait stays; fake timers would also have to cover flush-promises and MSW.

Preserved:
- Ready state: the label text and the Multiselect (`toBeTruthy()` became `toBe(true)`).
- Empty state: the message, now produced by an empty `/api/datasets` response.
- Search: `getDataset` was called with `("abc", "history123")`; now a request with `history_id=history123` and `qv=abc` must reach the server. Changing the expected text fails the case.
- Error: "Oops!" is shown. The service no longer throws a hand-made `Error`; the server answers 500 with `err_msg: "Oops!"`.
- Drag and drop: the class sequence and the emitted `change` payload.
- Custom `objectQuery`: called with the search text.
- First-option fallback: the options are non-empty (now exactly one) and the selection is `{ id: "ds1", name: "Dataset A" }`.

Replaced: the fallback case read `wrapper.vm.currentValue` through `defineExpose`. It now checks the Multiselect's `modelValue` prop and the rendered `.multiselect__single` text "Dataset A". Changing either expectation fails the case.

Reuse: `createTestingPinia` `initialState` (store id `historyStore`), `withPlugins`, `useServerMock`, `getFakeHistorySummary`, `getFakeDatasetSummary`. No shared helper. Other suites stub the history store's current id in several different ways (`useEntityMentions`, `HistoryDatasetDisplay`, `ConfigureVitessce`, `UserBeaconSettings`). A "seed current history" helper could serve them, but they mock the store module rather than use a testing Pinia, so adopting one is a separate change.

Validation: 7 tests pass, shuffled (seed `380101`). ESLint, Prettier and full client `vue-tsc --noEmit` pass. Per-file coverage against the baseline: no loss; `services.ts`, `eventStore.ts`, `historyStore.ts` and `simple-error.ts` gain lines.

Guidance: same as WorkflowAnnotation: `initialState` can't seed state a setup store doesn't return (`historyStore.storedCurrentHistoryId`).
