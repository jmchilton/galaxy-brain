# galaxy#23744: [26.1] Handle denied history permissions requests

- Author: mvdbeek. Base: `release_26.1`. +67/-6, 3 files.
- Head SHA: `ac94d14062d676ed330066de71e8666fb2cd5be7` (2 commits: `ddfc296f4eb` fix, `ac94d14062d` test toast mock)
- Worktree: `~/projects/worktrees/galaxy/pr/23744`, diffed against `git merge-base origin/release_26.1 HEAD`
- Sentry: GALAXY-MAIN-4KSCZZZ0018XP. `/history/permissions` returns 403 while the history sharing page loads. `HistoryAccessibility.vue:79` mounts `HistoryDatasetPermissions` eagerly (the tab is not lazy), so the request fires whenever the page opens.
- No comments or reviews yet. CI: no failing checks.

## What it does

- `composables/datasetPermissions.ts`: `useCallbacks(init)` now wraps `init()` in `load()`, which catches and toasts via the existing `onError` (`errorMessageAsString` + `useToast`). This covers the initial load and the reload after a save. `onSuccess` now awaits the reload. The signature is now `init: () => Promise<void>`.
- `HistoryDatasetPermissions.vue`: `init()` sets `loading`, records `loadError`, rethrows, and resets `loading` in `finally`. The template shows `GAlert variant="danger"` in place of the form when `loadError` is set.
- `datasetPermissions.test.ts`: a new composable spec covering a rejected initial load and a rejected reload after save.

## Verification

- `npm_config_use_node_version=22.20.0 pnpm exec vitest run src/composables/datasetPermissions.test.ts`: 2/2 pass.
- **Red-to-green confirmed.** With `datasetPermissions.ts` reverted to the merge-base, both tests fail (`Toast.error` not called). Restored afterwards; worktree clean.

## Findings

### 1. `UserDatasetPermissions.vue` gets half the fix. Its spinner stays up forever (medium)

`useCallbacks` has a second caller: `components/User/UserDatasetPermissions.vue:32-36,68`. Its `init()` was not changed:

```ts
async function init() {
    const { data } = await axios.get(withPrefix(inputsUrl.value));
    updateRefs(...);
    loading.value = false;
}
```

With this PR, a failure there no longer becomes an unhandled rejection, because the composable catches it and toasts. But `loading.value = false` never runs, so `DatasetPermissionsForm` shows "Loading permission information" indefinitely. That is the same stuck-spinner bug the PR fixes for history. Either mirror the history `try/finally` + `loadError` + `GAlert` in the user component, or apply finding 2 so both components get the fix at once.

### 2. History initial-load failure shows both a toast and an alert (low-medium; consistency)

`HistoryDatasetPermissions.vue:77-79` sets `loadError` (which renders the `GAlert`) and then rethrows. The composable's `load()` catches the rethrow and calls `toast.error` with the same `errorMessageAsString(error)`. A single 403 therefore shows the same message twice: once in the panel and once as a toast. The same pattern came up on #23739/#23743 ("the alert should supersede the toast, not stack with it").

Suggested fix, which also resolves finding 1 and gives a reusable abstraction: have `useCallbacks` own `loading` and `loadError`. In `load()`, set `loading = true` and clear `loadError`, then `await init()`; on catch, set `loadError = errorMessageAsString(e)` and do not toast; in `finally`, set `loading = false`. Return `{ loading, loadError, onSuccess, onError }`. Each component's `init()` then shrinks back to "fetch + `updateRefs`", and both templates render the same `GAlert v-if="loadError"`. `onError` keeps toasting for `setPermissions` failures, which is the right surface for those.

Smaller alternative: drop the `throw error` in the history `init()`. That removes the duplicate, but then the composable's catch only serves the user component, and finding 1 still needs its own fix.

### 3. The component behaviour is untested (low)

The spec tests only the composable's catch-and-toast. The user-visible fix in this PR is the history panel showing an alert instead of a spinner, and nothing asserts it. A small `HistoryDatasetPermissions` mount test (mock `getPermissions` to reject with a 403, then assert the `GAlert` text and that `LoadingSpan` is gone) would cover the actual regression. If finding 2's approach is taken, the composable test can assert `loadError`/`loading` directly, and that covers both components. The current tests are not trivial; they fail without the fix.

### 4. Nit: spinner flash after a save

`init()` now sets `loading.value = true` on every call, including the reload in `onSuccess`. Toggling "Make new datasets private" now briefly swaps the checkbox for the spinner. This is harmless and optional to change (for example, set `loading` only on the first load).

### Out of scope

`SelectPreferredStore.vue:72` also calls `getPermissions` without a catch. It sits inside a submit handler that already surfaces `error.value` for the other calls, but not this one. It is not in the Sentry report, so there is no need to raise it here.

## Reuse / abstraction

- Good: it reuses `errorMessageAsString`, `useToast` (through the existing `onError`) and `GAlert`. It adds no ad-hoc helpers.
- The fix is split between the shared composable (toast) and one of its two consumers (alert + loading). Moving `loading`/`loadError` into `useCallbacks` (finding 2) would leave behind a real reusable piece, instead of each consumer growing its own try/finally.

## Suggested verdict

Comment / approve-with-suggestions. The fix is correct for the Sentry case, and the tests fail without it. Before merge, ask for finding 1 (the user-preferences page keeps the stuck spinner) and finding 2 (the duplicate toast and alert). Ideally both are fixed at once by moving the state into the composable. Finding 3 is nice to have.

## Draft GitHub review comment

> *Posted by Claude (AI assistant) on behalf of jmchilton - not personally authored.*
>
> Thanks. This fixes the unhandled rejection from the Sentry report. I confirmed both new specs fail with the `datasetPermissions.ts` change reverted.
>
> Two things before merge:
>
> 1. **`UserDatasetPermissions.vue` only gets half the fix.** It also uses `useCallbacks`, and its `init()` still sets `loading.value = false` only on success. A failed `/api/users/{id}/permissions/inputs` is now toasted instead of unhandled, but the "Loading permission information" spinner stays up forever, which is the same symptom this PR fixes for histories.
> 2. **The history panel shows the error twice.** `HistoryDatasetPermissions.init()` sets `loadError` (the `GAlert`) and then rethrows. `useCallbacks.load()` catches that and calls `toast.error` with the same message, so you get both a toast and an alert.
>
> Both could be fixed at once by having `useCallbacks` own the state: in `load()`, set `loading`, clear `loadError`, then `await init()`; on catch, set `loadError = errorMessageAsString(e)` (no toast); in `finally`, set `loading = false`. Return `{ loading, loadError, onSuccess, onError }`. Each component's `init()` goes back to fetch + `updateRefs`, and both templates use the same `GAlert v-if="loadError"`. `onError` would still toast save failures.
>
> Optional: a small `HistoryDatasetPermissions` mount test that asserts the alert replaces the spinner on a 403 would cover the user-visible part. With the state in the composable, the existing spec could assert `loadError`/`loading` directly instead.
