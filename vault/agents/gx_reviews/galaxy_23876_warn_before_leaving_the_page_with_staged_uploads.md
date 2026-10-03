# galaxy#23876 - Warn before leaving the page with staged uploads

- PR: https://github.com/galaxyproject/galaxy/pull/23876 (davelopez, +49/-1, 3 files)
- Fixes: #23873 ("Upload Activity: Prevent page refresh when there are staged uploads")
- Head reviewed: `d9131533149cf8566bc91a043d6fb5a2f980f616`
- Worktree: `~/projects/worktrees/galaxy/pr/23876`
- Tests: not run locally (worktree has no `client/node_modules`); read-only review.

## Recommendation

**Approve.** Small, correct, and built the right way: reuses the existing `useUploadStagingCounts()` (same counts that drive the method-list badges in `UploadMethodList.vue`), so whitespace-only paste content is ignored consistently, and it extends the one existing `window.onbeforeunload` guard in `App.vue` rather than adding a second listener. Nothing blocking.

## Findings

1. **(Optional, sibling gap / follow-up) In-flight uploads aren't guarded either.** Once the user clicks Start, `clearStaging()` empties the store (`LocalFileUpload.vue:231`), so the new guard stops firing - but a local file whose bytes are still streaming from the browser is now the *more* fragile state: a refresh kills the transfer. `useUploadState()` (`components/Panels/Upload/uploadState.ts`) already exposes `hasUploadingItems` (status `"uploading"`) / `isUploading`. Same guard, one more term:

   ```js
   if (this.confirmation || this.windowManagerStore.beforeUnload() || this.hasStagedUploads || this.hasUploadingItems) {
   ```

   Out of scope for #23873 as written; fine as a follow-up or a one-line addition here if the author agrees. (Use `hasUploadingItems`, not `isUploading`/`hasActiveUploads` - "processing"/"queued" server-side work survives a reload.)

2. **(Note, no change needed) Transient upload modals aren't covered.** Methods mounted with `transient` (`disableStore: props.transient`) bypass the staging store, so items staged in the modal flavor won't trigger the warning. Consistent with the PR's stated scope (the Import Data panel); just worth knowing.

3. **Tests are proportionate.** Three cases on the composable, the whitespace one actually exercises the shared `countStagedItems` rule; not trivial. No test of the `App.vue` wiring, which is acceptable for a one-term boolean change. Docstring is one line and useful. `(count ?? 0)` is needed because the counts record is `Partial`.

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). Worst case is an extra native "leave page?" prompt, removable by reverting one condition.
