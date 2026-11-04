Run via claude-opus-5-5.

# Implementation debrief: invocation_graph_embedded_outputs (deck polish revision)

**STATUS: READY.** Code changed after polish, for the deck review's polish list ([presentation/deck_review.md](presentation/deck_review.md), P3 here; P2, P4 and P10 on stage 2, carried by the rebase). The hardening debrief, with every design decision and the layout measurements, is in [earlier_drafts/1/implementation_debrief.md](earlier_drafts/1/implementation_debrief.md). All of its decisions hold.

Head `b29dbd61b9c` on `jmchilton`: nine commits on stage 2's `95fa1ee00df` (rebased from `3b546b24e6f`).

```
created /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/invocation_graph_embedded_outputs/differential-review/snapshots/20261104T043118Z-revision-b29dbd61b9cd.json
  revision @ b29dbd61b9cd vs invocation_graph_embedded_workflow_outputs (merge-base 95fa1ee00dfb)
  since 20261104T024344Z-polishing-bfd85ad414f1:
    commits: 0 same, 7 rebased, 1 changed, 1 new, 0 dropped
    hunks:   58 carried, 7 changed, 3 new, 2 dropped
    changed afebcc61a2e0 Invocation graph: a static output snapshot component for the embedded output cards (2 differing hunks)
    new     b29dbd61b9cd Invocation graph: label a step shown as its preferred output
```

## What changed

1. **Rebase onto stage 2's deck polish.** Stage 2's three new rules (compact tables, images sized to the body, previews clipped not scrolled) were card CSS; the refactor commit `afebcc61a2e` ("a static output snapshot component") moves the card CSS into `InvocationOutputSnapshot.vue`, so the conflict resolution moved them too, and grown steps get them through the same component. The card keeps its flex sizing, the not-ready inset and its halo. The commit message now lists the new rules.
2. **A label on a grown step (P3), `b29dbd61b9c`.** A step shown as its preferred output stood in for that output's card but dropped the card's label, so the workflow output's label, the one name its author chose, appeared nowhere. A one-line label now sits above the snapshot, with the output icon and the cards' blue: the workflow output's label, or else the output's name (`out_file1` on `cat_table`). This also ties the grown step to the cards' visual grammar (deck review point 5).
   - The label sits inside the existing 8.5rem (collections 5.25rem), so grown steps keep their size and the layout and its measurements are unchanged. The cost: a grown table shows four rows where a card shows five.
   - The label and snapshot live in a new `InvocationStepPreferredOutput.vue`; `Node.vue` only chooses between it and the step's state, as before. The wrapper is `pointer-events: none` like the snapshot, so a click still selects the step and a drag pans.

Not done here: P11 (show the outline star only on hover or selection) is a design call left for John.

## Tests

- Vitest: `InvocationStepPreferredOutput.test.ts` (new): the snapshot gets the item and step; the label is the matching workflow output's label among several; it falls back to the output name when the output has no labelled workflow output. `Node.test.ts` now finds the new component.
- E2E `test_embed_shows_steps_as_their_preferred_output` checks the labels: `top_rows` on `head_table` (a workflow output) and `out_file1` on `cat_table` (not one). New selector `graph_step_preferred_output.output_label`; the `_` selector moved to the wrapper.

Verification, on both stage 2 and stage 3 unless noted:

- Playwright: the whole `test_workflow_invocation_graph.py` and `test_star_preferred_output`: 11 passed on stage 3 (9 on stage 2).
- Vitest: the graph directory, `Node`, `NodeOutput` and `useInvocationGraph`: 14 files, 134 tests on stage 3 (11 files, 101 tests on stage 2).
- vue-tsc (`NODE_OPTIONS=--max-old-space-size=8192`): no errors on either branch.
- eslint: no errors (the warnings in `Node.vue` are dev's `@onChange` hyphenation); prettier, black, isort and ruff: clean; `make format`: no changes.
- The E2E runs used one Galaxy (this worktree's, port 8091) with each branch's own Vite client (5181, 5182).

## Review

A normal review subagent read stage 2's commits, this rebase and the label commit: [subagents/deck_polish_review.md](subagents/deck_polish_review.md). It found nothing wrong with the label; its fixes (a 2px image overflow, stronger image checks) landed on stage 2 and came here through the rebase, and its naming nits are fixed.

## Screenshots

Every live frame was retaken with demo content and the new rules (deck P1): see [screenshot_debrief.md](screenshot_debrief.md) and [presentation/capture_debrief.md](presentation/capture_debrief.md). The old frames are in [earlier_drafts/1/screenshots/](earlier_drafts/1/screenshots/).
