---
upstream_base_branch: dev
related_records:
  - galaxy/branches/subworkflow_mapping
  - galaxy/branches/mapping_axes_clarity_correctness
---
# mapping_axes_model

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:mapping_axes_model?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/mapping_axes_model)

## Status

Head `a6bb814032f` (pushed): this is the foundation slice of #23676. The first 7 commits (`b5c5721dae3`..`3c824c6e146`) model collection mapping as ordered axes, serialize and hydrate axis references, and type the matching layer. On top of those are a make format commit and 2 review fixes. It is not on `dev` or any release branch. The local branch matches the fork, and there is no worktree.

No PR.

Fork CI: `174e74528bd` was green. `a6bb814032f` is mixed, with some failures that haven't been triaged. `3c824c6e146` alone was red: `test_run_workflow_conditional_subworkflow_step_map_over_expression_tool_with_extra_nesting`, fixed by `a6bb814032f`.

## Decisions

- This is the slice meant to become a PR. It was cut from `subworkflow_mapping` on 2026-09-24, which was then rebased onto it. It is marked "not yet intelligible, needs a clarity pass" (deleted `workflow_core/WORK_GRAPH.md`, 2026-10-01).
- It is not a pure no-behavior-change slice: without #23676's planner path it needs `a6bb814032f`, which indexes inherited conditions by outer element. #23676 doesn't need that commit, but it carries `174e74528bd`, cherry-picked as `77807fafe07`.
- 2026-11-02: the review fixes from the typo-named `mapping_axes_clarity_correctness` were folded in by fast-forward.
- It is not the same as merged #23681 (`map_over_extraction`), which extracted `galaxy.workflow.map_over` and is on `dev`.
- Standing branch: [subworkflow_mapping](../../../../../agents/gx_standing/standing_branches/subworkflow_mapping/index.md).
