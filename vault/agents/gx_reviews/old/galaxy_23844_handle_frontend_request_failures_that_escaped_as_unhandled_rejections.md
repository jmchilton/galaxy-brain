# galaxy#23844 — [26.1] Handle frontend request failures that escaped as unhandled rejections

https://github.com/galaxyproject/galaxy/pull/23844 · mvdbeek · head `dd37c832f9a` · base `release_26.1` · reviewed 2026-10-01

## Summary

23 files, +634/-61, 11 commits (one fix + one vitest per commit). Fixes galaxy-main Sentry groups (GALAXY-MAIN-4KSCZZZ0019*) where a request rejected and nothing caught it. The root cause is mostly `GalaxyApi().GET`: it returns `{ error }` for an HTTP error but throws a `TypeError` when no response comes back. The PR adds one local catch per call site:

- `webhooks.js`: return `[]` and don't cache it, so the next call retries.
- `unprivilegedToolStore.ts`: try/finally around the request, so a failure no longer leaves `isLoading` stuck. A 403 stays silent; any other failure shows a toast. The store now loads only for registered users, driven by a `watch` on the current user id.
- `DatasetDetails.vue`: a request with no response is retried on the next poll, with an `isUnmounted` guard.
- `GalaxyAI.vue` (2 places): wraps the thrown error as `{ error }` so the existing toasts show it.
- `DiskUsage/util.ts`: `useDataLoading.loadData` shows a toast. `HistoryStorageOverview` routes the object-store reload through it.
- `toolTrainingMaterial.ts`: logs the failure and carries on without tutorial links.
- `ToolForm.vue`: toast on a failed update, and the form is re-enabled. Failed option paging and search are logged. This mirrors dev `692fcfc34c7`.
- `WorkflowInvocationSteps.vue` / `WorkflowInvocationFeedback.vue`: each gets a local `graphError`/`stepsError` ref and shows an alert.
- `historyStore.ts`: `loadHistoryById` records a thrown error in `historyLoadErrors` and rethrows. The getter retries any non-`ApiError` within `MAX_RETRIES`.
- `JobInformation.vue`: an error row in place of the Workflow Invocation row.

State:
- No reviews or comments yet.
- CI: all checks green.
- Merges cleanly into current `release_26.1`. The base has moved 19 commits, but none of them touch these files.
- The merge forward to dev will conflict in `ToolForm.vue` (dev already has the equivalent fix), `WorkflowInvocationSteps.vue` and `GalaxyAI.test.ts`.

## Findings

1. **Minor — duplicated graph-error handling; `useInvocationGraph` should own the error.**
   - Where: `WorkflowInvocationSteps.vue:98-112`, `WorkflowInvocationFeedback.vue:35-50`.
   - Issue: both views now have the same `watch → try { await loadInvocationGraph(false); x = "" } catch { x = errorMessageAsString(e) }` block. `InvocationGraph.vue:118-135` already has a third hand-written version. The composable owns `loading` (`useInvocationGraph.ts:128,136,174`) and already catches inside `loadInvocationGraph` (`:171`), but it does not expose the error.
   - Fix: add a `loadError` ref to the composable, set in that catch and cleared at the start of each load. Both views then read `loadError` and drop their local refs and try/catch. It's a few lines, so it suits 26.1, and it leaves a reusable piece behind.

2. **Minor — the store shows its own toast.**
   - Where: `unprivilegedToolStore.ts:14-19`.
   - Issue: no store in `client/src/stores` on `release_26.1` imports `@/composables/toast`, so this would be the first. This is the same concern raised on #23743's `configurationStore`: the pattern elsewhere is that the store records or rethrows and the UI chooses how to show it.
   - Practical effect: on any transient failure, every registered user gets "Failed to check access to custom tools", although most of them never use the feature. The toast fires again on each `load(true)` (`CustomToolEditor.vue:119`, `agentActions.ts:166`).
   - Fix: expose a `loadError` ref, and let `UserToolPanel`/`ActivityBar` decide what to show. Or keep the toast for 26.1 and move it out of the store on dev. Either is defensible; just a heads-up.

3. **Minor — after a failed object-store change, the old charts stay up.**
   - Where: `HistoryStorageOverview.vue:68-71`, `util.ts:90-96`.
   - Issue: if `fetchHistoryContentsSizeSummary` fails after the user picks a new object store, the charts for the previous store stay rendered under the new selector value. The toast is the only clue they are stale.
   - The PR body says it will "clear the loading state, including for reloads on object store change". That doesn't apply here: the reload never sets `isLoading` (this predates the PR). This path also has no test, since `util.test.ts` covers only `loadDataOnMount`.
   - Fix: clear `datasetsSizeSummaryMap` and the chart refs when the reload fails, or have `loadData` toggle `isLoading` so the reload shows a spinner.

4. **Nit — `historyStore.ts:105-107` retries every non-`ApiError` error.**
   - Issue: `!(existingError instanceof ApiError)` treats every non-`ApiError` as a missing response. That includes a bug thrown from `setHistory` and an `AbortError`.
   - Fix: in the new catch (`:534`), record the error as a typed network error, or check `error instanceof TypeError` before counting it retryable.

5. **Nit — `DatasetDetails.vue:70-75` retries forever and silently.**
   - Issue: with the network down, it polls every 3 s and never sets `jobLoadingError`. Unbounded polling matches the non-terminal path, so this is acceptable.
   - Option: set `jobLoadingError` after a few consecutive failures.

