# issue_17204_remove_shared_with_me_26.2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:issue_17204_remove_shared_with_me_26.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_17204_remove_shared_with_me_26.2)

## Status

Status: `branches_need_decision` (BLOCKED, 2026-10-25): second scope eval suggests `pluralize` in 11 existing owner bulk strings; check-branch mypy annotations and screenshots remain.

No PR yet.

Fork CI not yet checked on `7f8a10ab0e5`.

Base: `release_26.2` (`8c59e95feb2`), head `7f8a10ab0e5`. Worktree: `~/projects/worktrees/galaxy/branch/issue_17204_remove_shared_with_me_26.2` (`.venv` symlinked from `issue_24303_collection_type_prefix_26.2`). Alt: `issue_17204_remove_shared_with_me_26.2_alt_original_scope` (`alts/original_scope.md`).

## What

Share recipients can remove items shared with them (#17204), one at a time or in bulk, for histories, workflows and visualizations (pages API-only). Removing a workflow share also drops the recipient's bookmark.

## Decisions

- Base `release_26.2`: restores lost functionality, additive, no migration, issue labeled `release-testing-26.2`; dev is the fallback.
- Issue assigned to dannon; assignment left alone.
