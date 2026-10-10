# Debrief: invocation_load_error_display

## Research

- Source: two BUGS_FOUND.md rows (story lane, WorkflowInvocationState). Combined into one issue. Row 2 (the dead `catch`) explains row 1: the `Error: ` alert exists only because the intended `errorMessageAsString` path never runs.
- Dev sha `20f365a2654` (origin/dev, 2026-10-10). Scratch worktree: `/private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-gx-issues/8085a6b3-fc13-41f7-b964-fa636a69fe53/scratchpad/D/wt`.
- Repro (node 22.20.0; real pinia store plus `useServerMock`, no store mocks):
  - `WorkflowInvocationStateLoadError.test.ts`: the store test passes (fetch resolves `undefined`). The view test is red: got `Error: User does not own specified item.`
  - `HistoryDatasetDetailsLoadError.test.ts`: red, got `Error: User cannot access specified item.`
  - `fetchJobWatcherError.test.ts`: red. The store holds the error, but `jobRequestError` stays `undefined`.
- Fix sanity check: wrapping the WorkflowInvocationState binding in `errorMessageAsString` turned the view test green, and the existing `WorkflowInvocationState.test.ts` still passed (12/12). Reverted afterwards.
- Raw `{{ err }}` sites found by grepping the keyed-cache error getters: WorkflowInvocationState, HistoryDatasetDetails (both reproduced), MarkdownGalaxy, MarkdownVisualization, HistoryDatasetDisplay (code read only). Already correct: WorkflowRerun, CollectionEditView, datasetCollections.ts, useCreatingJob.ts (`errorMessageAsString`), DatasetView, DatasetPopoverLink (`.message`).
- Dead `catch` around a keyed fetch: WorkflowInvocationState and `useJobWatcher` (fetch.ts) are in the issue. `JobParameters.vue` is also dead but only calls `console.error`, so it is left out. `useInvocationMessageStepData` handles `undefined` itself.
- Origin:
  - #18730 (`0c3e7e3f0711`) added the try/catch while `fetchItemById` still threw.
  - #18756 (`59607f15f70`) made keyedCache swallow and store errors, which killed that catch.
  - #22873 (`a3417e25fd3c`) added the raw `getInvocationLoadError` alert.
  - `useJobWatcher` catch: #19305 (`092954d95ae6`). It was written after #18756, so it was dead from the start.
- Retry gating (`isRetryableApiError`, which needs `ApiError.status`) landed in #21881 (release_26.0, `a239a091c7b2`). #21920 is the dev follow-up. This rules out storing strings.
- Duplicates searched (issues and PRs): "keyedCache error", "getInvocationLoadError", "fetchItemById error", "useKeyedCache", "User does not own specified item", "invocation load error prefix". No duplicates. Related: #21886 (keyed-cache retry consistency, closed) and #23977 (request fan-out). Open #23463 touches `useJobWatcher` but keeps the dead catch, so the two may conflict.
- Unverified:
  - The `FetchLanding` UI effect, i.e. whether it would spin forever after a failed job fetch. I showed the composable-level effect only.
  - The Markdown sites marked "(code read)".
  - No browser check. Rendering goes through Vue's `toDisplayString`, which calls `String(err)`, so it should match the vitest.
- Existing `WorkflowInvocationState.test.ts` "errored invocation fetches" mocks a throwing `fetchInvocationById`, which the real store never does. The proposal says to rewrite it with assertions kept, not remove it.
- Backend messages, cited. `GET /api/invocations/{id}` goes through `services/invocations.py:142-143` (`show`, `check_ownership=False, check_accessible=True`), then `managers/workflows.py` `check_security`, then `managers/base.py:131-133`. A private invocation of another user therefore raises `ItemAccessibilityException("History is not accessible to the current user")`, which is 403 / 403002. The row's "User does not own specified item." came from the story fixture, so the issue uses the real message. Datasets: `services/datasets.py:406` `get_accessible`, then `managers/secured.py:61` `"HistoryDatasetAssociation is not accessible by user"` (403002).
- Side finding, not in the issue: `MarkdownVitessce.vue:51` calls `fetchInvocationById(invocationId)` with a bare string instead of `{ id }`, so `params.id` is `undefined`. It sits inside a `try` at :33. It's worth a separate look. I dropped it from the issue's list of await-without-catch callers.

## Review round (subagent)

- All 3 repros rerun on dev 20f365a2654 and fail as described; the store test passes. A trial of the `getItemLoadErrorMessage` getter turned all three green, existing tests still passed, and it was reverted.
- Server message confirmed from code: another user's private invocation gets 403002 "History is not accessible to the current user".
- Fixed the origin: #18726 (24.1) added the try/catch and the `errorMessage` alert; #18730 only moved them. #18756, #22873, #19305, #21881/#21920 verified. Open #23463 rewrites `useJobWatcher` and keeps the dead catch.
- Toned down the `useJobWatcher` row: the `FetchLanding` spinner is read from code, not shown. Marked the sites checked only by reading code.

## Leftover

- With the proposed fix, `FetchLanding` would show a doubled prefix ("Error importing data: Error requesting job: …"); worth handling in the fix.
- Side finding, not in the issue: `MarkdownVitessce.vue:51` passes a bare string to `fetchInvocationById` instead of `{ id }` (confirmed on dev). Separate small fix.
- Not checked in a browser.
