# invocation_graph_embedded_outputs

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:invocation_graph_embedded_outputs?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/invocation_graph_embedded_outputs)

Spike: show outputs inside the workflow invocation graph in three stages (hover preview, workflow outputs embedded as large nodes with nudged layout, steps shown as their preferred output). Requirements are in the queued issue draft [invocation_graph_embedded_outputs](../../../../../agents/gx_issues/to_file/invocation_graph_embedded_outputs.md).

- Base: `dev` (`2cca8565861`). New feature plus new step metadata, so it targets dev.
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/invocation_graph_embedded_outputs`
- [Spike debrief](spike_debrief.md)

## Status

Spike branch with one commit per stage plus two follow-up fixes, head `1b3b00c9502`; it hasn't been run in a browser.

No PR.

No CI run.

## Decisions

- Nudge only, never a full re-layout. If nudging can't keep the layout recognizable, drop stage 2 (John, requirements session 2026-10-20).
- "Annotated outputs" means workflow outputs (John, 2026-10-20).
