# galaxy#23765 — [26.1] Handle rejected upload submissions started from the upload view

https://github.com/galaxyproject/galaxy/pull/23765 · mvdbeek · head `f489b94f956` · base `release_26.1` · reviewed 2026-09-27

## Summary

Two commits, 4 files, +192/-4 (mostly tests).

1. `useUploadSubmission.processLibraryUploads`: a failed `copyDataset` now marks the failed item and every later library item as errored (`markTrackedError`), sets the batch error when there is a batch, and rethrows. Before, those items sat in "uploading" at 50% forever.
2. `UploadMethodView.handleStart`: `void submitPreparedUpload(...)` becomes `.catch(() => undefined)`. This fixes the Sentry `UnhandledRejection: Non-Error promise rejection ... Action requires account activation.` report.

Small, correct, well tested. CI green (28/28), no reviews or comments yet.

## Findings

### Blocker
None.

### Major
None.

### Minor
- **The catch swallows everything with no trace.** I checked every rejection path in `submitPreparedUpload`, and the swallow is safe today:
  - API uploads: `uploadDatasets` / `uploadCollectionDatasets` catch internally and route everything through `config.error`, which calls `markTrackedError` and `setBatchError`.
  - Library copies: covered by this PR.
  - `createCollection`: every throw calls `setBatchError`, except "Batch not found", which calls `console.error`.

  But the next rejection path added without state recording will vanish silently, in the UI and in Sentry. Cheap hardening is optional:
  ```ts
  submitPreparedUpload(targetHistoryId.value, prepared).catch((err) =>
      console.debug("Upload submission failed; failure recorded in upload state", err),
  );
  ```
  Not blocking. The PR body argues this explicitly.
- **Root cause of the "Non-Error" part (out of scope).** `processApiUploads` calls `reject(uploadError)` with a string, and the new library path calls `throw err`. The modal handles both through `errorMessageAsString`. Rejecting with `new Error(errorMessage)` would make any future unhandled report readable. Not needed for this fix.

### Nits
None worth raising. The new inline comment ("Copies after this one never start, so they fail with it.") explains something not obvious and should stay.

## Reuse

Good. The fix reuses `markTrackedError`, `errorMessageAsString` and `uploadState.setBatchError`, the same pattern `processApiUploads`' error callback already uses. It adds no new abstraction and none is needed. The library error path now mirrors the API one. No toast: the progress view already shows per-item and per-batch errors (`BatchUploadGroup` shows `batch.error`), so a toast would duplicate it.

`UploadMethodModal` already awaits the submission in a try/catch, so only the view needed the catch. The modal also benefits from fix 1, since its items no longer stay stuck.

## Tests

Ran with node 22.20.0 against symlinked `node_modules`: `UploadMethodView.test.ts` and `useUploadSubmission.test.ts`, 11/11 passed.

Red-to-green confirmed by reverting each part of the fix:
- Reverting `UploadMethodView.vue` fails the view test (`unhandledRejections` gets 1 entry).
- Reverting `useUploadSubmission.ts` fails both new library tests (`expected 'uploading' to be 'error'`).

These tests are meaningful, not trivial:
- The view test goes through MSW with a real 403 `/api/tools/fetch` response and a real `process.on("unhandledRejection")` listener.
- The library tests check that the *remaining* item is errored, not just the failed one, and that the batch fails.

The view test mocks `uploadMethodRegistry` with a tiny inline method component. That's heavy-ish, but it's the least intrusive way to drive `prepareUpload`. The local `makeHistory` helper duplicates `TargetHistorySelector.test.ts` fixtures. Not worth changing.

## Relation to #23764

No overlap, no conflict, no shared root cause. #23764 changes only `utils/upload-queue.js` (`UploadQueue.remove` no-op for already-submitted indices) in the legacy upload modal (`DefaultBox.vue`). #23765 touches the new upload panel (`UploadMethodView` → `useUploadSubmission`), which doesn't use `UploadQueue`. Both are Sentry-driven 26.1 upload fixes and can merge independently in either order.

## Suggested verdict

Approve. Optionally mention the silent-swallow hardening as non-blocking.

## Draft GitHub review

> *Posted by Claude (AI assistant) on behalf of @jmchilton — not authored by them personally.*
>
> Looks good. I traced every rejection path of `submitPreparedUpload`:
> - API uploads go through the `config.error` callback, which records item and batch errors.
> - Library copies are recorded by this PR.
> - `createCollection` calls `setBatchError` on every throw except "Batch not found", which logs.
>
> So swallowing the rejection in `UploadMethodView` hides nothing today. I confirmed the new tests fail with each half of the fix reverted.
>
> One optional, non-blocking suggestion: `.catch(() => undefined)` leaves no trace if a later change adds a rejection path that doesn't record state. A `console.debug(...)` in the catch would keep it discoverable at no cost.
>
> Approving.
