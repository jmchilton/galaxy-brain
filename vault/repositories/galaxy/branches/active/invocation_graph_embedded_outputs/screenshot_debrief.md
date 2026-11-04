Run via claude-opus-5-5 at high effort.

Screenshots successfully obtained.

## Screenshots

Every frame is 1280x1000, the E2E framework's window and the size stage 1 and stage 2 used. All the invocation frames, live and E2E, have the same panels as stage 2: the tool panel is closed and the history panel is open on the invocation's own history. That leaves the same 857x690 graph canvas in every frame. Nothing is hovered or focused and no tooltip shows, except in 03, which is named for its tooltip. Each frame was taken after the graph's refit and after its images and previews had loaded. I checked every frame by eye.

A frame marked **flip** has the same zoom and the same pan as its stage 2 counterpart, so the two can be swapped in place on a slide. For each flip I pinned a step that doesn't move in either stage (an input, or `Bowtie2 map on reference`) at the stage 2 frame's exact screen position. I then compared the two PNGs over a region that should not change between the stages. In every flip, that region lines up at zero shift.

Outside the canvas, a flip pair differs only in page chrome. The live stage 3 frames show history names such as "Output previews (preferred a)", and longer names wrap onto two lines in the history panel. Stage 2's 01-03 are E2E frames, with a test user and "Unnamed history". For a flip with identical chrome, 18 is stage 2's 03 retaken live on this server, and its canvas matches stage 2's 03 pixel for pixel.

