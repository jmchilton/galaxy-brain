---
upstream_base_branch: dev
related_records: galaxy/branches/invocation_graph_embedded_outputs
---

# Invocation graph: hover a step to preview its outputs

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:invocation_graph_output_previews?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/invocation_graph_output_previews)

## Status

Hardened at `90cdc7089d9`, BLOCKED on a scope decision: the scope evaluation suggests also fixing mapped-over step state ([implementation debrief](implementation_debrief.md), [scope evaluation](scope_evaluation.md), [screenshots](screenshot_debrief.md)).

No PR.

No CI run checked.

## Decisions

- Stage 1 of the [invocation_graph_embedded_outputs](../../../../../agents/gx_standing/standing_branches/invocation_graph_embedded_outputs/index.md) standing branch, extracted from the spike (`3e4312f7c1d`, kept as `invocation_graph_embedded_outputs_spike`). Stage 2 stacks on this branch (John, 2026-11-03).
- Leaves out the embed toggle, embedded nodes, the nudge layout and `preferred_output`.
- Targets `dev`: new client feature.
- Worktree: `~/projects/worktrees/galaxy/branch/invocation_graph_output_previews`.
