---
upstream_base_branch: dev
parent_branch: mapping_axes_model
related_records:
  - galaxy/branches/subworkflow_mapping
---
# mapping_axes_clarity_correctness

- [Open PR](https://github.com/galaxyproject/galaxy/compare/mapping_axes_model...jmchilton:galaxy:mapping_axes_clarity_correctness?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/mapping_axes_clarity_correctness)

## Status

Head `a6bb814032f` (pushed): `mapping_axes_model` + `b77c29aae59` make format + `174e74528bd` validate inherited mapping axis prefix shapes + `a6bb814032f` broadcast inherited workflow conditions across nested mapping. Neither fix is on #23676's head. Checked out in the `subworkflow_mapping` worktree.

No PR.

No CI run on this tip.

## Decisions

- Open: fold these fixes into `mapping_axes_model`, or keep them as a layer above it?
- Standing branch: [subworkflow_mapping](../../../../../agents/gx_standing/standing_branches/subworkflow_mapping/index.md).