| Frame | What it shows | Stage 2 counterpart | Flip | Zoom | Source |
|---|---|---|---|---|---|
| `01_editor_star_e2e.png` | Workflow editor: `create_2`'s `out_file2` starred (filled star) and `out_file1` unstarred (outline). | none (stage 2 has no editor frame; spike `11_editor_preferred_output_star.png`) | - | 100% | E2E `workflow_editor_preferred_output_starred` |
| `02_editor_star_output_previews_a.png` | The "Output previews (preferred a)" workflow in the editor. `head_table` (`top_rows`) and `cat_table` (`out_file1`) have filled stars. Every other tool output has an outline star. | none | - | 100% | live, stored workflow 2d9035b3fc152403 |
| `03_editor_star_tooltip_hovered.png` | The same view with the pointer on `copy_image`'s star. The tooltip reads "Display this step as this output in invocation graphs with embedded outputs." **Hovered on purpose.** | none | - | 100% | live, same workflow |
| `04_output_previews_a_embedded.png` | Scenario a, embedded and refit. `head_table` and `cat_table` are drawn as their tables at 260 px wide. `top_rows` has no card of its own (dedup). `cat_table`, `head_cat` and `final` are pushed right. | 02 | no (45% vs 53%) | 45% | E2E `invocation_graph_embedded_preferred_outputs` |
| `05_output_previews_b_embedded.png` | Scenario b, embedded and refit. `cat_table` is drawn as its table and `copy_image` as the quality plot, so `plot` has no card. | 02 | no (50% vs 53%) | 50% | live, invocation 4b187121143038ff |
| `06_output_previews_a_embedded_closeup.png` | Scenario a at 100%. `head_table` shows the `top_rows` table inside the step, exactly where stage 2 drew the step plus its card. `cat_table`'s table is pushed to x=603. `plot`, `lines`, `numbers` and `numbers_b` are unchanged. | 03 (and 18) | **flip** | 100% | live, invocation 2a56795cad3c7db3 |
| `07_output_previews_b_embedded_closeup.png` | Scenario b at 100%. `cat_table` shows its table in place. `copy_image` shows the plot, pushed right of `cat_table`. `head_table` and `top_rows` are pushed 116 px right. | 03 (and 18) | **flip** | 100% | live, invocation 4b187121143038ff |
| `08_output_previews_a_preferred_tables_100pct.png` | Scenario a at 100%, centered on `head_table` and `cat_table`: both steps' tables, legible, with `copy_image` and the `plot` card below. | 03 | no (centered on the stage 3 steps) | 100% | E2E `invocation_graph_embedded_preferred_outputs_zoomed` (new) |
| `09_output_previews_b_copy_image_150pct.png` | `copy_image` drawn as its image at 150%. The plot title ("boxplot of quality scores") and axes are readable. | none (03 shows the `plot` card at 100%) | - | 150% | live, invocation 4b187121143038ff |
| `10_chipseq_typical_embedded.png` | ChIP-seq PE typical, the whole graph embedded and refit. `Bowtie2 map on reference`, `summary of MACS2` and `MultiQC` are drawn as their outputs, and the MACS2 three-card stack is unchanged. | 05 | no (32% vs 33%) | 32% | live, invocation 417e33144b294c21 |
| `11_chipseq_typical_embedded_50pct.png` | The middle of the graph at 50%, pinned on `Bowtie2 map on reference`. Bowtie2 is now drawn as its `mapping stats` table, where stage 2 had a card beside it. `filter MAPQ30` sits 25 px (screen) further left than in stage 2, because the grown step is narrower than step plus card. | 07 (also 06, the unembedded frame) | **flip** | 50% | live, invocation 417e33144b294c21 |
| `12_chipseq_typical_embedded_80pct.png` | The MACS2 stack at 80%, pinned on Bowtie2 (off-canvas left) at stage 2's 08 position. `summary of MACS2` is drawn as its report, where stage 2 had the `MACS2 report` card. Because stage 3 pushes less, `Call Peaks with MACS2` and `Bigwig from MACS2` sit about 40 px (screen) left of their stage 2 positions, and `summary of MACS2` sits 12 px left. | 08 | **flip** | 80% | live, invocation 417e33144b294c21 |
| `13_atacseq_typical_embedded_50pct.png` | ATAC-seq typical, the upper-left region at 50%, pinned on `Bowtie2 map on reference`. `Compute fragment length histogram` is drawn as its output, and `remove comments lines` moves 164 px (workflow) left of where stage 2 put it, since the histogram card is gone. | 10 (also 09) | **flip** | 50% | live, invocation 5a1cff6882ddb5b2 |
| `14_running_embedded.png` | A running invocation embedded, with `preferred_output: out_file1` on `final` (`cat_data_and_sleep`, 240 s). `final` is in its running state and grown to 260x165. It shows "This output isn't ready yet: the step is running." inside the node, and no `final_table` card (dedup). The header reads 6 of 7 jobs. | 11 | no (59% vs 53%) | 59% | live, invocation 40876639881ca029 |
| `15_running_finished_embedded.png` | The same page after `final` finished. The table filled in inside the step, and the header reads 7 of 7. Every step and card is at the same screen position as in 14 (the driver compared bounding boxes). | 12 | flip with 14 | 59% | same |
| `16_running_embedded_closeup_90pct.png` | The running moment at 90%, around `head_cat`, `summary` and `final`. The not-ready message is legible inside the grown `final`. | 13 | no (different centering) | 90% | same, second session |
| `17_running_finished_closeup_90pct.png` | The zoomed page after `final` finished. The table filled in in place, and the bounding boxes are unchanged. | 14 | flip with 16 | 90% | same |
| `18_stage2_output_previews_embedded_closeup_live.png` | **Stage 2 reference, not stage 3.** Stage 2's 03 retaken live on this server, on the stage 2 invocation (no preferred outputs). Its canvas is pixel-identical to stage 2's 03. It is here so that 06 and 07 have a counterpart with the same live chrome. | 03 | flip with 06 and 07 | 100% | live, invocation c9468fdb6dc5c5f1 |

Checks on every frame:
- Grown steps are 260 px wide at 100% (208 at 80%, 130 at 50%) and line up with the 260-wide cards.
- Nothing overlaps.
- Tables in grown steps are legible at 80% and above. In 11 and 13 (50%) they are recognisable but small, as stage 2's cards were.
- Grown steps show no table pagination.

## Test changes (no product changes)

The test changes are in two commits, folded with fixup and autosquash. The final tree matched the pre-rebase tree.

- **`58ffc620081` Workflow editor: star an output as its step's preferred output.**
  - The bug: `workflow_editor_preferred_output_starred` showed a light box behind the filled star. That box is the star button's 150 ms hover fade (`background-color`/`color` CSS transitions on `.inline-icon-button`), caught mid-fade because the screenshot came right after the click.
  - The fix: the test now hovers off (`clear_tooltips()`) and waits until no `CSSTransition` is running before the screenshot, the same wait as the invocation graph test's `_settle_for_screenshot()`.
  - Why this commit: `test_star_preferred_output` was added in the editor commit, not in the E2E commit, so the fix is folded there.
