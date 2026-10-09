# Implementation debrief: issue_23977_datatypes_fanout_26.1

**STATUS: READY.** Branch `issue_23977_datatypes_fanout_26.1` on `jmchilton`, tip `b2ec6aac24c`, based on `origin/release_26.1` `5308aa51b16`. 2 commits, client only. Refs galaxyproject/galaxy#23977. No PR.

On 2026-10-08 John split this branch out of `issue_23977_client_api_fanout_26.1`, which keeps the retry/backoff half. The commits are unchanged, so reviews, the Codex review, the test challenge, the scope evaluation and the screenshot step all apply as written. See `../issue_23977_client_api_fanout_26.1/` (`implementation_debrief.md`, `codex_review.md`, `test_challenges_debrief.md`, `scope_evaluation.md`, `screenshot_debrief.md`).

## Commits

1. **Add sharedPromise helpers; share in-flight upload datatypes/genomes requests.** Adds `utils/sharedPromise.ts` (`memoizeUntilRejected`, `dedupeInFlight`) with tests. `Upload/utils.js` shares one `/api/datatypes` request across concurrent callers and no longer caches `[]` after an HTTP error.
2. **Load datatypes for help terms only for datatype terms.** Invocation-state help terms (one per grid row) send 0 datatypes requests, where there was one per row before. Datatype terms share one load, retried after a failure. `datatypeStore.fetchUploadDatatypes` rethrows, and `DatatypesProvider` catches. Includes the restored `HelpText.test.ts` (25 YAML rows → 0 requests).

## Split mechanics

- The sibling branch adds the same `sharedPromise.ts` and `sharedPromise.test.ts`, byte-identical, so the branches merge in either order without conflict. Verified: `git merge-tree` of both tips equals the pre-split tree. The pre-split tip is on local ref `backup/issue_23977_pre_split`.
- Whichever PR merges second will show the shared file in its diff until it is rebased.

## Testing

- At `b2ec6aac24c` on its own, Node 22.20.0: vitest across touched areas, 217 files / 1555 tests pass. `vue-tsc --noEmit` is clean, and pre-commit over `origin/release_26.1..HEAD` passes.
- No E2E. Not re-measured against a rate-limited server.

## For the PR description (when asked)

- User-visible: after a failed `/api/datatypes`, Upload shows "Unable to load upload options". Before, it silently cached an empty list.
- `HelpText.test.ts` was restored, which reverses John's earlier "keep test-challenge drops" for that one file. It is the only guard on the eager HelpTerm mount path.
