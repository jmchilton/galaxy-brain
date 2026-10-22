# lint_input_defaults

Status: pushed to `jmchilton` fork, commit `a94af46`; no PR yet. Base: `origin/main` `007b7ae`.
Worktree: `~/projects/worktrees/gxformat2/branch/lint_input_defaults`.
Issue: [gxformat2#272](https://github.com/galaxyproject/gxformat2/issues/272).

[PR description](pr_description.md) · TS twin: [galaxy-tool-util-ts lint_input_defaults](../../../../galaxy-tool-util-ts/branches/active/lint_input_defaults/index.md)

Issue check: galaxy#24140 (`3274a9c98da`) does reject non-string multiple-text defaults. The issue overstated the scalar case, which `_validate_input_types` already errored on. The gaps were `[string]` (skipped) and native `.ga` (unchecked). The lint route was chosen over schema typing because list inputs use the catch-all `WorkflowInputParameter` with an `Any` default.

Verified: full pytest (908 passed), isort/ruff/flake8/black(--fast)/mypy/pyrefly clean, red-to-green on the new expectations. IWC `.ga` sweep: 0 hits.

Merge gxformat2 first, then re-sync TS fixtures from `main`.
