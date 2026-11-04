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

Code changed after polish, for deck polish: `95fa1ee00df` adds compact table snapshots, images sized to the card and a halo round each card (snapshot since polishing: "commits: 6 same, 0 rebased, 0 changed, 3 new, 0 dropped; hunks: 29 carried, 3 changed, 0 new, 0 dropped"), still ready for final review ([PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md), [checklist](pr_checklist.md), [polish debrief](polish_debrief.md), [implementation debrief](implementation_debrief.md), [screenshots](screenshots/) with [index](screenshot_debrief.md)).

No PR.

Fork CI has not run on `95fa1ee00df`; locally the invocation graph Playwright tests (9) and the graph vitest suites pass.

## Decisions

- Stage 2 of the [invocation_graph_embedded_outputs](../../../../../agents/gx_standing/standing_branches/invocation_graph_embedded_outputs/index.md) standing branch, stacked on stage 1 (`invocation_graph_output_previews`); the spike (stage 3) stacks on this branch (John, 2026-11-03).
- Nudge only, never a full re-layout. If nudging can't keep the layout recognizable, drop stage 2 (John, 2026-10-20).
- Proposed for John (evidence in the [initial debrief](initial_implementation_debrief.md)): push right only (down mode dropped), static cards pinned beside their step, constant card sizes (260×170, collections 260×120 as summaries), a one-pass constraint layout.
- Targets `dev`: new client feature.
- Polish (2026-11-03): history squashed into six logical commits (baseline test refactor first); embedded table cards hide their unusable pagination.
- Deck polish (2026-11-04, from the stage 3 [deck review](../invocation_graph_embedded_outputs/presentation/deck_review.md), P2, P4, P10): compact tables, images sized to the card body, and a halo round each card instead of drawing edges over cards.
- Worktree: `~/projects/worktrees/galaxy/branch/invocation_graph_embedded_workflow_outputs`.
