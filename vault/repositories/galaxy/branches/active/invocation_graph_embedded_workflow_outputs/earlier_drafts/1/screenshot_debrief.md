Run via claude-opus-5-5 at high effort.

Screenshots successfully obtained.

## Screenshots

Every frame is 1280x1000. That is the E2E framework's fixed window (`DEFAULT_WINDOW_WIDTH` in `lib/galaxy/selenium/driver_factory.py`) and stage 1's frame size, so stage 1 and stage 2 frames line up on a slide. The live frames use the same viewport with the same panels (tool panel closed, history panel open on the invocation's own history), so every frame has the same 857x690 graph canvas. Pairs marked "flip" share zoom and pan, so they can be swapped in place on a slide.

All frames were taken with nothing hovered or focused and no tooltip showing, after the graph's refit and after images and previews had loaded.

### "Output previews" test workflow (E2E test)

Captured by `TestWorkflowInvocationGraph::test_embed_workflow_outputs` (Playwright backend), against stage 1's `WORKFLOW_OUTPUT_KINDS` workflow.

- `screenshots/01_output_previews_before_embedding.png`: the finished invocation at its authored layout (84%), with Embed Outputs off. Test screenshot `invocation_graph_before_embedding`.
- `screenshots/02_output_previews_embedded.png`: the same view with Embed Outputs on, refit to 53%. It shows six cards beside their steps (`top_rows`, `summary` and `final_table` tables, the `plot` image, the `lines` collection summary, the `numbers_b` text), shrunken step nodes, the steps right of the cards pushed right, and the inputs and first tool column unmoved. The toggle shows its pressed state. Test screenshot `invocation_graph_embedded_outputs`. Pairs with 01 at the same viewport, though not as a flip, since embedding changes the zoom.
- `screenshots/03_output_previews_embedded_closeup.png`: the embedded graph at 100%, around the `top_rows` table card, the `plot` card (the quality boxplot), and the `lines` collection card ("a list with 2 data datasets", elements 1 and 2), with their steps on the left and `head_cat`, `numbers` and most of the `summary` card on the right. The card content is legible here. Test screenshot `invocation_graph_embedded_outputs_zoomed` (new).

### IWC ChIP-seq PE layout replica (live server, invocation a799d38679e985db)

This is a layout replica, not the real workflow: it has the real IWC positions, labels, edges and workflow outputs, but the tools are swapped for test tools. Card contents are therefore placeholder text ("test") and small test tables, and the history lists test-tool dataset names. 12 steps, 9 workflow outputs.

- `screenshots/04_chipseq_before_embedding.png`: the whole workflow fit to the canvas (36%), Embed Outputs off.
- `screenshots/05_chipseq_embedded.png`: the whole workflow embedded and refit (33%). It shows nine cards, including the three cards of `Call Peaks with MACS2` (MACS2 peaks, narrowPeak, summits) stacked beside it with dashed connectors, and `MultiQC`'s two cards stacked lower right.
- `screenshots/06_chipseq_before_embedding_50pct.png` and `screenshots/07_chipseq_embedded_50pct.png` (flip): the middle of the workflow at 50%, pinned so `Bowtie2 map on reference` sits at the same spot in both frames. Bowtie2 and everything left of it stay put. `filter MAPQ30` moves 49 workflow pixels right to clear Bowtie2's `mapping stats` card, and `Call Peaks with MACS2` and everything after it move the same 49 pixels. The MACS2 stack, `MACS2 report` and `coverage from MACS2` appear on the right, partly cut by the frame edge.
- `screenshots/08_chipseq_embedded_macs2_stack_80pct.png`: a close-up at 80% of the three-card stack beside `Call Peaks with MACS2`, with `summary of MACS2` and its `MACS2 report` card above and `Bigwig from MACS2` and its `coverage from MACS2` card to the right.

### IWC ATAC-seq layout replica (live server, invocation df7a1f0c02a5b08e)

This is also a layout replica, built the same way. 42 steps.

- `screenshots/09_atacseq_before_embedding_50pct.png` and `screenshots/10_atacseq_embedded_50pct.png` (flip): the upper-left region at 50%, pinned on `Bowtie2 map on reference`. The `mapping stats` card appears beside Bowtie2, the `MarkDuplicates metrics` and `BAM filtered rmDup` cards stack beside `remove PCR duplicates`, and `histogram of fragment length` and `TSS Enrichment Score` appear lower down. Downstream steps shift right (`Call Peak with MACS2` moves to the right edge), and the left column stays fixed. The graph is dense, so many edges pass under the cards.

### Running invocation (live server)

`output_previews_running.gxwf.yml` is "Output previews" with `final` replaced by `cat_data_and_sleep` (240 s). It was invoked with `setup_live.py --no-wait` into its own history, "Output previews (running)" (invocation c385e49b9fe1853c), which is current in these frames. Two browser sessions opened it once the other six jobs were ok and `final` was running: one at the fitted view, one zoomed. Each toggled Embed Outputs, took its frame, and then stayed open, without reloading or re-toggling, until `final` finished.

- `screenshots/11_running_embedded.png`: embedded while `final` runs (53%). The `final` node is in its running state, the header shows "6 of 7 jobs complete" and Cancel Workflow, and the `final_table` card shows its not-ready placeholder while the other five cards have content.
- `screenshots/12_running_finished_embedded.png` (flip with 11): the same page after `final` finished. `final_table` has filled in with its table, and the header reads 7 of 7. Every step and card is at exactly the same screen position as in 11 (the driver compared their bounding boxes). Only the card's content and the step's state changed.
- `screenshots/13_running_embedded_closeup_90pct.png`: the same moment at 90%, around `head_cat`, `summary`, `final` and `final_table`. "This output isn't ready yet: the step is running." is legible in the `final_table` card, next to the running `final` node, with the finished `summary` table beside it.
- `screenshots/14_running_finished_closeup_90pct.png` (flip with 13): the zoomed page after `final` finished. The card filled in place. Bounding boxes were unchanged here too.

## Test changes

The test changes are in two commits. The screenshot-settling fix is folded into "Embedded outputs E2E: check connectors and static cards in the browser" (now `661f256534e`), which added the focus and tooltip handling it fixes. The close-up is a new commit, "Embedded outputs E2E: close-up screenshot of the cards at 100%" (`083f6eccb03`). Folding the close-up into the original "E2E test for embedding workflow outputs" commit conflicted with the two later commits that rewrote the same lines, so I made it a separate unit.

- **Focus ring on the toggle (fixed).** In the embedded screenshot, the pressed Embed Outputs button showed a light-blue focus halo and its darker hover/focus fill, even though the test blurs it before the screenshot. The cause was the button's 150 ms box-shadow and background transition: the screenshot came straight after the blur, mid-fade. A new `_settle_for_screenshot()` clears tooltips, drops focus, and then waits until `document.getAnimations()` has no running `CSSTransition`. It replaces the bare `clear_tooltips()` and `_drop_focus()` pair before the embedded screenshot.
- **Close-up screenshot (new).** After the embedded screenshot, `_zoom_in_around(...)` pans the fitted graph so that `top_rows`, `lines` and `head_cat` are centered. It drags from the middle of the canvas, which is background in this layout, through the existing `mouse_drag` helper (both backends). It then clicks the zoom control's reset (100%, which scales about the canvas center) and waits for the transform to change. After `_settle_for_screenshot()`, the test takes `invocation_graph_embedded_outputs_zoomed`. The toggle-off assertions that follow are unchanged and still pass, because node positions are in workflow coordinates.
- **navigation.yml.** New `invocations.graph_zoom_reset: '.invocation-graph .zoom-reset'`. The canvas uses the existing `workflow_editor.canvas_body` (`#workflow-canvas`), in keeping with this file's reuse of `workflow_editor.node` for the overview graph.

After the autosquash, the final tree matched the pre-rebase tree. `test_embed_workflow_outputs` and stage 1's `test_hover_previews_step_outputs` both pass on the rebased branch (Playwright, 166 s), and the worktree is clean. black, isort and ruff pass on the Selenium file.

## Product change: not-ready message inset (own commit)

One visual bug turned up in the running-invocation close-up: a card's "This output isn't ready yet: the step is running." sat flush against the card's left border, while the dataset and collection previews beside it are inset by 0.5rem. The fix is "Embedded outputs: inset the not-ready message in cards" (`4d64ca21529`). The message gets an `invocation-output-not-ready` class in `InvocationOutputPreview.vue`, and `InvocationEmbeddedOutputs.vue` pads it `0.25rem 0.5rem` inside cards, matching the collection summary. The hover popover pads its own body, so it is unchanged. The graph vitest suite (`client/src/components/Workflow/Invocation/Graph/`, 8 files, 49 tests) passes. `test_embed_workflow_outputs` passes after the fix, and frames 01-03 come from that run. Frames 11, 13 and 14 were taken after the fix.

## Notes for John

- Table cards render the dataset preview's pagination row ("« ‹ 1 › »") when the table component shows one. The MACS2 narrowPeak and summits cards in 07 and 08 and `BAM filtered rmDup` in 10 have it. The cards are inert, so these controls can't be used. This isn't a layout bug, and I left it alone, but it is visible on slides. Hiding pagination in embedded table cards would be a small follow-up if it bothers you.
- The edges of the original graph keep their routes and pass under the opaque cards (for example `head_table` to `final` under `top_rows` in 02 and 03, and several edges under the ATAC cards in 10). This is expected with nudge-only, but it is the busiest part of the dense frames.

## Not captured

- **The whole ATAC-seq graph.** Before and after embedding, the fit clamps at its 25% minimum and the graph overflows the canvas at both edges, so the whole-graph frames don't read well. Only the region pair (09 and 10) is kept.
- **Selenium-backend run of the new close-up.** Only the Playwright backend was run here. `mouse_drag` and the zoom reset click work on both backends, but the Selenium run wasn't exercised locally.

## Reproducing the live frames

The scratch driver, which isn't kept, was `shots3/shots.py` in the session scratchpad (Playwright, logs in as demo@example.org, makes the invocation's history current, closes the tool panel before the graph's first fit). Its `--anchor LABEL --anchor-at X,Y --zoom-delta N` options pan so that, after the reset to 100% and N zoom levels, that step's top-left lands at (X, Y) on the canvas. `--zoom-around` centers a set of steps and cards, and `--wait-ok-jobs 6 --after-wait-ok` drives the running-invocation pair.
