# issue_24411_job_cache_identifier_25.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_25.1...jmchilton:galaxy:issue_24411_job_cache_identifier_25.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24411_job_cache_identifier_25.1)

## Status

Implemented; hardening in progress.

No PR.

Base: `release_25.1` (`6060e10fe7a`). Fork: `jmchilton/issue_24411_job_cache_identifier_25.1`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24411_job_cache_identifier_25.1`.

## Issue

Fixes [#24411](https://github.com/galaxyproject/galaxy/issues/24411) (`vault/repositories/galaxy/issues/wip/24411/`). Related: [#24410](https://github.com/galaxyproject/galaxy/issues/24410) / branch `udt_element_identifier_api_test`.

## Decisions

- Base `release_25.1`: oldest release in the 1-year window (25.0 is 2025-06); same `JobSearch` code there; small fix.
- Scope widened past the issue: the issue's "reverse direction is already guarded" is wrong. A mapped run reused a plain job, or a job mapped over another list with the same dataset, through the job wrapper's second, name-agnostic search (`consumes_names` not set by `element_identifier`). Fixed here too.
- The NOT EXISTS guard sits under `require_name_match`, so the name-agnostic second search still reuses across plain and mapped runs for tools that read neither name nor identifier.
