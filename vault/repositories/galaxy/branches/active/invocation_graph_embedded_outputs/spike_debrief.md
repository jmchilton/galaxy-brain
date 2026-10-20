# Spike debrief: invocation_graph_embedded_outputs

Branch `jmchilton/invocation_graph_embedded_outputs`, based on `dev` `2cca8565861`. One commit per stage, then two follow-up fixes:

| Stage | Commit | What |
|---|---|---|
| 1 | `4054f126c5e` | Hovering an output terminal in the invocation graph pops up a preview of its dataset or collection |
| 2 | `5f33ad43ffa` | An "Embed Outputs" toggle turns workflow outputs into large nodes, shrinks steps, and nudges the layout |
| 3 | `16d2ddff843` | New per-step `preferred_output`, with a star toggle in the editor; in embed mode the step renders as that output |
| fix | `9a47ea37cb1` | Layout leaves steps the author placed closer than the gap alone; the layout reruns when measured step sizes settle |
| fix | `1b3b00c9502` | The hover preview moved from each terminal to one popover per step that lists all of its produced outputs |

Requirements: [queued issue draft](../../../../../agents/gx_issues/to_file/invocation_graph_embedded_outputs.md).

## Verification

- vitest: Workflow Editor, Invocation and WorkflowInvocationState pass (48 files, 412 tests), including 7 new tests for the layout module.
- `vue-tsc --noEmit` is clean. eslint shows no new errors. The Python files compile.
- **Not run in a browser.** No local Galaxy is running and the worktree has no `.venv`. The go/no-go for stage 2 depends on seeing it on a real multi-output workflow, which hasn't happened yet.
- No Python tests: the backend round-trip (editor save → `.ga` export → editor dict) was checked by reading the code only.
  - The graph loads the `style=editor` dict (`getWorkflowFull`), which is where `preferred_output` is serialized.
- mypy wasn't run. Assigning a dict to `WorkflowStep.config` (`Mapped[bytes | None]`) will probably need a type fix.

## Answers to the open questions in the draft

- **Rendering stack:** the invocation graph is the editor's `WorkflowGraph.vue` in readonly mode, using `isInvocation`, its own scoped stores (`invocation-<id>`), and plain absolutely positioned DOM nodes under one CSS transform.
  - Node sizes come from the DOM: `useNodePosition` measures each node into `stateStore.stepPosition`. Variable-size nodes are easy as a result: change the CSS and the edges follow.
  - Added content goes in a new named slot (`node-area`) inside the transformed layer, so it pans and zooms with the nodes.
- **Data:** with the element view, `invocation.steps[i].outputs` and `output_collections` already map every step output to an hda or hdca. `useInvocationGraph` now copies these onto `GraphStep.outputItems`. No API change was needed.
- **Preview reuse:** the Markdown `HistoryDatasetDisplay` (`embedded`) and `CollectionDisplay` components, wrapped in `InvocationOutputPreview.vue`. Tables, images, PDF/HTML iframes and text all come from existing code.
- **Hover target:** in invocation mode, every output row of a step is absolutely positioned on the same spot (`.invocation-node-output`), so the terminals stack. A popover per terminal only reached the top one.
  - The popover is now on the node: it targets the topmost terminal and lists every produced output.
  - Hovering a single output on its own needs the terminals un-stacked, which changes how edges leave the node.
- **Embedded-content cost:** the hover popover mounts the preview only while shown. Embedded nodes render every preview at once, with no lazy loading. Fine for a handful of outputs; a workflow with dozens of outputs would need an IntersectionObserver.

## Stage 2: nudging (the go/no-go)

`Editor/modules/embeddedOutputLayout.ts` is a pure function and unit-tested. It works like this:
- Each embedded node is placed beside its source step: to the right, or below with the "down" direction.
- Overlapping nodes are then pushed along **one axis only**, and never backwards. Nodes never move on the other axis.
- Edges that already ran along the push axis keep their original spacing. A pushed step carries its downstream chain along at the same shape instead of squeezing into it.
- Overlaps the author already had in the original layout are left alone.
- A step that grew (stage 3) is told apart from those author overlaps by its pre-growth size.
- The result includes `maxDisplacement` and `movedNodeIds`. The toolbar tooltip shows the largest move, so the go/no-go can be judged by eye.

Positions are computed from the original positions every time. Toggling off restores them. New position objects are written, because the originals are shared with the cached workflow.

What the tests show:
- An unrelated node outside the embedded node's band stays put.
- A downstream chain shifts as a unit.
- On the 37-step `parameter_steps.json` fixture with two embedded nodes, fewer than half the steps move.

What's still unproven:
- A wide workflow with a workflow output near the left edge pushes everything to its right along. It's still a translation of whole columns, not a re-layout, but it may be a big move.
- The "down" direction may suit horizontal pipelines better. A toggle is included so both can be compared on real workflows.

Shortcuts:
- Embedded nodes aren't in the minimap or `fitWorkflow`'s bounding box.
- Connectors are dashed straight lines, not real terminals.
- Node shrinking is a CSS override (`width: 9rem`, smaller font) in `InvocationGraph.vue`.
- Embedded nodes use a fixed estimated size (360×260).
- Steps use their measured sizes. The measured width and height (not left/top) are watched, so the layout reruns from the original positions once ResizeObserver reports the shrunk sizes.
- Preferred-output bodies have a fixed height (16rem), so loading the preview doesn't resize the node again.

## Stage 3: preferred output

- Stored in the existing, unused `WorkflowStep.config` JSON column through a `WorkflowStep.preferred_output` property, so no migration.
  - Serialized in the editor dict (always) and the export dict (when set).
  - Read in `__module_from_dict`, next to `when`.
  - Workflow copies already copy `config`.
- Editor: a star toggle next to each tool output, using `UpdateStepAction` so undo/redo works.
- Invocation (embed mode only): a node with a produced preferred output widens to 22.5rem and shows the preview in place of the invocation text.
- Dedup: a workflow output that is also the step's preferred output isn't embedded separately.

## Open questions

- Should stage 3 apply in the default graph view, or only in embed mode? The spike ties it to embed mode, so the default graph doesn't change.
- `config` column vs. a dedicated `preferred_output` column with a migration. `config` avoided the migration but is vague, and it has no schema or validation. The check that `config` is unused only grepped `modules.py`, `managers/workflows.py` and `model/__init__.py`.
- gxformat2 doesn't round-trip `preferred_output` yet. It needs a format2 field and a gxformat2 release.
- Should embedded and preferred-output content be interactive (scrolling tables, paging) or static thumbnails? The spike stops wheel and pointer events so tables scroll; that blocks panning while over them.
- Is the embed toggle per invocation, or a remembered user preference?
- Subworkflow steps: outputs come from the parent invocation step, and nested subworkflow outputs aren't explored.

## Suggested next step

Bootstrap the worktree, run one multi-output workflow (images plus tabular), and take screenshots in both nudge directions. Make the stage 2 go/no-go from those, then decide whether to split into three PRs (stage 1 alone is shippable).
