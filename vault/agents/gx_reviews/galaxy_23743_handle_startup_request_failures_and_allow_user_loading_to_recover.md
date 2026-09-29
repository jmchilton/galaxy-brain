# galaxy#23743 — [26.1] Handle startup request failures and allow user loading to recover

https://github.com/galaxyproject/galaxy/pull/23743 · mvdbeek · head `9d7d1e505ec` · base `release_26.1` (merge-base `7c3e430b465`) · reviewed 2026-09-28

## Summary

11 files, +316/-44, for Sentry USEGALAXY-EU-MAIN-61HFG00001XBM and related groups (`TypeError: Failed to fetch` at startup).

- `userStore.loadUser`: clears the cached `loadPromise` on failure, with a `loadPromise === promise` guard.
- `historyStore.loadHistories`: moves the count request inside `try/finally` so a failure can't leave `historiesLoading` stuck.
- `App.vue`: catches the startup `loadUser()` rejection and shows a persistent `Alert` with a Retry button.
- `configurationStore.loadConfig`: throws on an HTTP error, where it used to `console.error` and then set `config = undefined`. It then catches the error and calls `Toast.error` from inside the store.
- `uploadConfigurations.ts`: wraps each of the three loads in try/catch and shows a toast on failure.
- `UploadContainer.vue` (legacy upload modal): runs the three loads through `Promise.all`, then shows a danger `BAlert` on failure.
- Tests: new `startupLoading.test.ts`, `App.test.ts`, `uploadConfigurations.test.ts` and `UploadContainer.test.ts`. `PairedOrUnpairedListCollectionCreator.test.ts` gets a one-line stub fix, because `createMapper().catch` now needs a real promise from the `createTestingPinia` stub.

CI: 26/26 green. No reviews or comments yet. GitHub reports **mergeable: CONFLICTING** against current `release_26.1`.

## Overlap with #23739 (merged 2026-09-27, `ebb16af8410`)

**Mostly duplicate.** 23739's changes to the same files are already on `release_26.1`:

| File | 23739 vs 23743 |
|---|---|
| `historyStore.ts` | **Byte-identical** hunk (same blob `6b5cfdafa12`). Merges cleanly. |
| `userStore.ts` | **Semantically identical.** 23739 uses an async IIFE + `.catch`, 23743 uses `getCurrentUser().then(...).catch(...)`. Both have the same `loadPromise === promise` guard. `git merge-tree` reports a **conflict**. |
| `App.vue` | **Conflicts.** 23739 added `useToast` and `.catch → toastError(..., "Failed to load user or histories")`. 23743 replaces that with an `Alert` + Retry. |
| tests | `startupLoading.test.ts` tests 1–2 (shared failing request, retry, stuck `historiesLoading` after a count failure) repeat what 23739's `historyStore.test.ts` "history loading failures during user initialization" block already covers. 23739's version is more thorough: it parametrises which count request fails, checks the list request, and covers user-only recovery. |

