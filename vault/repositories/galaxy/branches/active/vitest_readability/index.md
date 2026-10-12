# vitest_readability

Status: `ci_wait`. Base: `dev`. Draft [PR #24038 — Rewrite Client Tests toward Readability](https://github.com/galaxyproject/galaxy/pull/24038).

Rewrites client and Tool Shed frontend tests for readability, shared fixtures and stronger assertions.

Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/vitest_readability`. Current pushed head: `e1570742723b0ea164652d6d40f417a53bf4de27`.

[Rebase conflict-resolution review](subagents/rebase_2026-10-12.md)

[Client testing guidance](https://github.com/jmchilton/galaxy/blob/vitest_readability/client/README.md)

## Added to queue — 2026-10-12

John explicitly requested adding this previously untracked draft during GOOD_MORNING. All 56 current upstream checks settled with no failures, but GitHub reports conflicts with dev. The checkout is clean, its HEAD matches the live PR and its upstream. Read-only merge-tree against dev `6831f768a637d148d941a3477db0a14e21573c1d` finds four conflicting test hunks in `client/src/utils/upload.test.ts`: upstream now preserves upload element/file order, while the rewritten tests still assert reversed URL/mixed/pasted order and omit the new file-name pairing checks. These require reconciling behavior assertions with the upstream fix, beyond a purely mechanical conflict resolution; left branch and draft status unchanged. No rebase or approval inferred.


## Rebased and conflicts resolved — 2026-10-12

John explicitly requested rebasing PR #24038 and fixing conflicts. Rebased all 313 commits from original head `d49bea20fac0cd23e51abcac5f9d8ea9feebe3f1` onto live dev `9ac3cd2eb304f2860c0daf3afea0cc777f9e5cd6`; pushed `e1570742723b0ea164652d6d40f417a53bf4de27` to `jmchilton/vitest_readability` with the original head as the explicit force-with-lease guard. Local backup ref: `backup/vitest_readability-pr24038-20261012`.

- `client/src/utils/upload.test.ts`: retain upstream input order for collection payloads and local-file name assertions, using the PR's concise object assertions. Preserve upstream's file/session pairing and progress-ID regression test, adapting its request handler to the typed mock's `response.untyped` API.
- `client/src/components/Libraries/LibraryFolder/LibraryFolderDataset/LibraryDataset.test.js`: preserve upstream datatype-load error coverage, extend the existing provider fixture to forward errors, and pass the failed provider through the rewritten mount helper.
- Folded resolutions into the original per-test commits. Range-diff shows only these two patches changed; all 313 commit messages and trailers are identical to the original series. No downstream lanes rebased in this task.

Validation: both affected Vitest suites pass (101 tests), targeted ESLint and Prettier checks pass, client `pnpm type-check` passes, and `git diff --check` passes. The focused normal subagent review found no issues; its full result is linked above. Galaxy checkout is clean. Vault validation has zero errors and 15 pre-existing advisory warnings.

GitHub confirms the pushed head and `MERGEABLE`. Draft status retained; new-head CI has 39 checks queued, one running and two completed at the verification snapshot. Queue moved to `ci_wait`; CI has not yet settled.
