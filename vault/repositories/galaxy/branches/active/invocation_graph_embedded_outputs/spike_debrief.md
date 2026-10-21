# Spike debrief: invocation_graph_embedded_outputs

Branch `jmchilton/invocation_graph_embedded_outputs`, based on `dev` `2cca8565861`. One commit per stage, then fixes, the later ones from a live browser run:

| Stage | Commit | What |
|---|---|---|
| 1 | `4054f126c5e` | Hovering an output terminal in the invocation graph pops up a preview of its dataset or collection |
| 2 | `5f33ad43ffa` | An "Embed Outputs" toggle turns workflow outputs into large nodes, shrinks steps, and nudges the layout |
| 3 | `16d2ddff843` | New per-step `preferred_output`, with a star toggle in the editor; in embed mode the step renders as that output |
| fix | `9a47ea37cb1` | Layout leaves steps the author placed closer than the gap alone; the layout reruns when measured step sizes settle |
| fix | `1b3b00c9502` | The hover preview moved from each terminal to one popover per step that lists all of its produced outputs |
| live | `06f13135728` | Output items come from the invocation; other step outputs load per step on demand (without this, nothing showed on a real server) |
| live | `e9914764686` | The graph refits to include embedded outputs; controls moved beside the zoom buttons; compact text and image previews |
| live | `0de2c009db3` | Steps that share a row (or column) keep their order when pushed |
| live | `9e83906a728` | Smaller cards (300×200, collections 300×140), and preferred-output steps shrunk to match |
| live | `3e4312f7c1d` | Previews reload when the producing step changes state (outputs embedded mid-run stayed empty) |

Requirements: [queued issue draft](../../../../../agents/gx_issues/to_file/invocation_graph_embedded_outputs.md).

## Live run

