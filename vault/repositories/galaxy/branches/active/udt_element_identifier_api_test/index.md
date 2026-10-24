# udt_element_identifier_api_test

- [PR #24434](https://github.com/galaxyproject/galaxy/pull/24434)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/udt_element_identifier_api_test)

## Status

`ready`: reworked onto `release_26.1`, polished, PR opened 2026-10-24 at John's request.

[#24434](https://github.com/galaxyproject/galaxy/pull/24434) open against `release_26.1`, not draft.

CI running on `10492c660b3`.

Base: `release_26.1` (`28dcf86a6c4`), head `10492c660b3`; alts `udt_element_identifier_api_test_alt_original_scope`, `udt_element_identifier_api_test_alt_dev` ([alts](alts/)). Fork: `jmchilton/udt_element_identifier_api_test`. Worktree: `~/projects/worktrees/galaxy/branch/udt_element_identifier_api_test`.

## Issue

[#24410](https://github.com/galaxyproject/galaxy/issues/24410), filed 2026-10-23; tracked in `vault/repositories/galaxy/issues/wip/24410/`. Job-cache crossing: [#24411](https://github.com/galaxyproject/galaxy/issues/24411) (`wip/24411/`), fixed separately on `issue_24411_job_cache_identifier_25.1`.

## Decisions

- Red tests came from Foundry issue #672 research ([notes](../../../../foundry/issues/wip/672/index.md)).
- Fix reads the identifier already persisted as `<name>|__identifier__` job param (same source as Cheetah's `ElementIdentifierMapper`); does not change job tool_state to `{"src": "dce"}`.
- 2026-10-24 John: rework onto `release_26.1` (same branch, force-pushed; dev version kept as `_alt_dev`); `shell_quotable` plumbing dropped (dev-only).
- 2026-10-24 John: no job-cache guard / `consumes_names` here; left to #24411.
- 2026-10-24 John: plain (non-mapped) dataset falls back to the HDA name (Cheetah/labels parity). In `to_cwl` the fallback applies only on the UDT path, not workflow `when` expressions.

## Polish

- [PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md), [polish debrief](polish_debrief.md).
