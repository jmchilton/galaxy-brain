# Thermo-nuclear review (round 2, after re-scope)

Reviewed `f90a897bfbe..2d4931aee0f` fresh. Production code is about 250 lines and tests are about 850, so the size is proportionate for what changed: three tabs that used to remount on every refetch now stay mounted. No file nears 1k lines; the largest is `DatasetView.vue` at 347. No ad-hoc branching was added to shared code. I acted on one small cleanup, `6b8c9d835ea`. The biggest finding is a code-judo move for `DatasetDetails`, which I recommend but didn't make because it needs test rewrites.

- **Acted on (`6b8c9d835ea`): DatasetAttributes derives `loading`.** The branch had three idioms for first load vs refresh. `loading` is now `computed(() => formRevision === 0 && !loadingFailed)`, matching DatasetDetails. That removes a ref, the `loading = true` in `onMounted`, and the trailing `loading = false`. A superseded first load still clears loading, because the winning request bumps `formRevision`. All tests pass unchanged.
  - Merge-forward cost: `git merge-tree` against `origin/release_26.2` and `origin/dev` now shows 2 conflict hunks in this file instead of 1. The new one is the `vue` import line (`computed`), next to upstream's `bootstrap-vue` import change, and it's trivial to resolve. `DatasetDisplay.vue` conflicts the same as before.

Not acted on:
- **Top finding: `DatasetDetails` should read the store through `useSettledDataset`.** It fetches `/api/datasets/{id}?view=detailed` itself, the same endpoint the dataset store uses.
  - After an update it requests the dataset twice (once itself, once via the store). When a refetch fails inside `DatasetView`, it shows its own refresh alert next to `DatasetView`'s.
  - Using the store would delete `getDatasetDetails`, its latest-request tracker, its `onDatasetUpdated` call and `datasetRefreshError`. The job poll would start from a `creating_job` watch.
  - Why not now: the tests are built around the component's own fetch.
    - `storeUpdate()` stores a detailed item (it has `peek`), so the store would never refetch. The real trigger is a summary.
    - "ignores a refresh that finishes after a newer one" can't happen through `keyedCache`, which reuses the in-flight request.
    - `.dataset-details-refresh-error` would move to `DatasetView`.
    - The legacy `datasets/:id/show_params` route mounts `DatasetDetails` alone, without `DatasetView`'s alert.
  - That means rewriting and dropping tests on a release branch. **Recommend it as a dev follow-up.** John decides on the test changes.
- **A single "fetch + refresh in place + latest wins + load/refresh error" composable: recommend against it.** The three sites only look alike:
  - DatasetDisplay keys its first load per id (`checkedDatasetId`) and writes four header refs.
  - DatasetAttributes sends load errors to the `messageText` the save path also uses, and needs `formRevision` to re-clone `FormDisplay`.
  - DatasetDetails is the plain case, and it should leave this pattern entirely (above).

  A shared composable would need options to cover those differences. It would add about as many lines as it removes, and put more churn into `DatasetAttributes.vue` and `DatasetDisplay.vue`, which already conflict on merge-forward to 26.2 and dev. The part that really is common is already extracted: `createLatestRequestTracker`.
- **`fetchForms` catch still uses `AxiosError` / `err_msg`, while `submit` uses `errorMessageAsString`.** Switching changes the fallback text when there is no `err_msg` (`statusText (status)` instead of "Unable to fetch…"). Round 1 declined the same trade. Inconsistency noted only.
- **Pre-existing `keyedCache` race:** an in-flight detailed fetch can land after a newer summary and overwrite it with the older item. Out of scope, same as the store root cause.

Recommended test removals (none made; John's call):
- None new. The round-2 test-challenge candidates still stand: `settledDataset` "is null until the dataset first loads", and the incidental `getDataset(...).name` assertion in DatasetDisplay. If the DatasetDetails follow-up lands, "ignores a refresh that finishes after a newer one" goes with it.

## Details

**Structure and cohesion**
- **`composables/settledDataset.ts`** (75 lines). It's cohesive enough: `isSettledDataset`, `useSettledDataset` and `onDatasetUpdated` all observe the dataset store, and `onDatasetUpdated` never fetches. "settled" is a slightly narrow name for `onDatasetUpdated`, but a rename isn't worth the import churn. It replaced three hand-rolled `update_time` watches, so it earns its place.
- **`utils/latestRequest.ts`** (12 lines). I checked `LastQueue`. It drops only queued tasks; a request already running still resolves and delivers its result, and the newer request waits behind it plus the throttle (1 s by default). So `LastQueue` alone wouldn't give latest-wins, and the guard would still be needed. Keep the tracker. The double closure (`start()` returns `isLatest`) is compact and readable at all three call sites.
- **`tests/vitest/hold.ts`**. No shared equivalent found on 26.0 or dev; dev has only file-local copies (`deferred()` in `CuratedWorkflowList.test.ts`, `deferredResponse()` in two GalaxyAI tests). Those are candidates to move onto it later. Keeping it out of `helpers.js` to avoid merge-forward conflicts is still the right call.
- **DatasetView.** `useSettledDataset` plus `showRefreshError` replaced a consolidated `isLoading`. The datatype-watch-before-composable ordering is documented and pinned by a test. `datasetName` mixes the live store with held data on purpose (renames). Fine.
- **DatasetDisplay.** It's only mounted inside `DatasetView`, and has no `:key`. Switching to an already-stored dataset with the same `file_ext` doesn't null the held dataset, so it isn't remounted ("shows a dataset that is already stored when switching to it"). The per-id `checkedDatasetId` is what keeps a failed first check for the new id blocking, instead of showing up as a refresh warning over the old preview. Keep it.
- **DatasetAttributes.** `formRevision` doing double duty, as the `FormDisplay` re-clone key and as "has loaded", is now explicit through the derived `loading`.

**Tests.** The overlap is layered: composable contract → DatasetDisplay/Attributes/Details → DatasetView integration. It isn't copy-paste. Each component test asserts rendered state or element identity through MSW and real Pinia. The one structural mismatch is DatasetDetails' `storeUpdate()` trigger (see the top finding).

**Runs** (node 22.20.0, at `6b8c9d835ea`)
- vitest on `Dataset/`, `DatasetInformation/` and `settledDataset`: 10 files, 72 passed, 2 skipped (pre-existing skips).
- eslint and `prettier --check` are clean on `DatasetAttributes.vue`. `vue-tsc --noEmit` exits 0.
- Selenium and Playwright were not run.
