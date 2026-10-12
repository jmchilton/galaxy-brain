# vitest_readability

Status: `author_work`. Base: `dev`. Draft [PR #24038 — Rewrite Client Tests toward Readability](https://github.com/galaxyproject/galaxy/pull/24038).

Rewrites client and Tool Shed frontend tests for readability, shared fixtures and stronger assertions.

Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/vitest_readability`. Current pushed head: `d49bea20fac0cd23e51abcac5f9d8ea9feebe3f1`.

[Client testing guidance](https://github.com/jmchilton/galaxy/blob/vitest_readability/client/README.md)

## Added to queue — 2026-10-12

John explicitly requested adding this previously untracked draft during GOOD_MORNING. All 56 current upstream checks settled with no failures, but GitHub reports conflicts with dev. The checkout is clean, its HEAD matches the live PR and its upstream. Read-only merge-tree against dev `6831f768a637d148d941a3477db0a14e21573c1d` finds four conflicting test hunks in `client/src/utils/upload.test.ts`: upstream now preserves upload element/file order, while the rewritten tests still assert reversed URL/mixed/pasted order and omit the new file-name pairing checks. These require reconciling behavior assertions with the upstream fix, beyond a purely mechanical conflict resolution; left branch and draft status unchanged. No rebase or approval inferred.
