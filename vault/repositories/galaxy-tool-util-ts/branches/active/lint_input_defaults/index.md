# lint_input_defaults

Status: pushed to `origin` (jmchilton), commit `4dcc34a2`; PR [#196](https://github.com/jmchilton/galaxy-tool-util-ts/pull/196) opened 2026-10-22. Base: `origin/main` `a3abfa2b` (rebased after #195 merged; `DEFAULT_CHECKS` table mirrors gxformat2).
Worktree: `~/projects/worktrees/galaxy-tool-util-ts/branch/lint_input_defaults`.

[PR description](pr_description.md) · Python twin: [gxformat2 lint_input_defaults](../../../../gxformat2/branches/active/lint_input_defaults/index.md)

TS port with identical messages and a patch changeset for `@galaxy-tool-util/schema`. Verified: `make check` and `make test` pass.

Fixtures were synced from the unmerged gxformat2 branch, this change's files only. Re-sync from gxformat2 `main` after merge.

#195 merged; rebased, import conflict resolved. `make check` green; `make test` green except the known gxwf-web `--output-schema` 12s timeout, which passes alone.
