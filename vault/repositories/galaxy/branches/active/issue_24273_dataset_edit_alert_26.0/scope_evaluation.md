# Scope evaluation (round 2, after re-scope)

**Recommendation: keep as implemented on `release_26.0`.** The round-1 expansion is done, and the regressions the reviews found (Details tab, form reload race, preview check error) are fixed and pinned. Contracting doesn't give a safe smaller fix. The original scope (`072f8e9fa80`) already keeps `DatasetView` mounted after the first load, so it has the Codex P1 too: the Details tab is fetched only on mount and goes stale when a dataset finishes. The smallest correct fix is therefore the original scope plus the Details refresh and the latest-request guard. The rest of the branch is the composable, the Display work and the backport. None of the open follow-ups is a modest, release-safe expansion:
- `DatasetDetails` via `useSettledDataset` requires rewriting tests and touches the legacy `show_params` route.
- Keying the Details children has little visible effect.
- The E2E risk is low on inspection.

The real cost is merge-forward: about 124 conflict lines in `DatasetDisplay.vue` against 26.2 and dev. John can lower that by splitting off the Display piece (see the decompositions), but the size alone doesn't justify a scope change.

## Possible Decompositions

The branch is 26 commits and about 1,120 added lines: roughly 250 of production code, 850 of tests and 8 of a test helper. Hard dependencies:
- **"View stays mounted"** (`DatasetView` gate) needs **both** the Attributes in-place form reload and the Details refresh. Without them it ships stale-tab regressions.
- **The Display piece** (`DatasetDisplay` gate, HEAD recheck, latest-wins, non-blocking preview error) works on its own on base. Base Display still remounts on a refetch, which is today's behaviour.
- **The #23985 cherry-pick** (`2d0823f3135`) is independent of everything else.
- **`useSettledDataset`** is needed only by the View and Display pieces. **`onDatasetUpdated`**, `createLatestRequestTracker` and `hold.ts` are shared by all three tab components.

**Option A: by surface (3 PRs, all on 26.0)**
1. Core: the 3 baseline commits, the refactors, `settledDataset.ts` and `latestRequest.ts`, the DatasetView gate, the Attributes reload, the Details refresh, the refresh-error alert and the #23985 backport. This piece fixes #24273.
2. Display: the preview stays mounted, plus the recheck on `update_time`, the stale-HEAD guard and the non-blocking preview error. Depends on 1 for the composable.
3. None. Option A could fold 2 into 1 instead; it's listed to show the seam.

**Option B: minimal 26.0 fix plus the rest elsewhere**
1. A 26.0 PR with the original scope, the Details refresh and the latest-request tracker. No composable: it keeps `loadedDatasetId`/`showLoading`. That's about 100 production lines, and it conflicts only in `DatasetAttributes.vue` (small) and with the `DatasetDetails.test.ts` add/add.
2. A follow-up on 26.2 or dev: `useSettledDataset`, the Display piece rewritten against the reworked preview code, and the DatasetView refresh-error alert. It avoids the 124-line Display conflict by being written on the new code.
- Cost: piece 1 reintroduces the one-off gate that round 1 asked to generalise. Display flicker stays on 26.0 and 26.1.

**Option C: by commit role**
1. Baseline tests and refactors only (`b7db9b4199a`..`9eb5612045e`). These pass on base and carry no behaviour change.
2. The #23985 backport alone.
3. Everything else as a single fix PR.

**Option D: retarget to `release_26.2` or dev**
1. Rebase onto 26.2. Display is then written once, against the reworked preview, with no conflicts.
- Cost: 26.0 and 26.1 keep the bug. The failure shows up in the dev weekly run, there are no user reports, and the bug is cosmetic or flaky. This is a policy call for John; 26.0 is defensible (see scope 5).

## Merge-forward (`git merge-tree`, head `3db8cffc661`)

| Target | Conflicts |
|---|---|
| `release_26.1` | `DatasetAttributes.vue` (small); `DatasetDetails.test.ts` add/add. `DatasetDisplay.vue` merges cleanly |
| `release_26.2` / `dev` | `DatasetDisplay.vue`: 7 hunks, about 124 lines (preview rework `644bd9fcd2c`, `26de751a0da`, `a2df9e01f34`). `DatasetAttributes.vue`: 2 hunks, about 10 lines (imports and `fetchForms`). `DatasetDetails.test.ts` add/add: about 267 lines |
| Original scope `072f8e9fa80` (any target) | `DatasetAttributes.vue` only |

- The **`DatasetDetails.test.ts` add/add conflict hasn't been reported before.** Upstream created that file on 26.1 with `2409981debf` (peek sanitizing) and `4e08379b8c3` (creating-job polling). Resolving it is mechanical: keep both test sets.
- The **`DatasetDetails.vue` change also hasn't been reported.** Upstream `4e08379b8c3` changes job polling in the same file. It auto-merges, but it sits next to the branch's derived `loading` and its refresh path. That's a semantic risk: rerun the Details tests after merging.
- The **Display gate is still buggy upstream.** Dev and 26.2 `DatasetDisplay.vue` still have `isLoading = computed(() => isLoadingDataset(...))` and an exclusive `errorMessage` alert. So the Display fix has to be **ported into the reworked code**, not dropped in favour of upstream. This is the main cost of the expansion.

