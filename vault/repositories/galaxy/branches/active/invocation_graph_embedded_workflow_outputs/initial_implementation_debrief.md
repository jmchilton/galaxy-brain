Run via claude-opus-5-5 at high effort.

# Initial implementation debrief: invocation_graph_embedded_workflow_outputs

Stage 2 of [invocation_graph_embedded_outputs](../../../../../agents/gx_standing/standing_branches/invocation_graph_embedded_outputs/index.md). The branch is the spike's four stage 2 commits (`invocation_graph_output_previews..fb8d4487040`), extracted onto stage 1 (`90cdc7089d9`), plus six commits that rework them after live and offline measurement and a normal review. Head `bacea92a7e4` on `jmchilton`.

```
created /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/invocation_graph_embedded_workflow_outputs/differential-review/snapshots/20261103T185924Z-implementation-bacea92a7e48.json
  implementation @ bacea92a7e48 vs invocation_graph_output_previews (merge-base 90cdc7089d9c)
  first snapshot: 10 commits, 10 files, 20 hunks
```

## What it does

An "Embed Outputs" button beside the graph's zoom controls turns each labeled workflow output that has produced a dataset or collection into a card. Cards are 260×170, or 260×120 for collections, and render stage 1's `InvocationOutputPreview`. Step nodes shrink to 9rem. Steps are pushed right just enough to make room, and the graph refits. Toggling off restores the author's positions.

## Commits

| Commit | What |
|---|---|
| `817479c5bbc` … `fb8d4487040` | Spike stage 2, unchanged: toggle, cards in the `node-area` slot, `fitWorkflow(extraRectangles)`, the first layout module, sizes |
| `293701bfb4a` | Cards pinned beside their step (several outputs stack downwards); push right only; the down toggle removed; 260×170 cards |
| `f44209cc53a` | Static cards: pointer-transparent, clipped, connectors from the step's right edge |
| `d252bde1a7a` | Vitest for `useEmbeddedOutputs` and `InvocationEmbeddedOutputs` |
| `097a8ebbb7c` | Selenium `test_embed_workflow_outputs` and `navigation.yml` selectors |
| `f95b8e7b081` | Layout settled in one left-to-right pass (replaces the fixed-point loop, which could run away) |
| `bacea92a7e4` | Review fixes: toggle disabled with nothing to embed, inert cards, restore/apply hygiene, a less brittle E2E check |

## Decisions (for John)

### 1. Drop down mode (right only)

On real IWC layouts, the spike's down mode was often less disruptive than right. For example, on IWC CUT&RUN, right mode widened the graph to 6876px with a 4467px move. That was mostly the spike's algorithm, though. It let cards drift away from their step (1 to 5 per workflow, up to 657px), and it laid a multi-output step's cards in a long row.

With cards pinned beside their step, right mode moves steps less than down on four of five workflows (dada2 is a tie at zero), and down keeps detaching less but distorting more. Down wins only on ATAC-seq, a tall workflow. It also turned the test workflow into a column 4× taller (bbox 1080×1990), with 7 step-order flips. An automatic per-workflow choice was considered and rejected. It would help one workflow out of five, and the direction could flip mid-run as outputs appear.

### 2. Static cards

Cards are `pointer-events: none` and `inert`, with clipped content. With outputs embedded, cards cover about a third of the test workflow's graph. Interactive cards blocked panning and wheel-zoom over that area, and table pagination or tree toggles at 25–55% zoom are hard to use anyway. The full, interactive preview stays available through stage 1's hover popover and the step card.

### 3. Constant card sizes per kind

Cards are 260×170 for datasets and 260×120 for collections.
- **Why smaller than the spike's 300×200:** on the test workflow, 260×170 moves 3 steps instead of 4, with no row-order flips (2 at 300×200). It halves ATAC-seq's flips, and text, tables and images stay legible at 100%.
- **Why not size by datatype:** that needs a dataset request per card before layout, or a re-layout once content loads, which makes the graph jump.

### 4. One-pass constraint layout

