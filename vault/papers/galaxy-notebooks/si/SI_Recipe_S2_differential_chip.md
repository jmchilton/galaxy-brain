# UC2 Setup Recipe — TAL1 Peaks to Candidate Regulated Genes

**Issue:** https://github.com/jmchilton/galaxy-brain/issues/13
**Science:** Differential TAL1 ChIP binding (G1E erythroid vs megakaryocyte), mm10. Headline: `Gata1` locus bound only in G1E, `Fli1` only in mega, `Cbfa2t3` common.
**Extracted workflow IDs on reference server:** single (condition-pinned) `03501d7626bd192f`; WF1 peak caller (reusable) `3f5830403180d620`; WF2 comparator (reusable) `e85a3be143d5905b`.

> Server-agnostic recipe. Tool versions/params confirmed against the reference server (Galaxy 26.2.dev0).

---

## 1. Tools to Install

```bash
shed-tools install -g http://<SERVER>:8080 -a <ADMIN_KEY> \
  -t tal1-candidate-genes-tools.yml --skip-install-resolver-dependencies
```
`tal1-candidate-genes-tools.yml` installs: bedtools (iuc), text_processing (bgruening), macs2 (iuc). Also install: `devteam/bowtie2`, `iuc/ggplot2_heatmap2`, `iuc/datamash_ops`.

### Confirmed tool IDs and versions
| Tool | Full tool ID | Version |
|---|---|---|
| bowtie2 | `toolshed.g2.bx.psu.edu/repos/devteam/bowtie2/bowtie2` | `2.5.5+galaxy0` |
| macs2_callpeak | `toolshed.g2.bx.psu.edu/repos/iuc/macs2/macs2_callpeak` | `2.2.9.1+galaxy0` |
| bedtools intersect | `toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_intersectbed` | `2.31.1+galaxy0` |
| bedtools closest | `toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_closestbed` | `2.31.1+galaxy1` |
| bedtools sortbed | `toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_sortbed` | `2.31.1+galaxy0` |
| tp_awk_tool | `toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_awk_tool` | `9.5+galaxy3` |
| tp_multijoin_tool | `toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_multijoin_tool` | `9.5+galaxy3` |
| datamash_ops | `toolshed.g2.bx.psu.edu/repos/iuc/datamash_ops/datamash_ops` | `1.9+galaxy0` |
| ggplot2_heatmap2 | `toolshed.g2.bx.psu.edu/repos/iuc/ggplot2_heatmap2/ggplot2_heatmap2` | `3.3.0+galaxy0` |

Builtin (no install): `Grouping1` (gene-list grouping), `cat1` (prepend header row), `__EXTRACT_DATASET__` (condition-pinned element selection), `__DATA_FETCH__`.

**Worker caution:** Bowtie2 (3.4 GB mm10 index) mapped over 6 reads → set `workers: 2` in `config/galaxy.yml` to avoid OOM on a memory-constrained host.

---

## 2. Reference Data / DB Setup

### mm10 Bowtie2 index
Download the prebuilt index (avoids slow emulated `bowtie2-build`): `https://genome-idx.s3.amazonaws.com/bt/mm10.zip`. Extract the 6 `.bt2` files to `tool-data/bowtie2_indexes/mm10/`. Register in `tool-data/shed/bowtie2_indices.loc` (cols `value, dbkey, name, path`; path = index basename, no `.bt2`):
```
mm10	mm10	Mouse (mm10)	/path/to/tool-data/bowtie2_indexes/mm10/mm10
```
Restart Galaxy after editing `.loc`.

### RefSeq mm10 BED12 (also fetched in §3)
`https://zenodo.org/records/197100/files/RefSeq_gene_annotations_mm10.bed?download=1` (dbkey=mm10). Source for promoter windows + TSS points.

---

## 3. Input Data

Fetch all 6 FASTQ + the RefSeq BED in ONE `POST /api/tools/fetch`. Reads are two `list:list` collections (outer = condition, inner = replicate) — mandatory for the MACS2 map-over-reduce encoding.

```json
{"targets": [
  {"destination": {"type": "hdca"}, "collection_type": "list:list", "name": "treatment_reads", "elements": [
    {"name": "G1E", "elements": [
      {"name": "r1", "ext": "fastqsanger", "src": "url", "url": "https://zenodo.org/records/197100/files/G1E_Tal1_R1_downsampled_SRR492444.fastqsanger?download=1"}]},
    {"name": "mega", "elements": [
      {"name": "r1", "ext": "fastqsanger", "src": "url", "url": "https://zenodo.org/records/197100/files/Megakaryocyte_Tal1_R1_downsampled_SRR549006.fastqsanger?download=1"},
      {"name": "r2", "ext": "fastqsanger", "src": "url", "url": "https://zenodo.org/records/197100/files/Megakaryocytes_Tal1_R2_downsampled_SRR549007.fastqsanger?download=1"}]}]},
  {"destination": {"type": "hdca"}, "collection_type": "list:list", "name": "control_reads", "elements": [
    {"name": "G1E", "elements": [
      {"name": "r1", "ext": "fastqsanger", "src": "url", "url": "https://zenodo.org/records/197100/files/G1E_input_R1_downsampled_SRR507859.fastqsanger?download=1"}]},
    {"name": "mega", "elements": [
      {"name": "r1", "ext": "fastqsanger", "src": "url", "url": "https://zenodo.org/records/197100/files/Megakaryocyte_input_R1_downsampled_SRR492453.fastqsanger?download=1"},
      {"name": "r2", "ext": "fastqsanger", "src": "url", "url": "https://zenodo.org/records/197100/files/Megakaryocyte_input_R2_downsampled_SRR492454.fastqsanger?download=1"}]}]},
  {"destination": {"type": "hdas"}, "elements": [
    {"name": "RefSeq_gene_annotations_mm10", "dbkey": "mm10", "ext": "bed", "src": "url", "url": "https://zenodo.org/records/197100/files/RefSeq_gene_annotations_mm10.bed?download=1"}]}
]}
```

