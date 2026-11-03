---
upstream_base_branch: dev
parent_branch: subworkflow_mapping_per_step_semantics
related_records:
  - galaxy/branches/subworkflow_mapping
---
# subworkflow_mapping_when_alignment

- [View on GitHub](https://github.com/jmchilton/galaxy/tree/subworkflow_mapping_when_alignment)

## Status

Status: `abandoned`. Tip `bd24feae8f1`, stacked on `subworkflow_mapping_per_step_semantics`. Never opened as a PR.

Second half of the #23369 split: the `MatchingCollections.is_aligned_with` guard (fail when positional `when_values` cross unrelated collections), API + unit tests, the Subworkflows section of `collection_semantics`. See [SUBCOLLECTION_WHEN_REVIEW_STATE](../../../../../projects/workflow_semantics/SUBCOLLECTION_WHEN_REVIEW_STATE.md).

[Tracking history](tracking_history.md)

## Abandoned — 2026-11-02

John abandoned it: superseded by #23676. The #23426 RFC chose callable-boundary semantics; #23676 replaces the positional `when_values` list with conditions bound to mapping-axis coordinates, so the alignment guard has nothing to guard. Its 2 API scenarios (`test_conditional_subworkflow_rejects_independent_child_mapping`, `test_invocation_conditional_map_over_inner_collection`) are ported to `subworkflow_mapping` with callable-semantics assertions; the `test_alignment_*` unit tests only exercised `is_aligned_with` and are dropped. No worktree.
