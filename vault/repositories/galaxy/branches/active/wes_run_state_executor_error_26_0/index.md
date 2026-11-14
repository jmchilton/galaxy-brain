---
upstream_base_branch: release_26.0
parent_branch: wes_api_fixes_26_0
related_records: galaxy/branches/wes_api_fixes_26_0
---
# WES: runs with failed or paused jobs report EXECUTOR_ERROR

- [Open PR](https://github.com/jmchilton/galaxy/compare/wes_api_fixes_26_0...wes_run_state_executor_error_26_0?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/wes_run_state_executor_error_26_0)

## Status

Implemented at `d83962aa811`, one commit stacked on `wes_api_fixes_26_0` (`85f9b2b42be`), during stage 3 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md). [Debrief](implementation_debrief.md). Worktree: `~/projects/worktrees/galaxy/branch/wes_run_state_executor_error_26_0`.

No PR.

Fork CI for `d83962aa811` was queued at hand-off.

## Decision needed

This is a behavior change that reverses a documented choice in `doc/source/dev/ga4gh_wes.md` ("a failed job does not make the run unsuccessful"). Take it (on 26.0 as a spec-conformance fix, or retargeted to `dev`), narrow it (count only paused jobs, or only failed workflow outputs), or drop it. See the debrief.
