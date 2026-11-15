---
upstream_base_branch: release_26.0
parent_branch: wes_api_fixes_26_0
related_records: galaxy/branches/wes_api_fixes_26_0
---
# WES: runs with failed or paused jobs report EXECUTOR_ERROR

- [Open PR](https://github.com/jmchilton/galaxy/compare/wes_api_fixes_26_0...wes_run_state_executor_error_26_0?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/wes_run_state_executor_error_26_0)

## Status

Rebased and hardened READY at `ec656e83ae7`: two commits (a behavior-preserving helper, then the rule) on `wes_api_fixes_26_0` (`67305c6d0a1`), from stage 3 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md). [Debrief](implementation_debrief.md). Worktree: `~/projects/worktrees/galaxy/branch/wes_run_state_executor_error_26_0`.

No PR.

Fork CI for `ec656e83ae7` was queued at hand-off.

## Decision needed

This is a behavior change that reverses a documented choice in `doc/source/dev/ga4gh_wes.md` ("a failed job does not make the run unsuccessful"). The [scope evaluation](scope_evaluation.md) recommends taking it as implemented on `release_26.0`. On the demo evidence, D3's output rule catches no failed run this branch misses; it only keeps some filter-failed runs COMPLETE. The choices are: take it (26.0 or `dev`); D3 on `dev` (its "What would change" section lists the work); paused-only; or drop it. See the debrief.
