# Invocation graph review — iteration 08

Selected originator: `client/src/composables/useInvocationGraph.test.ts`. Baseline and final: 17 cases.

Replace two layers of sparse `object`/array casts with one local typed graph arrangement. Fully typed invocation/step defaults sit together; the scenario supplies the presence of a step, job counts and populated state. Each test still awaits `loadInvocationGraph(false)` through the local load action before checking the actual graph step. The workflow fetch, editor conversion and scoped-store provisioning remain mocked; unused testing Pinia initialization is removed. Direct invocation remains appropriate for this isolated graph-state calculation because the lifecycle-dependent provisioning boundary is explicitly mocked.

Named rows retain all eight job-state cases: any error/running/paused/deleting resolves to error/running/paused/deleted, while all deleted/skipped/new/queued jobs preserve that state. Five named populated-state rows retain scheduled→queued, ready→queued, resubmitted→new, failed→error and deleting→deleted with the original inconclusive `{ok: 1}` jobs. Separate cases retain missing-step→queued, missing-summary→waiting, a defined header class on a fresh step, and `{ok: 1}` plus excluded stop→uninitialized. No original input or expected result is dropped.

The generated job-summary enum excludes scheduled and ready even though the composable explicitly handles them. Preserve these runtime contracts through a documented `PopulatedState` union and a cast confined to the `populated_state` field at the schema boundary. Every other fixture field and summary remains typed; no broad fixture cast, any or unknown is required. The two schema-mismatch inputs cannot be dropped to appease typing.

Reuse search found no suitable existing invocation factory and no second consumer of this single-workflow-step arrangement; no new shared factory is justified. Existing README guidance covers named combinations, direct composable calls and domain setup. The enum mismatch is explained next to its test boundary; it does not warrant a general README paragraph or marginal advice.

Validation: all 17 cases pass in normal and shuffled six-suite runs. Full client types pass after the narrow enum boundary correction; scoped current-config ESLint and Prettier pass. Normal result: `/private/tmp/jest_readability_batch08_stores_final.json`; final shuffled result: `/private/tmp/jest_readability_batch08_stores_shuffled_final.json`, all 107 cases passing with seed 80109.