Steps never change rows, so every rule is a fixed lower bound on a step's x relative to a step settled earlier. The rules are row order, flowing edges, a step clearing a source's cards, a source's cards clearing a step to their left, and two sources' cards. One sorted pass satisfies them all.
- Sources sort by their right edge, so a column-mate below a source keeps its place.
- This replaced a fixed-point loop that the normal review showed could run away (to x≈205000) on real-looking inputs.
- A 20,000-layout fuzz found no overlaps, no left or vertical moves, and no non-termination.

## Layout measurements

Offline: the branch's layout function on real positions and edges, steps 144×55 as shrunk, the 880×600 fit zoom capped at 25–100%. "Flips" counts step pairs whose left/right or above/below order changes. The test workflow ("Output previews", 10 steps, 6 outputs) and four IWC workflows, at 260×170:

| Workflow | Steps / cards | Steps moved | Largest move | Bounding box before → after | Fit zoom | Flips | Cards detached |
|---|---|---|---|---|---|---|---|
| Output previews | 10 / 6 | 3 | 368 | 924×475 → 1572×590 | 91% → 55% | 0/75 | 0 |
| IWC ChIP-seq PE | 12 / 9 | 5 | 49 | 2279×780 → 2608×1085 | 38% → 33% | 0/132 | 0 |
| IWC CUT&RUN | 15 / 10 | 5 | 603 | 2090×835 → 2973×835 | 41% → 29% | 1/210 | 0 |
| IWC dada2 paired | 19 / 3 | 0 | 0 | 2792×944 → 3072×1008 | 31% → 28% | 0/340 | 0 |
| IWC ATAC-seq | 42 / 14 | 17 | 354 | 3377×2585 → 3993×2700 | 25% → 25% | 19/1722 | 0 |

The spike's algorithm on the same inputs at 300×200, right mode:

| Workflow | Steps moved | Largest move | Bounding box after | Detached cards (worst) |
|---|---|---|---|---|
| Output previews | 3 | 544 | 1692×620 | 1 (340px) |
| IWC CUT&RUN | 5 | 4467 | 6876×835 | 0 |
| IWC ATAC-seq | 15 | 1371 | 5050×2730 | 1 |

Live in the browser (local Galaxy and Vite, 1600×1000 window). The IWC runs are layout replicas: real positions, labels, edges and workflow outputs, with tools swapped for `cat1`/`output_format`.

- **Output previews:** 3 of 10 steps move (`head_cat` and `numbers` by 184px, `final` by 368px), matching the unit test. Rows and columns stay intact; zoom 54%.
- **ChIP-seq PE:** 4 of 12 steps move, each by 49px; MACS2's three outputs stack beside it. Zoom 34%.
- **ATAC-seq:** 21 of 42 steps move, the largest by 527px (the replica drops some edges, so it differs from offline). It is already at the 25% minimum zoom before embedding, so cards are thumbnails until you zoom in.

**Read:** nudging keeps the test workflow and ChIP-seq clearly recognizable. CUT&RUN keeps its single row of tools and widens by 42%. ATAC-seq keeps its left half untouched and shifts its right half. At that size, the bottleneck is the 25% minimum zoom, not the nudging.

## Verification

- **Vitest** (node 22.20.0) on `Workflow/Editor`, `Workflow/Invocation`, `WorkflowInvocationState` and `useInvocationGraph.test.ts`: 56 files, 508 tests pass, including 14 layout tests, 8 composable tests and 3 card tests.
- **Static checks:** `vue-tsc --noEmit` is clean. eslint shows no errors on changed files (the warnings are pre-existing), and prettier is clean.
- **Selenium** (Playwright backend): `test_embed_workflow_outputs` passes. It checks each card's content, that every card sits just right of its step and clear of every step, right-only moves, and the restore on toggle-off.

## Open questions

- **Minimap:** embedded cards aren't drawn in it. Left as is.
- **Large collections:** a collection card mounts `CollectionDisplay`, which loads every element (stage 1's performance debrief). Embedding all outputs at once multiplies that; the performance challenge should decide.
- **Unlabeled workflow outputs:** stage 1 lists them, but only labeled outputs are embedded. Kept from the spike.
- **Spike commit messages:** `817479c5bbc` and `c2e370cad4d` still describe the down toggle. Squash or reword at polish.
