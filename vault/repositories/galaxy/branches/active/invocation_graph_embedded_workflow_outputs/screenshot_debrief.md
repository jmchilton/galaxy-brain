Run via claude-opus-5-5.

Screenshots successfully obtained.

Retaken for the deck polish revision (`95fa1ee00df`): compact tables, images sized to the card and a halo round each card change every embedded frame. The earlier frames and their debrief are in [earlier_drafts/1/](earlier_drafts/1/). How the live frames were made, and the demo content, are in stage 3's [presentation/capture_debrief.md](../invocation_graph_embedded_outputs/presentation/capture_debrief.md).

## Demo content

The live frames no longer show test-tool placeholders ("test", the same three-column test table everywhere). The ChIP-seq and ATAC-seq workflows are layout replicas, as before (IWC's real positions, labels, edges and workflow outputs), but every tool step now runs a demo tool that copies a prepared file shaped like the real output: a Bowtie2 alignment summary, MACS2 peaks and summits, a MACS2 summary, a fragment length plot, a MultiQC stats table and page. BAM and bigWig outputs are Galaxy's own binary test files, so their cards show what Galaxy really shows for them: "No content found." None of it is a real tool result.

## Frames

All frames are taken with stage 2's own client (Vite on port 5182) against the stage 3 worktree's Galaxy, whose backend is stage 2's plus the preferred-output field; the stage 2 client ignores that field. Nothing is hovered or focused. Pairs marked flip share zoom and pan.

| Frame | What it shows | Source |
|---|---|---|
| `01_output_previews_before_embedding.png` | The E2E "Output previews" invocation at its authored layout (84%), Embed Outputs off. | E2E `invocation_graph_before_embedding` |
| `02_output_previews_embedded.png` | The same with Embed Outputs on, refit to 53%: six cards, tables showing all five rows. | E2E `invocation_graph_embedded_outputs` |
| `03_output_previews_embedded_closeup.png` | The E2E close-up at 100%: compact `top_rows` table, the quality plot sized to its card, the `lines` collection summary. | E2E `invocation_graph_embedded_outputs_zoomed` |
| `04_chipseq_before_embedding.png` | The whole ChIP-seq replica, Embed Outputs off, in a 1600×1000 window (50%). | live |
| `05_chipseq_embedded.png` | The same embedded and refit: nine cards, MACS2's three stacked beside Call Peaks. | live |
| `05b_chipseq_toggled_off.png` | The same page after toggling off: every step at its authored position, matching 04 at zero shift (2,106 antialiased pixels differ). New. | live |
| `06_chipseq_before_embedding_50pct.png`, `07_chipseq_embedded_50pct.png` | **Flip.** The middle at 50%, pinned on Bowtie2. Four steps move 49 workflow px; the cards show the alignment summary and peak tables. | live |
| `08_chipseq_embedded_macs2_stack_80pct.png` | The MACS2 stack at 80%: peaks (with the file's own header row), narrowPeak, summits; the MACS2 report card. | live |
| `09_atacseq_before_embedding_50pct.png`, `10_atacseq_embedded_50pct.png` | **Flip.** ATAC-seq's upper left at 50%, pinned on Bowtie2; the fragment length plot fills its card; edges end at the cards' halos. | live |
| `13_running_embedded_closeup_90pct.png`, `14_running_finished_closeup_90pct.png` | **Flip.** A running invocation at 90% (`final` waits 240 s): the `final_table` card's not-ready message, then its table in place. The driver compared every step's and card's bounding box: unchanged. | live |
| `15_demo_content_embedded_closeup.png` | The demo-content version of "Output previews" at 100%: named columns, a wide plot filling its card, a named list. New. | live |

The PR description uses 01–03, 06–10, 13 and 14. Not retaken: the running fit-view pair (old 11 and 12); the running close-ups carry the same evidence.

## Problems hit

- A Cheetah parameter named `sleep` in the demo tool collides with `Template.sleep`, so its first runs failed; renamed `wait_seconds`.
- The fit views were first taken with the history panel collapsed, but the graph's first fit runs before the collapse, so the before and toggled-off frames differed in zoom. A 1600px-wide window gives the canvas the same width throughout (deck P7).
