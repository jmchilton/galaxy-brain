# Implementation debrief: issue_23977_client_api_fanout_26.1

**STATUS: READY.** Branch `issue_23977_client_api_fanout_26.1` on `jmchilton`, tip `423bd6a3ec2`, based on `origin/release_26.1` `5308aa51b16`. 6 commits, client only. It refs galaxyproject/galaxy#23977 and does not fix it: the backend counts N+1 is a separate dev follow-up. No PR.

Pre-revision debrief, with per-commit detail, earlier decisions and pre-existing issues: `earlier_drafts/1/implementation_debrief.md`.

## Split (2026-10-08, John)

The datatypes half (old commits 1–2) moved to `issue_23977_datatypes_fanout_26.1` (`b2ec6aac24c`, debrief in `../issue_23977_datatypes_fanout_26.1/`). This branch keeps its own copy of `utils/sharedPromise.ts` and its test, byte-identical, because `workflowStore` uses `dedupeInFlight`. The two branches merge in either order without conflict; `git merge-tree` of both tips equals the pre-split tree. Pre-split tip: local ref `backup/issue_23977_pre_split` (`448da3a3b9a`). Each branch was tested on its own (see Testing).

## Commits

1. Add sharedPromise helpers for sharing in-flight requests (helpers + test only).
2. API rate limiter: jittered exponential backoff between 429 retries.
3. Add useRetryGate; back off keyed-cache, history and collection retries.
4. Show loading, not blank/not found, while a retry is pending.
5. Share failures of in-flight workflow instance fetches; catch in grids.
6. Only fetch workflow invocation counts for cards that show them.

## This revision (2026-10-08)

- **E2E dropped (John).** `84ec8b0f713` (`test_grid_requests_each_resource_once` plus `NavigatesGalaxy` request-log helpers) was removed. Local backup ref: `backup/issue_23977_with_e2e`.
- **Codex review** found 2 bugs, both fixed with red→green tests (`codex_review.md`):
  - When retries ran out, the rate limiter returned the first 429 instead of the last. The final `Retry-After` was lost.
  - Markdown `HistoryDatasetDetails` showed "attribute 'peek' unavailable." for a cached history summary during a pending retry.
- **Test challenge** (`test_challenges_debrief.md`):
  - Restored `HelpText.test.ts` as one test: 25 YAML help rows, 0 `/api/datatypes`. It is now the only guard on the eager HelpTerm mount path. Mutation-checked. *(Now on the datatypes branch.)*
  - Rewrote the `WorkflowRerun` and `DatatypesProvider` tests to use msw failures instead of store mocks.
  - No E2E recommended.
- **Screenshot step** found a misleading spinner: a failed `setCurrentHistory` in `WorkflowRerun` left the new spinner up forever, where base stayed blank. Fixed: the error is caught, the existing "Unable to switch" toast shows, and the form renders. Test added. While there I fixed a `WorkflowRerun.test.ts` assertion that could never fail (it looked for `workflowrun-stub`, but the stub renders as `anonymous-stub`).
- Also changed `WorkflowRerun.test.ts` to check the alert with `findComponent(GAlert)`. The old tag-name check was never verified to match the rendered stub.
- **Not independently reviewed:** the three post-process fixes (rateLimiter last 429, HistoryDatasetDetails summary spinner, WorkflowRerun try/catch) landed after the review, Codex and the test challenge had run. They are self-verified with red→green tests only.
- **Reverses a John decision:** the 2026-10-08 "keep test-challenge drops" call is overridden for `HelpText.test.ts` only (now on the datatypes branch), because the E2E that justified dropping it is gone. The keyedCache and helpTermsStore spy drops still stand.
- All fixes were folded into their logical commits. Local backup ref: `backup/issue_23977_pre_codex_fold`.

## Process results

- Review after the drop (`subagents/review_after_e2e_drop.md`): no code findings.
- Scope (`scope_evaluation.md`): **keep as implemented**, as one PR to `release_26.1` that says "refs #23977". Backend counts N+1 → dev (`followup_workflow_counts_proposal.md`). Splitting the branch is a fallback only.
- Screenshots (`screenshot_debrief.md`): **not relevant**. The happy-path UI matches base; the visible changes need 429/5xx responses.

## Testing

- After the split, at `423bd6a3ec2` on its own, Node 22.20.0: vitest across touched areas, 218 files / 1606 tests pass. `vue-tsc --noEmit` is clean, and pre-commit over `origin/release_26.1..HEAD` passes. Before the split: 223 files / 1617 tests.
- No E2E. Not re-measured against a rate-limited server.

## For the PR description (when asked)

- The Upload "Unable to load upload options" change is on the datatypes branch now; see its debrief.
- #23977's regression-check box: only vitest guards it now.
- On dev, #23510's slowapi limiter sends `Retry-After`, so the branch's `Retry-After` handling has a real source there.
- Forward-merge to dev: expect `set`/`del` conflicts in `keyedCache.ts`, `retryGate.ts` and `workflowStore.ts`.

## Still open (pre-existing, dev follow-ups)

- `collectionElementsStore` key mismatch (HDCA id vs `collection_id`).
- `WorkflowInvocationState` never starts polling after a late retry success.
- Hand-rolled dedupes could adopt `sharedPromise`.
- Lazy HelpTerm mount.
