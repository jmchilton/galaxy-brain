# Normal review: deck polish (P3, and P2/P4/P10 from stage 2)

A normal review subagent read the new label on grown steps (`InvocationStepPreferredOutput.vue`), and stage 3's rebase of stage 2's deck-polish commits into `InvocationOutputSnapshot.vue`. It found no problem in the label. The one bug it found, a 2px overflow that made image snapshots scroll, is in the shared snapshot CSS, so it's fixed on stage 2 and carried here through the rebase (see stage 2's [deck_polish_review.md](../../invocation_graph_embedded_workflow_outputs/subagents/deck_polish_review.md)). On this branch I fixed a comment ("a labelled workflow output") and renamed two test helpers.

Not acted on:

- **The label sits inside the fixed 8.5rem / 5.25rem height,** so a grown step's snapshot area is about 1.25rem shorter than a card's body (four table rows where a card shows five; collections get about 4rem against 5.5rem). Deliberate: it keeps grown steps' sizes, and so the layout and its measurements, unchanged.

<details>
<summary>Full review (stage 3 parts)</summary>

- **Pointer events:** `pointer-events: none` on the new wrapper sends hits to `.node-body`, which owns selection and the drag/pan handling. The label holds nothing focusable, so it needn't be `inert`. `_assert_static` still applies. Fine.
- **Label behaviour:** falls back from the workflow output label to the output name, consistent with cards (only labelled workflow outputs get cards). The vitest cases (a labelled match among several, an unlabelled workflow output, none) are meaningful, and the E2E checks both paths (`top_rows` on head_table, `out_file1` on cat_table). Fine.
- **Rebase:** every stage 2 rule survived the move into the snapshot, and the grown step gets them through it, plus `flex: 1; min-height: 0`. Fine.
- **Nits:** the computed label's comment should say "a labelled workflow output"; `mountShown` / `shownLabel` read oddly. **Fixed.** The "snapshots the item under the step's state" test only checks props pass through: borderline trivial, kept.
- **Height trade-off:** noted above, not a defect.

</details>
