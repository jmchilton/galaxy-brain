# workflowSearchStore: accepted

Originator: `client/src/stores/workflowSearchStore.test.ts`. Cases: **7 → 7**, all passing, no skips.

The name, label, and annotation searches are three named table cases. `setupSearchWorkflow()` pairs the workflow step with the four DOM nodes it requires, replacing seven copies of the same arrangement. The existing `createTestStep()` supplies workflow defaults; the visible fixture retains FastQC, quality_check, QC tool, input1 / Input Dataset, and html_file. Existing `setupTestPinia()` replaces the repeated Pinia setup.

All original contracts remain: nonempty name matches, matching step type for all three fields, empty unmatched results, input-terminal matches, first-call null-cache regression, and absence of repeated DOM collection for an unchanged changeId. Result assertions now identify the expected step and input label. Mock restoration and DOM cleanup run after each case, including a failed assertion.

The shared workflow-step factory already has concrete editor consumers, so no new factory or supporting migration is needed. The DOM setup is specific to this search fixture. Existing readability, reuse, and isolation guidance covers these changes; no new best practice proposed.

Validation: baseline JSON `/private/tmp/jest_readability_batch11_stores_baseline.json` (40 passing across these five suites); final shuffled JSON `/private/tmp/jest_readability_batch11_stores_final.json` (42 passing, seed 110019). Scoped ESLint and Prettier checks pass. Full client typecheck and independent batch review are owned by the driver. No production changes.
