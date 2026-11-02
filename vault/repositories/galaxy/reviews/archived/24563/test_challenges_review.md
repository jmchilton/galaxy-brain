# Test challenges review — #24563

- Profile: [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md)
- Model: Claude Opus 5.5 (`claude-opus-5-5`), effort low
- Reviewed commit: `f7db338ea74b7efd891d3c8edd84ab53ad007ad0`
- Debrief: [test_challenges_debrief.md](test_challenges_debrief.md)

The new tests target the right behaviour (frame held back until the viewer is known, owner gets the id, non-owner does not, load failure shows an error), and switching the "not signed in" viewer from `null` to an anonymous user is correct. The tests were not run (no client deps in the worktree).

### P2 1: The shared-load tests run against a hand-written copy of `loadUser`, not the store

`mountDisplay` replaces `userStore.loadUser` with a mock that reimplements the store's behaviour: it sets `currentUser` and then optionally throws a "histories" error to imitate the app's shared `loadUser()` promise failing after the user is set. The test "shows the frame without an error when the viewer loaded but the shared load failed later" therefore checks the component against the test's own model of the store. If `userStore.loadUser` changes how it shares the promise between `loadUser()` and `loadUser(false)`, or when it sets the user, these tests keep passing.

Suggested fix: use the real user store (`createTestingPinia({ stubActions: false })` or a real Pinia) with `useServerMock` from `@/api/client/__mocks__`, which client/README.md names as the preferred API mock. Add MSW handlers for `GET /api/users/{user_id}` that await a deferred the test controls, and drive the shared-failure case by calling `userStore.loadUser()` (with histories) first and returning 500 from `GET /api/histories`. That removes the `loadingViewer` branch from `mountDisplay`.

### P3 1: Spy-call assertions stand in for outcomes

`expect(useUserStore().loadUser).toHaveBeenCalledWith(false)` and, in the dataset-preview test, `expect(useUserStore().loadUser).not.toHaveBeenCalled()` assert how the component calls the store, not what the user sees. For the dataset preview, the contract is that the frame renders while the user request is still pending. Assert that instead. After the P2 1 rewrite, "no histories request was made" can replace the `false` argument check if that detail matters.

### P3 2: The "Failed to load the current user." fallback can't be reached and has no test

`getCurrentUser()` always returns a user object, because `toAnyUser` maps any payload to a registered or anonymous user. As a result, `loadUser` can't resolve while `currentUser` is still `null`. The fallback message in `VisualizationDisplay.vue` handles a state the store can't produce. Either drop it and use `errorMessageAsString(userError)` alone, or add a test that reaches it.

### P3 3: No E2E coverage that re-saving your own visualization updates it in place

A unit test is the right layer for the slow-user race. But the user-visible result this PR protects (saving your own visualization runs a PUT, not a POST that creates a duplicate) has no browser test. `test_visualizations.py::test_igv_loads_correct_genome` already saves an IGV visualization and opens the saved list. Extending it, or adding a sibling test, to reopen that visualization, save again, and assert the list still has exactly one entry would cover this end to end.
