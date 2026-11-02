---
pr: 23676
upstream_base_branch: dev
record: galaxy/branches/subworkflow_mapping
---
# Subworkflow mapping: align backend with editor

- [PR #23676](https://github.com/galaxyproject/galaxy/pull/23676) · [branch record](../../../../repositories/galaxy/branches/active/subworkflow_mapping/index.md)

Map every step inside a mapped-over subworkflow over the subworkflow's input shape, as the editor already assumes, instead of only steps the mapped input reaches.

## Children

- [`subworkflow_mapping_when_alignment`](../../../../repositories/galaxy/branches/active/subworkflow_mapping_when_alignment/index.md) — `wip` · `related` — Aligns mapped `when` values with collection inputs; needs decision: superseded by #23676?
- `mapping_axes_clarity_correctness` — `wip` · `related` — Diverged from this branch (3 own commits); checked out in its worktree; no record.

## Decisions

- John: "I just don't understand this PR." Making it understandable comes before splitting it; [branch review](../../../../repositories/galaxy/branches/active/subworkflow_mapping/subworkflow_mapping_branch_review.md) is the starting point.
