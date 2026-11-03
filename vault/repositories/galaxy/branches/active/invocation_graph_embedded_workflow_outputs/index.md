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

Polished at `3b546b24e6f` (six commits on stage 1 `90cdc7089d9`), ready for final review ([PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md), [checklist](pr_checklist.md), [polish debrief](polish_debrief.md), [screenshots](screenshots/)).

No PR.

Fork CI on `3b546b24e6f` is running; linting and first startup are green, nothing has failed.

## Decisions

- Stage 2 of the [invocation_graph_embedded_outputs](../../../../../agents/gx_standing/standing_branches/invocation_graph_embedded_outputs/index.md) standing branch, stacked on stage 1 (`invocation_graph_output_previews`); the spike (stage 3) stacks on this branch (John, 2026-11-03).
- Nudge only, never a full re-layout. If nudging can't keep the layout recognizable, drop stage 2 (John, 2026-10-20).
- Proposed for John (evidence in the [initial debrief](initial_implementation_debrief.md)): push right only (down mode dropped), static cards pinned beside their step, constant card sizes (260×170, collections 260×120 as summaries), a one-pass constraint layout.
- Targets `dev`: new client feature.
- Polish (2026-11-03): history squashed into six logical commits (baseline test refactor first); embedded table cards hide their unusable pagination.
- Worktree: `~/projects/worktrees/galaxy/branch/invocation_graph_embedded_workflow_outputs`.
