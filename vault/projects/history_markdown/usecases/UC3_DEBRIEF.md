# UC3 debrief — differential ATAC-seq accessibility (issue #14)

Built interactively via the notebooks MCP against the local Galaxy (worktree `history_pages`), 2026-06-13. Setup story in `SETUP_DEBRIEF.md`, operational facts in `index.md`. Siblings: `UC1_DEBRIEF.md`, `UC2_DEBRIEF.md`.

## Artifacts produced

| Thing | ID / location |
|---|---|
| History | `Differential ATAC-seq accessibility` — `7d08ada97da61dfd` |
| Notebook page | `36ddb788a0f14eb3` (history-attached) |
| Count matrix (chr11, 8 samples) | `2a4bf9d66c01414a`; per-sample files `6e7233e069aad1a7`,`6c322868fc97a6e5`,`227ea2970ce75d92`,`d836242eec778a25` (Bcell), `46be9598e9c0ce99`,`0b37776e18390093`,`c9e6d3334aa430f4`,`8ef77c0b9a2e8f61` (Eryth) |
| metadata / union peaks | `9c18ad129e678b2a` / `43d619180bf1008a` |
| DESeq2 result / plots / VST | `e98ef83f52349b9a` / `8a72a9a90df70b20` / `214222cd5aa9d49e` |
| Volcano (PNG) / PCA (PNG) | `d94929fc9baceae5` / `09a1e8ac238ed3d9` |

## Data-source decision

The issue's cited NK-cell ENCODE accessions (`ENCFF398QLV` etc.) are **6.5–11.7 GB unfiltered BAMs** — exactly what the issue says *not* to download for the MVP. Differential accessibility needs read *counts* over peaks → either huge BAMs or a precomputed matrix. Took the issue's preferred path (precomputed matrix): the **Corces 2016 human hematopoiesis ATAC count matrix** (GSE74912, `GSE74912_ATACseq_All_Counts.txt.gz`), a real peak × 132-sample table. Contrast: **Erythroblast vs B-cell** (donors as replicates), subset to **chr11** for runtime.

## Pipeline

```
Corces count matrix (stream-filter chr11 + 8 sample cols) ─► 8 per-sample count files + metadata + union_peaks.bed
   ─► DESeq2 (datasets_per_level, ~condition) ─► result table + PCA/sample-dist/dispersion plots + normalized/VST counts
   ─► filter NA p-values (awk) ─► Volcano Plot
   ─► top gained/lost peaks (awk) + marker validation
```

## Headline result (validates against canonical loci) — GENOME-WIDE

Originally run on chr11 (2,209 sig peaks). **Re-run genome-wide** at the user's request (the chr11 cap was the prior-agent issue's "keep small," not a real constraint — the full matrix was already downloaded; going genome-wide is just *not* subsetting, ~minutes more DESeq2). The genome-wide version is the notebook of record:

