# lint_input_defaults

Status: merged as [#275](https://github.com/galaxyproject/gxformat2/pull/275) 2026-10-23. Commits `e6008f8`, `3740cf9` (Codex review fix: `[int]`/`[float]` element checks). Base: `origin/main` `9f8fb36` (rebased after #271 merged; reuses `_as_list`, table-driven `_DEFAULT_CHECKS`).
Issue: [gxformat2#272](https://github.com/galaxyproject/gxformat2/issues/272).

[PR description](pr_description.md) · TS twin: [galaxy-tool-util-ts lint_input_defaults](../../../../galaxy-tool-util-ts/branches/merged/lint_input_defaults/index.md)

Issue check: galaxy#24140 (`3274a9c98da`) does reject non-string multiple-text defaults. The issue overstated the scalar case, which `_validate_input_types` already errored on. The gaps were `[string]` (skipped) and native `.ga` (unchecked). The lint route was chosen over schema typing because list inputs use the catch-all `WorkflowInputParameter` with an `Any` default.

Verified: full pytest (910 passed after the Codex fix), isort/ruff/flake8/black(--fast)/mypy/pyrefly clean. Red-to-green: the new expectations fail on main (format2 fixture: main reports 0 errors). `lint_ga` sweep: IWC 132 files, planemo 21, 0 skipped, 0 hits.

Merge gxformat2 first, then re-sync TS fixtures from `main`.

#271 merged; rebased, import conflict resolved.

Follow-up (not done): a `10.0` int default errors in Python (float) but passes TS (`Number.isInteger`). The format2 path already diverged this way; native inherits it.
