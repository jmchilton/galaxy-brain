---
upstream_base_branch: dev
related_records: galaxy/branches/invocation_graph_embedded_outputs
---

# Invocation graph: hover a step to preview its outputs

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:invocation_graph_output_previews?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/invocation_graph_output_previews)

## Status

Polished at `90cdc7089d9`; ready for John's final review ([PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md), [checklist](pr_checklist.md), [polish debrief](polish_debrief.md)).

No PR.

Fork CI on `90cdc7089d9`: unrelated reds only (macOS startup jobs cancelled; Galaxy packages mypy on `kombu`), 2026-11-03.

## Decisions

- Stage 1 of the [invocation_graph_embedded_outputs](../../../../../agents/gx_standing/standing_branches/invocation_graph_embedded_outputs/index.md) standing branch, extracted from the spike (`3e4312f7c1d`, kept as `invocation_graph_embedded_outputs_spike`). Stage 2 stacks on this branch (John, 2026-11-03).
- Leaves out the embed toggle, embedded nodes, the nudge layout and `preferred_output`.
- Targets `dev`: new client feature.
- Worktree: `~/projects/worktrees/galaxy/branch/invocation_graph_output_previews`.
- Mapped-over step state (pending jobs reading `ok`, the scope evaluation's Scope A) is not fixed here: John dropped it for now (2026-11-03). This branch is polished without it.
