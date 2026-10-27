# Sanitize invocation labels used as filenames

- [View PR #1724](https://github.com/galaxyproject/planemo/pull/1724)
- [View on GitHub](https://github.com/jmchilton/planemo/tree/sanitize-invocation-test-data-paths)

## Status

Branch `sanitize-invocation-test-data-paths` on `jmchilton` at `5fb99e16e32a`, base `master`; worktree `~/projects/worktrees/planemo/branch/sanitize-invocation-test-data-paths`.

PR #1724 open, awaiting review; conflicts resolved by rebase.

CI pending on `5fb99e16e32a`.

Review notes: [reviews/active/1724](../../../reviews/active/1724/index.md).

## Notes

- 2026-10-27: rebased onto `origin/master` (was 52 behind). One conflict in `planemo/galaxy/workflows.py` imports (kept both). mvdbeek's merge of fix-1724-label-collisions (#16) linearized away; its commit kept. Old head `d171869b94`. `make lint` clean; touched tests pass. Force-pushed `--force-with-lease`.
