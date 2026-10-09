# Visualization creation

Originator: `client/src/components/Visualizations/VisualizationCreate.test.js`. Cases: **4 → 4**.

Use one async mount arrangement with consistent props and plugins. The mocked history store and component tree now share an explicit fresh Pinia, following the already reviewed `VisualizationExamples.test.js` pattern. Auto-unmount all wrappers and remove the tooltip target appended to document.body on every test. Keep FormCardSticky and markdown directive rendering real; stub SelectionField because these scenarios exercise the query supplied to it, not its search implementation. Invoke its public `objectQuery` prop instead of reaching into the parent component instance.

Preserved scatterplot metadata (description, logo, display name), Help heading and both tags; dataset1/101 and dataset2/102 names/ordered returned options; the optional-dataset `Open visualization...` option; and the exact markdown input, links sanitization profile, `_blank` target and escaped `<b>now</b>` string. Awaiting flushPromises remains necessary for the mounted plugin fetch; query promises are awaited directly.

Reuse: existing `getLocalVue`/`withPlugins` provide the plugin setup. A two-field mock history store is clearer than importing the full history store and its polling/configuration dependencies. Its sibling has the same short store pattern but different upload interactions; a shared helper would save only a tiny declaration and hide per-file isolation. No supporting edit needed. Existing guidance covers this work; no new guidance or marginal advice proposed.

Validation: all four owned suites pass **27/27**, with zero skips under shuffled seed `140041` (`/private/tmp/batch14_graph_tests.json`). Scoped ESLint, Prettier, and whitespace checks pass. The driver performs full-client typechecking and combined batch validation.
