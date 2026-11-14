---
upstream_base_branch: release_26.0
child_branches: wes_run_state_executor_error_26_0
related_records: galaxy/branches/wes_run_state_executor_error_26_0
---
# WES API bug fixes (26.0)

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.0...jmchilton:galaxy:wes_api_fixes_26_0?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/wes_api_fixes_26_0)

## Status

Implemented at `85f9b2b42be` on `release_26.0` (`9ae7ab9c1df`) during stage 3 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md). [Debrief](implementation_debrief.md). Worktree: `~/projects/worktrees/galaxy/branch/wes_api_fixes_26_0`.

No PR.

Fork CI for `85f9b2b42be` was queued or running at hand-off.

## Scope

Five commits, one per fix, each with an API test: JSON boolean `use_cached_job` (was 500), 403 instead of 500 for anonymous run-scoped requests, cancel leaves terminal runs alone, rejected submissions leave no imported workflow or history, omitted optional parameters reported as `null` instead of `{"__class__": "NoReplacement"}`. Bugs found by the demo's probes (`~/projects/repositories/galaxy-wes-tes/docs/troubleshooting.md`, "Galaxy WES bugs").

## Demo branch

`wes_api_fixes_v26.1.2` (`2aad3a3e80c`, pushed to jmchilton) is the same five commits cherry-picked onto tag `v26.1.2` for the demo's Galaxy. Demo only; not for a PR.
