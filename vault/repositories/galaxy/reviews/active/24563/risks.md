Review profile gx_risk_assessment via Claude Opus 5.5 at low effort; reviewed commit f7db338ea74b7efd891d3c8edd84ab53ad007ad0.

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It is a client-only fix in `VisualizationDisplay.vue` (plus tests) with no API, schema, or artifact-format change.

<details><summary>Risk Details</summary>

- Opening a saved visualization now waits on `userStore.loadUser(false)` alongside the visualization fetch; if the user request fails, the page shows an error instead of the frame, where previously it rendered (and saved as a copy).
- `loadUser` shares a cached promise; when the app's own load (with histories) is already in flight, a later history failure is swallowed here by design, and the ownership check relies on `currentUser` being set before that failure.

</details>
