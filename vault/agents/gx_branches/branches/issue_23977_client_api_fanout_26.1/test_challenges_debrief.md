# Test challenge debrief (2nd run): issue_23977_client_api_fanout_26.1

Process: `vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md`. Base: `origin/release_26.1`. Branch head before this run: `4d184c6672e`. The previous run is in `earlier_drafts/1/test_challenges_debrief.md`. Its verdicts still hold for the files it covered and aren't repeated here.

What triggered this run: John dropped the request-counting E2E test. That test was the stated reason for deleting `HelpText.test.ts` in `229818f3f36`.

Commits (coordinator note: later folded into commit 2 "Load datatypes for help terms…" (HelpText, storeProviders) and commit 5 "Show loading…" (WorkflowRerun); branch `f8d58ca20a1`; originals on local ref `backup/issue_23977_pre_codex_fold`):
- `465438a4c4f` Restore HelpText fan-out test: many YAML help rows request no datatypes
- `aa8ff56e66f` WorkflowRerun, DatatypesProvider tests: msw failures instead of store mocks

Concurrent WIP: the coordinator (Codex review fixes) modified `rateLimiter.ts`, `rateLimiter.test.ts`, `HistoryDatasetDetails.vue` and `HistoryDatasetDetails.test.js` in this worktree during this run. I didn't touch, format or stage those files.

## HelpText.test.ts: restored, slimmed

- **Restored test:** "renders invocation state help for many rows without requesting datatypes". It mounts 25 `HelpText` rows with invocation-state URIs and asserts:
  - all rows render;
  - no "Loading Galaxy help terms" text;
  - the YAML help text appears;
  - 0 `/api/datatypes` requests.
- **Why restore it:** it is the only guard on the actual fan-out path. `HelpText` mounts `HelpPopover`, which mounts `Popper`. `Popper` uses `v-show`, so it mounts the slot eagerly, and `HelpTerm` runs `useHelpForTerm` for every row. That is the per-row pattern in `GridList.vue`'s `helptext` field.
- **Mutation evidence:** I added an eager `useHelpTermsStore().ensureInitialized()` to `HelpTerm.vue`. The 4 `helpTermsStore` tests still passed and only `HelpText.test.ts` failed (expected 0, got 1). The store tests can't see a component-level eager load.
- **Red/green:**
  - With base `helpTermsStore.ts` swapped in, it fails with 1 request vs 0, and passes on HEAD.
  - Base reports 1 request, not 25, because commit 1 (`sharedPromise` in upload utils) already dedupes concurrent requests. The red comes from YAML terms loading datatypes at all.
- **Dropped:** the second old test, "requests datatypes once for many datatype help texts". It duplicates `helpTermsStore` "loads datatypes once for many concurrent datatype terms" and adds no component-specific path.
- **Cleanups:**
  - `wrapper.destroy()` in `afterEach`.
  - Removed the `@popperjs/core` mock; it wasn't needed, and the test passes against the real popper under happy-dom.
  - Removed `vi.resetModules` and the dynamic imports. The single remaining test never loads datatypes, so the module-level memo doesn't matter.
- **Earlier drops stay dropped:** the keyedCache duplicate backoff tests and the `helpTermsStore` spy test. Restoring HelpText doesn't argue for either; they covered different code (retryGate arithmetic and a `fetchUploadDatatypes` spy).

## Tests the previous run never saw

| File / test | Verdict | Why |
|---|---|---|
| `WorkflowRerun.test.ts` | **rewritten** | It used a `vi.mock` of `invocationStore` that returned null. Now it uses a real pinia and an msw 503 for `/api/invocations/{id}/request` with fake timers, and asserts the loading span is shown with no error alert and no `WorkflowRun`. This exercises the real scenario: a retry pending in keyedCache. It is red against base `WorkflowRerun.vue` and also against base `keyedCache.ts`, where the error alert shows instead. The old mock version was only red against the component. |
| `storeProviders.test.js` (`DatatypesProvider`) | **rewritten** | It used a `vi.mock` of `datatypeStore` with a stub `defineStore`, a `fetchUploadDatatypes` spy and a `console.log`-called assertion. Now it uses the real store with an msw 500. It asserts exactly 1 `/api/datatypes` request (a network-observable replacement for the spy) and `loading === false`. The "log was called" assertion was dropped as an implementation detail; console.log is still silenced. Red against base `storeProviders.js`: `loading` stays `"true"`, plus an unhandled rejection. |
| `datatypeStore.test.ts` | keep | It is the only direct guard that `fetchUploadDatatypes` rethrows. The provider test passes whether the store swallows or rethrows. `helpTermsStore`'s retry test covers it indirectly. |
| `HistoryExport.test.ts` 503 case | keep | Uses msw and covers what a consumer sees for a retryable error from `loadHistoryById`. |
| `WorkflowInvocationState.test.ts` retry case | keep | Adds `isLoadingInvocation` to the file's existing `vi.mock` store. Rewriting the whole file to msw is out of scope. |
| `HistoryDatasetDetails.test.js` retry case | keep (read only) | Uses msw and fake timers and checks observable loading → content. The other session's WIP touches this file, so I left it alone. |

## E2E

None recommended.
- The fan-out regression can only be seen end to end by counting requests, and John rejected that test.
- The 429/5xx retry, backoff and loading paths need forced error responses, and CI's Galaxy has no rate limiter.
- Rendering of the invocation grid is already covered by the existing `test_invocation_grid.py::test_grid` (Selenium-only).
- A non-counting E2E would only re-test that rendering and wouldn't guard the fix.

## Verification

- vitest on all 20 branch test files plus the restored `HelpText.test.ts`, node 22.20.0: 20 files and 138 tests pass. The count includes the other session's uncommitted edits to `rateLimiter` and `HistoryDatasetDetails`.
- prettier and eslint are clean on the 3 touched files.
- I didn't run `vue-tsc`. The changes are test-only.
- Every red check swapped in one base file temporarily and restored it with `git checkout HEAD -- <file>`. I confirmed beforehand that none of those files were in the other session's WIP.
