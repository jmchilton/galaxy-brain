# Implementation debrief

**STATUS: READY.** Fixes [#24273](https://github.com/galaxyproject/galaxy/issues/24273) on `release_26.0`.
- Head `c11610da344` (same tree as hand-off head `2844b08fb87`; #23985 backport moved to commit 7 for the baseline split). Original-scope alt: `072f8e9fa80`.
- A non-workhorse session implemented this. It was recovered into the workhorse process, re-scoped once, and hardened twice.

## Bug

After you save on the Edit tab, the history watcher stores a summary over the detailed dataset, and the dataset store refetches it. `DatasetView` blocked on `isLoading || !dataset`, so every refetch unmounted the open tab. That dropped the save alert, which is why Selenium `test_history_dataset_rename` timed out on `.dataset-attributes-alert`. The Preview tab, and the whole view on a failed refetch, blanked the same way.

## Final implementation

- **`useSettledDataset`** (`composables/settledDataset.ts`) holds the last complete stored dataset while the store refetches. Only the first load of each id blocks. `DatasetView` and `DatasetDisplay` gate on it.
- **Header and errors:** the `DatasetView` header name follows the live store. A load error blocks only before the first load; after that, it shows a non-blocking warning.
- **`onDatasetUpdated`** (same file) and **`createLatestRequestTracker`** (`utils/latestRequest.ts`): tabs that loaded only on mount now refresh in place, with the latest request winning. They used to get fresh data from the remount.
  - `DatasetAttributes`: its forms are rebuilt through `FormDisplay`'s `id`, and the Datatypes tab stays put while metadata is set.
  - `DatasetDetails`, and the preview check in `DatasetDisplay`: a failed background refresh keeps the last good content and shows a warning.
- **Backport** of upstream #23985 (`9cb9df41c63`): save errors now show the server's message.
- **Tests:**
  - New vitest coverage for all of the above.
  - Three "Baseline tests" commits come first and pass on base.
  - The Selenium tests now assert that the rename alert survives the header refresh, and that the auto-detected datatype appears in the open tab. Both add screenshots.
- **Size:** about 270 production lines and 870 test lines.

## Scope decision

Round 1 [scope evaluation](earlier_drafts/1/scope_evaluation.md) recommended expanding, and the expansion was done ([re-scope](implementation_rescope_debrief.md)). Round 2 [scope evaluation](scope_evaluation.md) recommends keeping it: the original scope already had the stale Details-tab bug, so contracting gives no smaller fix that's correct. It lists split options A–D (e.g. a minimal 26.0 PR plus the Display and composable work on 26.2/dev) for the branch manager or John.

## Found during hardening, fixed

- Stale edit forms after a datatype change, an older form reload overwriting a newer one, and a Details tab that never refreshed.
- A failed background preview check blanking the preview.
- Switching to an already-loaded dataset getting stuck loading, a vue-tsc narrowing break, and the refresh alert sticking after a retry succeeded.
- The header lagging after a rename, and the Edit form jumping to Permissions after auto-detect (found by screenshots).

## Open for review

- **Test removals awaiting John** ([test challenges](test_challenges_debrief.md)): the weak `settledDataset` "is null until the dataset first loads" test, and a store-name assertion in `DatasetDisplay`.
- **Follow-ups (dev):**
  - `DatasetDetails` should read the store via `useSettledDataset` instead of its own fetch.
  - Some Details-tab children (`DatasetStorage` etc.) still load only on mount.
  - The history panel's `DatasetDetails.vue` uses the same gate.
  - `keyedCache` never clears non-retryable errors.
  - The dataset-store root cause: summaries overwrite detailed items.
- **Merge-forward:** `DatasetDisplay.vue` conflicts heavily against 26.2/dev (about 124 lines), and the fix has to be ported into the reworked preview there. `DatasetDetails.test.ts` is an add/add conflict on 26.1+.
- **Base:** the same gate exists on 25.1. Kept 26.0 because the patch would differ and the bug is low severity.

## Validation

- vitest (node 22.20.0): `Dataset/`, `DatasetInformation/` and `settledDataset` give 73 passed, 2 skipped. `vue-tsc` is clean, and eslint/prettier are clean.
- Selenium, at head: `test_history_dataset_rename` and `test_history_dataset_auto_detect_datatype` pass.
  - Local retries hit a known upload-timing race in `perform_single_upload`, before any changed UI.
  - Playwright never got past that race locally, so CI is the first Playwright run of the new steps.
- [Screenshots](screenshot_debrief.md).

Reviews: [normal](subagents/normal_review.md), [re-scope](subagents/rescope_review.md), [test challenges](test_challenges_debrief.md), [Codex](codex_review.md), [thermo-nuclear](thermo_nuclear_review.md), [baseline refactor](baseline_refactor.md), [scope](scope_evaluation.md). Round 1: [earlier_drafts/1/](earlier_drafts/1/).
