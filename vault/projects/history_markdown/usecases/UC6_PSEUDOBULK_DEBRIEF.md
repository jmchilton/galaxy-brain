# UC6 — Cell-type-resolved pseudobulk DE (COVID-19) — drive debrief

Driven via `/drive-scenario` against local Galaxy (backend 8080, dev client 5173), 2026-06-20.

## TL;DR

- **MVP is a faithful reproduction.** The shipped IWC `pseudo-bulk_edgeR.ga` runs end-to-end
  on the COVID-19 PBMC `AnnData`: pseudobulk QC plot, expression-filter plot, pooled
  `normal` vs `COVID-19` edgeR contrast → DEG table **(1,430 rows, byte-matches the test
  fixture)** + volcano. All genuine on-graph outputs.
- **The stretch machinery works; the biology does not survive.** Splitting the pseudobulk
  matrix by cell type → a 6-element collection → **mapped edgeR** (a clean paired
  collection map-over) is solid engineering and the spec's headline deliverable. But this
  dataset has **7 individuals (3 normal, 4 COVID)**; split across **6 cell types** →
  **2–4 samples/arm**.
- **Result: no robust cell-type-specific signal claimable.** The four best-powered cell
  types (B, T, monocyte, neutrophil) return **0 genes at FDR<0.05**. The *only* "significant"
  cell type is **platelet (2v2)** with **10 hits**, and those hits are **hemoglobin genes
  (HBB/HBA1/HBA2, FDR 1e-22…1e-33)** — RBC ambient-contamination markers in an anucleate
  cell type, amplified by small-*n* edgeR overconfidence. Textbook false positive: smallest
  sample, biologically implausible markers, absurd significance.
- **The honest biology pointer:** monocyte's strongest gene is **TNFAIP3** (NF-κB /
  inflammation — the *expected* COVID-monocyte response) at P≈8e-5 but **FDR≈0.11**:
  pointing the right way, underpowered at n=3.
- Transferable win = the decomposition workflow + the power/contamination teaching story.
  Same red-flag lesson as UC5: a lone extreme result from the smallest stratum is an
  artifact to debunk, not a finding.

## Artifacts

- **History** `b2486a20bc56b90f` (39+ datasets).
- **Page** `a676e8f07209a3be`, slug `uc6-pseudobulk-celltype-de-covid19`
  (`/published/page?id=a676e8f07209a3be`). Honest banner + 6 sections, all genuine
  on-graph directives (`history_dataset_as_image` / `_as_table` / `_collection_display` /
  `_embedded`).
- **MVP workflow** `UC6_pseudobulk_edgeR_MVP.ga` (20 steps; version-migrated shipped IWC
  workflow; re-import round-trips clean, invocation produced fixture-matching DEG).
- **Figures** (usecases dir): `uc6_report_full.png` (whole page), `uc6_report_top.png`
  (headline + banner + QC), `uc6_pseudobulk_qc.png`, `uc6_platelet_volcano_artifact.png`.

## Data structure (verified, gates the stretch)

`Source AnnData file.h5ad` (548 MB, Zenodo 13929549). obs: `cell_type`, `individual`,
`disease` (`normal` / `COVID-19`), raw `counts` layer, `gene_symbol` var.
**7 individuals:** Control_#1/2/3 (normal); SARS_CoV2_pos_Mild, Severe_#1/2/3 (COVID).
**6 cell types · 34 pseudobulk samples.** Per-(cell type × disease) sample counts:

| cell_type | normal | COVID | power |
|---|---|---|---|
| B_cell | 3 | 4 | ok |
| T_cell | 3 | 4 | ok |
| monocyte | 3 | 3 | ok |
| neutrophil | 3 | 3 | ok |
| erythroid_lineage_cell | 1 | 3 | **low (1 normal)** |
| platelet | 2 | 2 | **thin** |

`samples_metadata` carries only the `disease` factor — **cell_type is encoded only in the
sample-name suffix** `{individual}_{cell_type}`. Suffix parsing is unambiguous (all 34
samples resolved; cell-type suffixes are mutually non-overlapping).

## Pipeline as driven

1. **Upload** h5ad via `/api/tools/fetch` (Zenodo CDN, fast).
2. **MVP** — version-migrate shipped `.ga` (see drift below), import, invoke with the test
   yml params (`groupby=cell_type`, `sample_key=individual`, `layer=counts`,
   `factor=disease`, `formula=~ 0 + disease`, `gene_symbol`). Volcano step dropped from the
   workflow (major version break) and run separately.
