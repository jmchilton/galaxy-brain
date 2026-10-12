# datasetPermissions — readability batch 50

Originating file: `client/src/composables/datasetPermissions.test.ts`.
Base: `15ba2c4a57710c6b0715adbda5319465cfc44cc9`.
Ledger entry has `storified: skip` and no later-lane true fields.

## Changes and assertion audit

Scenario names now describe the observable loading state, initial denied-request error without an error toast, and successful save followed by denied reload. Each request callback mock is named `loadPermissions` and typed as `() => Promise<void>`.

Replaced the partial save response forced through `as never` with a complete, local `satisfies AxiosResponse<{ message: string }>` fixture, including HTTP status, headers, and Axios config. This tests the composable's existing response contract without changing production types or adding an unnecessary shared builder.

The reload scenario now waits until the successful initial request has completed and asserts its empty error before invoking the save callback. The second request waits on the existing deferred<void> helper before rejecting with the 403 error. After starting `onSuccess` and flushing promises, the test checks that two requests have begun and the save callback remains pending. A finally block settles the request gate and awaits completion even if an assertion fails, before checking the original success/error/toast outcomes. This keeps the initial load and reload phases distinct and proves the callback waits for the reload response.

All ten original checks remain: initial loading true and eventual false with empty error; denied initial request completes, stores the request error, suppresses the error toast, and calls the loader once; saving displays the success message, then stores the reload error without an error toast. Added checks for initial completion/empty error, exactly two loader calls, and the save callback remaining pending while the second response is unresolved. All asynchronous error checks remain awaited.

## Validation

- Baseline and final: 3 tests, no skips, shuffled seed 500101, maxWorkers 1, pinned node.
- V8 coverage: 5 source files at both revisions; no previously covered statement/function/branch location lost. Target datasetPermissions retains 12 covered statements and 3 covered functions; covered branch count remains 0.
- Reviewer follow-through: a temporary mutation replacing onSuccess’s awaited load with fire-and-forget load fails specifically at the new pending-completion assertion (2 pass, 1 fail). The production source was restored immediately; only the test remains changed. The normal shuffled run after restoration passes all three tests (`/private/tmp/readability50-permissions-post-mutation.log`). Mutation log: `/private/tmp/readability50-permissions-await-mutation.log`.
- ESLint, Prettier, whitespace check, and clean explicit canonical pre-commit hooks passed. Initial hooks formatted the long mock chain; clean rerun passed.
- Logs and coverage: `/private/tmp/readability50-permissions-{baseline,final}.log` and matching `-coverage` directories. Comparison `/private/tmp/readability50-permissions-coverage-comparison.json`.

## Guidance, reuse, and scope

README's asynchronous assertion and typed fixture guidance was sufficient. This composable uses refs and plain callbacks without component lifecycle hooks, so direct testing is appropriate. The typed Axios response is local to one save-callback scenario; search found no other test consumers of this callback contract, so no shared helper or supporting edits are justified. No new marginal advice is needed.

No production, shared helpers, supporting tests, later-lane files, ledger, or push changed by this worker. No security findings.
