# DatasetView review

Selected originator: `client/src/components/Dataset/DatasetView.test.js`. Baseline: 15 passed and one preexisting skipped case. Final: 24 passed and the same skipped case.

A single mount helper now handles cached and loading datasets, installs a fresh local Vue configuration with the existing `withPlugins()` helper, and copies scenario data into the store. Auto-unmount and restored observer/URL globals prevent the fixture from leaking into neighboring tests. The loading case still holds the dataset request unresolved and checks the exact loading text plus absence of the loaded view. Real DatasetDisplay behavior, its preview request query, iframe blob URL, download endpoints, filesize text, and absence of a strong tag remain covered. Redundant mapping and cached-dataset HTTP handlers were unnecessary and removed; sparse configuration/datatype responses use `response.untyped`.

The four independent tab mounts and three transient dataset states use named cases while preserving their original prop checks. Tab cases additionally check the selected child receives the dataset ID, error cases retain no-redirect checks for both error states, and dataset information also checks the visible name. Dependent tab-prop updates stay together.

The former URL test constructed five strings locally and compared each against the same expression. It exercised no component. Its replacement reads navigation emitted by DatasetView for all five labels. A named BNavItem stub receives the actual `to` prop and renders it to an anchor href; this isolates parent routing from the functional Bootstrap compat wrapper, which has no Vue wrapper props and renders no href in this environment. Preview is asserted at the component's actual `/datasets/dataset_id/preview` target; the other four paths retain the original suffixes. The former root preview string was a local literal, not observed routing behavior. No production route changed. Initial assertions against the functional wrapper failed during development; the final prop-preserving stub passes.

The skipped preferred-visualization case and all its original assertions remain skipped. It references an obsolete visualization store and VisualizationFrame, while production uses datatypeStore and VisualizationDisplay. Repairing that separate coverage gap requires choosing the intended current contract; this readability change does not silently enable or replace it.

Reuse inspected: `getLocalVue`, `withPlugins`, existing datatype mapper fixture, DatasetDisplay production implementation, central test-data factories. No existing central dataset fixture matches this short display-specific object; a new shared fixture would hide the handful of fields under test without a second concrete consumer. The existing helpers were reused directly.

Evidence: `/private/tmp/jest_readability_batch10_components_baseline.json` and `_final.json` (final shuffle seed 100041; combined DatasetView/object refs: 30 passed, one original skip). Scoped ESLint and Prettier checks pass.

Guidance: existing readable-scenario, fixture-reuse, mounting and async guidance covers these changes. The URL tautology is an instance of the existing behavior-testing rule, not new README advice. No marginal advice added.

Validation used the existing worktree and dependencies with `NODE_OPTIONS=--no-webstorage`. Source edits stay in the four selected suites; no supporting suite or new shared helper was needed.
