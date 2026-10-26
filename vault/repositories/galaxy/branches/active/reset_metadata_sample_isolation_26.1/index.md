---
upstream_base_branch: release_26.1
---

# reset_metadata_sample_isolation_26.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:reset_metadata_sample_isolation_26.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/reset_metadata_sample_isolation_26.1)

## Status

Status: `branches_ready_for_final_review`; polished 2026-10-25, awaiting John's read-through and title choice.

No PR yet.

Fork CI queued/pending on pushed head `c6e92c5ce8d`; no failures in the 2026-10-25 live check.

Base: `release_26.1` (`cf168b20f6a`), head `c6e92c5ce8d`. Fork: `jmchilton/reset_metadata_sample_isolation_26.1`. Worktree: `~/projects/worktrees/galaxy/branch/reset_metadata_sample_isolation_26.1` (`.venv` symlinked from `issue_24093_batch_element_labels_26.1`).

## What

Tool shed `reset_metadata` staged de-suffixed sample copies inside the clone it scans and preferred the tip's working-copy samples. Result: tools shipped only as `*.xml.sample` became tools, copies leaked across `hg update`, old revisions validated against the tip's samples. Samples now always come from the revision being reset and are staged in `ValidationContext`'s temp tool data dir.

## Commits

1. `787e812c77e` Key tool shed metadata path stripping and cleanup on `files_dir` (originally `c6ee20cecd5`).
2. `03489800465` Isolate sample files when resetting tool shed metadata (originally `6408b44bbfe`).
3. `c6e92c5ce8d` Exercise reset sample isolation through the Tool Shed API (originally `96b94dd2697`); remove branch-only unit fixtures and helpers.

Clean rebase on 2026-10-25; `git range-diff` reports all three patches unchanged.

## Testing

- Both focused API regressions passed again after the clean rebase to `cf168b20f6a`.
- Repository API suite: 40 passed; `test/unit/tool_shed/`: 99 passed, 12 skipped (two regressions moved to API).
- Both final API regressions fail at metadata assertions with the release-base generator and pass with the fix.
- `make format`, diff checks, and commit hooks pass; mypy on both changed files reports only the generator's two verified base errors.
- Test challenge, code-quality review, baseline-refactoring review, and scope evaluation complete; no scope change or production edits needed during hardening.
- Fresh vault validation passed on 2026-10-25: 126 files, zero errors, 15 advisory warnings.

## Final review

- [PR description](pr_description.md)
- [Title options](pr_titles.md)
- [Recommended labels](pr_tags.md)
- [Polish debrief](polish_debrief.md)
- [Checklist review](subagents/polish_checklist.md)
- [Strengthening review](subagents/polish_strengthening.md)

## Decisions

- Reset output changes for some repositories: sample-only tools drop out, old revisions read their own samples, a root non-`.sample` `.loc` no longer satisfies a data table. Reset now agrees with upload.
- `issue_24441_tool_shed_upload_dry_run` carries the same two commits on `dev`; once this merges forward, rebase it and drop them.
