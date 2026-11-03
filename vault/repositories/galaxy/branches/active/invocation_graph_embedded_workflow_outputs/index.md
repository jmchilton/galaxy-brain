---
upstream_base_branch: dev
parent_branch: invocation_graph_output_previews
child_branches: invocation_graph_embedded_outputs
related_records: galaxy/branches/invocation_graph_embedded_outputs
---

# Invocation graph: embed workflow outputs as large nodes

- [Open PR](https://github.com/jmchilton/galaxy/compare/invocation_graph_output_previews...invocation_graph_embedded_workflow_outputs?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/invocation_graph_embedded_workflow_outputs)

## Status

Hardened at `4d64ca21529` (19 commits on stage 1 `90cdc7089d9`), STATUS READY ([implementation debrief](implementation_debrief.md), [screenshots](screenshots/)).

No PR.

No CI run yet; local vitest, vue-tsc, eslint and the invocation graph Selenium tests pass.

## Decisions

- Stage 2 of the [invocation_graph_embedded_outputs](../../../../../agents/gx_standing/standing_branches/invocation_graph_embedded_outputs/index.md) standing branch, stacked on stage 1 (`invocation_graph_output_previews`); the spike (stage 3) stacks on this branch (John, 2026-11-03).
- Nudge only, never a full re-layout. If nudging can't keep the layout recognizable, drop stage 2 (John, 2026-10-20).
- Proposed for John (evidence in the [initial debrief](initial_implementation_debrief.md)): push right only (down mode dropped), static cards pinned beside their step, constant card sizes (260×170, collections 260×120 as summaries), a one-pass constraint layout.
- Targets `dev`: new client feature.
- Worktree: `~/projects/worktrees/galaxy/branch/invocation_graph_embedded_workflow_outputs`.
