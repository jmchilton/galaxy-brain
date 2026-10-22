# lint_input_defaults

Status: pushed to `origin` (jmchilton), commit `60d46677`; no PR yet. Base: `origin/main` `022bc661`.
Worktree: `~/projects/worktrees/galaxy-tool-util-ts/branch/lint_input_defaults`.

[PR description](pr_description.md) · Python twin: [gxformat2 lint_input_defaults](../../../../gxformat2/branches/active/lint_input_defaults/index.md)

TS port with identical messages and a patch changeset for `@galaxy-tool-util/schema`. Verified: `make check` and `make test` pass.

Fixtures were synced from the unmerged gxformat2 branch, this change's files only. Re-sync from gxformat2 `main` after merge.

Conflicts with `lint_untyped_params` (#195) in `lint.ts` imports. Merge #195 first and rebase this branch.
