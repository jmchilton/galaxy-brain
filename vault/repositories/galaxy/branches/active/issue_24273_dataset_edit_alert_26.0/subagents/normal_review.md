# Normal review

Acted on one real regression: switching the same `DatasetView` instance to a dataset that was already stored and ready (e.g. one viewed earlier) left the view stuck on "Loading dataset details". Fixed in `ffa9c071652` (watch keyed on the ready dataset id) with a red-to-green test (green on base, red at `e9af550063e`, green after). Left the watcher-order dependency in place; it's documented and guarded by a test.

Not acted on:
- Watcher declaration order: still order-dependent. Alternatives are no simpler (see Details). The "waits for datatype details on the first load" test catches a reorder.
- Refetch error path: unchanged from base. A failed refetch shows the "Dataset Not Available" alert and unmounts the tab. Pre-existing, out of scope.
- `DatasetDisplay.vue:80` uses the same `isLoading || !dataset` gate, so on the preview tab the content still flashes to a loading span (and reloads) on a background refetch. `History/Content/Dataset/DatasetDetails.vue:45` hides the expanded details the same way. Sibling issue, out of scope.
- Store-level fix (stop history summaries from overwriting detailed items): touches every dataset store consumer. Agree with the implementer's choice.

## Details

**Stale/stuck content on dataset switch (fixed).** The router reuses `DatasetView` across `/datasets/:datasetId/:tab`. The original watch source was `Boolean(dataset) && !isLoading`. Going from A (ready) to B, where B is stored with `peek` and has the same `file_ext`, keeps the source at `true`, so the callback never runs. `loadedDatasetId` stays at A and `showLoading` stays true forever. Changed the source to `dataset && !isLoading ? props.datasetId : undefined`, so a change of ready id fires the watch. Stale content can't render for the wrong dataset: `showLoading` compares `loadedDatasetId` with the current `props.datasetId`. If B isn't stored, `dataset` is null and it stays loading until the fetch finishes. If B has a different ext, the datatype watch (earlier id, pre-flush) sets `isDatatypeLoading` before the ready watch re-reads its source.

**Watcher order.** The ready watch's immediate run has to see `isDatatypeLoading = true`, which only holds if the datatype watch was declared first. Option 1: seed `isDatatypeLoading` with `Boolean(dataset.value?.file_ext)`, which removes the order dependency at mount, but it's just as subtle. Option 2: derive datatype readiness from `datatypeStore.datatypeDetails`. A failed fetch stores nothing there, so the view would spin forever. Neither the dataset store's `keyedCache` nor the datatype store exposes a "first loaded" signal to reuse. The current form plus the comment and guard test is acceptable.

**Error path.** `loadError` takes precedence in the template, same as base. `keyedCache` never clears `loadingErrors` after a later success (pre-existing).

**Tests.** The "Background refresh" tests are meaningful: the edit-tab test checks component identity across a gated refetch, and the datatype test guards the order regression. The comment about summaries lacking `peek` is non-obvious and worth keeping. Added "shows a dataset that is already stored when switching to it".

**Runs.** `DatasetView.test.js`: 14 passed, 2 skipped (node 22.20.0). eslint on touched files: 0 errors (3 pre-existing `v-html` warnings). vue-tsc not run.