## Scopes considered

### 1. As implemented (recommended)

Mounted tabs no longer reset on a refetch:
- **DatasetView** holds the last settled dataset; a refetch error shows as a non-blocking alert.
- **Attributes, Details and Display** each refresh in place on `update_time`, and only the latest request applies.
- **Saves** show the server's error message (the #23985 backport).

| Pros | Cons |
|---|---|
| Fixes #24273 at the root (no remount) and fixes the same bug on the Preview tab and in the error path | About 250 production lines across 4 components plus 2 new modules: large for a flaky-test fix on a release that is two branches old |
| The cascading regressions (Details P1, form race, preview error) are fixed with red-to-green tests | About 124 Display conflict lines to port onto 26.2 and dev's reworked preview |
| Reusable pieces: `useSettledDataset`, `onDatasetUpdated`, `createLatestRequestTracker`, `hold.ts` | DatasetDetails fetches the dataset itself, so it duplicates a request and can show a second refresh alert (thermo top finding) |
| Merges into 26.1 with only small conflicts | Selenium and Playwright not run; CI not yet seen |

### 2. Contract to the original scope (`072f8e9fa80`)

Only the `DatasetView` first-load gate and the Attributes form reload.

| Pros | Cons |
|---|---|
| About 60 production lines; conflicts only in `DatasetAttributes.vue` | **Ships the Details-tab P1.** The view stays mounted there too, so Details is never refreshed after a job finishes. Not a safe option on its own |
| | Keeps the stale-form race, the Display flicker and the blocking `loadError` unmount |

<details>

Confirmed in `072f8e9fa80:DatasetView.vue`: `showLoading = loadedDatasetId !== datasetId` gates only the first load. `DatasetDetails` (line 263) and `DatasetAttributes` (line 260) therefore stay mounted through refetches. Codex attributed the P1 to the re-scope, but its cause is in the original scope.

</details>

### 3. Minimal-correct contraction: original scope + Details refresh + latest-request guard

The smallest version that doesn't regress, taken as Option B piece 1.

| Pros | Cons |
|---|---|
| About 100 production lines, and avoids the Display conflict entirely | Undoes the round-1 generalisation, so the one-off gate comes back and the Display flicker stays |
| A clear fit for a release branch | Rework and a re-review for a smaller fix; the work already done is tested |

### 4. Follow-ups as expansions

- **DatasetDetails reads the store through `useSettledDataset`.** It deletes its own fetch, tracker, duplicate request and alert. But it needs test rewrites (`storeUpdate()` triggers, a latest-wins test that `keyedCache` makes unreachable). The legacy `datasets/:id/show_params` route mounts the component without DatasetView. Upstream `4e08379b8c3` also edits the same file. **Leave it as a dev follow-up.**
- **Details children load only on mount.**
  - `DatasetStorage` watches `props` (only `datasetId`) and shows object-store, discarded and deferred info. None of that usually changes when a job finishes.
  - `JobInformation` watches `jobId`. `JobParameters` and `InheritanceChain` are static for a finished job.
  - A `:key` on `update_time` would remount them and cause flicker, for little visible gain. **A note, not an expansion.**
- **E2E risk from in-place Details updates.** I spot-checked the Selenium reads of dataset details: `test_tool_form` `_check_dataset_details_*`, `test_history_dataset_state`, `test_uploads` and `wait_for_hid_ok_and_open_details`.
  - They open the tab after the dataset is OK, so it mounts fresh rather than updating in place.
  - None depends on a refetch skeleton inside DatasetView. **Low risk**, and CI will confirm.
- **History-panel `DatasetDetails.vue`, the store root cause (summaries overwriting detailed items), and `keyedCache` never clearing errors.** Unchanged since round 1: these are separate surfaces with shared-store risk. **Dev follow-ups.**

| Pros | Cons |
|---|---|
| The store-read change would remove about 20 lines and the duplicate request | Test rewrites and removals need John's sign-off, which is risky on a release branch |
| | Would reopen hardening for a marginal gain |

### 5. Retarget the base (26.2 or dev, or 25.1)

| Pros | Cons |
|---|---|
| 26.2 or dev: Display is written once against the new code, with no 124-line port | 26.0 and 26.1 keep the bug. The policy favours the oldest affected branch, and Galaxy is liberal about release-branch fixes |
| | 25.1: the DatasetView watcher structure differs, so it needs a different patch. Not worth it for a cosmetic bug |

### 6. Test-only (Selenium waits or retries)

Rejected again: the success alert really does vanish for users.
