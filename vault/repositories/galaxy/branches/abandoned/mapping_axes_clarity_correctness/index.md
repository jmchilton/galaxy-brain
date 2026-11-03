---
upstream_base_branch: dev
related_records:
  - galaxy/branches/mapping_axes_model
  - galaxy/branches/subworkflow_mapping
---
# mapping_axes_clarity_correctness

- [View on GitHub](https://github.com/jmchilton/galaxy/tree/mapping_axes_clarity_correctness)

## Status

Status: `abandoned`. Tip `a6bb814032f`, now also `mapping_axes_model`'s tip. Never a PR.

## Abandoned — 2026-11-02

Transient name from a typo. On 2026-09-24, with `mapping_axes_model` checked out, John asked Codex "Can you branch for clarity and correctness?", meaning *review* the branch for clarity and correctness. Codex created this branch, and the review and its fixes landed here:

- `b77c29aae59`: make format.
- `174e74528bd`: validate inherited mapping axis prefix shapes. This was the review finding: a lower-rank axis could silently drop slices.
- `a6bb814032f`: index inherited conditions by outer element. It fixes the red CI run on `mapping_axes_model` (`3c824c6e146`), where `test_run_workflow_conditional_subworkflow_step_map_over_expression_tool_with_extra_nesting` failed with "Condition values do not match mapping coordinates".

On 2026-11-02, `mapping_axes_model` was fast-forwarded to this tip and pushed. `174e74528bd` was cherry-picked to `subworkflow_mapping`. `a6bb814032f` is not needed there, because #23676's planner already handles inherited conditions. The fork ref is kept, and there is no worktree.