- **`a8728b098c1` E2E test for steps shown as their preferred output in the invocation graph.**
  - The test now records the graph transform before toggling and waits for the refit before `invocation_graph_embedded_preferred_outputs`, as stage 2's test does. Before this, the frame could catch the pre-refit zoom.
  - It adds the close-up `invocation_graph_embedded_preferred_outputs_zoomed`, using `_zoom_in_around(head_table, cat_table)` at 100% (frame 08).

The graph commit is now `7e55164510f`. Only its parent changed. The branch is clean and not pushed.

Tests: `test_embed_shows_steps_as_their_preferred_output` and `test_star_preferred_output` pass on Playwright (the final code ran in two runs, 108 s and 30 s). black, isort and ruff pass on both Selenium files. There are no client changes, so I didn't run vitest.

## Problems hit

- **Vite served stale modules after the autosquash rebase.**
  - The rebase checks out intermediate commits, and Vite hot-reloaded them. Pages already open lost their embedded state (InvocationGraph remounted). Fresh loads then got a broken mix: grown steps 144 wide and the layout wrong.
  - `touch` on the branch's client files (mtime only; git status clean) made Vite re-transform them. After that, a fresh load matched the earlier frames pixel for pixel.
  - Frames 01-13 were taken before the rebase. 14-17 were retaken after the touch.
  - I first took this for a product bug ("Embed Outputs resets when a preferred-output step finishes"). It isn't: three later runs of the same scenario kept the embedded state across completion.
- ChIP-seq and ATAC-seq are layout replicas, as in stage 2. Grown steps show placeholder content ("test", a small test table), and MultiQC's "webpage" is a replica table.
- Only the Playwright backend was run, not Selenium.

## Reproducing the live frames

The scratch driver, which isn't kept, is `shots_s3/shots.py` in the session scratchpad.
- It is stage 2's `shots3/shots.py` pointed at Galaxy 8091 and Vite 5181, with `demo_key` regenerated through the master key.
- It waits for `[data-description="loading message"]` to clear and for CSS transitions to end.
- It adds `--exact-anchor`. A pan moves content only by whole screen pixels, so this option takes out the sub-pixel residue by panning one zoom level out and zooming back.

Commands (invocation, then options):
- Close-ups 06 and 07 (and 18 with c9468fdb6dc5c5f1, `--zoom-around top_rows,lines,head_cat` instead): `--exact-anchor --anchor table --anchor-at=-207,75.22 --zoom-delta 0`. This pins the `table` input where stage 2's 03 has it.
- ChIP 50% (11): `--exact-anchor --anchor "Bowtie2 map on reference" --anchor-at 29.53,180.65 --zoom-delta -5`.
- ChIP 80% (12): `--anchor "Bowtie2 map on reference" --anchor-at=-613,274.22 --zoom-delta -2 --exact-anchor`.
- ATAC 50% (13): `--exact-anchor --anchor "Bowtie2 map on reference" --anchor-at 29.5,260.0 --zoom-delta -5`.
- Image close-up (09): `--zoom-around copy_image --zoom-delta 4`.
- Running frames:
  - Setup: `measure3/setup3.py ... live/output_previews_running.gxwf.yml --preferred '{"final": "out_file1"}' --no-wait` (history "Output previews (preferred running)").
  - Fit pair (14 and 15): `--wait-ok-jobs 6 --after-wait-ok`.
  - Zoomed pair (16 and 17): add `--zoom-around head_cat,summary,final --zoom-delta -1`.
  - Two browser sessions ran at once.

The editor frames come from `shots_s3/editor.py <stored workflow id> <out> [--hover-star STEP:OUTPUT]`.

The stage 2 anchors were recovered by retaking each stage 2 frame live on this server and diffing it against the stage 2 PNG; `match.py` and `match2.py` both report zero shift. Retake frames only after any rebase has settled and the client files have been touched (or Vite restarted).
