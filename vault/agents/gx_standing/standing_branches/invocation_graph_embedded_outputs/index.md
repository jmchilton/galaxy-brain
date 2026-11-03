---
upstream_base_branch: dev
record: galaxy/branches/invocation_graph_embedded_outputs
---
# Invocation graph embedded outputs

- No PR yet · [branch record](../../../../repositories/galaxy/branches/active/invocation_graph_embedded_outputs/index.md) · [project](../../../../projects/invocation_graph_embedded_outputs/index.md)

Show outputs inside the workflow invocation graph in three stages: hover previews, workflow outputs embedded as large nodes with nudge-only layout, and steps that render as their preferred output. The spike branch becomes the standing branch once stages 1 and 2 are extracted beneath it.

## Children

- [`invocation_graph_output_previews`](../../../../repositories/galaxy/branches/active/invocation_graph_output_previews/index.md) — `wip` · `stacked` — Stage 1: hovering a step's outputs previews its datasets and collections.
- `invocation_graph_mapped_step_state` — `proposed` · `related` — Pre-existing bug found by stage 1 scope evaluation: a map-over whose jobs are all new/queued shows as `ok`. ~10 lines plus Vitest; stands alone and could target a release branch. Awaiting John: split out, fold into stage 1, or drop.
- [`invocation_graph_embedded_workflow_outputs`](../../../../repositories/galaxy/branches/active/invocation_graph_embedded_workflow_outputs/index.md) — `wip` · `stacked` — Stage 2: workflow outputs embedded as large nodes, nudging steps; stacked on stage 1.

## Decisions

- 2026-11-03 John: extract stage 1 from the spike, harden (gx_workhorse) and polish (gx_branches POLISH_BRANCH.md); rebase the spike; repeat for stage 2 on stage 1; rebase; harden and polish the spike itself (stage 3). The original spike head `3e4312f7c1d` is kept as `invocation_graph_embedded_outputs_spike` on `jmchilton`.
- Nudge only, never a full re-layout (John, 2026-10-20).
