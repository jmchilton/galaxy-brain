### P2 1: The shared-load tests check a hand-written copy of `loadUser`, not the store (implementation verified)

`mountDisplay` replaces `userStore.loadUser` with a mock that sets `currentUser` and then optionally throws a "histories" error, imitating the app's shared `loadUser()` promise failing after the user is set. The test "shows the frame without an error when the viewer loaded but the shared load failed later" therefore checks the component against the test's own model of the store. The component depends on `loadUser` setting the user before it loads histories. If the store stopped doing that, or changed how `loadUser()` and `loadUser(false)` share their promise, these tests would still pass. A few assertions also check how the component calls the store (`loadUser` called with `false`, `loadUser` not called for a dataset preview) instead of what actually happens.

Suggested fix: use the real user store (`createTestingPinia({ stubActions: false })`) with `useServerMock`. Hold `GET /api/users/{user_id}` on a deferred the test controls. Drive the shared-failure case by starting the app's `userStore.loadUser()` (with histories) before mounting and returning 500 from the history endpoints. Then assert on the requests made: `/api/users/current` is requested with no `/api/histories*` request, and a dataset preview makes no user request.

<details><summary>Details</summary>

The review branch's rewrite needs two things beyond the swap. `mount` has to get the test's pinia, because `getLocalVue()` installs its own long-lived pinia, and the component would otherwise share one store, and one cached `loadPromise`, across tests. Assertions also have to wait on outcomes with `vi.waitFor`, since a single `flushPromises()` doesn't settle MSW responses.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort, and by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: on the rewritten tests, swapping the store so `setUserState` runs after `loadHistories` fails the shared-failure test. The original mock-based test can't detect that change.

</details>

### P3 1: After a user-load failure on a full page, the view stays on the error when the app's Retry succeeds (implementation verified)

When the page isn't embedded and `/api/users/current` fails, `App.vue` shows "Unable to load your user data: …" with a **Retry** button, and `VisualizationDisplay` shows the same message in its own alert. Clicking Retry reloads the user and clears the app's alert. The display only checks `currentUser` once, in `onMounted`, so its error stays and the frame never appears until a full page reload.

Suggested fix: when the visualization loaded but the user didn't, keep the fetched record, then finish the ownership decision and clear the error once `currentUser` becomes non-null (a top-level `watch(currentUser, …)`, cleaned up with the component).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: a new unit test fails the user request, then reloads the user through the store, and it passes only with the fix.

</details>

### P3 2: The `"Failed to load the current user."` fallback can't be reached (implementation verified)

`loadUser` resolves only after `setUserState(await getCurrentUser())`. `getCurrentUser` either throws or returns `toAnyUser(data)`, which is always a registered or anonymous user, never `null`. A load that resolves therefore can't leave `currentUser` as `null`, so the comment ("A load that resolves can still leave no user") describes a case that doesn't happen, and the fallback string has no test.

Suggested fix: drop the comment and the fallback string, and use `errorMessageAsString(userError)` alone. It already supplies a default message.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort, and by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort by reading `userStore.loadUser`, `getCurrentUser` and `toAnyUser`. The existing tests still pass with the fallback removed.

</details>

### P3 3: No E2E test checks that re-saving your own visualization updates it in place

A unit test is the right layer for the slow-user race. But the outcome this PR protects, that saving your own visualization sends a PUT rather than a POST that creates a duplicate, has no browser test. `test_visualizations.py::test_igv_loads_correct_genome` already saves an IGV visualization and opens the saved list, so it can be extended to cover this.

Suggested fix: extend that test to open "igv with hg18" from the saved list, save it again, and assert that exactly one visualization has that title. The review branch does this, but the test wasn't run: this worktree has no Python environment, built client, or IGV plugin.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort.

</details>
