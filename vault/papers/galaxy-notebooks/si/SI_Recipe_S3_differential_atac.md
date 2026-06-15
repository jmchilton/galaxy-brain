# UC3 Setup Recipe — Differential ATAC-seq Accessibility

**Issue:** https://github.com/jmchilton/galaxy-brain/issues/14
**Science:** Genome-wide differential ATAC-seq accessibility, Erythroblast vs B-cell (Corces 2016, hg19). Headline: 45,620 significant peaks; GATA1/HBB Erythroblast-gained; PAX5/EBF1/MS4A1/CD19 B-cell-gained.
**Extracted workflow ID on reference server:** `0a248a1f62a0cc04` (`/tmp/uc3_workflow.ga`) — 5 steps, zero dangling, 3 workflow outputs.

> Server-agnostic recipe. Tool versions/params confirmed against the reference server (Galaxy 26.2.dev0). **Requires the PDF-renderer Galaxy code change** (see §1) for the notebook figures to display and seed extraction.

---

## 1. Tools to Install

```bash
shed-tools install -g http://<SERVER>:8080 -a <ADMIN_KEY> \
  -t atac-differential-tools.yml --skip-install-resolver-dependencies
```
`atac-differential-tools.yml` installs: macs2 (iuc), bedtools (iuc), text_processing (bgruening), featurecounts (iuc), deseq2 (iuc), volcanoplot (iuc), the deeptools suite (bgruening), pygenometracks (iuc). The extractable spine only needs deseq2, text_processing, volcanoplot.

### Confirmed tool IDs and versions
| Tool | Full tool ID | Version |
|---|---|---|
| deseq2 | `toolshed.g2.bx.psu.edu/repos/iuc/deseq2/deseq2` | `2.11.40.8+galaxy2` |
| volcanoplot | `toolshed.g2.bx.psu.edu/repos/iuc/volcanoplot/volcanoplot` | `4.0.3+galaxy0` |
| tp_awk_tool | `toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_awk_tool` | `9.5+galaxy3` |

Builtin (no install): `__DATA_FETCH__` (pasted-content / collection upload).

### Required Galaxy code change — PDF-as-image renderer + `history_dataset_as_pdf` directive
UC3's figures (DESeq2 diagnostics, volcano) are **PDF**. The notebook references the real PDF outputs (no re-uploaded screenshots), which requires this code (shipped in the same branch as PR #22860):
1. **`lib/galaxy/datatypes/images.py`** — `Pdf` rasterizes a chosen 1-based page to PNG via **PyMuPDF** (`Pdf.render_pdf_page_as_image_markdown` / `_page_as_png`; optional import with graceful fallback; size-clamped). `handle_dataset_as_image` delegates to page 1.
2. **`lib/galaxy/managers/markdown_util.py`** — the report renderer (`ToBasicMarkdownDirectiveHandler`) delegates to the datatype so PDFs rasterize for the baked report/HTML/PDF export; the extraction collector records the reference regardless of format (so a PDF reference seeds extraction).
3. **New `history_dataset_as_pdf(history_dataset_id, page=N)` directive** — registered in `markdown_parse.py` (VALID_ARGUMENTS), `markdown_util.py` (dispatch + handlers, incl. `_ReportLabelRewriter`), the `Pdf` datatype (arbitrary page), and the client (`client/src/components/Markdown/Sections/Elements/HistoryDatasetAsPdf.vue` + `MarkdownGalaxy.vue` branch + directives.yml/requirements.yml/MarkdownToolBox/MarkdownHelp/templates.yml). Live view embeds the page with chrome hidden (`#page=N&toolbar=0&navpanes=0`); the baked report rasterizes the page.
4. Add **`pymupdf`** to `packages/data/pyproject.toml` + `lib/galaxy/dependencies/pinned-requirements.txt` (or `uv pip install pymupdf` into the venv). If absent, PDF rendering falls back gracefully (no rasterization).

