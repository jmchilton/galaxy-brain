# lint_input_defaults

Status: pushed to `jmchilton` fork, commit `e6008f8`; PR [#275](https://github.com/galaxyproject/gxformat2/pull/275) opened 2026-10-22. Base: `origin/main` `9f8fb36` (rebased after #271 merged; reuses `_as_list`, table-driven `_DEFAULT_CHECKS`).
Worktree: `~/projects/worktrees/gxformat2/branch/lint_input_defaults`.
Issue: [gxformat2#272](https://github.com/galaxyproject/gxformat2/issues/272).

[PR description](pr_description.md) · TS twin: [galaxy-tool-util-ts lint_input_defaults](../../../../galaxy-tool-util-ts/branches/active/lint_input_defaults/index.md)

Issue check: galaxy#24140 (`3274a9c98da`) does reject non-string multiple-text defaults. The issue overstated the scalar case, which `_validate_input_types` already errored on. The gaps were `[string]` (skipped) and native `.ga` (unchecked). The lint route was chosen over schema typing because list inputs use the catch-all `WorkflowInputParameter` with an `Any` default.

Verified: full pytest (910 passed after rebase), isort/ruff/flake8/black(--fast)/mypy/pyrefly clean. Red-to-green: the new expectations fail on main (format2 fixture: main reports 0 errors). `lint_ga` sweep: IWC 132 files, planemo 21, 0 skipped, 0 hits.

Merge gxformat2 first, then re-sync TS fixtures from `main`.

#271 merged; rebased, import conflict resolved.

Follow-up (not done): a `10.0` int default errors in Python (float) but passes TS (`Number.isInteger`). The format2 path already diverged this way; native inherits it.
