# Upload batch operations review — iteration 09

Selected originator: `client/src/composables/upload/useUploadBatchOperations.test.ts`. Baseline and final: **3→3** cases.

Read the problem/goal, loop instructions, marginal advice and client unit-testing guidance. Reuse `setupTestPinia()` and the existing `makeCollectionConfig()` factory for interrupted recovery rather than restating its defaults. Keep direct creation, retry after error and persisted-state recovery as separate scenarios. A named upload-ID array replaces positional id1/id2 variables while preserving the two upload items and batch membership.

Use the inferred OpenAPI handlers returned by `useServerMock()` for configuration, tools/fetch and collection creation. Preserve the original sparse responses via `response.untyped(HttpResponse.json(...))` rather than adding unrelated generated response fields. Keep handlers scoped to the scenario. Explicit two-item processing statuses replace an `every()` assertion that could pass with no active items. Retry setup obtains the actual upload item directly instead of conditionally skipping its error setup, then re-reads the current upload item after retry and verifies it still exists with its error cleared.

Coverage audit preserves exact direct-upload history ID, HDCA target, list type and collection name; empty outputs plus collection hdca_1 response; two active processing uploads; completed pasted upload, ds_1, original Temporary error and collection-creation error, retry status/col_retried/error removal; and persisted recovered.txt, Recovery Collection, hist_1, visible source items, ds_recovered, col_recovered and processing status. Keep real upload operations/state and await returned promises; recovery remains fire-and-forget and uses flushPromises.

Reuse is fully handled by established Pinia and upload fixtures; this three-case file needs no new helper or additional consumer migration. Existing README guidance covers each change. No README or marginal-advice addition is proposed.

Validation: scoped shuffled Vitest seed **90123** passes **64/64** cases across all four assigned suites. JSON: `/private/tmp/jest_readability_batch09_composables_utils.json`. Current-config scoped ESLint reports zero warnings/errors, and Prettier checks pass. The driver performs combined-suite validation and full client typechecking. No production, configuration, dependency or supporting-suite changes.

Independent review restored the post-retry assertion against the current active-items store rather than a pre-action object alias, and strengthened it with an explicit item-presence assertion. The original current-store error check remains represented even if an operation replaces an item. Shuffled seed **90137** passes **3/3**; zero-warning ESLint and Prettier pass. Evidence: `/private/tmp/jest_readability_batch09_review_upload.json` and the matching `_lint.log`/`_prettier.log`.
