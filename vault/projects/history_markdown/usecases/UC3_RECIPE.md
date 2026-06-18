# UC3 Setup Recipe — Differential ATAC-seq Accessibility

**Issue:** https://github.com/jmchilton/galaxy-brain/issues/14
**Science:** Genome-wide differential ATAC-seq accessibility, Erythroblast vs B-cell (Corces 2016, hg19). 45,620 significant peaks; GATA1/HBB Erythroblast-gained; PAX5/EBF1/MS4A1/CD19 B-cell-gained.
**Extracted workflow:** 13 steps — counts collection + sample sheet → DESeq2 → NA-filter → { volcano ∥ significance-filter → rank → top-gained / top-lost }, with each PDF figure (PCA, volcano) converted to PNG in-graph (graphicsmagick → extract-page). 6 workflow outputs; re-runs to the identical numbers. Latest extraction: [`UC3_ATAC_extracted_figures.ga`](UC3_ATAC_extracted_figures.ga).

> Server-agnostic. Tool versions confirmed on Galaxy 26.2.dev0. Build everything through `/api/tools` (or the MCP `run_tool`); the notebook and the extraction are plain API calls — no UI needed. **No Galaxy code change required** — DESeq2/volcano emit PDF, so each figure is rasterized to PNG by an in-graph tool (§1) and referenced with the stock `history_dataset_as_image` directive.

---

## 1. Figure rendering — PDF → image via in-graph tool (no code change)

The DESeq2 diagnostics and the volcano are **PDF**, which the notebook cannot embed as an image. Instead of a core PDF-rasterizing directive (the abandoned `history_dataset_as_pdf` / PyMuPDF path — see `PDF_IMAGES.md`), rasterize each figure with a **tool**, so the image becomes a real on-graph dataset referenced by the stock `history_dataset_as_image` directive. Provenance-clean, extraction-automatic, no server dependency.

Per PDF figure:
1. **`graphicsmagick_image_convert`** (bgruening) on the PDF, `output_format=png`. For PDF input it splits **every page** into a `list` collection `splitted_pdf`, elements `temp_000`, `temp_001`, … (one per page). Runs in the graphicsmagick biocontainer (ghostscript delegate reads the PDF).
2. **`__EXTRACT_DATASET__`** by identifier to pull the wanted page (`temp_000` = page 1) out of the collection as a standalone PNG HDA.
3. **Rename** that HDA to a meaningful figure name (`Sample PCA plot`, `Volcano plot`) — it becomes the workflow output label and the `output="…"` reference in the extracted report.

Volcano PDF = 1 page → `temp_000`. DESeq2 diagnostics = 5 pages → page 1 (`temp_000`) is the PCA. (Cost: graphicsmagick converts *all* pages, so the 5-page DESeq2 PDF yields 5 PNGs even though only the PCA is used.)

---

## 2. Tools

| Tool | Full tool ID | Version |
|---|---|---|
| DESeq2 | `toolshed.g2.bx.psu.edu/repos/iuc/deseq2/deseq2` | `2.11.40.8+galaxy2` |
| Volcano Plot | `toolshed.g2.bx.psu.edu/repos/iuc/volcanoplot/volcanoplot` | `4.0.3+galaxy0` |
| Text reformatting (awk) | `…/bgruening/text_processing/tp_awk_tool` | `9.5+galaxy3` |
| Sort | `…/bgruening/text_processing/tp_sort_header_tool` | `9.5+galaxy3` |
| Select first (head) | `…/bgruening/text_processing/tp_head_tool` | `9.5+galaxy3` |
| Select last (tail) | `…/bgruening/text_processing/tp_tail_tool` | `9.5+galaxy3` |
| Convert image format | `…/bgruening/graphicsmagick_image_convert/graphicsmagick_image_convert` | `1.3.46+galaxy0` |
| Extract dataset | `__EXTRACT_DATASET__` (built-in) | `1.0.2` |

---

## 3. Input data

**Source:** Corces 2016 hematopoiesis ATAC count matrix — GEO `GSE74912`, `GSE74912_ATACseq_All_Counts.txt.gz` (590,650 peaks × 132 samples, hg19).

**Sample selection (8 samples, donors as replicates):**

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

(Bcell_3+4 and Eryth_3+4 each share a donor — minor pseudoreplication; conclusions robust; a `~ donor + condition` design is the cleaner ideal.)

