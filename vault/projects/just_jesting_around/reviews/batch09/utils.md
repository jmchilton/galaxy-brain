# Utility traversal review — iteration 09

Selected originator: `client/src/utils/utils.test.ts`. Baseline and final: **3→4** cases.

Read the problem/goal, loop instructions, marginal advice and client unit-testing guidance. Remove explicit any annotations from deepEach callbacks and let the utility's signature infer their types. Full driver typechecking exposed that the inferred node union includes `{}`; narrow with `"skip" in node` before reading the marker, preserving the false-return branch without an any annotation or cast. Use arrays of visited nodes as the observable output, replacing count-only checks with explicit nested-node expectations. Keep skip-subtree assertions tied to the concrete child/grandchild identities and verify the sibling remains visited. Split the original undefined/true callback return variations into two named rows.

Coverage audit retains all three nested objects in the default traversal; false return at a marked parent prunes its child/grandchild while visiting its sibling; undefined and true each visit four nested nodes. Expected arrays preserve the original counts and strengthen which nodes/order are visited. The extra case is the split of an existing callback return variation, not new behavior or deleted coverage.

Reuse: four short pure-function scenarios require no domain factory or cross-file helper. Existing direct-function and it.each guidance suffices; no README or marginal-advice addition is proposed.

Validation: scoped shuffled Vitest seed **90123** passes **64/64** cases across all four assigned suites. JSON: `/private/tmp/jest_readability_batch09_composables_utils.json`. Current-config scoped ESLint reports zero warnings/errors, and Prettier checks pass. The driver performs combined-suite validation and full client typechecking. No production, configuration, dependency or supporting-suite changes.

The narrowing correction is verified separately by shuffled seed **90123**, **4/4** utility cases, scoped ESLint and Prettier. JSON: `/private/tmp/jest_readability_batch09_utils_narrowed.json`.
