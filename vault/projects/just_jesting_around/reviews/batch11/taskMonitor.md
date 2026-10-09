# Task monitor readability review

Selected originator: `client/src/composables/taskMonitor.test.ts`.

All eight scenarios remain: pending monitoring, successful completion, failed completion with the fetched reason, a failed status request, restoring success, restoring failure with its stored reason, and recognizing success and failure as final states. Every original initial and final running/completed/failed/request-failure/status/reason assertion remains. Names now use the actual `FAILURE` state rather than `FAILED`.

Tests await `waitForTask()` directly instead of launching it and flushing unrelated promises. A local monitor creator records each instance so `afterEach` always stops its polling, including when the pending case or an assertion fails. Console spies are restored afterward. This removes the pending case's surviving real polling timeout without losing its original running/status checkpoint.

The large shared state/result switch is replaced with scenario-specific typed handlers. Only failed tasks register the failure-reason endpoint; pending and completed scenarios no longer silently satisfy unexpected result requests. Each registered handler also checks the requested task ID. The request-error scenario retains its original HTTP 500 body and exact user-facing status. No OpenAPI casts or untyped handlers were introduced.

Reuse: inspected `genericTaskMonitor` and `shortTermStorageMonitor.test.ts`. The latter has a boolean readiness endpoint and a different final-state contract. Sharing its short handler setup with string task-state handlers would add branching rather than useful domain setup, so helpers remain local and there are no supporting migrations.

The README example index now identifies this file as **Task monitoring**, demonstrating task states, failure reasons, and request errors. This corrects the obsolete switch-pattern description; no best-practice prose was added. Prettier reflows that existing table.

Validation: baseline 8/8; final 8/8. Assigned-suite shuffled seed `110071` passes all 33 cases across four files. Scoped current ESLint, Prettier including the README, and diff whitespace checks pass. Evidence: `/private/tmp/jest_readability_batch11_async_{baseline,final}.json`, `_lint.log`, and `_prettier.log`.

No new guidance proposed. The cleanup and scenario-specific handlers follow existing principles, and obvious advice was discarded.
