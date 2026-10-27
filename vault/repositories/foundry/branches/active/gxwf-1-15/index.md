---
upstream_base_branch: main
---
# Upgrade gxwf and Galaxy schemas to 1.15.0

- [Open PR](https://github.com/galaxyproject/foundry/pull/736)
- [View on GitHub](https://github.com/galaxyproject/foundry/tree/gxwf-1-15)

## Status

Branch `gxwf-1-15` on `origin`; `~/projects/worktrees/foundry/branch/gxwf-1-15`.

PR [#736](https://github.com/galaxyproject/foundry/pull/736) open, opened at John's request 2026-10-27.

Local `make check` green except `check-vendored` (local-only) and `validate-roadmap` (#672 sub-issue drift on GitHub).

## Unblocks

- #672 / draft PR #710: needed gtu-ts #198, shipped in 1.15.0. Rebase #710 on this, drop the §5 "validator defect" paragraph, undraft.
