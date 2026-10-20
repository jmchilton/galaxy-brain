# Codex review

Ran an independent `codex exec` review in a read-only sandbox, on `f90a897bfbe...1b41b798ea7`, with a neutral brief. It returned one finding. I confirmed it and fixed it in `Rebuild dataset attribute forms after a save`. Nothing was left unaddressed.

## Acted on

- **P1: the edit form keeps the old datatype's metadata schema.** CONFIRMED.
  - `DatasetAttributes.vue` loaded `get_edit` only in `onMounted`. Before this branch, the refetch remount reloaded the forms after a save, though only by accident. Now the tab stays mounted, so after a datatype change (e.g. tabular → interval) the forms keep the old metadata and conversion inputs.
  - `FormDisplay`'s `inputs` watcher only updates inputs it already has. Swapping `datasetAttributes` alone would not add the new columns.
  - Fix: after any save that doesn't throw, refetch `get_edit` with no loading state, so the tabs and alert stay put. A `warning` status still commits changes, so it counts. Then bump `formRevision`, which feeds each `FormDisplay`'s existing `id` prop. That prop is the same re-clone hook that `ToolForm` and the workflow editor forms use.
  - Unsaved edits in other sections of the form are reset by a save. The old remount reset them as well.
  - Test: `DatasetAttributes.test.ts`, "reloads the forms after a save so new datatype metadata appears". Red before the fix, green after.

## Verification

- `DatasetInformation/` and `DatasetView.test.js`: 25 passed, 2 skipped (node 22.20.0).
- eslint and prettier are clean on the touched files.
- I did not run Selenium or vue-tsc.

## Details

Codex coverage: it read DatasetView, DatasetDisplay, DatasetAttributes, DatasetDetails, the dataset and datatype stores, keyedCache, watchHistory, the router, `test_dataset.py` and the `set_edit`/`get_edit` controller. It also ran the focused vitest suite, which passed.

> P1 correctness, `DatasetView.vue:117`. Datatype changes leave the edit form using the old metadata schema. Keeping DatasetAttributes mounted also removes its refresh after datatype changes. That component fetches datasetAttributes only in onMounted; submit() updates the history but never reloads the form definitions. The backend get_edit builds metadata fields and conversion choices from the current datatype, so the retained form becomes stale. Scenario: tabular → interval, and the Attributes tab lacks the Chrom/Start/End column controls; saving omits those fields. Confidence: certain.
