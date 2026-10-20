# Re-scope debrief

The first hardening pass ended with [scope_evaluation](earlier_drafts/1/scope_evaluation.md) recommending a modest expansion. The original scope is kept as [alts/original_scope](alts/original_scope.md) (`072f8e9fa80`). Head after the re-scope: `3fafdd31157`.

## What changed

- **`useSettledDataset`** (`client/src/composables/settledDataset.ts`) holds the last complete stored dataset (detailed or inaccessible) for the current id, as seen while nothing was loading. It returns null before the first load and after an id switch. `isSettledDataset` is exported so views share the completeness check. It replaces the original scope's one-off `loadedDatasetId`/`showLoading`.
- **`DatasetView`** renders the held dataset, so the header and the preview's display choice keep the old datatype together until new datatype details load. The header name comes from the live store, so a rename shows immediately. `loadError` blocks only before the first load. After that, a non-blocking `.dataset-refresh-error` warning shows while the stored dataset is unsettled.
- **`DatasetDisplay`** (Preview tab) gates on the held dataset, so the iframe is no longer replaced on a refetch. It rechecks the preview headers when the held dataset's `update_time` changes, and drops HEAD results that come back out of order. Without the recheck, a dataset viewed while running kept its pending-state preview once it finished. That was latent in the original scope.
- **Backport:** cherry-picked upstream `9cb9df41c63` (#23985, davelopez, `-x`), so failed saves show the server's message. Merge-forward conflicts in `DatasetAttributes.vue` and `DatasetDisplay.vue` against 26.2/dev remain; the backport only shrinks one hunk.
- **History order:** both "Baseline tests" commits are now first. The new one adds `DatasetDisplay.test.ts` and a test for the blocking DatasetView error on a first load, and passes on `f90a897bfbe`.

## Decisions

- **Hold the item, not a first-load flag.** A summary in the store lacks `file_ext`, `peek` and metadata. Holding the last complete item means no consumer renders that state partway through a refetch.
- **Watcher-order dependency stays.** Readiness can't come from whether datatype details exist, because a failed datatype fetch stores nothing and the view would hang. A comment documents it and the guard test fails if the order changes.
- **`DatasetDetails.vue` (history panel) left out.** Selenium helpers read its datatype and peek right after actions, relying on the loading skeleton. Holding the old item would make those reads stale. Follow-up.
- **Out of scope:** the dataset-store root cause (summaries overwriting detailed items), and `keyedCache` never clearing a non-retryable (e.g. 403) error.

## Reviews and validation

- [Re-scope review](subagents/rescope_review.md) fixed the sticky refresh alert (502 then 200), the header name lag and the HEAD ordering. It recommends, but did not make, a few test consolidations.
- vitest under node 22.20.0: `Dataset/`, `DatasetInformation/` and `settledDataset`, 59 passed, 2 skipped. `vue-tsc --noEmit` is clean; eslint and prettier are clean on the touched files.
- Selenium and Playwright were not run locally.

Still applicable from round 1: [normal review](subagents/normal_review.md) and the first commits' red/green checks. The second hardening pass reruns the others ([earlier_drafts/1/](earlier_drafts/1/)).
