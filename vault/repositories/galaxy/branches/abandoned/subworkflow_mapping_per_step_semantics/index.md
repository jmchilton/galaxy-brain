---
upstream_base_branch: dev
child_branches: subworkflow_mapping_when_alignment
pr: 23426
related_records:
  - galaxy/branches/subworkflow_mapping
---
# subworkflow_mapping_per_step_semantics

- [PR #23426](https://github.com/galaxyproject/galaxy/pull/23426)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/subworkflow_mapping_per_step_semantics)

## Status

Status: `abandoned`. Fork tip `ec88bda5b46` (local `679abb87c4e` is an ancestor). [#23426](https://github.com/galaxyproject/galaxy/pull/23426) "[RFC] Subworkflow design bug report" closed unmerged 2026-09-03.

First half of the #23369 split (all-`None` `when_values` collapse + `subworkflow_mapping_per_step` framework test), then repurposed as the RFC that chose callable-boundary subworkflow semantics. See [#23426 debrief](../../../../../agents/gx_branches/pr_debriefs/workflows/negative/23426_subworkflow_design_rfc.md).

## Abandoned — 2026-11-02

John abandoned it: the RFC's decision became #23676 (`subworkflow_mapping`), which carries a rewritten `subworkflow_mapping_per_step` framework test. No worktree.
