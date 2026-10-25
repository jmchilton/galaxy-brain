# reset_metadata_sample_isolation_26.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:reset_metadata_sample_isolation_26.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/reset_metadata_sample_isolation_26.1)

## Status

Status: `branches_implemented_needs_ci`; READY after hardening on 2026-10-25, retaining the implemented scope.

No PR yet.

Fork CI pending on pushed head `96b94dd2697`.

Base: `release_26.1` (`d9647406cf6`), head `96b94dd2697`. Fork: `jmchilton/reset_metadata_sample_isolation_26.1`. Worktree: `~/projects/worktrees/galaxy/branch/reset_metadata_sample_isolation_26.1` (`.venv` symlinked from `issue_24093_batch_element_labels_26.1`).

## What

Tool shed `reset_metadata` staged de-suffixed sample copies inside the clone it scans and preferred the tip's working-copy samples. Result: tools shipped only as `*.xml.sample` became tools, copies leaked across `hg update`, old revisions validated against the tip's samples. Samples now always come from the revision being reset and are staged in `ValidationContext`'s temp tool data dir.

## Commits

1. `c6ee20cecd5` Key tool shed metadata path stripping and cleanup on `files_dir` (cherry-pick of `4a7ff284e3b`, clean).
2. `6408b44bbfe` Isolate sample files when resetting tool shed metadata (cherry-pick of `b6f362b2bbc`, clean; plus the `revision_path`/`metadata_rows` test helpers from the dry run branch's baseline commit `304d663321f`, which aren't on 26.1).
3. `96b94dd2697` Move both regressions to the existing Tool Shed repository API suite; remove branch-only unit fixtures and helpers.

## Testing

- Repository API suite: 40 passed; `test/unit/tool_shed/`: 99 passed, 12 skipped (two regressions moved to API).
- Both final API regressions fail at metadata assertions with the release-base generator and pass with the fix.
- `make format`, diff checks, and commit hooks pass; mypy on both changed files reports only the generator's two verified base errors.
- Test challenge, code-quality review, baseline-refactoring review, and scope evaluation complete; no scope change or production edits needed during hardening.
- Vault validation has an unrelated existing error: untracked `vault/FILL_IN_AT_RUNTIME.md` lacks frontmatter.

## Decisions

- Reset output changes for some repositories: sample-only tools drop out, old revisions read their own samples, a root non-`.sample` `.loc` no longer satisfies a data table. Reset now agrees with upload.
- `issue_24441_tool_shed_upload_dry_run` carries the same two commits on `dev`; once this merges forward, rebase it and drop them.
