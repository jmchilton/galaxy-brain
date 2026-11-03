Run via gpt-6.1-sol (codex-cli 0.165.0).

# Codex review: invocation_graph_embedded_workflow_outputs

Codex reported one defect. I confirmed it and fixed it in the layout commit (`358177e10fa`), with a test that fails without the fix:

- **Author-overlapped steps.** A step the author placed overlapping a source in its own row could end up under the source's card. The step now settles after the source and moves past its cards, keeping row order.

The test-challenge pass had found the same case and left it as an open question. Nothing was refuted, and nothing is left for John.

Codex's sandbox (bwrap) can't start on this host ("loopback: Failed RTM_NEWADDR"), so the first run read nothing and returned an empty result. The second run stayed read-only and got everything on stdin: the full diff (`invocation_graph_output_previews..d024e8c7438`), the complete branch-head contents of every changed file, and some surrounding files. Those were `InvocationOutputPreview.vue`, `useNodePosition.ts`, `workflowBoundingBox.ts`, `workflowEditorStateStore.ts` and `useInvocationGraph.ts`. It reviewed the head after the performance pass.

<details>
<summary>Findings and triage</summary>

### 1. P2: existing overlapping steps can overlap a newly embedded card

**CONFIRMED.** In `embeddedOutputLayout.ts` a source settles from its right edge.
- A non-source row-mate that starts inside the source's span therefore settles first.
- The row-order rule then keeps their authored offset.
- The "source's cards clear a step to their left" rule is skipped for row-mates (the `else if`).
- So nothing separates that step from the card. Codex's case: two 144×55 steps at (0,0) and (100,0), with a 260×170 card on the first. The card sits at x=164 and covers 80px of the second step.

**Fix:** such a row-mate now settles at the source's right edge, after the source (sources win ties). It is then pushed past the source's cards:
- In Codex's case, the second step moves to x=444. Nothing overlaps, and the row order (0 < 444) is kept.
- Dropping the `else` instead was rejected. It would move the source onto the overlapped step, turning a partial authored overlap into a full one and tying their order.
- Test: "moves a step the author placed overlapping a source in its row past the source's embedded node". It fails on the previous code.
- **No regressions:** the 20,000-layout scratch fuzz is still clean. The offline measurements on the test workflow and four IWC layouts are unchanged, since none has author overlaps. Vitest passes: 47 files and 465 tests in `Workflow/Editor`, `Workflow/Invocation` and `useInvocationGraph`.

### Coverage notes

Codex reviewed the supplied contents only. `useInvocationGraph.ts` was supplied in full but flagged as an excerpt, and it could not run tests. It reported no duplicated logic and no missing abstraction.

</details>
