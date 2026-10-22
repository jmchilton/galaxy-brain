# lint_untyped_params

Status: pushed to `jmchilton` fork, commit `61b4380`; PR not opened. Base: `origin/main` `3faf9ae`.
Worktree: `~/projects/worktrees/gxformat2/branch/lint_untyped_params`.

[PR description](pr_description.md) · TS twin: [galaxy-tool-util-ts lint_untyped_params](../../../../galaxy-tool-util-ts/branches/active/lint_untyped_params/index.md) · Origin: [foundry#677](../../../../foundry/issues/wip/677/index.md)

Untyped-parameter lint now follows Galaxy: it searches whole strings, skips renames that reference declared parameter-input labels, and gives one detailed warning per reference.

Verified: full pytest (908 passed), ruff/flake8/black/mypy/pyrefly clean. IWC `.ga` sweep: old 2 false positives, new 0.

Merge order: gxformat2 first. The TS branch syncs these fixtures, so re-sync from gxformat2 `main` after the merge.

Follow-ups (not done):
- `#{name}` that matches no step input is silently replaced with `""` by Galaxy. That would make a good lint.
- Best-practice step checks don't recurse into subworkflows (pre-existing). Galaxy scopes formal labels per subworkflow.
