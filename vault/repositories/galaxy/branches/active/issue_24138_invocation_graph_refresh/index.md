# issue_24138_invocation_graph_refresh

Status: implemented, needs CI. Base: `release_26.2` (regression since 25.1; touched files identical on `dev`).

Fixes [#24138](https://github.com/galaxyproject/galaxy/issues/24138) (Steps tab headers freeze while an invocation runs) and the refresh-cost part of [#22745](https://github.com/galaxyproject/galaxy/issues/22745) (O(n²) graph refresh). Doesn't claim to fix #22745's zoom/pan freeze, which hasn't been browser-profiled. The PR shouldn't auto-close #22745.

Issue research: [24138](../../../issues/queued/24138/index.md) · [22745](../../../issues/queued/22745/index.md)

Worktree: `~/projects/worktrees/galaxy/branch/issue_24138_invocation_graph_refresh` · Branch: `jmchilton/issue_24138_invocation_graph_refresh`

[Implementation debrief](implementation_debrief.md) · [Initial debrief](initial_implementation_debrief.md) · [Review](subagents/normal_review.md) · [Test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Codex](codex_review.md) · [Thermo-nuclear](thermo_nuclear_review.md) · [Scope](scope_evaluation.md) · [Screenshots](screenshot_debrief.md)

Head `27d72f8b62d` (7 commits). PR text should say `Fixes #24138` and reference #22745 as "part of" only.

## Notes

- ahmedhamidawan is the #22745 assignee and the author of #20719 and #18663; no @-mention has been added anywhere.
