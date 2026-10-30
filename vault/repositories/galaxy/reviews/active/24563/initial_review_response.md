(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Review profile gx_risk_assessment via Claude Opus 5.5 at low effort; reviewed commit f7db338ea74b7efd891d3c8edd84ab53ad007ad0.

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It is a client-only fix in `VisualizationDisplay.vue` (plus tests) with no API, schema, or artifact-format change.

<details><summary>Risk Details</summary>

- Opening a saved visualization now waits on `userStore.loadUser(false)` alongside the visualization fetch; if the user request fails, the page shows an error instead of the frame, where previously it rendered (and saved as a copy).
- `loadUser` shares a cached promise; when the app's own load (with histories) is already in flight, a later history failure is swallowed here by design, and the ownership check relies on `currentUser` being set before that failure.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24563_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24563_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24563_review_0) is based on the reviewed commit `f7db338ea74`. It rewrites the new `VisualizationDisplay` unit tests to run the real user store against `useServerMock` instead of a hand-written `loadUser` mock, and drops the unreachable "Failed to load the current user." fallback. It also lets a saved visualization recover when the app's Retry loads the user after a failure. Finally, it extends the IGV Selenium test to check that re-saving your own visualization updates it in place. The unit test file passes (17 tests, run under Node 26 with `NODE_OPTIONS=--no-experimental-webstorage`). The Selenium test was written but not run.

- [`ef7f8c6d77c`](https://github.com/jmchilton/galaxy/commit/ef7f8c6d77c) Test saved visualization ownership against the real user store: replaces the `loadUser` mock with `createTestingPinia({ stubActions: false })` plus MSW handlers, and asserts on the requests made instead of spy calls (P2 1).
- [`836905af900`](https://github.com/jmchilton/galaxy/commit/836905af900) Drop the unreachable current-user fallback message: uses `errorMessageAsString(userError)` alone (P3 2).
- [`b2cd932b747`](https://github.com/jmchilton/galaxy/commit/b2cd932b747) Show a saved visualization once the app's Retry loads the viewer: keeps the fetched record and finishes the ownership decision from a `watch(currentUser, …)`, with a unit test that fails without the fix (P3 1).
- [`25b3844766c`](https://github.com/jmchilton/galaxy/commit/25b3844766c) Check that re-saving one's own IGV visualization updates it in place: extends `test_igv_loads_correct_genome` to reopen, re-save, and assert a single visualization with that title (P3 3, not run).

</details>

</details>

### P2 1: The shared-load tests check a hand-written copy of `loadUser`, not the store (implementation verified)

`mountDisplay` replaces `userStore.loadUser` with a mock that sets `currentUser` and then optionally throws a "histories" error, imitating the app's shared `loadUser()` promise failing after the user is set. The test "shows the frame without an error when the viewer loaded but the shared load failed later" therefore checks the component against the test's own model of the store. The component depends on `loadUser` setting the user before it loads histories. If the store stopped doing that, or changed how `loadUser()` and `loadUser(false)` share their promise, these tests would still pass. A few assertions also check how the component calls the store (`loadUser` called with `false`, `loadUser` not called for a dataset preview) instead of what actually happens.

Suggested fix: use the real user store (`createTestingPinia({ stubActions: false })`) with `useServerMock`. Hold `GET /api/users/{user_id}` on a deferred the test controls. Drive the shared-failure case by starting the app's `userStore.loadUser()` (with histories) before mounting and returning 500 from the history endpoints. Then assert on the requests made: `/api/users/current` is requested with no `/api/histories*` request, and a dataset preview makes no user request.

<details><summary>Details</summary>

The review branch's rewrite needs two things beyond the swap. `mount` has to get the test's pinia, because `getLocalVue()` installs its own long-lived pinia, and the component would otherwise share one store, and one cached `loadPromise`, across tests. Assertions also have to wait on outcomes with `vi.waitFor`, since a single `flushPromises()` doesn't settle MSW responses.

</details>

Fixed on the review branch in [`ef7f8c6d77c`](https://github.com/jmchilton/galaxy/commit/ef7f8c6d77c).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort, and by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: on the rewritten tests, swapping the store so `setUserState` runs after `loadHistories` fails the shared-failure test. The original mock-based test can't detect that change.

</details>

### P3 1: After a user-load failure on a full page, the view stays on the error when the app's Retry succeeds (implementation verified)

When the page isn't embedded and `/api/users/current` fails, `App.vue` shows "Unable to load your user data: …" with a **Retry** button, and `VisualizationDisplay` shows the same message in its own alert. Clicking Retry reloads the user and clears the app's alert. The display only checks `currentUser` once, in `onMounted`, so its error stays and the frame never appears until a full page reload.

Suggested fix: when the visualization loaded but the user didn't, keep the fetched record, then finish the ownership decision and clear the error once `currentUser` becomes non-null (a top-level `watch(currentUser, …)`, cleaned up with the component).

Fixed on the review branch in [`b2cd932b747`](https://github.com/jmchilton/galaxy/commit/b2cd932b747).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: a new unit test fails the user request, then reloads the user through the store, and it passes only with the fix.

</details>

### P3 2: The `"Failed to load the current user."` fallback can't be reached (implementation verified)

`loadUser` resolves only after `setUserState(await getCurrentUser())`. `getCurrentUser` either throws or returns `toAnyUser(data)`, which is always a registered or anonymous user, never `null`. A load that resolves therefore can't leave `currentUser` as `null`, so the comment ("A load that resolves can still leave no user") describes a case that doesn't happen, and the fallback string has no test.

Suggested fix: drop the comment and the fallback string, and use `errorMessageAsString(userError)` alone. It already supplies a default message.

Fixed on the review branch in [`836905af900`](https://github.com/jmchilton/galaxy/commit/836905af900).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort, and by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort by reading `userStore.loadUser`, `getCurrentUser` and `toAnyUser`. The existing tests still pass with the fallback removed.

</details>

### P3 3: No E2E test checks that re-saving your own visualization updates it in place

A unit test is the right layer for the slow-user race. But the outcome this PR protects, that saving your own visualization sends a PUT rather than a POST that creates a duplicate, has no browser test. `test_visualizations.py::test_igv_loads_correct_genome` already saves an IGV visualization and opens the saved list, so it can be extended to cover this.

Suggested fix: extend that test to open "igv with hg18" from the saved list, save it again, and assert that exactly one visualization has that title. The review branch does this, but the test wasn't run: this worktree has no Python environment, built client, or IGV plugin.

Fixed on the review branch in [`25b3844766c`](https://github.com/jmchilton/galaxy/commit/25b3844766c).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort.

</details>