Local Galaxy with test tools and the Vite dev server. Screenshots are in `/Users/jxc755/projects/repositories/galaxy-brain/vault/agents/gx_spike/.playwright-mcp/` (gitignored, local only); a renamed, committed set is in the [project](../../../../../projects/invocation_graph_embedded_outputs/index.md#screenshots). The test workflow is [test_workflow.gxwf.yml](test_workflow.gxwf.yml), with inputs `test-data/2.tabular`, `test-data/454Score.png` and `test-data/simple_line_x2.txt`. It has 10 steps: three inputs (table, PNG, text) feed a table branch (head, cat, head, final cat), an image copy, a text split into a collection, and a two-output step. Six workflow outputs. The author's layout spans 924×480.

### Bugs found only in the browser

- **No previews at all.** The default invocation payload leaves `steps[].outputs` empty. The unit-test fixtures had them filled in, so tests passed.
  - Workflow inputs and outputs are now read from `invocation.inputs`, `invocation.outputs` and `invocation.output_collections`, matched to steps by `workflow_step_id`. No extra requests.
  - Other step outputs (hover, preferred output) load per step through the existing `fetchInvocationStepById` cache (`useStepOutputItems`).
  - So the debrief's earlier "no API change needed" was wrong: no API change, but one request per previewed step.
- **Steps jumped past their neighbours.** In down mode, cat_table (y=110) ended up below copy_image (y=230).
  - Overlap resolution compared current positions, so a pushed step could leap over a step it never overlapped.
  - Now steps that share a row (or column) carry ordering constraints, keeping the author's spacing. Red-to-green, with a test using this workflow's real positions in both directions.
- **A grown step covered the step below it.** A preferred-output step in the same column grew down into the next row, and nothing pushed that row because the two steps tied on x. Red-to-green.
- **Outputs embedded mid-run stayed empty.** The dataset stores cache by id, so a card loaded while its job ran kept showing "No content found" after the job finished. Previews now refetch when the producing step changes state.
- **Polish:** the view didn't refit after embedding; the toggle covered the first step; text previews were 10rem boxes holding one character; images were cropped.

### Stage 1: hover

Works for tables (paged), images, text, collections and multi-output steps.

### Stage 2: nudging (the go/no-go)

Largest step move and bounding box on this workflow (original 924×480), from the layout function with the real positions:

| Card size | Right: largest move / bbox | Down: largest move / bbox |
|---|---|---|
| 360×260 | 664px / 1968×680 | 1380px / 1140×2330 |
| 300×200 (now) | 544px / 1692×620 | 530px / 1080×1390 |
| 260×170 | 368px / 1572×590 | 420px / 1040×1230 |

In the browser, after the refit (graph panel about 880×600):
- **Right, workflow outputs only:** 51% zoom. Rows and columns stay intact, and only 3 of 10 steps move. I think it's recognizable. Card text is small but legible.
- **Down:** 42% zoom. Order is now kept, but the left-to-right workflow becomes a tall column of cards with long vertical edges. Not useful for horizontal workflows.
- **Right, with two preferred outputs:** 40% zoom, largest move 1608px.
  - copy_image is pushed past everything to the far right. It sits in a row that the grown cat_table and the tall summary/final_table cards all overlap, so in right-only mode it has to clear all of them.
  - Pushing it down would fix it, but that mixes axes. That's a new strategy (orthogonal-order-preserving placement), not a nudge. I stopped there.
- **Down, with two preferred outputs:** 28% zoom.
- **Running invocation:** the layout doesn't jump mid-run. Workflow output datasets exist from scheduling, so every card is placed at once, and no step moved across samples taken 3s apart. Cards fill in as their jobs finish.

Screenshots for the call: `20_v1_right.png`, `20_v1_down.png`, `21_v2pref_right.png`, `32_running_done_fixed.png`. Hover previews: `22_hover_text.png`, `23_hover_image.png`, `04_hover_table.png`, `06_hover_collection.png`.

**Root cause of the spread:** cards are taller than the author's row spacing (110–200px here). A card overlaps the next row or two and pushes those rows along too. Smaller cards help in proportion to their size, not completely.

**Read:** "nudge only" holds up for workflow outputs in right mode on this small workflow. It breaks down once preferred outputs grow steps across rows. A bigger real workflow (IWC) is the next test before a go/no-go.

### Stage 3: preferred output

- The star toggle works in the editor.
- Saved `preferred_output` comes back in both the editor dict and the `.ga` export, so the backend round trip is verified live.
- cat_table renders as its table, and copy_image stands in for its `plot` workflow output (no duplicate card).
- **The invocation that ran on v1 shows nothing.** The graph loads the workflow version that was invoked, and `preferred_output` was set on v2. This is display metadata stored on a versioned workflow, so it only shows on invocations of the new version.

## Verification

- vitest: Workflow Editor, Invocation and WorkflowInvocationState pass (48 files, 417 tests), including 12 layout tests.
- `vue-tsc` is clean; eslint shows no errors.
- No Python tests and no mypy. The `config` dict assignment typing is still unchecked.

## Answers to the open questions in the draft

- **Rendering stack:** `InvocationGraph.vue` reuses the editor's `WorkflowGraph.vue` in readonly mode, using `isInvocation`, scoped stores `invocation-<id>`, and plain absolutely positioned DOM nodes under one CSS transform.
  - Node sizes come from the DOM (`useNodePosition`), so variable-size nodes are a CSS change.
  - Embedded content sits in a new `node-area` slot inside the transformed layer.
- **Data:** see the first bug above. Workflow inputs and outputs come with the invocation; other outputs need one step request each.
- **Preview reuse:** Markdown `HistoryDatasetDisplay` (`embedded`) and `CollectionDisplay`, wrapped in `InvocationOutputPreview.vue`.
- **Hover target:** a step's output terminals are stacked in invocation mode, so there's one popover per step listing every produced output.
- **Embedded-content cost:** embedded cards mount all previews at once. Fine for a handful.

## Shortcuts

- Embedded nodes aren't drawn in the minimap. Connectors are dashed straight lines.
- Card sizes are constant per kind (dataset/collection). The datatype isn't known without a fetch, so a one-line text output gets a full-size card (`numbers_b`).
- Node shrinking is a CSS override in `InvocationGraph.vue`.

## Open questions

- **Go/no-go on stage 2:** right mode only (drop the down toggle)? Try one IWC workflow first?
- **Preferred output and versions:** resolve it against the latest workflow version, or only the invoked one (as built)?
- **Mixed-axis nudging:** push steps below a grown node down instead of right. That keeps orthogonal order but is beyond "nudge only". In scope?
- Should stage 3 apply in the default graph view, or only in embed mode?
- `config` column vs. a dedicated `preferred_output` column with a migration.
- gxformat2 doesn't round-trip `preferred_output` yet.
- Should embedded content be interactive (it blocks panning while the pointer is over it) or static?
- Should card size depend on the datatype? That costs a dataset-details request per card.
- One PR or one per stage? Stage 1 could ship alone.