Without this code, PDF figures show "not an image" warnings and operators fall back to re-uploading screenshots — which **breaks extraction** (the notebook then references off-graph uploads → seeds 0 tools).

---

## 2. Reference Data / DB Setup
None. The analysis starts from a precomputed count matrix (§3).

---

## 3. Input Data

### Source: Corces 2016 hematopoiesis ATAC-seq count matrix
- GEO `GSE74912`, file `GSE74912_ATACseq_All_Counts.txt.gz` (590,650 peaks × 132 samples), hg19.
- `https://ftp.ncbi.nlm.nih.gov/geo/series/GSE74nnn/GSE74912/suppl/GSE74912_ATACseq_All_Counts.txt.gz`

### Sample selection (8 samples, donors as replicates)
| Sample | Condition | Donor |
|---|---|---|
| Bcell_1 | Bcell | Donor1022 |
| Bcell_2 | Bcell | Donor4983 |
| Bcell_3 | Bcell | Donor5483 |
| Bcell_4 | Bcell | Donor5483 |
| Eryth_1 | Erythroblast | Donor2596 |
| Eryth_2 | Erythroblast | Donor5483 |
| Eryth_3 | Erythroblast | Donor6926 |
| Eryth_4 | Erythroblast | Donor6926 |

Bcell_3+4 share Donor5483; Eryth_3+4 share Donor6926 (shared-donor pseudoreplication; effective replication <4/condition; significance somewhat inflated; conclusions robust; a `~ donor + condition` design is preferable).

### Preparation (data-import boundary, done outside Galaxy)
Split the matrix into 8 per-sample two-column count files (`peak_id <TAB> count`, no header, 590,650 rows each). This stream-filter is the input boundary (acceptable prepared data), not an analysis step.

### Upload to Galaxy
Upload the 8 count files as a `list` collection named `ATAC counts` (element identifiers exactly `Bcell_1..4`, `Eryth_1..4` — must match the sample sheet), plus the sample sheet as one tabular dataset `ATAC sample metadata (with donor)`:
```
sample	condition	donor
Bcell_1	Bcell	Donor1022
Bcell_2	Bcell	Donor4983
Bcell_3	Bcell	Donor5483
Bcell_4	Bcell	Donor5483
Eryth_1	Erythroblast	Donor2596
Eryth_2	Erythroblast	Donor5483
Eryth_3	Erythroblast	Donor6926
Eryth_4	Erythroblast	Donor6926
```

---

## 4. Pipeline Steps

### Step 1 — DESeq2 `…/deseq2/2.11.40.8+galaxy2`
```json
{"select_data": {"how": "sample_sheet_contrasts",
   "countsFile": "<counts_collection>", "sample_sheet": "<sample_sheet_dataset>",
   "design_formula_mode": {"mode": "automatic", "factor": ["2"],
     "reference_level": "Erythroblast", "target_level": "Bcell"}},
 "batch_factors": null, "header": "true", "tximport": {"tximport_selector": "count"},
 "advanced_options": {"auto_mean_filter_off": false, "fit_type": "1",
   "outlier_filter_off": false, "outlier_replace_off": false, "use_beta_priors": false},
 "output_options": {"alpha_ma": "0.1", "output_selector": ["pdf", "normCounts", "normVST"]}}
```
**CRITICAL — direction:** `reference_level="Erythroblast"` ⇒ **LFC>0 = B-cell-gained**, **LFC<0 = Erythroblast-gained** (opposite of intuition). Confirm via a marker (MS4A1/CD20 chr11 should be LFC>0). Outputs used: result table (tabular), diagnostic plots PDF (5 pages; page 1 = PCA).

### Step 2 — tp_awk NA filter `…/tp_awk_tool/9.5+galaxy3`
Input: DESeq2 result table. Columns: 1=peak_id, 2=baseMean, 3=log2FC, 4=lfcSE, 5=stat, **6=pvalue, 7=padj**.
```awk
$6!="NA" && $7!="NA"{print}
```
(volcanoplot errors on NA-padj rows; drop them first.)

