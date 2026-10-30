# Initial review — galaxy #24563

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Claude Opus 5.5 (`claude-opus-5-5`), effort: low
- Reviewed commit: `f7db338ea74b7efd891d3c8edd84ab53ad007ad0`
- Diff: `git merge-base HEAD origin/dev`..HEAD — `VisualizationDisplay.vue` (+23/-8), `VisualizationDisplay.test.js` (+80)

## Summary

The fix is small and well aimed. `onMounted` now awaits `GET /api/visualizations/{id}` and `userStore.loadUser(false)` together, then decides ownership once before `VisualizationFrame` mounts. That handles the frame reading `visualizationId` only once at mount. The change reuses existing abstractions: the shared `loadPromise` in `userStore.loadUser` (so there's no duplicate `/api/users/current` request on a full page load), `userStore.matchesCurrentUserId` in place of the inline `isRegisteredUser` check, and `errorMessageAsString`. Embedded views, where `App.vue` calls `userStore.$reset()` and skips the user load, are covered because the component loads the user itself. Dataset previews skip the user load. The trade-offs in the PR description (waiting on histories during a full page load, and showing an error rather than a copy-saving frame when the user can't be loaded) are deliberate and are not re-argued here.

The tests cover the cases that matter: the frame is held back while the user is pending, the owner gets the id, a non-owner gets none, a user-load failure shows an error, a histories-only failure after the user was set still shows the frame, and dataset previews don't load the user. The previous "not signed in" test now uses an explicit anonymous user (`{ isAnonymous: true }`) rather than `null`. That's correct, since `null` now means "unknown".

I didn't run the tests: this worktree has no `client/node_modules`.

## Findings

### P3 1: A user-load failure on a full page leaves the display stuck after the app's Retry succeeds

When not embedded, a failed `/api/users/current` gets reported twice. `App.vue` shows its startup alert ("Unable to load your user data: …" with a **Retry** button), and `VisualizationDisplay` shows the same message in its own `GAlert`. If the user clicks Retry, `App.vue` reloads the user and clears its alert. The display only checks `currentUser` once, in `onMounted`, so it keeps showing the error with no frame until the page is reloaded.

Suggested fix: when the error came from the user load, have the display recover once `currentUser` becomes non-null. For example, keep the fetched visualization data and finish the ownership decision from a `watch(currentUser, …, { once: true })`, or retry the whole load. Alternatively, skip the component-level alert when not embedded and let the app's alert and Retry handle it. This is an edge case (the user request has to fail outright), so it's P3.

### P3 2: The `"Failed to load the current user."` fallback looks unreachable

```ts
} else if (currentUser.value === null) {
    // A load that resolves can still leave no user, so keep a fallback message.
    errorMessage.value = userError ? errorMessageAsString(userError) : "Failed to load the current user.";
```

`loadUser` resolves only after `setUserState(await getCurrentUser())`. `getCurrentUser` either throws or returns `toAnyUser(data)`, which is always a registered or anonymous object and never `null`. So a load that resolves can't leave `currentUser` as `null`, unless an `App.vue` `$reset()` lands in the same microtask window, which is not a real path. The comment describes a case that doesn't happen, and `errorMessageAsString` already has its own default message. Suggested fix: drop the fallback string and the comment, and set `errorMessage.value = errorMessageAsString(userError)` (or check `userError && currentUser.value === null`). This keeps the code from appearing to handle an input that can't occur.

### P3 3: The new tests reimplement the store's shared-load behavior instead of exercising it

`mountDisplay` replaces `userStore.loadUser` with a hand-written promise that sets `currentUser` and then optionally throws a "histories" error. The test "shows the frame without an error when the viewer loaded but the shared load failed later" therefore checks the mock's model of `loadUser`: user set first, then a later rejection from the shared promise. It doesn't check the real store. The component relies on that ordering in `userStore.loadUser`. If the store changed so the shared promise didn't set the user before the histories load, this test would still pass. Suggested fix (optional): run the store's real `loadUser` (`createTestingPinia({ stubActions: false })`, or a real pinia for the user store) and mock only the `/api/users/{user_id}` request (and `loadHistories` for the failure case). Alternatively, add a small `userStore` test asserting that `currentUser` is set even when `loadUser(true)` rejects from the histories load. Galaxy has many `stubActions: false` and server-mock test setups to copy from.

## Not flagged

- `Promise.all` with `.catch((e) => e)` means a visualization GET error takes priority over a user-load error. That's the right order.
- `loadUser(false)` sharing an in-flight `loadUser(true)` from `App.vue` is documented in the PR description.
- No new imports are buried inside functions. Typing is fine (`matchesCurrentUserId` narrows correctly).
