# Baseline refactor (round 2, after re-scope)

Added two refactor commits on the base after the baseline tests: extract `checkPreview()` in `DatasetDisplay.vue`, and derive `loading` in `DatasetDetails.vue`. They sit beside round 1's `fetchForms()` extraction. All three "Baseline tests" commits are now first. The history is on the local branch `issue_24273_dataset_edit_alert_26.0_refactored` (tip `3db8cffc661`), and its tree is identical to `6b8c9d835ea` (empty `git diff`). The original branch is unchanged, because the reviews cite its hashes. Nothing was pushed.

## Refactors

- `d339169598f` Extract dataset preview check from its watcher. The inline `datasetId` watcher body becomes `checkPreview()`, with `watch(() => props.datasetId, checkPreview, { immediate: true })`. Prettier also reflows the `contentTruncated` line. This is a pure extraction: the function is the same one `7fbaa7d5942` introduced, so that commit's diff shrinks to the actual fix.
- `9eb5612045e` Derive dataset details loading state. `loading` becomes `computed(() => !dataset && !datasetLoadingError)` instead of a flag set around the fetch. It matches `6b8c9d835ea`'s DatasetAttributes change, and the fix commit (`f497940cd6e` → `9597123c90a`) no longer has to replace the flag.
  - Behavior changes only before `onMounted` runs: the spinner now renders instead of an empty div, and the re-render happens before paint. After that, base never refetches, so the result is the same.
  - The baseline DatasetDetails tests pass at this commit.

Not split out:
- `createLatestRequestTracker`, `onDatasetUpdated` and `tests/vitest/hold.ts`, because nothing on base would use them.
- DatasetAttributes' derived `loading`, because it depends on `formRevision`, which the fix adds.

## Baseline ordering

`8d6de9484b9` "Baseline tests for DatasetDetails" moved from the middle of the history to third place. Its tests pass against the base `f90a897bfbe` component code. It imports nothing the branch added. `b7db9b4199a` and `976a7079009` keep their hashes.

## History mapping (old → new)

| Old | New | Note |
|---|---|---|
| `b7db9b4199a` Baseline tests (DatasetView) | `b7db9b4199a` | unchanged |
| `976a7079009` Baseline tests (DatasetDisplay/View) | `976a7079009` | unchanged |
| `8d6de9484b9` Baseline tests for DatasetDetails | `27be4062dab` | moved to the front |
| `c422debe46c` Extract form fetch | `f02f5b494c8` | |
| — | `d339169598f` | new refactor (DatasetDisplay) |
| — | `9eb5612045e` | new refactor (DatasetDetails) |
| `5395b786d88` | `5f8b348a777` | |
| `a12c6e21d73` | `894da50adff` | |
| `33acbe70ae1` | `6b78355eef0` | |
| `8763e949efa` | `46d3fada538` | |
| `7eb14b18717` | `1eb88ccc04d` | |
| `abc80d2bed6` (davelopez, `-x`) | `2d0823f3135` | author and cherry-pick trailer kept |
| `4a48b8e249e` | `5b2a84828b8` | |
| `34778b62171` | `630b177619d` | |
| `7fbaa7d5942` | `6bca59a4ad4` | conflict resolved to the original file; absorbs `d339169598f` |
| `f1f41b14527` | `e1acfdc55c9` | |
| `3fafdd31157` | `01de1e4ac7c` | |
| `0d5e89266ad` | `b0a8ab54832` | |
| `10e0ce02a86` | `51dd425f030` | |
| `625950808f2` | `0fedc7dcae9` | |
| `a4a5ff96e35` | `5deb7d7be63` | |
| `975576506ae` | `9182744c813` | |
| `986a83f30b2` | `274afd9e511` | |
| `f497940cd6e` | `9597123c90a` | conflict resolved to the original file; absorbs `9eb5612045e` |
| `2d4931aee0f` | `46e3ff1864c` | |
| `6b8c9d835ea` | `3db8cffc661` | tip, tree equal |

For each commit, the diff against the original contains only the expected files:

| Commits | Files that differ |
|---|---|
| `5395b786d88`–`34778b62171` | `DatasetDisplay.vue`, `DatasetDetails.vue`, `DatasetDetails.test.ts` |
| `7fbaa7d5942`–`a4a5ff96e35` | `DatasetDetails.vue`, `DatasetDetails.test.ts` |
| `975576506ae`–`986a83f30b2` | `DatasetDetails.vue` |
| `f497940cd6e` on | none |

## Verification (node 22.20.0)

- `27be4062dab` (all baseline tests on base code) and `9eb5612045e` (after the refactors): `Dataset/` and `DatasetInformation/` give 9 files, 46 passed, 2 skipped. eslint and prettier are clean on the refactored files; the only output is the existing `v-html` warning.
- `5deb7d7be63` (mid-history): 10 files, 62 passed, 2 skipped.
- Tip `3db8cffc661`: 10 files, 72 passed, 2 skipped. `vue-tsc --noEmit` exits 0.

## Later: backport moved into the baseline (2026-10-20)

At John's direction, upstream `9cb9df41c63` (#23985) was cherry-picked fresh (`-x`, davelopez author) as commit 7, `498f65b48a3`, right after the refactors. Its conflict with "Rebuild dataset attribute forms after a save" was resolved by keeping upstream's `errorMessageAsString` line plus the branch's `return;`. The final tree matches `2844b08fb87`; head is now `c11610da344`. `issue_24273_dataset_edit_alert_26.0_baseline` is cut at `498f65b48a3`.
