Reviewed `client/src/components/Markdown/Sections/Elements/HistoryDatasetDisplay.test.js` (originator), 6 → 6 cases.

The mount helper returns a local wrapper and explicitly installs its fresh datatypes Pinia via existing `withPlugins`; all six scenarios own the returned wrapper. Existing `testDatatypesMapper` remains the shared mapper arrangement, `loadCurrentHistory` is reset along with the copy/toast mocks, and wrappers auto-unmount. Removed redundant manual handler resets because existing `useServerMock` resets handlers after every test. Names identify tabular/text rendering, the embedded-header transition, and expansion.

Preserved original tabular ID and four two-column values, metadata, table presence, eight cells/two headers, exact text content, header presence then absence after embedded true, Expand button and initial compact class then Collapse button/expanded class, successful copy argument pair and exact success toast/no error toast, and failed copy error/toast/no success toast. Real mounting retains real GTable and GButton interactions.

Reuse: the existing mapper fixture and plugin helper eliminate setup duplication. Neighboring HistoryDatasetDetails has a different metadata-only fetch contract; exporting a factory merely for its few setup lines would make simple scenarios harder to read. No shared helper added.

Validation: six affected suites pass in shuffled order (seed `130043`): 53 cases, zero skips/failures. Selected baseline: 27 cases across the five originators; the selector supporting baseline adds eight. Tag regex parameterization accounts for the 18 additional individually reported cases. Evidence: `/private/tmp/jest_readability_batch13_components_final.json`; supporting baseline `/private/tmp/jest_readability_batch13_selector_baseline.json`. Scoped ESLint passes with zero warnings and Prettier passes for all six files. Root performs full client typechecking and the authoritative whole-batch verification.

Guidance: existing readable scenarios, factory reuse, component integration, async settling, and cleanup guidance already covers these changes. No README addition or marginal advice proposed.
