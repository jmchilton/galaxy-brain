# Normal review: duplicate HDAs fix (`e6dadb439ae`) and title removal (`d8cb457df34`)

Verdict: approve as is, with no code changes. Nothing needed fixing. I checked `copy_elements: false` on every path that reaches `createCollection`, and it is safe on all of them. The vitest is red without the fix and green with it. The `createCollectionPayload` `|| true` issue is a latent bug that no current caller hits, so I didn't fix it on this branch.

## Not acted on

- **`createCollectionPayload` `copy_elements || true`.** Not fixed here: it's latent and nothing reaches it.
  - None of its callers can pass `false`. `useCollectionCreation.createPayload` never sets `copy_elements`. `queries.createDatasetCollection` defaults it to `true`, and its only caller, `buildCollectionModal`, passes the rule builder's result, which has no `copy_elements` key.
  - The Upload Activity calls `createHistoryDatasetCollectionInstanceFull` directly, so it bypasses this helper.
  - Fixing it on a release branch wouldn't change any behavior. It's a good one-line `?? true` fix with a vitest for `dev`.
- **Posting `src: ldda` elements straight to `/api/dataset_collections`.** Not recommended for this branch.
  - It would only cover batches that are entirely library items. Mixed batches (library plus paste/local/URL) still have to copy first and then build the collection.
  - The per-item copy also drives per-item progress, cancellation and error tracking in `processLibraryUploads`.
  - So switching would need a second collection path in the activity, which is more code on a release branch. Copying and then building with `copy_elements: false` already ends with the same 2 hidden HDAs as the old LibraryFolder `ldda` path and fetch-to-list.

## Details

### Is `copy_elements: false` safe on every path?

Yes. `batch.datasetIds` is filled only by `uploadState.addBatchDatasetId`, and the only production caller of that is `useUploadSubmission.addHdaDatasetsToBatch`. It is called from two places:

- **The `processApiUploads` success callback, for non-direct batches.** These are HDAs from the `/api/tools/fetch` response, so the upload created them. Every non-library upload mode (local-file, paste-content, paste-links, remote-files, composite-file) goes through fetch. No upload mode refers to an existing history dataset.
- **`processLibraryUploads`.** These are HDAs returned by `copyDataset(..., "library")`, which makes a new HDA from the LDDA.

That covers each kind of batch:

- **Library-only and mixed batches:** both feed the batch through the two places above, so every ID is an HDA this upload created.
- **Retry (`retryCollectionCreation`) and `recoverIncompleteBatches`:** both reuse the persisted `datasetIds` from the same submission. Nothing adds IDs from anywhere else.

So a dataset the user owned beforehand can't get into a batch. `hideSourceItems` is hardcoded to `true` in `collectionCreation.buildCollectionConfig`. The only place it's `false` is a test fixture. On the backend (`DatasetCollectionManager.__load_element`, `hda` branch, with `copy_elements` false), `element = hda` and then `hda.visible = False` when the user owns it. So the elements end up hidden, and the E2E confirms that.

Edge cases:

- **Retry after a server-side success whose response was lost:** you get a second HDCA. Before the fix its elements were copies; now the two HDCAs share the same HDAs. Galaxy allows that, and it's no worse than before.
- **Failed attempt:** the transaction rolls back, so no hide flags stick.

### Consistency with sibling paths

| Path | Mechanism | Resulting HDAs (2-item list) |
|---|---|---|
| Old LibraryFolder "as a Collection" (`import-collection.js`) | `src: ldda`, backend `to_history_dataset_association(visible=not hide)` | 2 hidden |
| Upload Activity, paste/local → list | fetch with an `hdca` destination | 2 hidden |
| Upload Activity, library → list, after the fix | copy, then `src: hda` with `copy_elements: false` | 2 hidden |
| Collection builders over existing datasets | `copy_elements: true` | the originals hidden, plus hidden copies |

The fix brings the activity library flow in line with the other import flows. The builders keep copying, which is right, because their sources are datasets the user already had.

### Tests

- **Vitest** "builds the two-step collection from the uploaded datasets without copying them":
  - I confirmed it's red when the source is reverted to `copy_elements: true` (1 failed, 3 passed) and green with the fix (4 passed).
  - It uses the file's existing `server`, `http` and `HttpResponse` imports and fixtures. It is meaningful and not trivial.
- **E2E list assertion:** it checks that the target history's datasets are exactly the HDCA element objects and that all of them are hidden. That's a strict assertion, stronger than a count. The one-line comment is fine.
- **Range-diff** of `d8cb457df34` against the earlier `55900c2dd7a`: the change only removes the `:title`, the `targetHistoryName` computed, its vitest and the line in the commit message. The other commits are unchanged.

### Nits

- None worth acting on. The comment `// the batch's datasets were created by this upload, so they become the elements` is one line and explains a non-obvious constraint.
