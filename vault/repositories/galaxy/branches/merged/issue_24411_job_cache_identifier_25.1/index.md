# issue_24411_job_cache_identifier_25.1

- [PR #24436](https://github.com/galaxyproject/galaxy/pull/24436)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24411_job_cache_identifier_25.1)

## Status

Status: `ready` — [#24436](https://github.com/galaxyproject/galaxy/pull/24436) opened as draft on John's request (title option 1), found undrafted 2026-10-24. See [polish debrief](polish_debrief.md), [PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md).

PR #24436 against `release_25.1` at `fac15b1bfa9`; PR CI green except Selenium `test_library_contents::test_import_dataset_from_history` timeout, unrelated; rerun.

Fork CI on `fac15b1bfa9`: reds diagnosed unrelated (converter, selenium UI, singularity/mulled); API/unit/framework green.

Base: `release_25.1` (`6060e10fe7a`), head `fac15b1bfa9` (model_attributes tests isolated to new users); alt `issue_24411_job_cache_identifier_25.1_alt_original_scope`. Fork: `jmchilton/issue_24411_job_cache_identifier_25.1`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24411_job_cache_identifier_25.1`.

## Issue

Fixes [#24411](https://github.com/galaxyproject/galaxy/issues/24411) (`vault/repositories/galaxy/issues/wip/24411/`). Related: [#24410](https://github.com/galaxyproject/galaxy/issues/24410) / branch `udt_element_identifier_api_test`.

## Decisions

- Base `release_25.1`: oldest release in the 1-year window (25.0 is 2025-06); same `JobSearch` code there; small fix.
- Scope widened past the issue: the issue's "reverse direction is already guarded" is wrong. A mapped run reused a plain job, or a job mapped over another list with the same dataset, through the job wrapper's second, name-agnostic search (`consumes_names` not set by `element_identifier`). Fixed here too.
- The NOT EXISTS guard sits under `require_name_match`, so the name-agnostic second search still reuses across plain and mapped runs for tools that read neither name nor identifier.
- Re-scope: name match applies to mapped requests too (stale `$input.name` after element rename); `tool_evaluator` on fallback wrappers.
- Doesn't cover UDTs: `UserToolEvaluator` `consumes_names` one-liner rides with #24410 on dev.