6. **Follow-up for dev, not 26.1 — one fix in the API client instead of N catches.**
   - Issue: `GalaxyAI.vue:386-396,447-457` adds a two-copy adapter that turns a throw into `{ error: e }`. `DatasetDetails` has a variant.
   - Fix: a single `onError` middleware in `api/client/index.ts` could turn a thrown fetch failure into the `{ error }` result for every `GalaxyApi()` caller. openapi-fetch ^0.17 supports an `onError` hook; check the exact semantics. That would remove this whole class of Sentry noise. Too broad a behaviour change for a release branch.

Comments: most of the new call-site comments explain why a failure is only logged, which is useful. The webhooks and training-material comments could each be one line. Not worth raising.

## What's fine

- `webhooks.js`: the empty result is not cached, so the next call retries. `Webhook.vue:39` already guards `pickWebhook([])`.
- `unprivilegedToolStore`: `try/finally` fixes the stuck `isLoading`. Only the 403 is silent. The user watch keys on the user id, so a re-fetched user object does not reload. Skipping anonymous users is a real correctness fix: before, `[]` turned the activity on.
- `historyStore`: the new catch matches the `result.error` branch (count, record, rethrow), so awaiting callers (`HistoryStorageOverview`, `DatasetPopoverLink`, `detailedHistory`) behave as before. Only the getter's fire-and-forget call gets a `.catch`.
- `JobInformation`: an error row instead of a missing row is the right call. "No row" otherwise reads as "not part of a workflow".
- `WorkflowInvocationFeedback`: a warning instead of a missing "Steps with Errors" section, for the same reason.
- `ToolForm`: matches dev `692fcfc34c7` almost exactly, so take dev's side on merge forward.
- Reuse: `errorMessageAsString`, `useToast`/`Toast`, `GAlert`/`BAlert` and the existing `MAX_RETRIES`/`isRetryableApiError` machinery are used throughout. No new ad hoc error helpers.
- Scope fits a Sentry backport. Each change is local and small.

## Tests

Not run: `client/node_modules` is absent in the worktree, so I skipped vitest as instructed. The assessment below comes from reading the tests.

- The tests use msw `HttpResponse.error()`, which makes fetch throw a real `TypeError`. That is the actual production path, not a mocked rejection. Good.
- Each test would fail without its fix:

| Test | Without the fix |
|---|---|
| webhooks | rejects instead of resolving `[]` |
| unprivileged store | `isLoading` stays stuck, so `load()` is a no-op and `isLoaded` stays false |
| unprivileged store, anonymous user | 1 request instead of 0 |
| DatasetDetails | polling stops at 1 request |
| historyStore | no error is recorded, and the request count differs |
| `util.test` | `isLoading` stays true |
| ToolForm (429) | toast assertion fails |
| GalaxyAI | toast assertion fails |
| steps / feedback views | no error is shown |

- No tests were weakened. The removed lines are import changes and a `mountDatasetDetails()` helper extraction.
- `util.test.ts` is a small composable unit test, but not a trivial one. It doesn't cover the object-store reload path (Finding 3).

## Verdict

Approve. Optional suggestions: move the graph error into `useInvocationGraph` (1), and consider the store toast (2) and the stale storage charts (3). None of them block 26.1.

## Draft GitHub review comment

> *Written by Claude (AI assistant) on behalf of jmchilton.*
>
> Thanks, this is a well-contained batch. Each fix is local, and the msw `HttpResponse.error()` tests exercise the real thrown-`TypeError` path. Looks good for 26.1. A few optional suggestions:
>
> 1. **`useInvocationGraph` could own the load error.** `WorkflowInvocationSteps.vue` and `WorkflowInvocationFeedback.vue` now have identical `try { await loadInvocationGraph(false); … } catch { …Error = errorMessageAsString(e) }` watchers, and `InvocationGraph.vue` has a third hand-written version. The composable already owns `loading` and catches inside `loadInvocationGraph`. Exposing a `loadError` ref from it (set in that catch, cleared at load start) would let both views just read it.
> 2. **The toast lives in `unprivilegedToolStore`.** As far as I can tell, this would be the first store on `release_26.1` to import `@/composables/toast`. As a result, every registered user sees "Failed to check access to custom tools" on a transient failure, and again on each `load(true)` (custom tool editor save, agent actions). That's fine for 26.1 if you prefer it, but on dev it might be nicer for the store to expose an error ref and let `UserToolPanel`/`ActivityBar` decide.
> 3. **`HistoryStorageOverview` object-store change.** When the reload fails, the previous object store's charts stay rendered under the newly selected store, and the toast is the only hint. Clearing the chart data on failure, or having `loadData` toggle `isLoading`, would avoid showing stale numbers. That path isn't covered by `util.test.ts`.
> 4. Small: `historyStore`'s `!(existingError instanceof ApiError)` treats any non-`ApiError` (including a coding error or an abort) as a retryable network failure. Recording the thrown error as a typed network error in the new catch would make that check precise.
>
> For dev, not this PR: an `onError` middleware in `api/client/index.ts` that turns thrown fetch failures into the `{ error }` result would fix this class of bug for every `GalaxyApi()` caller at once.
>
> FYI, the merge forward to dev conflicts in `ToolForm.vue` (dev already has the equivalent from 692fcfc34c7), `WorkflowInvocationSteps.vue` and `GalaxyAI.test.ts`.
