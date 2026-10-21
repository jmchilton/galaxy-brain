---
type: project
title: "Invocation Graph Embedded Outputs"
tags:
  - project
  - galaxy/workflows
  - galaxy/client
status: draft
created: 2026-10-21
revised: 2026-10-21
revision: 1
ai_generated: true
summary: "Outputs inside the invocation graph: hover previews, embedded workflow-output nodes, steps shown as a preferred output."
---

# Invocation Graph Embedded Outputs

Pull outputs into the invocation graph in three stages: hover preview, workflow outputs as large embedded nodes (local nudging, never a full re-layout), and steps that render as their preferred output.

- Issue draft (not filed yet): [`invocation_graph_embedded_outputs.md`](../../agents/gx_issues/to_file/invocation_graph_embedded_outputs.md)
- Spike branch: [`jmchilton/invocation_graph_embedded_outputs`](https://github.com/jmchilton/galaxy/tree/invocation_graph_embedded_outputs) — [branch record](../../repositories/galaxy/branches/active/invocation_graph_embedded_outputs/index.md), [spike debrief](../../repositories/galaxy/branches/active/invocation_graph_embedded_outputs/spike_debrief.md)

## Screenshots

From the spike's live browser run on a 10-step test workflow.

- [`01_default_graph.png`](screenshots/01_default_graph.png) — invocation graph before any change.
- Stage 1, hover previews: [table](screenshots/02_hover_table.png), [image](screenshots/03_hover_image.png), [multi-output text](screenshots/04_hover_multi_output_text.png), [collection](screenshots/05_hover_collection.png).
- Stage 2, embedded workflow outputs: [pushed right](screenshots/06_embed_right.png), [pushed down](screenshots/07_embed_down.png).
- Stage 3, with preferred outputs: [right](screenshots/08_embed_right_preferred_outputs.png), [down](screenshots/09_embed_down_preferred_outputs.png).
- [`10_embed_running_invocation_done.png`](screenshots/10_embed_running_invocation_done.png) — invocation run live, after completion; layout didn't jump.
- [`11_editor_preferred_output_star.png`](screenshots/11_editor_preferred_output_star.png) — editor control for marking a preferred output.
