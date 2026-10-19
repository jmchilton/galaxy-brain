# Normal review after dropping the E2E commit (2026-10-08)

A review subagent reviewed the branch at `4d184c6672e` (7 commits) after John removed the E2E commit `84ec8b0f713`. It found no leftover references to the removed helpers or test, and no correctness or reuse problems. All 19 touched vitest files pass (135 tests). Acted on: the MY_BRANCHES line was updated at hand-off (tip, commit count, E2E blocker removed, links). The question of whether `HelpText.test.ts` should come back was handed to the fresh test challenge.

Not acted on:
- **Upload options now show "Unable to load upload options" after a failed `/api/datatypes`, instead of an empty list.** No code change: this is intended. Base cached `[]` until reload. It should be listed as a user-visible change in any PR description.
- **Optional rerun of the test challenge.** Only 1 test was removed, which is under the >3 threshold. It was rerun anyway, because the reason for the `HelpText.test.ts` drop no longer holds.

<details>
<summary>Full review</summary>

Review: issue_23977_client_api_fanout_26.1 at `4d184c6672e` (7 commits on origin/release_26.1). Read-only.

Verification: the 19 vitest files the branch touches all pass on node 22.20.0 (135 tests). The diff is client-only; it touches nothing under `lib/` or `test/`.

## E2E removal checks
- **Leftover references in code: none.** No hits for `start_browser_request_log`, `browser_api_request_paths` or `test_grid_requests_each_resource_once`.
- **Commit messages and test comments: none assume the E2E.**
- **Refs:** local backup `backup/issue_23977_with_e2e` = `84ec8b0f713`. `jmchilton/issue_23977_client_api_fanout_26.1` = `4d184c6672e`. The `jmchilton-https` tracking ref is stale; a fetch fixes it.

## Findings, ranked
1. **Medium: MY_BRANCHES.md:53 is stale.** It still has tip `84ec8b0f713`, 8 commits, the unrun E2E listed as a blocker, and links to debriefs that have moved into `earlier_drafts/1/`. Fix: update the line.
2. **Low–medium: lost coverage.** The archived test challenge dropped `HelpText.test.ts` because the E2E covered the HelpText → HelpTerm mount path.
   - `helpTermsStore.test.ts` still covers the logic.
   - What is lost is a component-level guard against a future eager `ensureInitialized()` in `HelpTerm`, `HelpPopover` or `HelpText`, which is the original fan-out.
   - The E2E never actually ran, so the real loss is small.
   - Suggestion: restore it from `229818f3f36^` with `wrapper.destroy()`, and ask John first.
3. **Low (informational):** `Upload/utils.js:54-61` now rethrows. `UploadContainer.vue:184-189` then shows "Unable to load upload options" instead of base's cached empty list. It doesn't retry until a remount or reload. The new behavior is more honest. The other callers catch. No code change suggested.
4. **Low:** a rerun of the test challenge is optional (1 test removed, under the >3 threshold). If it isn't rerun, the debrief should carry the coverage note.

## Focus areas
- **Reuse of existing abstractions:** no findings. `useRetryGate` replaces three hand-copied retry blocks; `sharedPromise` replaces two module caches and one promise map.
- **Retry/backoff correctness:** no new findings. Gate arithmetic, the middleware's long Retry-After `null` path, jitter range and the 4×4 worst case all match the decision.
- **Loading/error states:** no new findings. The `WorkflowInvocationState` loading branch does not flash on polls. Dropping the history load from `DatasetPopoverLink` is safe.
- **Release branch / Vue 3 forward-merge:** only the known `set`/`del` conflicts.
- **Tests, typing:** nothing beyond finding 2.
- **Security:** no findings.

</details>
