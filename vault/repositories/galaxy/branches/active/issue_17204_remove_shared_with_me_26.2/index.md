# issue_17204_remove_shared_with_me_26.2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:issue_17204_remove_shared_with_me_26.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_17204_remove_shared_with_me_26.2)

## Status

Status: implementing (gx_workhorse, 2026-10-25).

No PR yet.

Base: `release_26.2` (`8c59e95feb2`). Worktree: `~/projects/worktrees/galaxy/branch/issue_17204_remove_shared_with_me_26.2` (`.venv` symlinked from `issue_24303_collection_type_prefix_26.2`).

## What

Recipients can remove an item shared with them (#17204). Lost when the legacy "Histories shared with you" grid went away.

## Decisions

- Base `release_26.2`: additive endpoint, no migration, issue labeled `release-testing-26.2`.
- Issue assigned to dannon; assignment left alone.
