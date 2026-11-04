Run via claude-opus-5-5 at high effort (measurement subagent, at `6e8a0a965c9`, before the normal review fixes; see the note below).

# Stage 3 layout measurements: steps shown as their preferred output

Branch `invocation_graph_embedded_outputs` at `6e8a0a965c9`, worktree's running Galaxy (8091) + Vite (5181). Offline numbers use the branch's real `layoutEmbeddedOutputs` from `@/components/Workflow/Invocation/Graph/embeddedOutputLayout` (scratch test copied into the worktree, run, removed; `git status` clean).

Scripts (in the session scratchpad, not kept): `measure3.test.ts` + `config.json` + `run.sh` (offline, writes `out.json`), `tables.py` (`out.json` -> `tables.md`, every row), `setup3.py` (live invocations with `preferred_output` set on the converted native dict), `probe3.py` (live measurement + close-ups), `live_summary.py`. Live outputs: `live_*/measure.json` + screenshots.

## Rules and sizes

- **Offline, as stage 2 measured:** steps 144x55, cards 260x170 (collections 260x120), fit zoom for an 880x600 canvas with 40px padding, clamped 25-100%. Moves are `x` deltas (nothing moves vertically, checked live too). "Order flips" are pairwise x/y sign changes against the authored layout. "New overlaps" are step pairs overlapping that didn't in the authored layout, plus any card overlapping anything. A "backward edge" is one whose target's left is left of its source's right edge (authored: with 144-wide steps).
- **Grown size, measured live** (test workflow, `head_table`/`cat_table`): **260x165** = header 27 + preview 136 (8.5rem) + 2 border. With a title that wraps at 16.25rem: 260x183. Offline "constant" sizing uses 29 + preview height, so 165 / 125 (6rem) / 101 (4.5rem); collections 29 + 84 = 113 (5.25rem) or 93 (4rem).
- **Shrunk size, measured live:** 144x**55** with a one-line title (header 27 + invocation text 26 + 2). **Terminal rows add no height in the invocation graph**: `NodeInput`/`NodeOutput` are `position-absolute` and blank there (`Node.vue`), so the number of terminals never makes a step taller. What does is the title wrapping at 9rem / 0.75rem: 73, 91, 109 for 2, 3, 4 lines. I measured every IWC title by cloning a live shrunk node and retitling it (`probe3.py --clone-labels`); the live replicas confirm the values (for example Fastp 91, Bowtie2 73).
- **Base size** is the branch's constant `SHRUNK_STEP_SIZE` 144x60, except in the Q1 "true base" variant.
- "constant" sizing = all steps 55 tall, grown 165 (the brief's default). "true" sizing = every step at its measured title-wrapped height, grown steps at their measured grown height. This reproduces stage 2's live numbers exactly (ATAC-seq stage 2: 527px largest move, offline and live).

## Preferred-output scenarios

The rule for IWC "typical": a step whose output is a report, table or image you would naturally want to see in place of the step (MultiQC webpage, MACS2 report, mapping stats, fragment-length histogram, count/taxonomy tables). This is 2-3 steps per workflow, and MultiQC is allowed even though it has two labeled outputs (its Stats card stays). "max": every tool step with exactly one labeled workflow output names that output. IWC outputs are treated as datasets, as stage 2 did. Step ids are `.ga` ids; output names are the real tool outputs offline and the replica's outputs live (cat1 `out_file1`; output_format `input_based_output` for the MultiQC webpage).

| Workflow | Scenario | Steps (output) |
|---|---|---|
| Output previews | a (E2E test) | head_table (out_file1, also workflow output top_rows, deduped), cat_table (out_file1, not a workflow output) |
| Output previews | b (spike) | cat_table (out_file1), copy_image (out_file1 = plot, deduped) |
| Output previews | c (offline only) | split_text (output, collection `lines`): exercises the collection height |
| ChIP-seq PE | typical | 9 summary of MACS2 (output: MACS2 report), 11 MultiQC (html_report: MultiQC webpage), 6 Bowtie2 map on reference (mapping_stats) |
| ChIP-seq PE | max | 6 Bowtie2 (mapping_stats), 7 filter MAPQ30 (output1), 9 summary of MACS2 (output), 10 Bigwig from MACS2 (out_file1) |
| CUT&RUN | typical | 12 summary of MACS2 (output), 14 MultiQC (html_report), 7 Bowtie2 (mapping_stats) |
| CUT&RUN | max | 7 Bowtie2 (mapping_stats), 12 summary of MACS2 (output), 13 Bigwig from MACS2 (out_file1) |
| dada2 paired | typical | 17 dada2: sequence counts (counts), 18 dada2: assignTaxonomy (output) |
| dada2 paired | max | 16 removeBimeraDenovo (stable_sequencetable), 17 sequence counts (counts), 18 assignTaxonomy (output) |
| ATAC-seq | typical | 17 Compute fragment length histogram (output1, png), 25 summary of MACS2 (output), 40 MultiQC (html_report) |
| ATAC-seq | max | 10 Bowtie2 (mapping_stats), 17 fragment histogram (output1), 20 Call Peak with MACS2 (output_narrowpeaks), 22 Take TSSE score (data_param), 25 summary of MACS2 (output), 27 Bigwig (no norm) (out_file1), 31 Merge summits (output), 34 normalize by million reads (outFileName), 35 number of reads in peaks (outfile), 41 normalize by million reads in peaks (outFileName) |
| (Q1 only) | stress | every tool step names its first output (ChIP 7, CUT&RUN 9, dada2 14, ATAC 34 grown) |

## Live invocations (user demo@example.org / demopassword; server 8091, Vite 5181)

Each one was imported as a native dict with `preferred_output` set, and its stored workflow checked (`/download?style=editor`). Each runs in its own history.

| History | History id | Invocation id | Stored workflow id (name) | Preferred outputs |
|---|---|---|---|---|
| Output previews (stage 2) | 63cd3858d057a6d1 | c9468fdb6dc5c5f1 | 417e33144b294c21 (Output previews (stage 2)) | none |
| Output previews (preferred a) | b472e2eb553fa0d1 | 2a56795cad3c7db3 | 2d9035b3fc152403 (Output previews (preferred a)) | head_table: out_file1, cat_table: out_file1 |
| Output previews (preferred b) | a7db2fac67043c7e | 4b187121143038ff | 5a1cff6882ddb5b2 (Output previews (preferred b)) | cat_table: out_file1, copy_image: out_file1 |
| IWC ChIP-seq PE (stage 2) | 4ff6f47412c3e65e | 1e8ab44153008be8 | d413a19dec13d11e (IWC ChIP-seq PE layout (stage 2)) | none |
| IWC ChIP-seq PE (preferred typical) | e89067bb68bee7a0 | 417e33144b294c21 | 2f94e8ae9edff68a (IWC ChIP-seq PE layout (preferred typical)) | summary of MACS2: out_file1, MultiQC: input_based_output, Bowtie2 map on reference: out_file1 |
| IWC ATAC-seq (stage 2) | 79966582feb6c081 | 2d9035b3fc152403 | 8237ee2988567c1c (IWC ATAC-seq layout (stage 2)) | none |
| IWC ATAC-seq (preferred typical) | 964b37715ec9bd22 | 5a1cff6882ddb5b2 | f09437b8822035f7 (IWC ATAC-seq layout (preferred typical)) | Compute fragment length histogram: out_file1, summary of MACS2: out_file1, MultiQC: input_based_output |

The workflows are the E2E test's `WORKFLOW_OUTPUT_KINDS` (renamed per scenario) and `SCRATCH/live/{chipseq-pe,atacseq}.replica.gxwf.yml`. All invocations completed with all jobs ok. Encoded ids from different tables coincide; for example `2d9035b3fc152403` is both a stored workflow and an invocation.

## Offline results (constant sizes, 8.5rem preview)

"vs stage 2" counts the steps whose x differs from the stage 2 result, and gives the range of those differences.

| Workflow | Scenario | Grown / cards | Moved | Largest | Mean (all / moved) | vs stage 2 | Bbox authored -> result | Fit zoom | Flips | New overlaps | Backward edges authored / result / from grown |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Output previews | stage 2 | 0 / 6 | 3 | 368 | 74 / 245 | - | 924x475 -> 1572x590 | 91% -> 55% | 0/75 | 0 | 0 / 0 / 0 |
| Output previews | a | 2 / 5 | 4 | 648 | 174 / 435 | 3, +0..+444 | -> 1852x590 | 91% -> 47% | 1/75 (a tie) | 0 | 0 / 0 / 0 |
| Output previews | b | 2 / 5 | 5 | 484 | 136 / 273 | 4, +0..+280 | -> 1688x590 | 91% -> 51% | 0/75 | 0 | 0 / 0 / 0 |
| Output previews | c (collection) | 1 / 5 | 3 | 368 | 57 / 191 | 1, -164 | -> 1572x590 | 91% -> 55% | 0/75 | 0 | 0 / 0 / 0 |
| ChIP-seq PE | stage 2 | 0 / 9 | 5 | 49 | 20 / 49 | - | 2279x780 -> 2608x1085 | 38% -> 33% | 0/132 | 0 | 0 / 0 / 0 |
| ChIP-seq PE | typical | 3 / 6 | 1 | 34 | 3 / 34 | 5, -49..0 | -> 2675x895 | 38% -> 32% | 0/132 | 0 | 0 / 0 / 0 |
| ChIP-seq PE | max | 4 / 5 | 1 | 34 | 3 / 34 | 5, -49..0 | -> 2559x1085 | 38% -> 34% | 0/132 | 0 | 0 / 0 / 0 |
| CUT&RUN | stage 2 | 0 / 10 | 5 | 603 | 107 / 320 | - | 2090x835 -> 2973x835 | 41% -> 29% | 1/210 | 0 | 0 / 0 / 0 |
| CUT&RUN | typical | 3 / 7 | 5 | 767 | 117 / 352 | 1, +164 (summary of MACS2) | -> 2973x835 | 41% -> 29% | 1/210 | 0 | 0 / 0 / 0 |
| CUT&RUN | max | 3 / 7 | 5 | 603 | 107 / 320 | 0 | -> 2809x835 | 41% -> 31% | 1/210 | 0 | 0 / 0 / 0 |
| dada2 paired | stage 2 | 0 / 3 | 0 (1 subpixel) | 0 | 0 | - | 2792x944 -> 3072x1008 | 31% -> 28% | 0/340 | 0 | 0 / 0 / 0 |
| dada2 paired | typical | 2 / 1 | 0 (1 subpixel) | 0 | 0 | 0 | -> 2908x1003 | 31% -> 30% | 0/340 | 0 | 0 / 0 / 0 |
| dada2 paired | max | 3 / 0 | 0 (1 subpixel) | 0 | 0 | 0 | -> 2908x1003 | 31% -> 30% | 0/340 | 0 | 0 / 0 / 0 |
| ATAC-seq | stage 2 | 0 / 14 | 18 | 354 | 64 / 150 | - | 3377x2585 -> 3993x2700 | 25% -> 25% | 19/1722 | 0 | 7 / 6 / 0 |
| ATAC-seq | typical | 3 / 11 | 18 | 354 | 54 / 125 | 4, -164..+41 | -> 3993x2700 | 25% -> 25% | 17/1722 | 0 | 7 / 7 / 0 |
| ATAC-seq | max | 10 / 4 | 14 | 190 | 40 / 120 | 9, -164..0 | -> 3674x2695 | 25% -> 25% | 13/1722 | 0 | 7 / 7 / 3 |

With true (title-wrapped) heights the stage 3 rows match the constant ones on the test workflow and ChIP-seq PE. Stage 2 itself grows on CUT&RUN (largest 772, 7 moved, fit 28%) and ATAC-seq (527, 22 moved). Against that stage 2, CUT&RUN typical is 767 (7 steps differ, -169..0) and ATAC typical is 527 (3 steps differ, -164..0); see `tables.md`. **No scenario creates an overlap.** The only order flip that stage 3 adds is a tie on the test workflow (numbers and cat_table both at x=704).

What the numbers say: on real IWC layouts, showing 2-3 steps as their output is neutral or better than stage 2. A grown step replaces a 260-wide card beside it (dedup), so less gets pushed: ChIP-seq PE goes from 4-5 steps moved 49px to 1 step moved 34px. The large pushes happen on the dense test workflow, where steps sit 110-120px apart in one column and a 165px-tall step necessarily grows into the next row.

## Live results (1280x1000, tool panel closed, fit after toggle; workflow coordinates)

| Workflow | Scenario | Grown / cards | Moved | Largest | Mean | Fit zoom before -> after | vs live stage 2 frame | New overlaps |
|---|---|---|---|---|---|---|---|---|
| Output previews | stage 2 | 0 / 6 | 3 | 368 | 74 | 84% -> 53% | - | 0 |
| Output previews | a | 2 / 5 | 4 | 648 | 174 | 84% -> 45% | cat_table +444, head_cat +280, final +280 | 0 |
| Output previews | b | 2 / 5 | 5 | 484 | 136 | 84% -> 50% | head_table +116, copy_image +280, head_cat +116, final +116 | 0 |
| ChIP-seq PE replica | stage 2 | 0 / 9 | 4 | 49 | 16 | 36% -> 33% | - | 0 |
| ChIP-seq PE replica | typical | 3 / 6 | 1 | 34 | 3 | 36% -> 32% | 4 steps -49..-15 | 0 |
| ATAC-seq replica | stage 2 | 0 / 14 | 21 | 527 | 128 | 25% -> 25% | - | 0 |
| ATAC-seq replica | typical | 3 / 11 | 21 | 527 | 120 | 25% -> 25% | remove comments lines -164, Normalize profile -164 | 0 |

Live moves match offline exactly on the test workflow (both scenarios) and ChIP typical. Live ATAC matches stage 2's recorded live numbers (21 moved, max 527). The fit zoom differs from offline (84% vs 91% before) only because the live canvas is 857x690, not 880x600. Every grown step rendered at 260x165. No step moved vertically.

## Q1. The constant base size (144x60)

- **How often a real shrunk step is taller than 60:** most IWC steps are, but because of title wrapping, not terminals (terminals take no height in the invocation graph). Steps over 60: ChIP-seq PE 10/12, CUT&RUN 11/15, dada2 15/19, ATAC-seq 39/42 (up to 109); test workflow 0/10 (all 55). Most preferred-output candidates are 73 or 91 tall. So the constant 60 is 5px too tall for one-line titles and 13-49px too short for wrapped ones.
- **Effect:** using the true base (each grown step's measured shrunk height) instead of 60 changes **nothing**, in every scenario on all five workflows. That includes the stress case where every tool step is grown (34 grown on ATAC-seq): moves, bounding box, zoom and edges are identical to the pixel (`tables.md`, Q1 table).
  - Why: `baseHeight` only decides whether two steps shared rows *before* growth. That matters only when another step's top lies 60-109px below a grown step's top and the pair is horizontally ordered. On these layouts every such pair already overlaps rows through its other step, or is further apart.
- **Deriving the base from the grown size doesn't work:** the title wraps differently at 16.25rem and 9rem. "Compute fragment length histogram" is 91 shrunk but 165 grown, so grown minus preview plus text gives 55. A true base would need the node's size measured before it grows. That is possible, since the step is shrunk before its preview loads, but it adds state.
- **Recommendation:** keep the constant; it is not worth code. The rebase debrief's premise ("a shrunk step with many terminals is taller") is wrong for the invocation graph; fix that wording where it is carried forward (debrief, PR text). Optionally note in the `SHRUNK_STEP_SIZE` comment that the height is a one-line title's, and that wrapped titles are up to 49px taller with no measured effect on the layout.

## Q2. Preview height (growth pushes far)

The offline Q2 table is in `tables.md`. The live probe confirmed the test workflow and IWC rows by overriding the CSS height on the running page (`live_tw_a`, `live_tw_b`, `live_chip_typ`, `live_atac_typ`: `previews` in `measure.json`).

| Workflow / scenario | 8.5rem (165 tall): largest, fit | 6rem (125): largest, fit | 4.5rem (101): largest, fit |
|---|---|---|---|
| Output previews a | 648, 47% (live 648) | 648, 47% (live 648) | **320, 56%** (live 320) |
| Output previews b | 484, 51% (live 484) | 484, 51% (live 484) | 484, 51% (live 484; 4 moved, mean 108 vs 136) |
| ChIP-seq PE typical / max | 34, 32% / 34, 34% (live 34) | 34 (live 34) | 0 (live 0) |
| CUT&RUN typical | 767, 29% | **440, 31%** | 333, 31% |
| CUT&RUN max | 603, 31% | 333, 32% | 333, 32% |
| dada2 typical / max | 0 | 0 | 0 |
| ATAC-seq typical | 354, 25% (live 527) | 354 (live 527) | 354 (live 527) |
| ATAC-seq max | 190, 25% | 190 | 148 (one new backward edge) |

Collections (scenario c, 5.25rem vs 4rem): no difference anywhere. The grown collection step stays within its row.

- **Legibility** (live close-ups at 100%: `live_tw_a/closeup_*.png`, `live_tw_b/closeup_*.png`):
  - At 8.5rem a table shows its header and 2 data rows, and the image is readable as a plot.
  - At 6rem the table shows the header and 1 data row.
  - At 4.5rem the table shows **only the header row, no data**, and the image is a thumbnail.
- **The push is all-or-nothing.** A grown step that reaches even 1px into another step's (or card's) row costs that step the full gap: 260 + 20. Scenario b at 6rem: cat_table (110..235) overlaps copy_image's row (230) by 5px, and copy_image still moves 280px.
  - So a shorter preview only helps once it clears the row pitch minus the header. On the test workflow that is about 80px (5rem); at that height a table preview shows no data rows.
- **The 444px push on the test workflow** is cat_table growing into the rows of the plot card beside copy_image, which keeps it right of that card (260 + 144 + 20 + 260 + 20 = 704). It is a property of that dense column, not of typical workflows.
  - Note: the E2E assertion that cat_table moves holds at 8.5rem and 6rem, but not at 4.5rem.
- **Recommendation:** keep 8.5rem (5.25rem for collections). It matches stage 2's card bodies (260x170, 260x120).
  - Neither a cap nor a shorter preview is clearly better. 6rem helps only CUT&RUN, and costs a table row. 4.5rem helps the synthetic test workflow and ChIP by 34px, but empties tables.
  - On real workflows at 8.5rem, stage 3 already pushes no more than stage 2: ChIP improves, ATAC and dada2 are unchanged, and CUT&RUN has one step +164 offline.
  - If long pushes on dense columns turn out to matter, the lever is the "grew into a row, so the full gap" rule, not the preview height. Changing that rule touches stage 2's push-right constraints, so I would not change it in stage 3.

## Q3. Backward edges from a grown step

- **Test workflow, ChIP-seq PE, CUT&RUN, dada2:** 0 backward edges for authored, stage 2 and stage 3 in every named scenario at every preview height.
- **ATAC-seq:** the authored layout already has 7 backward edges (the author stacked downstream steps below and left).
  - Stage 2 leaves 6. It happens to fix `reads in peaks multiQC -> MultiQC` by pushing MultiQC 301px for its cards.
  - Stage 3 typical leaves all 7. MultiQC is grown instead of carded, so it is pushed only 148px. That is the authored state, not a new backward edge.
  - In max, 3 backward edges start at grown steps (Call Peak with MACS2 -> Bigwig; number of reads in peaks -> 2 steps), and all 3 were already backward in the authored layout.
- **New backward edges caused by growth** (the gap the rebase debrief describes: flow is judged by base width, so a grown step's extra 116px can pass a downstream step in another row) appear only in:
  - the ChIP stress case, `Fastp* -> Bowtie2`, 7px: Fastp grows to 526..786 and Bowtie2 is at 779;
  - ATAC max at 4.5rem: `Merge summits* -> Compute coverage`.
- **Recommendation:** accept it and list it as a known limitation. No named scenario at the shipped size shows it. Fixing it (keeping downstream steps right of a grown source's new right edge) would add pushes for a cosmetic issue.

## Note on the review fixes

The normal review changed the base size from 144×60 to a deliberate underestimate of 144×55 (one title line), and now gives a base only to steps that are actually shown as their preferred output. In every scenario here, each named step is shown. Q1 shows that base-height accuracy changes nothing on these workflows. So the tables stand for head `0c2458ec608`.
