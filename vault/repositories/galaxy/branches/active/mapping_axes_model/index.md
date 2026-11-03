---
upstream_base_branch: dev
child_branches: mapping_axes_clarity_correctness
related_records:
  - galaxy/branches/subworkflow_mapping
---
# mapping_axes_model

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:mapping_axes_model?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/mapping_axes_model)

## Status

Foundation slice of #23676: the bottom 7 commits (`b5c5721dae3`..`3c824c6e146`) model collection mapping as ordered axes, serialize/hydrate axis references and type the matching layer. Fork tip `3c824c6e146` is an ancestor of `subworkflow_mapping`; local is 1 ahead (`b77c29aae59` make format, also on `mapping_axes_clarity_correctness`). Not on `dev` or any release branch.

No PR.

No CI run on this tip.

## Decisions

- Meant to land below #23676 as its own PR; marked "not yet intelligible, needs a clarity pass" in the deleted `workflow_core/WORK_GRAPH.md` (2026-10-01).
- Not the same as merged #23681 (`map_over_extraction`, "Refactor workflow evaluation ahead of 23676"), which extracted `galaxy.workflow.map_over` and is on `dev`.
- Standing branch: [subworkflow_mapping](../../../../../agents/gx_standing/standing_branches/subworkflow_mapping/index.md).