After a rebase, the new parts of 23743 are the App.vue Retry alert (which should **supersede** 23739's toast, not stack with it), the config-store change, the two upload paths, and their tests. The userStore/historyStore diffs should go away entirely.

#23764 / #23765 are merged and touch different files (`upload-queue.js`, `useUploadSubmission.ts`, `UploadMethodView.vue`). No overlap.

#23775 (open) edits `PairedOrUnpairedListCollectionCreator.test.ts` at `@@ -103` and later. 23743 only touches the imports and `mountCreator`, so there is no textual conflict. 23775's new cases go through `mountCreator`, so they pick up the stub fix.

## Findings

### Major

1. **Needs a rebase onto release_26.1. Drop the 23739-duplicate code and tests.** `userStore.ts` and `App.vue` conflict (see table). When resolving:
   - keep `release_26.1`'s `userStore.ts` as-is
   - in `App.vue`, remove the `useToast`/`toastError` lines 23739 added, so a startup failure doesn't show *both* a toast and the alert
   - delete tests 1–2 from `startupLoading.test.ts`

   What remains of that file is the configuration test. It would then belong in a `configurationStore.test.ts` (none exists yet) rather than a "startupLoading" file.

2. **`configurationStore.ts:31`: calling `Toast.error` from inside the store can repeat on every mount while the server is down.** `useConfig()` (`composables/config.ts:13-17`) calls `store.loadConfig()` in `onMounted`. There are ~32 `useConfig()` call sites that do this. (About 20 more are `useConfig(true)` call sites, which never call it: `fetchOnce && isConfigLoaded` tests the computed ref itself, which is always truthy. That bug predates this PR.) The `isLoading` guard only dedups requests that are in flight at the same time. After a failure, each component that mounts later (on route changes, panels, modals) sends a new request and, with this PR, shows a new toast. The re-requesting happened before this PR too; what's new is that each one now toasts. Also, no other store in `client/src/stores` imports `Toast`. The pattern elsewhere is that the store rethrows (`rethrowSimple`, as in `historyStore` and `datatypesMapperStore`) and the UI decides how to show it. Suggested fix:
   - have the store record the error in a `loadError` ref and not toast
   - have `App.vue` show it in the same persistent alert/Retry slot it now uses for the user load

   That leaves one reusable "startup load failed, retry" surface for both user and config, instead of two different mechanisms (alert for the user, toast for config).

### Minor

3. **`App.vue:37`: "Unable to load your user data" also fires when only the history list fails.** `loadUser()` (default `includeHistories=true`) rejects when `loadHistories()` fails, even though the user was set successfully. 23739's wording, "Failed to load user or histories", was more accurate. Retry does refetch both, which is fine.

4. **`uploadConfigurations.ts:57-71,95-102`: one toast per composable instance, and no retry.** Six components call `useUploadConfigurations(` (`uploadDefaults`, `CollectionCreator`, `FormDataWorkflowRunTabs`, `SampleSheetGrid`, `gridHelpers`, …). On a page that mounts several of them, the same "Unable to load upload formats" toast appears more than once. After a failure, `ready` stays `false` until remount (the test asserts `ready === false`). That's better than a silent hang and acceptable for a backport. `datatypesMapperStore` doesn't cache rejections, so a remount does recover. Just flagging it.

5. **`UploadContainer.vue:201`: any single failure hides the whole upload UI.** The `v-if="loadingError"` alert precedes `v-else-if="ready"`. That matches the existing `ready` gate, which already required all three loads, so this doesn't change behaviour. It just replaces an endless blank with a message. OK as-is.

6. **Tests import a second `http` from `msw`** (`startupLoading.test.ts:1,61`). The same note applied to 23739: `useServerMock()`'s `http.untyped.get(...)` is the existing escape hatch (e.g. `InteractiveTools.test.js`). The typed `http.get("/api/configuration", ...)` already works here, as the file's own `beforeEach` shows. Moot if the file is reduced per Major 1.

### Nits

- `configurationStore.ts:23`: `throw new Error(errorMessageAsString(error))` followed by `errorMessageAsString(error)` in the catch works, but `rethrowSimple(error)` is the idiom the other stores use.
- `App.vue:38`: a raw `<button class="btn btn-link">` inside the legacy `Alert`. `GButton`/`GAlert` exist in `components/BaseComponents/`, but App.vue already uses `Alert` for its other banners, so consistency with the file is defensible.
- `userStore.ts`: the `// Return the shared promise` trailing comment is obvious. Moot after the rebase.

## Reuse

- Good: uses `errorMessageAsString` everywhere, and the `Toast`/`BAlert`/`Alert` surfaces that already exist.
- Accretes rather than abstracts: the three stores/composables each grow their own try/catch-and-surface logic, using three different mechanisms (store toast, composable toast, component alert). A single "startup resource failed" surface in `App.vue`, fed by store error refs (Major 2), would be the reusable piece. For a 26.1 Sentry backport, it's fine to defer this to `dev`.

## Tests

Ran locally with node 22.20.0 via pnpm. The 6 touched/new specs (incl. `historyStore.test.ts`) gave **21/21 pass**. I also ran the full client suite by accident: 2700 passed, 2 skipped.

**Red check** (revert one source file to the merge-base, rerun its spec):

| Reverted | Result |
|---|---|
| `configurationStore.ts` | both config cases fail, plus an unhandled rejection |
| `userStore.ts` | both user cases fail |
| `historyStore.ts` | stuck-loading case fails |
| `uploadConfigurations.ts` | 3/3 failure cases fail, unhandled rejection |
| `UploadContainer.vue` | 3/3 fail, unhandled rejections |
| `App.vue` | Retry case fails |

All the tests are meaningful; none are trivial or weakened. The `PairedOrUnpaired…` stub addition compensates for the new `.catch` on a stubbed action. It is not a weakened assertion.

## Suggested verdict

Request changes: rebase is required. Once rebased, it's close to an approve. The minimum is Major 1. Major 2 is strongly recommended (at least avoid a toast per mount). Everything else is optional.

## Draft GitHub review

*Written by Claude (AI assistant) on behalf of jmchilton, not authored by them personally.*

Thanks, the upload-path and config-failure handling is a good addition, and I confirmed locally (node 22.20.0) that every new test fails when its source change is reverted and passes with it.

This now conflicts with `release_26.1` because #23739 landed the same `userStore.loadUser` / `historyStore.loadHistories` fixes: the `historyStore.ts` hunk is byte-identical and `userStore.ts` is equivalent. When rebasing:

- keep `release_26.1`'s `userStore.ts`;
- in `App.vue`, drop the `useToast().error(... "Failed to load user or histories")` that #23739 added, so a failure shows only the new Retry alert and not both. It might also be worth borrowing that wording, since the alert fires when only the history load fails;
- the first two cases in `stores/startupLoading.test.ts` duplicate #23739's `historyStore.test.ts` block, so only the configuration case remains. That would fit better in a `configurationStore.test.ts`.

One behavioural concern with `configurationStore.loadConfig` calling `Toast.error`: `useConfig()` calls `loadConfig()` in `onMounted` for every consumer, and `isLoading` only dedups requests in flight at the same time. So while `/api/configuration` is failing, each component that mounts later retries and pops another toast. No other store toasts directly. Could the store keep the error in a ref (and rethrow, as `rethrowSimple` does elsewhere) and let `App.vue` show it in the same alert + Retry slot as the user load? That gives one startup-failure surface instead of an alert for the user and toasts for config.

Minor: `useUploadConfigurations` is used by several components at once, so a single failure can toast once per instance. That's acceptable for a backport; just flagging it.
