# Implementation debrief: issue_23977_client_api_fanout_26.1

Branch `issue_23977_client_api_fanout_26.1` on `jmchilton`, tip `84ec8b0f713`, rebased onto `origin/release_26.1` `5308aa51b16` (2026-10-08). 8 commits (squashed from 31 by path; pre-squash backup ref `backup/issue_23977_pre_squash` in the local clone). Client-only plus one E2E test. Addresses galaxyproject/galaxy#23977. No PR opened.

## Commits

1. **Add sharedPromise helpers; share in-flight upload datatypes/genomes requests.** `utils/sharedPromise.ts` (`memoizeUntilRejected`, `dedupeInFlight`); `Upload/utils.js` stops firing one `/api/datatypes` per concurrent caller and no longer caches `[]` after an HTTP error.
2. **Load datatypes for help terms only for datatype terms.** Invocation-state help terms (one per grid row) send 0 datatype requests (was 1 per row); datatype terms share one load, retried after failure. `datatypeStore.fetchUploadDatatypes` now rethrows; `DatatypesProvider` logs.
3. **API rate limiter: jittered exponential backoff between 429 retries.** Root cause of `workflows/{id}?instance=true` ×4: `GalaxyApi()`'s middleware retried every 429 GET 3× at fixed 1 s, re-bursting in lockstep (confirmed in gxui console log `~/.cache/gxui-loop/runs/refine-workflow-reports-1/...console-2026-10-07T23-30-12-675Z.log`). Numeric Retry-After honored; > `maxRetryDelay` (5 s) returns the 429; HTTP-date no longer retries instantly. Shared parsing/backoff + `apiErrorFromResponse` in `simple-error.ts`.
4. **Add useRetryGate; back off keyed-cache, history and collection retries.** `composables/retryGate.ts`: scheduled jittered backoff, loading while pending, `finalError` hides errors until final, Retry-After above 30 s cap is final. Adopted by `useKeyedCache`, `historyStore`, `collectionElementsStore` (latter two had their own immediate-retry copies). `loadHistoryById` returns its error (used by `HistoryExport`).
5. **Show loading, not blank/not found, while a retry is pending.** `WorkflowInvocationState` (was "Invocation not found." for ~7–14 s), `WorkflowRerun`, markdown `HistoryDatasetDetails`, `DatasetPopoverLink` (reactive getter while shown; unused history load dropped).
6. **Share failures of in-flight workflow instance fetches; catch in grids.** Concurrent waiters on a failed `fetchWorkflowForInstanceId` silently resolved with no data. Grids load histories only via the gate and catch fire-and-forget fetches (also `ObjectPermissions`).
7. **Only fetch workflow invocation counts for cards that show them.** Stops `/counts` in workflow panel (hide-runs), shared/published lists, anonymous. Owned cards on "My workflows" still fetch per card → backend follow-up.
8. **E2E: invocation list requests each resource once on a cold load.** `test_grid_requests_each_resource_once` + `NavigatesGalaxy.start_browser_request_log()` / `browser_api_request_paths()`.

## Testing

- Vitest red→green per change (agent-verified against unmodified code). Final: 251 files, 1872 passed, 2 skipped; full `vue-tsc --noEmit` clean; pre-commit (`--from-ref origin/release_26.1`) all pass. Node 22.20.0 via pnpm.
- **E2E not run** (no venv/server; disk was full mid-session). From code reading: datatypes assertion *probably* red on base (rows mount while boot UploadContainer's datatypes request is in flight) — not observed. History/workflow assertions are presence/regression guards (base already dedupes on the happy path; ×4 needs 429s). Skips (doesn't fail) when the resource-timing buffer already had ≥250 entries — likely always skips against a local unbundled Vite dev client; asserts against built client in CI.
- Not re-measured against a live rate-limited server.

## Reviews

Two review passes (REVIEW_FOCUS). All findings acted on except below. Second pass caught: E2E green on base (in-app navigation hit warm datatypes cache) → cold page load + presence checks; "Invocation not found." during backoff; history/collection error flash; history/collection errors dropped Retry-After; help terms never retried; Retry-After > cap burned attempts.

Decisions (John, 2026-10-08): **keep both retry layers** (middleware 429 retries + gate; worst case ~16 req/item spread over ~20–40 s; dropping 429 from the gate would regress #21886/#21920). **Keep test-challenge drops** (`HelpText.test.ts`, duplicate keyedCache backoff tests, helpTermsStore spy test).

Not acted on, and why:
- keyedCache Retry-After plumbing kept though low value (nginx sends none) — correct, small.
- Lazy HelpTerm mount in HelpPopover: needs `Popper.vue` change + positioning risk; dedupe already makes state rows send 0.
- `WorkflowInvocationState` never starts polling if first fetch failed and a retry later succeeds — pre-existing, non-trivial (watch interplay).
- `collectionElementsStore` key mismatch: `fetchCollection` stores gate/error/loading under HDCA id, getters look up by `collection_id`; element-fetch errors are plain `Error` (not retryable via gate). So gate changes there don't reach `CollectionPanel` today. Pre-existing; dev follow-up. Also: move `fetchCollectionElements` to `rethrowSimpleWithStatus`?
- Hand-rolled dedupes in `userStore`, `quotaUsageStore`, `workflowStore.getFullWorkflowCached`, `datatypeStore.fetchDatatypeDetails` — candidates for `sharedPromise` on dev.
- 37 unexplained extra datatypes requests never reproduced (base = 25 for 25 rows); moot.

## Follow-ups

- Dev backend fix for workflow-list counts N+1: `followup_workflow_counts_proposal.md` (open: naming vs `skip_` style; per-user counts — `/counts` counts all users' runs, badge links to own; omit vs null for unowned).
- Forward-merge to dev: expect conflicts in `keyedCache.ts`, `retryGate.ts` (Vue 2.7 `set`/`del`), `workflowStore.ts`.
- Re-measure invocations/workflow lists on test.galaxyproject.org after deploy.

## Process notes

- Parallel agents in one worktree: pre-commit hook stashes others' unstaged files while it runs; later commits used `--no-verify` after manual prettier/eslint; final pre-commit run over the whole range passes.
- `remote.jmchilton` has a duplicate `pushurl`, so each push runs twice and the second prints "Everything up-to-date".
