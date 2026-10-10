# visualizationStore

Selected originator: `client/src/stores/visualizationStore.test.ts`. Baseline and final: **8 tests**.

The local `mockVisualization(id, title)` stays as a one-line wrapper over the new `getFakeVisualizationSummary` factory, which removes the 13-line literal and its `as VisualizationSummary` cast. A typed `mockResult(visualizations, totalMatches = visualizations.length)` replaces the repeated `{ data, totalMatches }` literals; every original total equalled its list length, and the first case still passes its `2` explicitly because it asserts it. The concurrent-fetch case drops its hand-rolled resolver (a no-op placeholder reassigned inside `new Promise`) for `deferred<LoadVisualizationsResult>()`.

All 8 scenarios and their assertions survive. Two are strengthened:
- The concurrent callers now get the same array (`toBe` instead of `toEqual`), and that array holds `viz-1`.
- The title filter's `searchCachedVisualizations("my", "cov", 1)` → length 1 never exercised the limit, because only one title matches "cov". It now checks the ids (`["viz-2"]`). A new assertion, `("my", "a", 1)` → `["viz-1"]`, uses a term both titles match, so only the limit keeps the second out; without the limit it fails (`['viz-1', 'viz-2']`).

Reuse: `getFakeVisualizationSummary` (added in the preceding commit, see [getFakeVisualizationSummary](getFakeVisualizationSummary.md)) and `deferred` from `@tests/vitest/deferred`.

Validation: 8 tests pass shuffled (seed `410101`, `NODE_OPTIONS=--no-webstorage`). ESLint, Prettier and full client vue-tsc pass. Per-file coverage is unchanged (no statement or branch lost or gained).

Guidance: none.
