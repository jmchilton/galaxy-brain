---
upstream_base_branch: main
---

# validate-tool-source: check `inputs.*` member paths in UDT expressions (#212)

- [Open PR](https://github.com/jmchilton/galaxy-tool-util-ts/compare/main...issue_212_udt_expression_paths)
- [View on GitHub](https://github.com/jmchilton/galaxy-tool-util-ts/tree/issue_212_udt_expression_paths)

## Status

Implemented and reviewed; pushed to `origin` at `3d91bb6b` on `origin/main` `f5470fe5`; hardening in progress.

No PR yet.

Local gate: lint, format, typecheck, tests green except 3 integration-tests that fail identically on `origin/main`; Makefile checksum targets fail under Node 26 (pre-existing), checksums verified with `sha256sum`. CI runs on PRs only.

## Links

[implementation debrief](implementation_debrief.md) · [normal review](subagents/normal_review.md)

## Notes

- Issue: [galaxy-tool-util-ts#212](https://github.com/jmchilton/galaxy-tool-util-ts/issues/212), record [issues/wip/212](../../../issues/wip/212/index.md).
- Worktree: `~/projects/worktrees/galaxy-tool-util-ts/branch/issue_212_udt_expression_paths`.
- Runtime field lists synced from Galaxy `origin/dev` `e922a682` (2026-11-03) via `make sync-job-runtime-schema`.
