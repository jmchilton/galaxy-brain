# lint_untyped_params

Status: pushed to `origin` (jmchilton), commit `46afdbe4`; PR not opened. Base: `origin/main` `022bc661`.
Worktree: `~/projects/worktrees/galaxy-tool-util-ts/branch/lint_untyped_params`.

[PR description](pr_description.md) · Python twin: [gxformat2 lint_untyped_params](../../../../gxformat2/branches/active/lint_untyped_params/index.md) · Origin: [foundry#677](../../../../foundry/issues/wip/677/index.md)

TS port of the gxformat2 change, with identical messages. Includes a patch changeset for `@galaxy-tool-util/schema`.

Verified: `make check` and `make test` green (after `pnpm build` in the fresh worktree). IWC `.ga` sweep: 0 untyped warnings.

Fixtures were synced from the unmerged gxformat2 branch, untyped-params files only. Re-run `make sync-workflow-fixtures sync-workflow-expectations` against gxformat2 `main` once that merges.
