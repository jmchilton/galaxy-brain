---
upstream_base_branch: dev
record: galaxy/branches/invocation_graph_embedded_outputs
---
# Invocation graph embedded outputs

- No PR yet · [branch record](../../../../repositories/galaxy/branches/active/invocation_graph_embedded_outputs/index.md) · [project](../../../../projects/invocation_graph_embedded_outputs/index.md)

Show outputs inside the workflow invocation graph in three stages: hover previews, workflow outputs embedded as large nodes with nudge-only layout, and steps that render as their preferred output. The spike branch becomes the standing branch once stages 1 and 2 are extracted beneath it.

## Children

- [`invocation_graph_output_previews`](../../../../repositories/galaxy/branches/active/invocation_graph_output_previews/index.md) — `wip` · `stacked` — Stage 1: hovering a step's outputs previews its datasets and collections. Polished, head `90cdc7089d9`; ready for final review.
- [`invocation_graph_embedded_workflow_outputs`](../../../../repositories/galaxy/branches/active/invocation_graph_embedded_workflow_outputs/index.md) — `wip` · `stacked` — Stage 2: workflow outputs embedded as static cards beside their steps, steps pushed right only; stacked on stage 1. Polished at `3b546b24e6f`, then changed for deck polish: head `95fa1ee00df` adds compact table snapshots, images sized to the card and a halo round each card; ready for final review. The spike (stage 3, this standing branch) stacks on it, polished and changed for deck polish: head `b29dbd61b9c`, ready for final review: four baseline/refactor commits and five feature commits (preferred output on tool steps, editor star, steps drawn as their output in embed mode, a label on those steps). Its record holds the decisions for John and the eventual standing-branch PR title; gxformat2 support is a follow-up.

## Decisions

- 2026-11-03 John: extract stage 1 from the spike, harden (gx_workhorse) and polish (gx_branches POLISH_BRANCH.md); rebase the spike; repeat for stage 2 on stage 1; rebase; harden and polish the spike itself (stage 3). The original spike head `3e4312f7c1d` is kept as `invocation_graph_embedded_outputs_spike` on `jmchilton`.
- Nudge only, never a full re-layout (John, 2026-10-20).
- 2026-11-03 John: the stage 1 scope evaluation's pre-existing bug (a map-over whose jobs are all new/queued shows as `ok`) is dropped for now; no branch.
- 2026-11-03 John: his own requirements draft and the spike screenshots are the evidence for the PR checklist's "who hits this" item; no issue needed before PRs.
- 2026-11-04: deck polish from the stage 3 [deck review](../../../../repositories/galaxy/branches/active/invocation_graph_embedded_outputs/presentation/deck_review.md) (P2, P3, P4, P10 in code; the deck republished with demo content). P11 (outline star only on hover or selection) is left for John.
