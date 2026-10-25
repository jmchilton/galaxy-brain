# issue_24438_select_comma_split_25.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_25.1...jmchilton:galaxy:issue_24438_select_comma_split_25.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24438_select_comma_split_25.1)

## Status

Implemented; hardening in progress.

Base: `release_25.1` (`74f52289d82`). Fork: `jmchilton/issue_24438_select_comma_split_25.1`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24438_select_comma_split_25.1`.

## Issue

Fixes [#24438](https://github.com/galaxyproject/galaxy/issues/24438). Root cause posted in the [issue comment](https://github.com/galaxyproject/galaxy/issues/24438#issuecomment-6392581298).

## Decisions

- Base `release_25.1`: bug on all supported releases; small test-framework fix; John picked it.
- Fix A: legacy-path test parsing (`verify/parse.py`) comma-splits only data and `multiple` inputs; others wrap as `[value]` (same shape as before). Covers conditional discriminators too.
- Not done: moving tool tests off the legacy API path (request state already correct).
