---
upstream_base_branch: dev
parent_branch: invocation_graph_embedded_workflow_outputs
related_records:
  - galaxy/branches/invocation_graph_output_previews
  - galaxy/branches/invocation_graph_embedded_workflow_outputs
---

# invocation_graph_embedded_outputs

- [Open PR](https://github.com/jmchilton/galaxy/compare/invocation_graph_embedded_workflow_outputs...invocation_graph_embedded_outputs?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/invocation_graph_embedded_outputs)

Spike: show outputs inside the workflow invocation graph in three stages (hover preview, workflow outputs embedded as large nodes with nudged layout, steps shown as their preferred output). Requirements are in the queued issue draft [invocation_graph_embedded_outputs](../../../issues_incubator/incubating/invocation_graph_embedded_outputs/raw.md).

- Base: stacked on `invocation_graph_embedded_workflow_outputs` (stage 2), which stacks on `invocation_graph_output_previews` (stage 1) and targets `dev`. New feature plus new step metadata, so it targets dev.
- Worktree: `~/projects/worktrees/galaxy/branch/invocation_graph_embedded_outputs`
- [Spike debrief](spike_debrief.md)
- [Rebase on stage 1 debrief](rebase_on_stage1_debrief.md): commit list and the stage 2/3 boundary.
- Project: [invocation_graph_embedded_outputs](../../../../../projects/invocation_graph_embedded_outputs/index.md) (screenshots)

## Status

Rebased onto stage 1 (`90cdc7089d9`) as four stage 2 commits then two stage 3 commits, head `4187ad166e4`; the original spike is kept as `invocation_graph_embedded_outputs_spike` (`3e4312f7c1d`).

No PR.

No CI run; local vitest, vue-tsc, eslint and related Python unit tests pass.

## Decisions

- Nudge only, never a full re-layout. If nudging can't keep the layout recognizable, drop stage 2 (John, requirements session 2026-10-20).
- "Annotated outputs" means workflow outputs (John, 2026-10-20).