### Step 3 — volcanoplot `…/volcanoplot/4.0.3+galaxy0`
**CRITICAL — column params live inside the `with_header` conditional** (top-level `pval_col`/`header` are silently ignored → wrong column → `log10(non-numeric)` error):
```json
{"with_header": {"header": "no", "label_col": "1", "lfc_col": "3", "pval_col": "6", "fdr_col": "7", "shape_col": null},
 "signif_thresh": "0.05", "lfc_thresh": "1.0", "labels": {"label_select": "none"},
 "plot_options": {"boxes": false, "legend_labs": "Down,Not Sig,Up", "title": null}}
```
(`header="no"` because the DESeq2 result here is headerless — verify on your server.) Output: volcano PDF.

---

## 5. Figures (the new directive)
- PCA: `history_dataset_as_pdf(history_dataset_id=<DESeq2_plots_PDF>, page=1)` (page 1 of the 5-page diagnostics = PCA).
- Volcano: `history_dataset_as_pdf(history_dataset_id=<volcano_PDF>, page=1)`.

Both reference the **real on-graph PDF outputs**; the directive rasterizes the page for the baked report. **Do not re-upload PNG screenshots** (breaks extraction → 2 dead uploads / 0 tools). Residual: in the live in-app view a *multi-page* PDF embed still peeks the next page below the chosen one (single-page PDFs like the volcano are clean); the baked report rasterizes the exact page.

---

## 6. Notebook directives (verbatim shape)
1. `history_dataset_as_pdf(history_dataset_id=<DESeq2_plots_PDF>, page=1)` — PCA
2. `history_dataset_as_pdf(history_dataset_id=<volcanoplot_PDF>, page=1)` — volcano
3. `history_dataset_as_table(history_dataset_id=<DESeq2_result>, title="DESeq2 result (peak, baseMean, log2FC, lfcSE, stat, pvalue, padj)", compact=true)`

Each in its own `galaxy`-fenced block.

---

## 7. Verification
| Check | Expected |
|---|---|
| Peak universe | 590,650 |
| NA/low-count filtered | 343,612 |
| Testable (non-NA) | ~247,038 |
| Significant (padj<0.05, \|LFC\|≥1) | 45,620 |
| B-cell-gained (LFC>0) / Eryth-gained (LFC<0) | 34,873 / 10,747 |
| PCA PC1 variance | ≈ 98% |
| GATA1 (chrX) | LFC ≈ −5.5, Eryth-gained |
| HBB (chr11) | LFC ≈ −6.6, Eryth-gained |
| EBF1 (chr5) / MS4A1 (chr11) / PAX5 (chr9) / CD19 (chr16) | +8.0 / +7.3 / +6.8 / +4.0, B-cell-gained |
| Page extraction | 13 rows, all seeded, 0 warnings, 3 exposed |
| Extracted workflow | **5 steps**: counts collection + sample sheet → DESeq2 → tp_awk → volcanoplot; 0 dangling, 3 outputs, report clean |

**Extraction note:** pass only the `list` collection as the counts input to `/api/workflows/extract` (not its 8 element HDAs — those yield orphan input steps). DESeq2 direction reminder: LFC>0 (red "Up") = B-cell-gained.

---

## 8. Flagged as not fully determined
- DESeq2 output column indices may shift with `output_selector`/version — verify cols 6 (pvalue), 7 (padj) by inspecting the result header.
- The Corces matrix sample→column mapping for the 8 selected samples was identified by inspecting the `GSE74912_ATACseq_All_Counts.txt.gz` header during prep; reproduce by matching donor/cell-type sample identifiers in that header.
- `history_dataset_as_pdf` requires the renderer code change (§1); the live Vue view may still warn for PDFs without the complementary client component (the server-side fix covers the baked report/export); `pymupdf` must be installed (graceful fallback if absent).
