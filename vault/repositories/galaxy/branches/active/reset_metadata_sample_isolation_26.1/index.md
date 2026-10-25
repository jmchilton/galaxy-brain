# reset_metadata_sample_isolation_26.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:reset_metadata_sample_isolation_26.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/reset_metadata_sample_isolation_26.1)

## Status

Status: `branches_implemented_needs_ci`. Fix extracted from `issue_24441_tool_shed_upload_dry_run` on John's request, 2026-10-25; not hardened or polished.

No PR yet.

Fork CI not yet checked on `6408b44bbfe`.

Base: `release_26.1` (`d9647406cf6`), head `6408b44bbfe`. Fork: `jmchilton/reset_metadata_sample_isolation_26.1`. Worktree: `~/projects/worktrees/galaxy/branch/reset_metadata_sample_isolation_26.1` (`.venv` symlinked from `issue_24093_batch_element_labels_26.1`).

## What

Tool shed `reset_metadata` staged de-suffixed sample copies inside the clone it scans and preferred the tip's working-copy samples. Result: tools shipped only as `*.xml.sample` became tools, copies leaked across `hg update`, old revisions validated against the tip's samples. Samples now always come from the revision being reset and are staged in `ValidationContext`'s temp tool data dir.

## Commits

1. `c6ee20cecd5` Key tool shed metadata path stripping and cleanup on `files_dir` (cherry-pick of `4a7ff284e3b`, clean).
2. `6408b44bbfe` Isolate sample files when resetting tool shed metadata (cherry-pick of `b6f362b2bbc`, clean; plus the `revision_path`/`metadata_rows` test helpers from the dry run branch's baseline commit `304d663321f`, which aren't on 26.1).

## Testing

- `test/unit/tool_shed/`: 101 passed, 12 skipped.
- Red check: with 26.1's `metadata_generator.py`, `test_reset_ignores_tools_shipped_only_as_samples` (`{'Add_a_column1', 'Filter1'} == {'Add_a_column1'}`) and `test_reset_reads_sample_files_from_each_revision` (revision row versions differ) fail at assertions.
- black, isort and pre-commit hooks clean; mypy on the generator matches base (2 pre-existing errors).
- Not run: tool shed functional tests (`test_0300_reset_all_metadata.py`); left to CI.

## Decisions

- Reset output changes for some repositories: sample-only tools drop out, old revisions read their own samples, a root non-`.sample` `.loc` no longer satisfies a data table. Reset now agrees with upload.
- `issue_24441_tool_shed_upload_dry_run` carries the same two commits on `dev`; once this merges forward, rebase it and drop them.
