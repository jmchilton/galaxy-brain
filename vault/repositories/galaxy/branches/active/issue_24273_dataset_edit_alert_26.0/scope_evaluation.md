# Scope evaluation

**Recommendation: expand (modestly).** The branch fixes the Selenium symptom by keeping `DatasetView` mounted during a background refetch, but the same `isLoading || !dataset` gate in `DatasetDisplay.vue` (the Preview tab inside the same view) still blanks the content and reloads the iframe on the same refetch. A failed background refetch still unmounts the tab through the `loadError` alert. Expand modestly:

- Move the "only the first load blocks" model into a small reusable composable, and apply it to `DatasetView` and `DatasetDisplay`.
- Block on `loadError` only before the first load.
- Backport the one-line save-error fix from #23985.

Leave out the store-level root cause and a 25.1 retarget. Include `DatasetDetails.vue` only if the composable fits it without contortion.

## Possible Decompositions

Branch is ~190 lines (about 60 of code, 130 of tests). Two logical pieces, landing in this order:

1. **DatasetAttributes reloads its forms in place.** Baseline tests, the `fetchForms()` refactor, `formRevision`/`:id` rebuild after a save, and the `update_time` watch. On base it's redundant but harmless, because the refetch remount already reloads the forms. Plus the #23985 save-error backport if the expansion is taken.
2. **DatasetView (and DatasetDisplay) stop unmounting on refetch.** `loadedDatasetId`/`showLoading` (or the composable), the null-narrowing fix, and the "Background refresh" tests. This piece depends on 1. Without it, the kept-mounted Attributes tab shows stale datatype forms (the Codex P1).

Piece 2 requires piece 1.

## Scopes considered

### 1. As implemented

Stop `DatasetView` blocking after the first load of a dataset id. Because the Attributes tab now stays mounted, `DatasetAttributes` rebuilds its forms after a save and whenever the stored dataset's `update_time` changes.

| Pros | Cons |
|---|---|
| Fixes the flaky Selenium test deterministically, with a red-to-green unit test | Same gate in `DatasetDisplay` (same route, Preview tab) still flashes "Loading dataset content" and reloads the iframe on every refetch of the viewed dataset |
| Small, client-only, release-safe | `loadedDatasetId` logic is local to `DatasetView` and relies on watcher order, so it isn't reusable by siblings |
| Regressions the reviews found (stuck switch, stale datatype forms, mid-job snapshot, vue-tsc) are all fixed and pinned | Leaves a known bug in touched code: save errors never show the server message |
| | A failed background refetch still swaps the view for the blocking `loadError` alert, so the tab and its success alert are lost through another path |
| | The branch introduces a new state: a `file_ext` change through a save (the flow the failing test exercises) leaves the view mounted with the old datatype's display details until the new ones load. The thermo review called it a `DatasetDisplay` sibling, but it follows from this branch's `showLoading` change. A brief, self-correcting window |

### 2. Modest expansion (recommended): shared first-load gate, DatasetDisplay, refetch errors, save-error message

Changes:

- Extract the first-load gate into a composable keyed on dataset id, e.g. `useDatasetFirstLoad(datasetId, extraLoading?)`, and apply it in `DatasetDisplay`.
- In `DatasetView`, show the blocking "Dataset Not Available" alert only before the first load. After that, show a non-blocking alert above the still-mounted tabs.
- Backport #23985's `submit` catch (`errorMessageAsString(e, "Unable to save dataset attributes.")`).

