---
upstream_base_branch: dev
related_records: galaxy/branches/invocation_graph_embedded_outputs
---

# Invocation graph: hover a step to preview its outputs

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:invocation_graph_output_previews?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/invocation_graph_output_previews)

## Status

Polishing at `90cdc7089d9`, stopped at the checklist: "Who hits this in practice and what is the evidence?" fails because no issue or prior-art search backs the feature yet ([checklist](pr_checklist.md)).

No PR.

Fork CI on `90cdc7089d9` pending (1 of 11 runs passed, none failed) on 2026-11-03.

## Decisions

- Stage 1 of the [invocation_graph_embedded_outputs](../../../../../agents/gx_standing/standing_branches/invocation_graph_embedded_outputs/index.md) standing branch, extracted from the spike (`3e4312f7c1d`, kept as `invocation_graph_embedded_outputs_spike`). Stage 2 stacks on this branch (John, 2026-11-03).
- Leaves out the embed toggle, embedded nodes, the nudge layout and `preferred_output`.
- Targets `dev`: new client feature.
- Worktree: `~/projects/worktrees/galaxy/branch/invocation_graph_output_previews`.
- Mapped-over step state (pending jobs reading `ok`, the scope evaluation's Scope A) is deferred to a separate proposed child branch, `invocation_graph_mapped_step_state` (awaiting John); this branch is polished without it (coordinator, 2026-11-03).