**Prep (data-import boundary, outside Galaxy):** split the matrix into 8 per-sample two-column files (`peak_id <TAB> count`, no header, 590,650 rows). Peak IDs are `chr_start_end` (e.g. `chr11_60222940_60223440`).

**Upload:** the 8 count files as a `list` collection **`ATAC counts`** (element identifiers exactly `Bcell_1..4`, `Eryth_1..4` — must match the sample sheet); the sample sheet as one tabular dataset:
```
sample	condition	donor
Bcell_1	Bcell	Donor1022
…
Eryth_4	Erythroblast	Donor6926
```

---

## 4. Build sequence (all `/api/tools`, flat pipe-keys)

### 4.0 The one gotcha — DESeq2's conditional input
DESeq2's data selector is a **conditional** (`select_data|how`). Pass it with **flat pipe-delimited keys**, not a nested `{select_data:{...}}` dict. A nested dict mis-routes to the `datasets_per_level` default and silently feeds the *sample sheet* as the only counts file (job errors / garbage). Flat form:
```
select_data|how                          = sample_sheet_contrasts
select_data|countsFile                    = {src: hdca, id: <ATAC counts collection>}
select_data|sample_sheet                  = {src: hda,  id: <sample sheet>}
select_data|design_formula_mode|mode      = automatic
select_data|design_formula_mode|factor    = 2
select_data|design_formula_mode|reference_level = Erythroblast
select_data|design_formula_mode|target_level    = Bcell
header                                     = true
tximport|tximport_selector                = count
advanced_options|fit_type                 = 1
advanced_options|auto_mean_filter_off     = false
advanced_options|outlier_filter_off       = false
advanced_options|outlier_replace_off      = false
advanced_options|use_beta_priors          = false
output_options|alpha_ma                   = 0.1
output_options|output_selector            = [pdf, normCounts, normVST]
```
**Direction:** `reference_level=Erythroblast` ⇒ **LFC > 0 = B-cell-gained, LFC < 0 = Erythroblast-gained**. Confirm with a marker — MS4A1/CD20 `chr11_60222940_…` should be LFC ≈ +7.3.

### Step 1 — DESeq2
Outputs used: result table (tabular; cols 1=peak, 2=baseMean, 3=log2FC, 4=lfcSE, 5=stat, **6=pvalue, 7=padj**) and the 5-page diagnostics **PDF** (page 1 = PCA). Genome-wide run ≈ 6–7 min.

### Step 2 — NA-filter (tp_awk) on the DESeq2 result
```
infile = {src: hda, id: <DESeq2 result>}
code   = $6!="NA" && $7!="NA"{print}
```
→ testable peaks (≈ 247,038). Prerequisite for volcano (it errors on NA-padj rows).

### Step 3 — Volcano Plot on the NA-filtered table
Column params live **inside** the `with_header` conditional (top-level ones are silently ignored):
```
input_file                = {src: hda, id: <NA-filtered>}
with_header|header        = no
with_header|label_col     = 1
with_header|lfc_col       = 3
with_header|pval_col      = 6
with_header|fdr_col       = 7
signif_thresh = 0.05   lfc_thresh = 1.0   labels|label_select = none
plot_options|legend_labs = "Down,Not Sig,Up"
```
→ volcano **PDF**.

### Step 4 — Significance filter (tp_awk) on the NA-filtered table
**Branch in parallel with the volcano — do not replace the volcano's input** (it needs the full non-significant cloud).
```
infile = {src: hda, id: <NA-filtered>}
code   = $7+0 < 0.05 && ($3+0 >= 1 || $3+0 <= -1){print}
```
→ **Significant differential peaks** (45,620).

### Step 5 — Rank (Sort) the significant peaks by log2FC, descending
```
infile = {src: hda, id: <significant peaks>}
header = 0
sortkeys_0|column = 3   sortkeys_0|order = r   sortkeys_0|style = g
```
(`g` = general-numeric, handles scientific notation.) Top = largest +LFC (B-cell), bottom = most −LFC (Eryth).

### Step 6 — Top B-cell-gained = Select first 50 (tp_head_tool)
```
infile = {src: hda, id: <ranked>}   complement = ""   count = 50
```

### Step 7 — Top Erythroblast-gained = Select last 50 (tp_tail_tool)
```
infile = {src: hda, id: <ranked>}   complement = ""   num_lines = 50
```

**Rename the new outputs** to meaningful names (`Significant differential peaks…`, `Top 50 B-cell-gained peaks`, `Top 50 Erythroblast-gained peaks`) — these become the workflow output labels.