| Pros | Cons |
|---|---|
| Fixes the same symptom on the Preview tab of the same view. Reviewers seeing a `DatasetView` fix will ask why `DatasetDisplay` was skipped | During a refetch the stored item is a summary (no `file_ext`/`file_size`/metadata). Once `DatasetDisplay` stops gating, `TabularChunkedView` and the download URL see it briefly, so the display needs `hasDetails` handling or a held last-detailed item |
| Creates a reusable abstraction for every `isLoadingDataset` consumer, instead of a one-off ref and watch | The composable doesn't remove `DatasetView`'s watcher-order dependency on its own: its immediate watch still has to see datatype loading start. The normal review found no simpler form, so keep the guard test |
| A failed refetch after the first load currently replaces the whole view with "Dataset Not Available" and unmounts the open tab. That's the same bug through the error path, on a template line the branch already edits (`v-if="loadError"`) | A few more tests (`DatasetDisplay.test`, composable test, refetch-error test), and the existing DatasetView tests must stay green. `keyedCache` never clears `loadingErrors` after a later success, so the error alert stays until that's fixed. That's a shared composable, so defer it |
| Save-error backport is 1 line in a function the branch already edits, identical to what upstream already merged forward (#23985), so it removes a merge conflict rather than adding one | `DatasetDisplay.vue` was heavily reworked on 26.2/dev (HEAD previews, `previewLoaded` gate, infinite-scroll tabular), so that part will conflict on merge-forward. The gate line itself is unchanged and the bug is present on every branch |

<details>

- **`DatasetDisplay.vue:80`** has `LoadingSpan v-else-if="isLoading || !dataset"`. `isLoadingDataset` goes true whenever the history watcher stores a summary over the detailed item and the store refetches. That swaps out `CenterFrame`/`TabularChunkedView`, which re-request content when they come back. Its `datasetId` HEAD-header watch doesn't re-run, so the flash is pure churn.
- **Summary transient.** `saveDatasets` writes `HDASummary` objects into `storedItems` (`datasetStore.ts:27`). A summary lacks `peek`, `file_ext`, `file_size` and metadata. A composable that keeps the last detailed item for the id ("stale while revalidate") is cleaner than gating on `isLoading`. It covers `DatasetView`, `DatasetDisplay` and possibly `DatasetDetails`, without changing the store contract.
- **Save error.** `setAttributes` (`DatasetInformation/services.js`) calls `rethrowSimple`, which throws a plain `Error(errorMessageAsString(e))`. `error.response?.data?.err_msg` in `submit` is therefore always undefined. davelopez fixed this as `9cb9df41c63` (#23985, merged 2026-10-09). It's on `release_26.2` and `dev` only. Cherry-pick its code and test rather than writing a new variant.

</details>

### 3. Larger expansion: also DatasetDetails (history panel expanded item)

Apply the same held-last-detailed approach to `History/Content/Dataset/DatasetDetails.vue`, which drops to the skeleton placeholder while the item refetches.

| Pros | Cons |
|---|---|
| Same root cause and the same composable; it covers every `isLoadingDataset` consumer | The gate there is `hasDetails(result)` as well as `!isLoading`, so it needs the held-detailed variant, not just a first-load flag |
| History panel flicker on every update of an expanded item goes away | Separate surface (history panel), with no failing test or issue driving it. Selenium history-panel tests may assert the loading skeleton timing |

Include it if the scope 2 composable naturally returns a held detailed item. Otherwise make it a follow-up.

### 4. Store-level root cause: stop summaries overwriting detailed items

Change `datasetStore.saveDatasets` to merge or keep detailed items, and revalidate in the background.

| Pros | Cons |
|---|---|
| Addresses the cause every consumer shares | Doesn't fix this bug on its own. After a save `update_time` changes, so a refetch is still needed and `isLoadingDataset` still flips, and the view gates would still swap |
| | A merged summary-over-detailed object shows a stale `peek` and metadata until the refetch lands. Every dataset store consumer is affected, which is high risk on a release branch |
| | Three reviews independently agreed to defer it |

Not recommended. If wanted, it's a dev follow-up.

### 5. Retarget base to release_25.1

| Pros | Cons |
|---|---|
| The same `isLoading \|\| !dataset` gate exists on 25.1 (`DatasetView.vue:95`) | The fix depends on the 26.0 DatasetView watcher structure, so 25.1 needs a different patch |
| | The failure was seen in the dev weekly run, there are no user reports, and the bug is cosmetic or flaky rather than serious. 25.1 (released Dec 2025) is still inside the 1-year window, but the user's policy pushes intricate, low-severity fixes toward newer releases |

Not recommended. Keep `release_26.0`. The gates are unchanged on 26.1, 26.2 and dev, so the fix is still needed going forward. `DatasetAttributes.vue`/`DatasetDisplay.vue` changed upstream since 26.0 (GTabs/GAlert, #23985, preview rework), so expect merge-forward conflicts whichever base is chosen.

### 6. Contraction: test-only (make Selenium wait or retry)

| Pros | Cons |
|---|---|
| Tiny | Hides a real UX bug: the success alert vanishes after every attribute save |

Rejected.