- **PCA: PC1 ≈ 98% variance** cleanly separating Erythroblast vs B-cell (Eryth_1 a mild PC2 outlier, doesn't cross the boundary).
- **45,620 significant differential peaks** of 590,650 (padj<0.05, |LFC|≥1): 34,873 B-cell-gained, 10,747 Erythroblast-gained.
- **Master-regulator validation (the genome-wide payoff):** the test resolves the lineage master TFs, each on the right side — **GATA1** (erythroid master TF, chrX, invisible at chr11; LFC −5.5) and **HBB** (−6.6) Eryth-gained; **PAX5** (chr9, +6.8), **EBF1** (chr5, +8.0), **CD19** (chr16, +4.0), **MS4A1/CD20** (chr11, +7.3) B-cell-gained. GATA1 vs PAX5/EBF1 is the actual erythroid↔B-lymphoid switch.
- **Genome-wide artifacts:** DESeq2 result `df6be339a52c816d`; volcano PNG `e1a34e8a9807a4ae`; PCA PNG `64ed206b5444cf1a`; 8 genome-wide count files `1db633912b8cbbf6`…`9301843aab84a406`.

## Snags / findings

1. **DESeq2 reference-direction gotcha.** Factor levels given Bcell(0), Erythroblast(1); the tool made **Erythroblast the reference**, so **LFC>0 = B-cell-gained**, LFC<0 = Eryth-gained — the *opposite* of my first labeling. Caught and corrected by checking marker loci (MS4A1 LFC>0, HBB LFC<0). Stated explicitly in the notebook.
2. **DESeq2 input is per-sample files, not a single matrix.** Both `datasets_per_level` and `sample_sheet_contrasts` modes want per-sample count files; split the matrix into 8 two-column files. Used `datasets_per_level` with nested repeats (`rep_factorName_0|rep_factorLevel_0|countsFile`).
3. **Volcano Plot column params live inside a `with_header` conditional.** Passing top-level `pval_col`/`header` silently used defaults → wrong column → `log10(non-numeric)` error. Correct paths are `with_header|pval_col` etc. Also had to drop 8 `NA`-padj rows first.
4. **PDF-only figure tools.** Volcano + DESeq2 plots output PDF; `history_dataset_as_image` needs an image. Converted PDFs→PNG locally (`sips`) and uploaded via the legacy multipart `upload1` endpoint (`curl -F`), then embedded.
5. featureCounts/bowtie2 not needed for the matrix MVP (the BAM branch is the issue's optional path).

## Review pass (subagent, live-verified) — corrections applied

A review subagent verified every claim against the live DESeq2 result and independent hg19 gene coordinates. Verdict: **clears the issue #14 MVP bar; headline numbers and the load-bearing GATA1/chrX claim all hold** (peak universe 590,650, sig 45,620 = 34,873/10,747, direction, and EBF1/MS4A1/HBB/GATA1 LFC+padj+locus all matched to the digit). Fixes applied (notebook rev `24d84bcf64116fe7`):

- **PCA % error:** notebook/debrief said 94%; the figure says **PC1 ≈ 98%** → corrected.
- **Shared-donor pseudoreplication (main methodological catch):** two pairs share a donor (B-cell ×2 Donor5483, Eryth ×2 Donor6926) → effective replication <4/condition, significance somewhat inflated. Added a `donor` column to the metadata (new dataset `daecbdd824e1c349`) + a caveat recommending a `~ donor + condition` design. Conclusions robust to it.
- **Denominator:** "45,620 of 590,650" was misleading (343,612 are NA/low-count-filtered); now "of ~247k testable peaks."
- **union_peaks mislabel:** the `union_peaks.bed` in the history is chr11-only; prose fixed to not imply a genome-wide BED.
- Softened: PAX5/CD19 are representative-peak values (footnoted); "no outlier samples" → Eryth_1 mild PC2 outlier; "the map *is* the lineage program" → "recovers the lineage master-regulator program (a chromatin correlate)."

Method confirmed sound: a legitimate DESeq2 negative-binomial test (internal size factors, healthy dispersion/p-value diagnostics), not overlap-counting — satisfies the issue's warning.

## Still-open gaps vs issue #14

- ~~One chromosome only~~ — **now genome-wide** (590,650 peaks).
- **No featureCounts/BAM branch** (issue's optional path; we started from the precomputed matrix).
- **No pyGenomeTracks/deepTools** genome-track or heatmap over top peaks.
- **Peak→gene annotation is manual** (marker check), not a `bedtools closest` step.
- **Workflow not extracted.**

## Extractability — analysis extractable; inputs are prepared data (acceptable)

Job-graph scan: 0 collections, but the **analysis steps are all real tool jobs** — `deseq2` → `tp_awk` (NA filter) → `volcanoplot`. The pasted datasets (count files, metadata, union peaks) are **prepared input data**, not externally-computed *results* injected into a step, so they are legitimate workflow inputs (a "count-files → DESeq2 → volcano" workflow). External work was limited to *preparing* the count matrix (stream-filtering the Corces download in bash) — that's data import, the input boundary, not a hidden computation in the analysis path. So **UC3 extracts** as-is.

Two refinements for a *cleaner* extracted workflow (not required for extractability):
- Feed the per-sample counts as a **collection** + the donor-aware `sample_metadata.tsv` and use DESeq2's `sample_sheet_contrasts` mode, instead of 8 individually-pasted files via `datasets_per_level` (8 fixed inputs → 1 collection input).
- The figure PNGs in the history were converted from PDF **locally** and re-uploaded purely for notebook embedding — they're not in the analysis path (the real volcano/PCA are the DESeq2/volcano tool outputs).

## Page-extraction audit — 2026-06-13 (the WORST of the three — notebook references the wrong artifacts)

The "UC3 extracts" claim above was a **history** job-graph scan. The real **page-based** extraction (`extract_next`/#22860) tells a very different story. Against page `36ddb788a0f14eb3`: 32 rows, but only **2 seeded, 0 exposed outputs, 0 tool steps, 0 ICJ.** The two seeds are both `Upload File` inputs — the **re-uploaded PNG figures** (`DESeq2 PCA genome-wide`, `Volcano genome-wide`). The full genome-wide pipeline (`deseq2 on dataset 22-29` → `tp_awk` → `volcanoplot`) **is in the history but entirely unreferenced by the notebook**, so it seeds nothing. A page extraction here yields a degenerate 2-input / 0-tool "workflow."

**Root cause — the figure-display anti-pattern, fatal for notebook extraction.** Volcano/DESeq2 emit **PDF**; `history_dataset_as_image` needs an image; so the figures were converted PDF→PNG **locally** and re-uploaded, then displayed. Those uploads are disconnected from the DESeq2 provenance, so walking back from them hits the upload boundary immediately. The note above ("they don't affect extraction") is true for *history* extraction but **exactly wrong for notebook extraction** — they are the *only* things the notebook references.

**To make UC3 a real notebook-extraction demo, the notebook must display artifacts on the provenance path:**
1. Reference the **actual tool outputs** (the `volcanoplot` / DESeq2 outputs), not re-uploaded copies.
2. Solve the PDF-vs-image display: either run a figure tool that emits **PNG directly** (as UC2's `ggplot2_heatmap2` does — which is why UC2's figure extracts), or add an **in-Galaxy PDF→PNG conversion tool step** so the displayed image sits on the graph. Then walking back from the displayed image reaches DESeq2 and seeds the whole pipeline.

This is the same family as UC1's pasted matrices and UC2's pasted comparison — **values/artifacts produced outside Galaxy and pasted/re-uploaded back** — but here it's total: the notebook shows *only* off-graph artifacts, so extraction seeds *nothing*. Cross-cutting lesson across all three: **notebook extraction is only as good as what the notebook displays** — every figure/result a notebook shows must be a real on-graph tool output, or the subgraph behind it is empty.

## Path forward — the PDF figure problem (investigated 2026-06-13)

Confirmed the constraint is real and not a one-off: **both plotting tools emit PDF only** — `iuc/volcanoplot` hardcodes `pdf("volcano_plot.pdf")` (no format param), `iuc/deseq2`'s `output_selector` offers only `pdf` for plots. The notebook renderer's `handle_dataset_as_image` base64-embeds a **raster** (assumes PNG/JPG) — it does not rasterize PDF. No active PDF→image converter tool is installed. So "just choose PNG" is unavailable, and this PDF-vs-image gap will recur for the large class of R/Bioconductor tools that emit PDF. Four paths, with a recommendation:

**(A) Strategic / root-cause — teach the notebook renderer to display PDFs.** Extend `handle_dataset_as_image` to rasterize the **first page** of a PDF HDA server-side (e.g. `pymupdf`/`pdf2image`+poppler) → embed as PNG; this works for both the live notebook view and the WeasyPrint-baked report (both need a raster, not a PDF blob). Because `history_dataset_as_image` is **already in the extraction collector taxonomy**, the notebook can then reference the *real* volcano/DESeq2 PDF output directly — it renders **and** extraction seeds volcano→DESeq2 for free. Minimal surface (one handler branch + a raster dep), and it eliminates the entire "tool emits PDF → can't display → re-upload PNG → break provenance" class for every PDF tool. This is the highest-leverage place to spend the offered "extend the renderer" effort. (Galaxy already shows PDFs in the dataset view; this reuses that capability inside the notebook directive.)

**(B) Immediate / unblocks the demo today — an in-Galaxy PDF→PNG tool step.** Install an ImageMagick/GraphicsMagick `convert` tool (needs a **ghostscript** delegate to read PDF) and insert `volcano.pdf → convert → volcano.png → history_dataset_as_image`. The PNG is now an on-graph tool output, so extraction walks back convert→volcano→DESeq2 and seeds the whole pipeline. Zero Galaxy code change, works now, generalizes. Cost: one extra step per figure + the converter install; rasterizing vector is fine for display. _Verify the converter handles PDF (ghostscript delegate present in the container)._

**(C) Alternative — replace the PDF plotters with PNG-native tools.** Rebuild the volcano from the DESeq2 result table with a generic `ggplot2` point tool that emits PNG (exactly how UC2's `ggplot2_heatmap2` with `image_file_format=png` extracts), and regenerate the PCA from DESeq2 normalized counts (`normCounts`/`normVST`, already selectable in `output_selector`) via a PNG-emitting PCA/ggplot2 tool. Cleanest graph (figure is a native tool output, no convert, no renderer change) but the most analysis rework, and the PCA must be re-derived.

**(D) Upstream — add an `image_file_format` (PNG/PDF/SVG) param to `volcanoplot`/`deseq2` plots.** Correct for the ecosystem long-term; slow (PR to IUC tools), out of band.

**Recommendation:** do **(B) now** to make UC3 an extractable demo immediately, and pursue **(A)** as the real fix — it's a recurring Galaxy-notebook papercut, not a UC3 quirk, and the offered renderer work pays off across every PDF-emitting tool. (C) is a fine substitute for (B) if you'd rather not install a converter; (D) is the upstream-correct long game.

**To redo UC3 extractably (next run):** keep the existing extractable spine — counts (ideally one collection + `sample_sheet_contrasts`, per the refinement above) → `deseq2` → `tp_awk` (NA filter) → `volcanoplot`. Then, depending on the path chosen: (A) reference the volcano/DESeq2 **PDF outputs directly** via `history_dataset_as_image`; or (B/C) display the **PNG produced by a convert step or a PNG-native plot tool**. Either way the notebook references on-graph tool outputs, so page extraction seeds the full DESeq2 pipeline instead of two dead uploads. _Not executed this session — Docker was down, so no tool jobs could run; this is the documented next-run recipe._

## CLEAN REBUILD — 2026-06-13 (Path A renderer fix executed; extraction now seeds the full pipeline)

Rebuilt in a clean history and **fixed the PDF-figure blocker at the root (Path A — extend the renderer)**. Result: the notebook references the **real on-graph PDF outputs**, page extraction seeds the **entire DESeq2 pipeline** (vs the original's degenerate 2-dead-uploads / 0-tools), and the extracted workflow is a pristine 5-step DAG.

Artifacts:
- History `Differential ATAC-seq accessibility (clean, extractable)` — `241d84796a24640a`
- Notebook page `a7e42332dab8f5db`; extracted workflow `0a248a1f62a0cc04` (`/tmp/uc3_workflow.ga`)
- counts collection `eca0af6fb47bf90c` (list of 8) + sample sheet `8988d7127d7495f1`; DESeq2 result `a688b28870072064`, plots PDF `3fc611c177312662`, volcano PDF `bc5426068173df4b`

Pipeline (clean, `sample_sheet_contrasts` = 1 collection input):
`ATAC counts (collection) + sample sheet → DESeq2 → tp_awk (NA filter, $6!="NA" && $7!="NA") → volcanoplot`. Science reproduced **exactly**: 590,650 peaks, 343,612 NA, **45,620 sig = 34,873 B-cell-gained (LFC>0) + 10,747 Eryth-gained** (Erythroblast=reference); master regulators on the right sides (GATA1/HBB Eryth, PAX5/EBF1/MS4A1/CD19 B-cell).

**Path A — the renderer fix (the strategic root-cause fix the user chose):**
- **`Pdf.handle_dataset_as_image`** (`lib/galaxy/datatypes/images.py`) now rasterizes the PDF's **first page → PNG** via **PyMuPDF** (`pymupdf`, optional import with graceful fallback, mirroring the PIL pattern). Added `pymupdf` to `packages/data/pyproject.toml`.
- **`ToBasicMarkdownDirectiveHandler.handle_dataset_as_image`** (`lib/galaxy/managers/markdown_util.py`) now **delegates to the datatype** (no explicit `path`), so the format-specific rendering (PDF→PNG) applies to the baked report / HTML / PDF export. Preserves the composite-dataset `path` branch + a raw-bytes fallback.
- **Unit test** added: `test/unit/data/datatypes/test_images.py::test_pdf_handle_dataset_as_image_rasterizes_to_png` (skips if pymupdf absent) — asserts a PNG data-URI with valid magic bytes. Verified: image suite 40 passed, markdown suite 58 passed, no regressions. Also verified live on the real volcano PDF (renders the Down/Up/Not-Sig plot correctly).

**Why this is the right fix:** the extraction collector (`_ReferencedContentCollector`) already records `history_dataset_as_image` references **regardless of format** — so referencing the real volcano/DESeq2 PDFs *seeds extraction for free*; the only thing PDF broke was **display**. Extending the renderer makes the notebook reference the genuine tool output (no re-uploaded-PNG anti-pattern), which is exactly what lets extraction walk back from each figure to DESeq2. One change fixes the **entire class** of PDF-emitting R/Bioconductor tools.

**Extraction — VERIFIED clean.** Page summary: 13 rows, all seeded, 0 warnings, 3 exposed (DESeq2 result + plots PDF + volcano PDF). Extracted `.ga` (passing only the counts collection as input, not its 8 element copies): **5 steps — `data_collection_input` (counts) + `data_input` (sample sheet) → DESeq2 → tp_awk → volcanoplot — all connected, 3 workflow outputs, report 0 leftover ids.** (Note: seeding the collection's 8 element HDAs yields 8 orphan inputs; pass only the collection for a pristine workflow.)

**Remaining (frontend follow-up, out of this scope):** the live in-app Vue notebook view (`DatasetAsImage.vue`) fetches `dataset/display` and checks `content-type: image/*` — for a PDF it shows a "not an image" warning. The server-side renderer fix covers the **baked report / HTML / PDF export** (what extraction produces); making the *live* view show PDFs inline needs a small complementary client change (request a rasterized variant) + deploy (client build). The WeasyPrint PDF-conversion service is also not installed in this env (the `/api/pages/{id}.pdf` endpoint returns 501), but that's downstream of the renderer change.

## Suggested next moves

Complete the live-view frontend tweak + add WeasyPrint for full PDF export, pyGenomeTracks/heatmap over MS4A1 vs HBB loci, nearest-gene annotation, or the featureCounts BAM branch. UC3 is now a **fully-extractable** issue-#14 demo, and the renderer fix generalizes to every PDF-emitting tool.
