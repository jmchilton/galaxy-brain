# Embed outputs in the workflow invocation graph (three stages)

Agent-to-agent draft. Feature request from John (2026-10-20), taken from a voice requirements session. Motivated by user input. Research the code on `dev` before filing. Decide whether to file one umbrella issue or one issue per stage.

A spike exists: branch `jmchilton/invocation_graph_embedded_outputs`. Its [spike debrief](../../../repositories/galaxy/branches/active/invocation_graph_embedded_outputs/spike_debrief.md) already answers the rendering-stack and data questions below.

## Goal

Show outputs and their data inside the workflow invocation graph view instead of only in the output lists and the history. Do it in three stages, each pulling outputs further into the graph.

## Stage 1: hover preview

- Hovering any output in the invocation graph shows a small popup preview of that output.
- The preview depends on the datatype: tabular data as a table, an image as the image, and so on.
- Look for existing preview and visualization components to reuse (dataset peek, tabular display, image display) rather than writing new renderers.

## Stage 2: workflow outputs become embedded nodes

- Each workflow output (a step output marked as a workflow output) becomes its own node in the graph. These nodes are larger than normal step nodes and render the output inline.
- Normal step nodes probably shrink to make room.
- Workflow outputs are already in the model, so no new model work is needed to identify them.
- **Hard requirement: no full re-layout.** Galaxy runs its own layout, not Cytoscape or similar, and has an auto-layout algorithm, but this feature must not use it on the whole graph. Room for the big nodes has to come from local nudging.
  - Why: the feature is for users who already carry the workflow's spatial layout in their heads. A full re-layout destroys that mental map. Users without it are better served by a flat list of outputs.
  - Go/no-go: if local nudging can't make room while keeping the layout recognizable, the stage (and maybe the feature) isn't worth shipping.
- The implementer should answer these from the code:
  - Rendering stack: how the invocation graph draws nodes, and how hard variable node sizes are.
  - Cost of embedded content: lazy-loading previews when nodes come into view, static thumbnails versus interactive widgets, and very large outputs.

## Stage 3: preferred step output, the node renders as its output

- New metadata: each step can name a **preferred output**. This is one of the step's own outputs, not a workflow output. Step outputs already exist in the model; only the "preferred" marker is new.
- A step with a preferred output renders as that output: the node itself shows the table or image. This fits tools with a single table or image output.
- Dedup rule: if the preferred output is also a workflow output (stage 2), don't extract and nudge a separate embedded node for it. The step node stands in for that workflow output, so nothing is shown twice.
- Needs: storage for the new step-level metadata (and how it round-trips through gxformat2 and `.ga` export/import), an editor UI to set it, and the invocation-graph rendering.

## Open questions for research

- Which component(s) render the invocation graph today, and how much code they share with the editor canvas.
- Is there existing nudge or local-layout code, or only the full auto-layout?
- Where should preferred-output metadata live on the step model? Does it need a DB migration, or can it go in existing step JSON?
- Prior art: search for existing issues and PRs on invocation output previews, inline outputs, and node thumbnails.
