---
pr: 23676
upstream_base_branch: dev
record: galaxy/branches/subworkflow_mapping
---
# Subworkflow mapping: align backend with editor

- [PR #23676](https://github.com/galaxyproject/galaxy/pull/23676) · [branch record](../../../../repositories/galaxy/branches/active/subworkflow_mapping/index.md)

Map every step inside a mapped-over subworkflow over the subworkflow's input shape, as the editor already assumes, instead of only steps the mapped input reaches.

## Children

- `map_over_extraction` — [#23681](https://github.com/galaxyproject/galaxy/pull/23681) · `merged` · `prerequisite` — Extracts `galaxy.workflow.map_over` (`plan_map_over`) ahead of #23676.
- [`mapping_axes_model`](../../../../repositories/galaxy/branches/active/mapping_axes_model/index.md) — `wip` · `stacked` — Bottom 7 commits of #23676: collection mapping as ordered, persistable axes.
- [`mapping_axes_clarity_correctness`](../../../../repositories/galaxy/branches/active/mapping_axes_clarity_correctness/index.md) — `wip` · `related` — On `mapping_axes_model`: prefix-shape validation, inherited `when` broadcast; not in #23676.
- [`workflow_test_timeouts`](../../../../repositories/galaxy/branches/active/workflow_test_timeouts/index.md) — `wip` · `extracted` — Slow workflow framework tests can set a timeout.
- [`subworkflow_mapping_per_step_semantics`](../../../../repositories/galaxy/branches/abandoned/subworkflow_mapping_per_step_semantics/index.md) — [#23426](https://github.com/galaxyproject/galaxy/pull/23426) · `abandoned` · `related` — #23369 split half 1, then the RFC that chose callable-boundary semantics.
- [`subworkflow_mapping_when_alignment`](../../../../repositories/galaxy/branches/abandoned/subworkflow_mapping_when_alignment/index.md) — `abandoned` · `related` — `is_aligned_with` guard on the inlining model; superseded, API scenarios ported here.
- mvdbeek's `subworkflow-mapping-26.2` — [#24168](https://github.com/galaxyproject/galaxy/pull/24168) · `closed` · `related` — Reworked #23676 at `6ece27c39d8d` onto `release_26.2` with extra fixes; closed 2026-10-15.

## Decisions

- John: "I just don't understand this PR." Making it understandable comes before splitting it; [branch review](../../../../repositories/galaxy/branches/active/subworkflow_mapping/subworkflow_mapping_branch_review.md) is the starting point.
- 2026-11-02: John abandoned `subworkflow_mapping_when_alignment` and `subworkflow_mapping_per_step_semantics` as superseded by this branch; port the 2 `when_alignment` API scenarios here with callable-semantics assertions.
- `mapping_axes_model` is not merged (only #23681 is); tracked as this branch's foundation slice.
