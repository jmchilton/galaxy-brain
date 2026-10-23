# Duplicate hidden HDAs after library-to-list import, and the duplicate-tooltip `title`

## Task A: verdict, a real duplicate, fixed

The 4 hidden HDAs come from a two-step path that only library items take:

1. `useUploadSubmission.processLibraryUploads` calls `copyDataset(lddaId, historyId, "dataset", "library")` once per item. That's `POST /api/histories/{id}/contents` with `source=library`, and it creates 2 visible HDAs.
2. `useUploadBatchOperations.createCollection` then sends `POST /api/dataset_collections` with `src: hda` elements, `hide_source_items: true` and `copy_elements: true`. The backend (`DatasetCollectionManager.__load_element`, the `hda` branch) copies each element as a hidden HDA and hides the sources. That leaves 4 hidden HDAs.

Fetch-compatible items (paste, URL, local) take `processDirectBatch` instead (`isDirectCollectionCreation`). That's a single `/api/tools/fetch` request with an `hdca` destination, so they never hit step 2. `isFetchApiCompatible` is false only for `data-library` items.

### HDA counts per flow (API, :8092, 2 datasets → list)

| Flow | HDAs | visible / hidden |
|---|---|---|
| Upload Activity library → list (before fix: copy + `copy_elements: true`) | 4 | 0 / 4 |
| Old LibraryFolder "as a Collection" (`src: ldda`, `copy_elements: true`) | 2 | 0 / 2 |
| List builder over 2 existing history datasets | 4 (2 pre-existing) | 0 / 4 |
| Upload Activity paste → list (direct fetch HDCA) | 2 | 0 / 2 |
| Upload Activity library → list with `copy_elements: false` (the fix) | 2 | 0 / 2; elements are exactly the copied HDAs |

The list builder also ends up with 4 HDAs, but 2 of them are the user's own pre-existing datasets. Copying them is the reason `copy_elements` exists. In the library activity flow, the first 2 HDAs exist only because this upload made them as intermediates, so nobody owns them as "originals". Both flows that import from a source into a list keep one set: the old library path keeps 2 (backend `ldda` branch, no copy) and paste-to-list keeps 2. So the activity library flow keeps both the intermediates and copies of them, where the comparable flows keep one set.

origin/dev has the same code (no diff in `useUploadSubmission.ts`, `useUploadBatchOperations.ts` or `collectionCreation.ts` against base), and no upstream PR fixes it.

### Fix: `e6dadb439ae`

- `createCollection` in `useUploadBatchOperations.ts` now sends `copy_elements: false`. It's safe everywhere this path runs: `batch.datasetIds` only ever comes from `addHdaDatasetsToBatch` in the same submission, and that holds for library-only batches, mixed batches, retry and autoRecover. The sources are hidden by `hide_source_items` and become the elements themselves.
- Tests, red then green:
  - **Vitest:** `useUploadBatchOperations.test.ts`, "builds the two-step collection from the uploaded datasets without copying them". It checks `copy_elements: false` and the `src: hda` element.
  - **E2E:** `test_upload_list_from_data_library_to_target_history` now asserts that the target history's datasets are exactly the HDCA element objects and that all of them are hidden.
- No existing test asserted `copy_elements: true`, so no assertion was weakened.
- Not touched: `createCollectionPayload` in `api/datasetCollections.ts` does `options.copy_elements || true`, which can never send `false`. That's a pre-existing bug. `createCollection` calls `createHistoryDatasetCollectionInstanceFull` directly, so it isn't affected, but don't route this call through `createCollectionPayload`.

## Task B: removed the native `title`, CSS truncation kept

- Neither `SwitchToHistoryLink` nor `TargetHistoryLink` exposes the full name another way. The GLink tooltip text comes from the internal `linkTitle` ("Switch to this history", "This is your current history", and so on). Showing the name there would need a new prop threaded through both shared components, so I removed the `:title` instead.
- Removed `:title="targetHistoryName"`, the `targetHistoryName` computed and the vitest case "puts the full history name on the target history link title". This was a fixup-amend into the truncation commit, now `d8cb457df34`, which also drops "put the full name in the link's title" from its message.
- Autosquashed onto base `d2d1dcd883c`. Commit order is unchanged, and the Task A fix is last.

## Tests

- Vitest, with a temporary config aliasing galaxy-ui to this worktree, deleted afterwards:
  - `TargetHistorySelector.test.ts` and `useUploadBatchOperations.test.ts`: 7 passed.
  - All 5 files under `composables/upload/`: 34 passed.
- E2E `TestUploadActivityDataLibrary`:
  - The list test failed on Playwright before the fix (4 HDAs vs 2 elements).
  - After the fix and the rebase, Playwright passed 3/3.
  - Selenium passed 3/3 on the rerun. The first run passed 2, and `test_upload_from_data_library_as_other_user` errored when the Chrome renderer disconnected, which is an environment problem.
- Lint:
  - ruff, black and isort are clean on the test file.
  - eslint and prettier are clean on the touched client files, apart from one pre-existing `vue/v-on-event-hyphenation` warning on a base line.
