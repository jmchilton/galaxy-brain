# Initial implementation debrief

Fixes [#24273](https://github.com/galaxyproject/galaxy/issues/24273) on `release_26.0`. Implemented by a non-workhorse session; this debrief was written during recovery from the commits and a re-run of the tests.

## Failure

The weekly Selenium run ([39348719530](https://github.com/galaxyproject/galaxy/actions/runs/39348719530)) failed `test_dataset.py::TestDataset::test_history_dataset_rename`: `Timeout waiting on CSS selector [.dataset-attributes-alert] to become visible`.

## Root cause

After saving attributes, the history watcher stores summary items over the detailed dataset. Summaries lack `peek`, so the dataset store refetches the dataset. `DatasetView` rendered `LoadingSpan` whenever `isLoading || !dataset`, so the refetch swapped out every tab. That unmounted `DatasetAttributes` right after the save and dropped its success/error alert.

## Commits

1. `ab2ccab2252` Keep the dataset view mounted while the dataset refetches. A `loadedDatasetId` ref is set once a dataset is present and not loading. `showLoading` only blocks until that happens for the current `datasetId`. Later refetches leave the open tab mounted.
2. `e9af550063e` Keep blocking DatasetView until datatype details load. In commit 1, the first-load watch ran before the datatype watch had started loading. The view then rendered without datatype details, and auto-download and preferred-visualization datatypes fell back to the iframe preview. Fixed by declaring the watch after the datatype watch.

## Tests

`client/src/components/Dataset/DatasetView.test.js`, new "Background refresh" block:

- `keeps the edit tab mounted while a history update refetches the dataset`: red on base, green after commit 1.
- `waits for datatype details on the first load`: green on base, red after commit 1 only, green at head. Guards the regression commit 1 introduced.

Run under node 22.20.0 (`npm_config_use_node_version=22.20.0 pnpm exec vitest run`): 13 passed, 2 skipped. The Selenium test was not re-run locally.

## Choices

- The fix is in the view (only the first load blocks), not in the store. Stopping the history watcher from overwriting detailed items would touch every consumer of the dataset store.
- The fix relies on watcher declaration order, and only a comment documents it. The hardening reviews should look at this.
