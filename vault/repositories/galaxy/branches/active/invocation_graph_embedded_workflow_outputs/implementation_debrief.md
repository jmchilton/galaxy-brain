Run via claude-opus-5-5.

# Implementation debrief: invocation_graph_embedded_workflow_outputs (deck polish revision)

**STATUS: READY.** Code changed after polish, for the deck review's polish list ([deck_review.md](../invocation_graph_embedded_outputs/presentation/deck_review.md), P2, P4 and P10). The earlier hardening debrief, with every design decision, is in [earlier_drafts/1/implementation_debrief.md](earlier_drafts/1/implementation_debrief.md). All of its decisions hold: static cards, right-only nudging, constant card sizes, nudge-only layout.

Head `95fa1ee00df` on `jmchilton`: three new commits on the polished `3b546b24e6f`, +64/−4 lines in three files (one Vue component's styles, one selector, the Selenium test).

```
created /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/invocation_graph_embedded_workflow_outputs/differential-review/snapshots/20261104T042040Z-revision-95fa1ee00dfb.json
  revision @ 95fa1ee00dfb vs invocation_graph_output_previews (merge-base 90cdc7089d9c)
  since 20261103T220531Z-polishing-3b546b24e6f3:
    commits: 6 same, 0 rebased, 0 changed, 3 new, 0 dropped
    hunks:   29 carried, 3 changed, 0 new, 0 dropped
    new     24913e90dbb8 Embedded outputs: compact table snapshots
    new     47397dea825a Embedded outputs: size image snapshots to the card's body
    new     95fa1ee00dfb Embedded outputs: a white halo round each card
```

## What changed

All three are CSS in `InvocationEmbeddedOutputs.vue`'s card body; stage 3 moves them into `InvocationOutputSnapshot.vue`, so its grown steps get them too.

1. **Compact table snapshots (P2), `24913e90dbb`.** A card showed one full table row: the sort icons and GTable's 0.75rem cell padding filled the 170px card. The sort icons are hidden (a static card can't sort) and the rows are tighter (`0.125rem 0.375rem`, line height 1.3), so a card shows five rows. The rules out-rank GTable's scoped styles by specificity, (0,4,2) against (0,3,2).
2. **Images sized to the card's body (P4), `47397dea825`.** The picture was capped at a fixed 8rem, which matched the body only at a 16px root font size. The body is now a size container and the image box is `calc(100cqh - 1rem - 2px)` tall and full width, with the picture fitted inside. The preview inside a card is clipped, not scrolled, so neither an image nor a long table can put a scrollbar in a static card (the review subagent found the 2px border overflow that caused one).
   - On the square E2E test image the gain is small (121px instead of 128px tall, now inside the body). A wide plot fills the card's width: the demo plot is 238×119 in a 256×137 body.
3. **A halo round each card (P10), `95fa1ee00df`.** Edges keep their routes and pass under the opaque cards; an edge that crossed a card seemed to end at its border. A 5px `box-shadow` in the canvas background colour ends the edge short of the card, so it reads as passing underneath. The connectors are drawn over the halos (z-index 101), so each still meets its card.
   - I chose the halo over drawing edges above cards. Edges are one SVG inside `WorkflowGraph.vue`, under the nodes; drawing them over the cards would need a second edge layer or moving cards below the edge SVG, where edges would cross the cards' content. The halo changes nothing about panning, pointer pass-through or layout: a box-shadow takes no space and no events, and 5px sits inside the layout's 20px gap.
   - Cosmetic side effect, accepted: the connector's first pixels paint over its own step's border.

## Tests

- E2E `test_embed_workflow_outputs` now checks that a card hides the table's sort icons, that all five `top_rows` rows fit in the card (it was one), and that the plot's image is as wide as the card, at least 0.6 of its height, inside it, and that the preview doesn't scroll. The checks run after the refit, each measured in one script. New selector: `graph_embedded_output.table_sort_icon`.
- No vitest change: the changes are CSS, which happy-dom doesn't lay out.

Results:

- Playwright, the whole `test_workflow_invocation_graph.py`: 9 passed (stage 2 client on Vite 5182, against stage 3's Galaxy, whose backend is stage 2's plus the new step field).
- vitest, the graph directory plus `Node`, `NodeOutput` and `useInvocationGraph`: 11 files, 101 tests passed.
- vue-tsc, eslint, prettier, black, isort and ruff: see the stage 3 debrief's verification list, which ran on both branches.

## Review

A normal review subagent read the three commits; [subagents/deck_polish_review.md](subagents/deck_polish_review.md) has the debrief. It found the 2px overflow (fixed), weak and early image checks (fixed), and the hard-coded halo colour (now `var(--background-color)`).

## Screenshots

Every live frame was retaken with demo content (deck P1); see [screenshot_debrief.md](screenshot_debrief.md). The old frames are in [earlier_drafts/1/screenshots/](earlier_drafts/1/screenshots/).