Source: Zenodo 197100 (Galaxy TAL1 tutorial data), 36-bp single-end, no trimming (documented simplification). Design: G1E = 1 TAL1 + 1 input replicate; mega = 2 + 2. Pooling mega R1+R2 (both treatment AND control) lifts mega peaks from ~17 → 150 (single-replicate mega fails because deep TAL1 4.4M reads vs shallow input 750k → MACS2 scales down).

---

## 4. Pipeline Steps

### Step 1 — Bowtie2 (map over each list:list) `…/bowtie2/2.5.5+galaxy0`
Run twice (treatment_reads, control_reads); maps over the `list:list` → `list:list` BAM (structure preserved).
```json
{"library": {"type": "single", "aligned_file": false, "unaligned_file": false},
 "reference_genome": {"source": "indexed", "index": "mm10"},
 "rg": {"rg_selector": "do_not_set"},
 "analysis_type": {"analysis_type_selector": "simple", "presets": "no_presets"},
 "sam_options": {"sam_options_selector": "no"}, "save_mapping_stats": false}
```

### Step 2 — MACS2 callpeak (outer-map condition + inner-reduce replicates) `…/macs2_callpeak/2.2.9.1+galaxy0`
**CRITICAL encoding:** pass both `list:list` BAM inputs with `map_over_type:"list"` → outer-map (one job per condition) + inner-reduce (pool replicates into the `multiple="true"` inputs). Naive `batch:true` WITHOUT `map_over_type` flattens to all leaves (no pooling).
```json
{"batch": true, "values": [{"src": "hdca", "id": "<treatment_bams>", "map_over_type": "list"}]}
```
(same for control; the two `list:list` link on the outer key automatically). Tool params:
```json
{"treatment": {"t_multi_select": "Yes"},
 "control": {"c_select": "Yes", "c_multiple": {"c_multi_select": "Yes"}},
 "format": "BAM",
 "effective_genome_size_options": {"effective_genome_size_options_selector": "1870000000"},
 "nomodel_type": {"nomodel_type_selector": "create_model", "band_width": "300", "mfold_lower": "5", "mfold_upper": "50"},
 "cutoff_options": {"cutoff_options_selector": "qvalue", "qvalue": "0.05"},
 "advanced_options": {"keep_dup_options": {"keep_dup_options_selector": "1"},
   "broad_options": {"broad_options_selector": "nobroad", "call_summits": false}}}
```
Output: `peaks` list (G1E 261, mega 150).

### Steps 3 & 4 — Extract Dataset (G1E, mega) `__EXTRACT_DATASET__`
Input: `peaks` list. `{"which": {"which_dataset": "by_identifier", "identifier": "G1E"}}` and `…"identifier": "mega"`. The condition-pinned seam.

### Steps 5–7 — bedtools intersect (classes) `…/bedtools_intersectbed/2.31.1+galaxy0`
- common = A:G1E ∩ B:mega, `{"once": true}` (i.e. `-u`) → 39.
- G1E-only = A:G1E, B:mega, `{"invert": true, "once": true}` → 222.
- mega-only = A:mega, B:G1E, `{"invert": true, "once": true}` → 110.
Common iterate form: `{"reduce_or_iterate": {"reduce_or_iterate_selector": "iterate", "inputB": "<B>"}, "strand": "", "invert": false, "once": true, "count": false, "bed": false, "sorted": false}`. (39 is the G1E-side count; reciprocal mega-side is 40, so 39+222=261, 40+110=150.)

### Step 8 — TSS points awk (on RefSeq BED) tp_awk
```awk
$6=="+" {print $1"\t"$2"\t"($2+1)"\t"$4"\t"$5"\t"$6}
$6=="-" {print $1"\t"($3-1)"\t"$3"\t"$4"\t"$5"\t"$6}
```

### Step 9 — Promoter windows awk (TSS −1000/+500, strand-aware) tp_awk
```awk
$6=="+" {s=$2-1000; if(s<0)s=0; print $1"\t"s"\t"($2+500)"\t"$4"\t"$5"\t"$6}
$6=="-" {s=$3-500; if(s<0)s=0; print $1"\t"s"\t"($3+1000)"\t"$4"\t"$5"\t"$6}
```