3. **Per-cell-type subset** — for each cell type, `tp_awk_tool` keeps the gene column +
   matrix columns with header suffix `_{ct}$` → 6 count matrices; same suffix-filter on the
   factor file → 6 factor files. Assemble two **paired list collections** (id = cell_type).
4. **Mapped edgeR** — `edger` over (matrices, factors) collections, broadcasting the shared
   genes_metadata + contrast file → `list:list` of 6 per-cell-type DEG tables.
5. **Synthesis (on-graph)** — map `tp_awk` over the flat DEG list to (a) count FDR<0.05 rows
   and (b) emit sig-gene names; `collapse_dataset` (add_name=cell_type) → **responder
   ranking** table and **sig-genes-by-cell-type** table.
6. **Volcanoes** — `volcanoplot 4.0.3` on the pooled table and mapped over the per-cell-type
   DEG collection (PDF) → `graphicsmagick_image_convert` PDF→PNG for inline Page images.

## Version drift handled (shipped pins → installed)

The shipped `.ga` pins exact versions not installed. Patched `tool_id`+`content_id`+
`tool_version` per step and filled new optional params:

- `decoupler_pseudobulk` galaxy8→**galaxy10** — added `num_pseudo_replicates`, `seed` (optional → "").
- `tp_replace_in_line/column`, `tp_awk_tool` 9.3+galaxy1→**9.5+galaxy3** — added per-repeat `sed_options` ("").
- `edger` galaxy5→**galaxy7**; `collection_element_identifiers` 0.0.2→**0.0.3**.
- `volcanoplot` 0.0.6→**4.0.3+galaxy0** — full form restructure (`with_header|{header,fdr_col,
  pval_col,lfc_col,label_col}`, `labels|labels`); **dropped from workflow, run standalone**.

Gotcha: import keys off `content_id`, not just `tool_id` — patch both or the version
error persists.

## What I'd change / caveats

- **Power is the story.** 7 donors split 6 ways is below the threshold for per-cell-type
  pseudobulk DE. Even 3v3/3v4 yields 0 FDR hits. The responder ranking must carry per-arm
  counts (it does, in prose) — the lone non-zero entry being the *smallest* stratum is the
  tell.
- **Platelet contamination** — anucleate platelets carry ambient RBC RNA; HBB/HBA dominate.
  A real analysis would drop platelet (and likely erythroid) before per-cell-type DE, or add
  a contamination/ambient-RNA filter.
- **Generic on-graph split unavailable.** `anndata_manipulate` / `scanpy_filter` (the
  tutorial's split-by-`obs` path) and any transpose tool are **not installed**, so the clean
  "split AnnData → collection → map the whole workflow" approach wasn't possible; used
  awk-per-celltype column subsetting + API-assembled collections instead. Because the
  collections were API-built (no creating job), auto-extraction can't reconstruct the stretch
  as one clean `.ga` — hence MVP `.ga` shipped + stretch documented as recipe.
- `volcanoplot 4.0.3` emits **PDF only**; `history_dataset_as_pdf` renders as a live
  `<embed>` (blank in headless capture) → converted PDF→PNG on-graph for figures.
- `as_table` widgets are scroll-truncated to ~3 rows in static screenshots; live page is
  interactive, prose carries full numbers.

## Key IDs

History `b2486a20bc56b90f`; input h5ad `709ee9fb7b09a260` (hid1). MVP: pseudobulk QC
`aaa9bb27aeb7b84b` (hid5), filter `300f24fa15eda72e` (hid6), pooled DEG `6875c703d2301e12`
(hid15), volcano-table `07156755f40944e6` (hid18), report `28e1382d92a13bc5` (hid14),
MVP volcano PNG `25352d0f50169864`. Stretch: matrices coll `76fc6a61d2847f9c`, factors
`599c929992aefd6c`, flat DEG `75c5bc32ad0ce8b8`, mapped DEG list:list `4011851c940e7469`,
responder ranking `45bc061a4d279b5b`, sig-genes `7972115ae4a0dcf6`, volcano PNG coll
`dba3bb6dfae451b8` (platelet `fb5da8d37e7135b8`, monocyte `fda86291ff9ae1d6`).
