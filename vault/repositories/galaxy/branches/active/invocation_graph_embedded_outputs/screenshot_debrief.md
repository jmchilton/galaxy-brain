Run via claude-opus-5-5.

Screenshots successfully obtained.

Retaken for the deck polish revision (`b29dbd61b9c`): the grown-step label, compact tables, images sized to the box and card halos change every embedded frame, and the live frames now show demo content. The earlier frames and their debrief are in [earlier_drafts/1/](earlier_drafts/1/). How the live frames were made, the demo tool and its content, the anchors and the checks are in [presentation/capture_debrief.md](presentation/capture_debrief.md).

## How they were taken

- One Galaxy (this worktree's) and one invocation per workflow, seen through each stage's own client: this branch on Vite 5181, stage 2 on 5182. Stage 2's client ignores `preferred_output`, so each stage 2 frame here is stage 2's own rendering of the same invocation, with the same chrome. (Before, frame 18 was stage 2's view approximated on this branch's client.)
- The ChIP-seq and ATAC-seq workflows are layout replicas, and the "Output previews" live frames use a demo version of the E2E test workflow: same labels, positions, edges and workflow outputs, every tool step copying a prepared, synthetic file shaped like the real output. BAM and bigWig cards show Galaxy's real "No content found." for binary files. No frame shows a real tool result.
- Frames are 1280×1000 except 10 and 19, which use a 1600×1000 window so the fit has a wider canvas.

## Frames

| Frame | What it shows | Stage 2 counterpart | Source |
|---|---|---|---|
| `01_editor_star_e2e.png` | Editor: `create_2`'s `out_file2` starred, `out_file1` not. | - | E2E `workflow_editor_preferred_output_starred` |
| `02_editor_star_output_previews_a.png` | The E2E test workflow in the editor at 100%, Attributes panel closed, the whole graph in view. `head_table`'s `top_rows (tabular)` and `cat_table`'s `out_file1 (tabular)` starred. Outputs show real formats (change-datatype actions) and Best Practices has nothing to flag. | - | live |
| `03_editor_star_tooltip_hovered.png` | The same with `copy_image`'s star hovered and its tooltip. **Hovered on purpose.** | - | live |
| `04_output_previews_a_embedded.png` | Scenario a refit: `head_table` and `cat_table` grown and labelled; `top_rows` has no card. | - | E2E `invocation_graph_embedded_preferred_outputs` |
| `06_output_previews_a_embedded_closeup.png` | **Flip with 18.** Scenario a at 100%: `head_table` drawn as its table under the label `top_rows`, `cat_table` as its table under `out_file1`, pushed right. | 18 | live |
| `07_output_previews_b_embedded_closeup.png` | **Flip with 18.** Scenario b at 100%: `cat_table` as its table, `copy_image` as its plot, pushed right. | 18 | live |
| `08_output_previews_a_preferred_tables_100pct.png` | The E2E close-up of both grown, labelled tables. | - | E2E `..._zoomed` |
| `09_output_previews_b_copy_image_150pct.png` | `copy_image` drawn as its plot at 150%, the plot spanning the box. | - | live |
| `10_chipseq_typical_embedded.png` | ChIP-seq embedded and refit (43%, 1600 wide): Bowtie2, summary of MACS2 and MultiQC drawn as their outputs. | stage 2's 05 | live |
| `11_chipseq_typical_embedded_50pct.png` | **Flip with `stage2_07`.** ChIP-seq at 50%, pinned on Bowtie2: Bowtie2 drawn as its mapping stats; filter MAPQ30 stays at its authored place, 25 screen px left of stage 2's. | `stage2_07_...` | live |
| `12_chipseq_typical_embedded_80pct.png` | **Flip with `stage2_08`.** The MACS2 stack at 80%: summary of MACS2 drawn as its report; Call Peaks and Bigwig about 40 px left of stage 2's. | `stage2_08_...` | live |
| `13_atacseq_typical_embedded_50pct.png` | **Flip with `stage2_10`.** ATAC-seq at 50%: Compute fragment length histogram drawn as its plot; remove comments lines 82 screen px (164 workflow px) left of stage 2's. | `stage2_10_...` | live |
| `16_running_embedded_closeup_90pct.png`, `17_running_finished_closeup_90pct.png` | **Flip.** A running invocation at 90% with `final` starred: grown, labelled `final_table`, showing the not-ready message, then its table in place. Bounding boxes unchanged. | stage 2's 13/14 | live |
| `18_stage2_output_previews_embedded_closeup_live.png` | **Stage 2, not stage 3:** scenario a's invocation through stage 2's client, at the same pin as 06 and 07. | - | live, stage 2 client |
| `19_preferred_step_clicked.png` | Scenario a embedded (1600 wide) after clicking `head_table`: still drawn as its table, with the step details below on the Outputs tab, its dataset expanded. New (deck P8). | - | live |
| `stage2_07_...`, `stage2_08_...`, `stage2_10_...` | **Stage 2, not stage 3:** the counterparts of 11, 12 and 13, through stage 2's client. | - | live, stage 2 client |

Not retaken: scenario b's fit view (old 05) and the running fit-view pair (old 14 and 15); the PR description doesn't use them.

## Checks

Every anchored frame is within 0.15px of its anchor, and each stage 2 and stage 3 pair comes from one invocation in one sitting. The moves read off the driver's node positions match `layout_measurements.md` (see the capture debrief's Checks).