### Step 10 — SortBED on promoters (default params); also SortBED the TSS and each class as needed for closest.

### Step 11 — bedtools intersect peaks ∩ promoters (×3 classes)
A: sorted peak class; B: sorted promoters; `{"once": true}`. Outputs the promoter-overlapping peaks per class.

### Step 12 — Group candidate gene lists (×3) `Grouping1`
On each promoter∩class output: `{"groupcol": "4", "ignorecase": false, "operations": []}` (group by col 4 = gene symbol → deduped gene list dataset).

### Step 13 — bedtools closest nearest TSS (×3 classes, **ties=first**) `…/bedtools_closestbed/2.31.1+galaxy1`
A: each peak class BED; B: TSS BED.
```json
{"ties": "first", "strand": "", "addition": true, "addition2": {"addition2_select": ""}, "k": "1", "io": false, "mdb": "each"}
```
**Critical:** `ties=first` (one row per peak). `ties=all` tie-inflates and gives wrong distances (caught/fixed mid-build).

### Step 14 — Binning awk (×3 classes) tp_awk (distance = column 17)
```awk
{d=$17; if(d<0)d=-d; if(d<=1000)b="1_<=1kb"; else if(d<=10000)b="2_1-10kb"; else if(d<=50000)b="3_10-50kb"; else b="4_>50kb"; print b}
```

### Step 15 — Datamash count per bin (×3) `…/datamash_ops/1.9+galaxy0`
```json
{"grouping": "1", "need_sort": "true", "header_in": "false", "header_out": "false",
 "print_full_line": "false", "ignore_case": "false", "narm": "false",
 "operations": [{"op_column": "1", "op_name": "count"}]}
```
Output: `bin <tab> count`.

### Step 16 — Multi-Join bin×class matrix `…/tp_multijoin_tool/9.5+galaxy3`
```json
{"key_column": "1", "value_columns": ["2"], "output_header": "false", "input_header": "false", "ignore_dups": "false", "filler": "0"}
```

### Step 17 — Prepend header row `cat1`
Prepend a pasted header dataset (one tab-separated line): `bin<TAB>common<TAB>G1E-only<TAB>mega-only`.

### Step 18 — Figure (distance-to-TSS heatmap) `…/ggplot2_heatmap2/3.3.0+galaxy0`
Input: header-prepended bin×class matrix.
```json
{"title": "TAL1 peak distance-to-TSS by class (peak counts)", "transform": "none",
 "zscore_cond": {"scale": "none", "zscore": "none"}, "cluster_cond": {"cluster": "no"},
 "labels": "both", "colorchoice": {"name": "BrBG", "type": "palettes"}, "image_file_format": "png"}
```

---

## 5. Notebook directives
1. `history_dataset_display(history_dataset_id=<G1E-only Group gene list>)`
2. `history_dataset_display(history_dataset_id=<mega-only Group gene list>)`
3. `history_dataset_as_image(history_dataset_id=<distance-to-TSS heatmap PNG>)`

(Use `history_dataset_display` for the gene-list TSVs, `history_dataset_as_image` for the figure.)

---

## 6. Verification
| Check | Expected |
|---|---|
| G1E / mega peaks | 261 / 150 |
| common / G1E-only / mega-only | 39 / 222 / 110 |
| Promoter-bound common | `Cbfa2t3`, `Pf4` |
| Promoter-bound G1E-only | `Gata1` + Cpox, Tfr2, Pdcd4, Cep55, Il9r, Noc3l, Eml3, Zfyve27, Pga5, Mir101b, Mir5114 |
| Promoter-bound mega-only | `Fli1`, `Tal1`, Dock8, Lgi1 |
| Figure bin counts | common 4/11/22/2; G1E-only 18/66/97/41; mega-only 5/30/45/30 |
| Single-WF extraction | 31 seeded, 4 ICJ, 34 steps, 0 dangling, 3 outputs (comparison condition-pinned) |
| Two-workflow split | WF1 5 steps (reusable); WF2 29 steps (reusable, no condition pinning) |

Biology note: G1E is GATA1-null → "Gata1 bound only in G1E" = differential TAL1 binding *at the Gata1 locus*, not GATA1 activity.

---

## 7. Extraction notes
- The MACS2 seam dissolves via the `list:list` restructure (`map_over_type:"list"`) — one mapped step.
- The `__EXTRACT_DATASET__` element-selection steps are condition-pinned but extractable/runnable **only with the `_original_hda` fix** (`lib/galaxy/workflow/extract.py`: stop walking `copied_from` when content has its own `creating_job_associations`; without it the extracted comparison dangles). The fix ships in the same branch as PR #22860.
- The page summary may surface 2 MACS2 rows sharing one ICJ — **deduplicate `implicit_collection_jobs_ids`** before POSTing `/api/workflows/extract`.
- Two-workflow split: use `extract_by_ids` to select the caller subgraph (Bowtie2 + MACS2, output = peaks list) separately from the comparator subgraph (intersect onward; inputs = G1E peaks, mega peaks, RefSeq BED, header constant).
