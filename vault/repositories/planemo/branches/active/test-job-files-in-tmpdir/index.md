# Write inline test jobs outside source directories

- [View PR #1707](https://github.com/galaxyproject/planemo/pull/1707)
- [View on GitHub](https://github.com/jmchilton/planemo/tree/test-job-files-in-tmpdir)

## Status

Branch `test-job-files-in-tmpdir` on `jmchilton`, base `master`; `~/projects/worktrees/planemo/branch/test-job-files-in-tmpdir`.

PR #1707 open, awaiting review; rebased onto `origin/master` (5ff07fa8) 2026-10-27, mergeable status pending refresh.

CI pending on `d0c106ef48` (previously green on `f87c2c58e4`).

Review notes: [reviews/active/1707](../../../reviews/active/1707/index.md).

## Rebase notes

2026-10-27: rebased onto `origin/master`, force-pushed `f87c2c58e4` -> `d0c106ef48`. Conflicts in `planemo/engine/interface.py` and `tests/test_engines.py` against #1748 (`_collect_test_data`): kept both, `_run_test_cases` uses `materialized_job_paths` with `partial(_collect_test_data, ...)` collectors. Local `tests/test_engines.py`: 17 pass, 2 `secondary_files` tests fail on Python 3.14 (same on pre-rebase commit; see companion #15 skip).
