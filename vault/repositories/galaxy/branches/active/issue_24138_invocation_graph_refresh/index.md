# issue_24138_invocation_graph_refresh

Status: implementing. Base: `release_26.2` (regression since 25.1; touched files identical on `dev`).

Fixes [#24138](https://github.com/galaxyproject/galaxy/issues/24138) (Steps tab headers freeze while an invocation runs) and the refresh-cost part of [#22745](https://github.com/galaxyproject/galaxy/issues/22745) (O(n²) graph refresh). Doesn't claim to fix #22745's zoom/pan freeze, which hasn't been browser-profiled. The PR shouldn't auto-close #22745.

Issue research: [24138](../../../issues/queued/24138/index.md) · [22745](../../../issues/queued/22745/index.md)

Worktree: `~/projects/worktrees/galaxy/branch/issue_24138_invocation_graph_refresh` · Branch: `jmchilton/issue_24138_invocation_graph_refresh`

[Initial implementation debrief](initial_implementation_debrief.md)

## Notes

- ahmedhamidawan is the #22745 assignee and the author of #20719 and #18663; no @-mention has been added anywhere.
