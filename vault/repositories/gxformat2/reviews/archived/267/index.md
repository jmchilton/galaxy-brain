# gxformat2 #267 — Make check-release pass on main

- [PR](https://github.com/galaxyproject/gxformat2/pull/267) (ours; opened 2026-10-15 at John's request)
- Branch `release_lint_fixes` on `jmchilton`, head `28f8845`; worktree `~/projects/worktrees/gxformat2/branch/release_lint_fixes`.

## Why

Pre-0.28.0 release dry run on main `eb1d3ff`: `make check-release` failed in `make lint`.
- `uv.lock` pinned ruff 0.15.15; CI installs latest (0.17.1), which allows imports after `sys.path` edits. The stale pin flagged E402 in `docs/conf.py` and `scripts/bootstrap_history.py`. Fixed by bumping the lock, not noqa.
- isort: `scripts/generate_pydantic.py`. CI (tox lint) doesn't run isort; `make lint` does.
- `make lint-docs` left committed API docs dirty (missing `gxformat2.layout`; locked Sphinx reorders `:undoc-members:`). Regenerated.
- `HISTORY.rst` lacked the `@dependabot[bot]` target (invalid RST since 0.27.0).
- `.DS_Store` untracked files break the clean-tree check on macOS; now ignored.

Verified: `make check-release` OK, tree still clean after; 897 passed / 8 skipped.

## Remaining before 0.28.0

- Decide `negate` on text validators (shipped in #265; Galaxy ignores stored `negate`) — see [#266 notes](../../../issues/queued/266/index.md).
- After `make add-history`: drop hand-written draft entries duplicating the #219 line; optionally trim dependabot lines.
- Run `make release` from a clone synced to galaxyproject `main` (main is unprotected; push goes straight there).
- Optional follow-up: add isort to tox lint so CI and `make lint` stop drifting.

## After release

- Bump gxformat2 pin in Galaxy (`invocation_parameter_expected_failure` patches around missing #265).
- galaxy-tool-util-ts: `make sync-schema-sources` for `validators`.

## Archived — 2026-10-16

Merged 2026-10-16 as `dce2692`. `make check-release` re-run on merged main: OK; 897 passed / 8 skipped. Worktree removed (clean, pushed).
