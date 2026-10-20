# Rescope review

I reviewed the re-scope commits (`072f8e9fa80..151fb7fae37`) against the whole branch, and made fixes in two commits, both red to green:

- `623db835af2`: the refresh alert stopped sticking, and the header shows renames immediately again.
- `de73cbe8a5b`: the stale-HEAD guard in `DatasetDisplay`.

I also fixed the inaccurate `extraLoading` docstring and test name. I didn't rewrite history or remove any tests.

These fixes resolve three of the implementer's "Known limits": the stuck alert (it still stays after a 403, which is accurate), the unordered HEAD rechecks, and the header name lag. Don't carry those three into the final debrief or the PR description.

**Not acted on:**

- **Baseline commit order.** `9699766754e` comes after the fix commits. I only noted it, as instructed.
  - Before splitting PRs, move it ahead of `6e09e8dcfa7`/`072f8e9fa80` and confirm its tests pass at `f90a897bfbe`.
  - Its tests look independent of the earlier commits, but I didn't verify that because it needs a separate checkout.
- **Redundant tests.** I'm recommending these, not deleting them; see Details.
- **A 403 on refetch is a dead end until reload.** `keyedCache` never retries non-retryable errors. The view keeps the held dataset and the alert stays, which is accurate. A shared `keyedCache` fix is out of scope.
- **History-panel `DatasetDetails.vue`.** It is the only other `isLoadingDataset` consumer. Deferring it is already justified in the implementer's notes. The `DatasetInformation/DatasetDetails.vue` and `DatasetError.vue` tabs don't gate on `isLoadingDataset`.
- **Merge-forward conflicts.** The cherry-pick narrows the `DatasetAttributes.vue` conflict but doesn't remove it; see Details. No fix is available on this base.

## Details

### `useSettledDataset` (`client/src/composables/settledDataset.ts`)

- **Naming and placement.** It fits its siblings: noun-style file names like `persistentToggle.ts` and `datasetPermissions.ts`, with a `use*` export.
- **Typing.** `HDADetailed` matches the store, which already types summaries as `HDADetailed`.
- **Reuse.** It's a genuine reusable abstraction: two consumers now, and the history-panel `DatasetDetails` is a candidate.
- **The completeness check was duplicated in spirit.** `DatasetView` needed the same "detailed or inaccessible" test for the alert. I exported it as `isSettledDataset` and the composable now uses it.
- **The `extraLoading` docs were wrong.** They said it gates "the first load" and is "read when called". In fact it gates every new version: a datatype change holds the old dataset until the new datatype details load, which is desirable. It is also read on every evaluation. Only the first, immediate check depends on watcher order. I fixed the docstring and renamed the test to "waits for extra loading without dropping a held dataset".
- **Watcher-order dependency.** Acceptable. It's documented at the call site and pinned by the "waits for datatype details on the first load" test.

### Header shows the old name after a rename (fixed)

- `HDASummary` carries `name`, and the header already mixes data sources: `DatasetState` reads the live store by id.
- `datasetName` is now `storedDataset?.name ?? dataset.name`. Only the name reads the live store. `file_ext` stays held, because it drives which display is used and must stay in step with the loaded datatype details.
- Red to green: I strengthened the existing refetch test to assert `.dataset-name` is "Renamed Dataset" during the refetch.

### `.dataset-refresh-error` sticking (fixed; this was a real bug)

- `keyedCache` retries 429 and 5xx responses but never clears `loadingErrors` after a success. A transient 502 on a refetch was retried and succeeded, and the view showed current data. The alert still said "could not be refreshed, showing the last loaded version" for as long as the view stayed open, which was false.
- The alert now shows only when `loadError` is set and the stored dataset is not settled, so it clears once a detailed item lands. I didn't edit `keyedCache`.
- The new test returns a 502 and then a 200. It was red before the fix.
- The existing 403 test stays green: the summary is never upgraded, so the alert correctly stays.

### Overlapping HEAD checks in `DatasetDisplay` (fixed)

- The problem was real, though rare. When an update rechecks while an earlier HEAD is still in flight, a slow response for the older version could land last and flip between the chunked view and the iframe.
- `checkPreview` now drops any result that isn't from the latest check, using a per-instance sequence counter.
- I looked at `LastQueue` and chose not to use it. Its 1 s default throttle and promise-skip semantics are heavier than this needs.
- The `update_time` watch also skips the case where the held dataset clears on an id switch. The `datasetId` watch already rechecks then, so that path used to send a duplicate HEAD. This guard is defensive and only partial: switching to an id that is already stored still sends a second, harmless HEAD. Inside `DatasetView` the path is barely reachable, because `DatasetDisplay` remounts on a switch. It has no dedicated test.
- The new test holds the first HEAD and releases it after the second. It was red before the fix.

### Cherry-pick `6e09e8dcfa7` (of `9cb9df41c63`, #23985)

- The author is preserved (davelopez), and `-x` is present.
- The conflict resolution is correct. It keeps `return;` and the `fetchForms()` rebuild, and takes `errorMessageAsString(e, ...)`.
- `AxiosError` is still needed, because `fetchDatasetAttributes` uses axios directly. So `fetchForms`'s `err_msg` lookup is valid there; it is not the same bug.
- **Merge-forward**, checked with `git merge-tree` against `origin/release_26.2` and `origin/dev`:
  - `DatasetAttributes.vue` conflicts both at `072f8e9fa80` and at `6e09e8dcfa7`. The cherry-pick removes the `err_msg` lines from the `submit` hunk, so that hunk is smaller, but the `fetchForms` hunk and the import hunk (`BTabs`/`BAlert` vs `GTabs`) still conflict.
  - So the scope evaluation's "removes a merge conflict" claim is overstated. It reduces the conflict; it doesn't remove it.
  - `DatasetDisplay.vue` newly conflicts at HEAD, as the scope evaluation predicted (preview rework upstream).
- The cherry-pick is still worth keeping, because it fixes a user-visible bug.

### Test volume (recommendations only; nothing deleted)

- **`settledDataset.test.ts`.** "holds the loaded dataset while a summary replaces it" and "keeps the loaded dataset when a refetch fails" overlap the `DatasetView` and `DatasetDisplay` integration tests. Consider dropping them and keeping "is null until first load", the extra-loading test and the id-switch test, which only the unit tests pin precisely.
- **`DatasetDisplay.test.ts`.**
  - "shows a loading message until the dataset is stored" ends with a store-name assertion that is incidental; it could be trimmed.
  - "rechecks the preview once a pending dataset finishes" stores a peek-bearing object, which skips the real path where a summary is followed by a refetch. Consider strengthening it to that path rather than removing it.
- **Everything else** tests behaviour (mounted-element identity, alerts, headers) and isn't trivial.

### Verification

- vitest: `src/components/Dataset/ src/components/DatasetInformation/ src/composables/settledDataset` gives 9 files, 59 passed and 2 skipped (the skips existed before).
- eslint: clean. The only warnings are the existing `v-html` warnings in `DatasetView.vue`.
- prettier `--check`: clean.
- `vue-tsc --noEmit`: exit 0, no output.