### Steps 8–11 — Figures: PDF → PNG (see §1)
Per figure (DESeq2 plots PDF, volcano PDF):
```
# convert
graphicsmagick_image_convert:
  input                 = {src: hda, id: <figure PDF>}
  output_format         = png
  palette|palette_select = no
  resize                = 100
→ list collection splitted_pdf (temp_000 … per page)

# extract page 1
__EXTRACT_DATASET__:
  input                 = {src: hdca, id: <splitted_pdf collection>}
  which|which_dataset   = by_identifier
  which|identifier      = temp_000
→ standalone PNG HDA
```
**Rename** the two extracted PNGs → `Sample PCA plot` (from DESeq2 plots page 1) and `Volcano plot` (from the volcano PDF).

---

## 5. Notebook page

Each directive in its own ```galaxy block, every one referencing a **real on-graph output**:
1. `history_dataset_as_image(history_dataset_id=<Sample PCA plot PNG>)` — PCA (extracted page 1 of DESeq2 plots)
2. `history_dataset_as_image(history_dataset_id=<Volcano plot PNG>)`
3. `history_dataset_as_table(history_dataset_id=<DESeq2 result>, title="…", compact=true)`
4. `history_dataset_as_table(history_dataset_id=<significant peaks>, title="…", compact=true)`
5. `history_dataset_as_table(history_dataset_id=<top B-cell>, title="…", compact=true)`
6. `history_dataset_as_table(history_dataset_id=<top Eryth>, title="…", compact=true)`

---

## 6. Extraction (page → workflow)

1. `GET /api/pages/{page}/workflow_extraction_summary` — expect **0 warnings**, every tool step seeded, the 6 referenced outputs exposed.
2. `POST /api/workflows/extract`:
```json
{
 "workflow_name": "Differential ATAC-seq accessibility (Eryth vs B-cell)",
 "job_ids": ["<DESeq2>","<NA-filter>","<volcano>","<sig-filter>","<sort>","<head>","<tail>","<convert PCA>","<extract PCA>","<convert volcano>","<extract volcano>"],
 "hda_ids":  ["<sample sheet>"],
 "hdca_ids": ["<ATAC counts collection>"],
 "from_page_id": "<page>",
 "report_title": "Differential ATAC-seq Accessibility — Erythroblast vs B-cell"
}
```
Easiest source of `job_ids`: the `jobs[]` from the summary where `step_type=="tool"` and `checked`. **Pass only the collection as the counts input — NOT its 8 element HDAs** (those become orphan `input_dataset` steps). The extractor maps DESeq2's expanded element-inputs back to the collection.

Result: **13-step workflow, 0 dangling, 6 outputs**, report markdown carried with each directive rewritten from `history_dataset_id=…` to workflow-relative `output="<label>"` (e.g. `history_dataset_as_image(output="Sample PCA plot")`). Each figure branch — `DESeq2 → graphicsmagick_image_convert → Extract dataset` and `volcanoplot → graphicsmagick_image_convert → Extract dataset` — is reproduced when the workflow runs.

---

## 7. Verification

| Check | Expected |
|---|---|
| Peak universe | 590,650 |
| Testable (non-NA) | 247,038 |
| Significant (padj<0.05, \|LFC\|≥1) | 45,620 |
| B-cell-gained (LFC>0) / Eryth-gained (LFC<0) | 34,873 / 10,747 |
| MS4A1/CD20 (chr11 ~60.22 Mb) | LFC ≈ +7.3 |
| GATA1 (chrX ~48.64 Mb) / HBB (chr11 ~5.25 Mb) | LFC ≈ −5.9 / −6.6 |
| Extraction summary | 0 warnings, all tool steps seeded, 6 exposed |
| Extracted workflow | 13 steps, 0 dangling, 6 outputs (incl. `Sample PCA plot`, `Volcano plot`), report clean |
| Re-run | identical 590,650 / 45,620 / 34,873 / 10,747 |

---

## 8. Notes

- DESeq2 result column indices can shift with `output_selector`/version — confirm 3=log2FC, 6=pvalue, 7=padj from the header before wiring the awk/volcano column args.
- Figures are tool outputs (§1), so no `pymupdf` / core change is needed. `graphicsmagick_image_convert` splits a PDF into a one-page-per-element collection; `temp_000` is page 1. Rename the extracted PNG *before* extraction so the workflow output label is meaningful (else it inherits `temp_000`).
- The 8 count files are prepared input data (data-import boundary), not an analysis step — legitimate workflow inputs.
