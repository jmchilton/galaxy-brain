# Workflow step store — iteration 05

Selected originator: `client/src/stores/workflowStepStore.test.ts`.

All nine cases and 17 assertion statements remain. Preserve the original sparse step payloads exactly, including the second connected fixture's inherited `id: 0`; changing that id would change this scenario's input. Existing conditional input fixtures, the longer referenced input versus shorter connection-name regression, extra-input ordering, connection creation/removal, and empty-input results remain covered.

Corrected the first suite's misleading “Connection Store” name to “Workflow Step Store”, named cases by their conditions, used length/undefined matchers directly, and removed comments that repeated assertions. `setupTestPinia` replaces both duplicate local Pinia setup hooks. The file mocks no functions; redundant restore-all-mocks hooks and their imports were removed.

Reuse search found the existing `Workflow/Editor/test_fixtures.createTestStep`, already used here and in layout tests. It remains in use for conditional input cases. Its default output, position, name, and id assumptions differ from the sparse connection fixtures shared in shape with `workflowConnectionStore.test.ts`. Broadening its API or deleting generated fields solely to preserve those inputs would add noise; retain the short sparse fixtures. No new shared factory, supporting migration, or deferred advice was needed.

Validation: nine cases pass with all original inputs/checks retained; scoped ESLint and Prettier pass. Existing guidance already covers Pinia isolation and fixture reuse.
