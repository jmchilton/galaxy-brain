# Embed outputs in the workflow invocation graph (three stages)

Agent-to-agent draft. Feature request from John (2026-10-20), taken from a voice requirements session. Motivated by user input. Research the code on `dev` before filing. Decide whether to file one umbrella issue or one issue per stage.

A spike exists: branch `jmchilton/invocation_graph_embedded_outputs`. It has been run in a browser; see [What the spike learned](#what-the-spike-learned) and the [spike debrief](../../../repositories/galaxy/branches/active/invocation_graph_embedded_outputs/spike_debrief.md).

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

## What the spike learned

The spike was run in a browser against a 10-step workflow. Details and numbers are in the debrief; screenshots are in [`gx_branches/embeddisplay/`](../../gx_branches/embeddisplay/).

- **Rendering:** the invocation graph is the editor's `WorkflowGraph.vue` in readonly mode, built from absolutely positioned DOM nodes under one transform. Node sizes are measured from the DOM, so variable-size nodes are a CSS change. Previews reuse the Markdown dataset and collection components.
- **Data:** the invocation payload lists workflow inputs and outputs, but not other step outputs (`steps[].outputs` is empty). Hover previews and preferred outputs need one step request each, loaded on demand. No API change is needed.
- **Layout:** there was no nudge code, only the full auto-layout, so the spike added a one-axis push that keeps steps sharing a row (or column) in their original order.
  - With workflow outputs embedded and steps pushed right, the layout stays recognizable: 3 of 10 steps move, and the graph fits at about 50% zoom.
  - Pushing down turns a left-to-right workflow into a tall column. Drop it.
  - Preferred-output steps that grow across rows make the push cascade (largest move 1608px). Fixing that needs mixed-axis placement, which is beyond nudging.
- **Running invocations:** workflow output datasets exist from scheduling, so the layout is placed once and doesn't jump mid-run. Previews must refresh when their job finishes, because the dataset stores cache by id.
- **Preferred output:** stored in the existing, unused `WorkflowStep.config` JSON, with no migration. It round-trips through the editor and `.ga` export, but not gxformat2 yet. It lives on a workflow version, so invocations of older versions don't show it.
- **Hover target:** in invocation mode a step's output terminals are stacked, so the spike has one popover per step listing all of its outputs.

## Open questions

- Go/no-go on stage 2: right-only nudging is acceptable here. Check one IWC-sized workflow before deciding.
- Is mixed-axis placement for grown steps in scope, or does stage 3 stay cosmetic (no growth)?
- Preferred output: resolve it against the invoked version (as built) or the latest version?
- `config` column vs. a dedicated column; add the gxformat2 field.
- Size cards by datatype? That costs one dataset request per card.
- Prior art: search for existing issues and PRs on invocation output previews, inline outputs, and node thumbnails (not done yet).
- One issue or one per stage? Stage 1 can ship on its own.
