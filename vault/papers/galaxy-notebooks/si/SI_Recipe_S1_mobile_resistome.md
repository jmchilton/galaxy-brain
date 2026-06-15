# UC1 Setup Recipe — MRSA Mobile AMR Context Across Isolates

**Issue:** https://github.com/jmchilton/galaxy-brain/issues/12
**Science:** Comparative ARG↔IS proximity analysis across 4 *S. aureus* isolates. Headline: `aac(6')-aph(2'')` is IS6-adjacent on plasmids of KUN1163/KUH140046 but IS256-adjacent on KUH180129 chromosome.
**Extracted workflow ID on reference server:** `33b43b4e7093c91f` (`/tmp/uc1_workflow.ga`) — 14 steps, 1 input, 13 tools, zero dangling, 9 workflow outputs.

> Server-agnostic recipe to recreate the UC1 notebook on another Galaxy. Tool versions and parameters were confirmed against the reference server (Galaxy 26.2.dev0). Where a value is instance-specific (encoded dataset ids), the recipe gives the step to regenerate it.

---

## 1. Tools to Install

### Tool Shed repos (install via ephemeris shed-tools)

```bash
# Install ephemeris isolated (do NOT pip-install into Galaxy's .venv):
uv tool install ephemeris

# Install UC1 tool set:
shed-tools install -g http://<SERVER>:8080 -a <ADMIN_KEY> \
  -t mrsa-mobile-amr-tools.yml \
  --skip-install-resolver-dependencies
```

`mrsa-mobile-amr-tools.yml` installs: staramr (nml), bakta (iuc), isescan (iuc), integron_finder (iuc), plasmidfinder (iuc), tbl2gff3 (iuc), text_processing (bgruening), bedtools (iuc), jbrowse (iuc). Also install (needed for the on-graph figures and collection operations): `iuc/ggplot2_heatmap2`, `nml/collapse_collections`.

### Confirmed tool IDs and versions (from running server)

| Tool | Full tool ID | Version |
|---|---|---|
| staramr | `toolshed.g2.bx.psu.edu/repos/nml/staramr/staramr_search` | `0.12.3+galaxy0` |
| isescan | `toolshed.g2.bx.psu.edu/repos/iuc/isescan/isescan` | `1.7.3+galaxy0` |
| integron_finder | `toolshed.g2.bx.psu.edu/repos/iuc/integron_finder/integron_finder` | `2.0.5+galaxy1` |
| bedtools closest | `toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_closestbed` | `2.31.1+galaxy1` |
| bedtools sortbed | `toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_sortbed` | `2.31.1+galaxy0` |
| tp_awk_tool | `toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_awk_tool` | `9.5+galaxy3` |
| ggplot2_heatmap2 | `toolshed.g2.bx.psu.edu/repos/iuc/ggplot2_heatmap2/ggplot2_heatmap2` | `3.3.0+galaxy0` |
| collapse_collections | `toolshed.g2.bx.psu.edu/repos/nml/collapse_collections/collapse_dataset` | `5.1.0` |

Builtin (no install): `__DATA_FETCH__` (collection upload from URL).

### Docker / container setup
Enable Docker for containerized jobs (`docker_enabled` job env + `enable_mulled_containers: true`, `conda_auto_install: false`). Pre-pull BioContainer images before running, especially on Apple Silicon (amd64 emulation is correct but slow).

### Bakta (OPTIONAL — structural confirmation only, NOT in the extractable core)
Deliberately excluded from the extractable clean pipeline. If desired as non-extractable enrichment:
- Install `iuc/bakta`; download Bakta light DB v5.1 (1.48 GB tar → 3.4 GB) to `database/bakta_db/db-light`.
- **Critical:** move the bundled `amrfinderplus-db/` OUT of `db-light` (the wrapper does `ln -s db-light/*` and fails if it exists there).
- Update AMRFinder DB: `amrfinder_update --force_update --database <amrfinderplus-db-dir>` inside `quay.io/biocontainers/bakta:1.9.4--pyhdfd78af_0` (bundled 2023-11-15.1 is too old for bakta 1.9.4's amrfinder 3.12.8 → need ≥ 2023-12-15.2).
- Register both DBs in `.loc` (bakta `bakta_version` col = `1.7`; amrfinder `db_version` col = `3.12`); repoint `shed_tool_data_table_conf.xml` off `.loc.sample`; restart (no working reload endpoint for data tables).
- On Apple Silicon run Bakta **serially** (one isolate at a time), not mapped 4-wide (OOM under concurrent amd64-emulated diamond/blast).

---

## 2. Reference Data / DB Setup

None for the extractable core. The analysis is assembly-based (FASTA→BED); no genome index or `.loc` registration is needed.

---

## 3. Input Data

One `list` collection of 4 combined chromosome+plasmid FASTA files, fetched directly from ENA via a single `POST /api/tools/fetch` (set `history_id`):

```json
{
  "targets": [{
    "destination": {"type": "hdca"},
    "collection_type": "list",
    "name": "MRSA isolate assemblies",
    "elements": [
      {"name": "KUH140013", "ext": "fasta", "src": "url",
       "url": "https://www.ebi.ac.uk/ena/browser/api/fasta/AP020311.1,AP020312.1"},
      {"name": "KUH140046", "ext": "fasta", "src": "url",
       "url": "https://www.ebi.ac.uk/ena/browser/api/fasta/AP020313.1,AP020314.1"},
      {"name": "KUH180129", "ext": "fasta", "src": "url",
       "url": "https://www.ebi.ac.uk/ena/browser/api/fasta/AP020322.1,AP020323.1"},
      {"name": "KUN1163", "ext": "fasta", "src": "url",
       "url": "https://www.ebi.ac.uk/ena/browser/api/fasta/AP020324.1,AP020325.1"}
    ]
  }]
}
```

Element names (isolate IDs) must be exactly `KUH140013`, `KUH140046`, `KUH180129`, `KUN1163` — they become the matrix column labels.

| Element | MLST | Chr | Plasmid | Genome bp |
|---|---|---|---|---|
| KUH140013 | ST8 | AP020311.1 | AP020312.1 | 2,837,394 |
| KUH140046 | ST8 | AP020313.1 | AP020314.1 | 2,859,431 |
| KUH180129 | ST6313 | AP020322.1 | AP020323.1 | 2,897,282 |
| KUN1163 | ST764 | AP020324.1 | AP020325.1 | 2,944,787 |

Source: Hikichi et al. 2019, BioProject PRJDB8599.

---

## 4. Pipeline Steps

All steps map over the input collection. Use `{"batch":true,"values":[{"src":"hdca","id":<collection_id>}]}` for the collection input parameter when calling `POST /api/tools` directly (the MCP `run_tool` does not surface map-over; use direct API).

### Step 1 — staramr `…/staramr_search/0.12.3+galaxy0`
```json
{"pointfinder_db": {"use_pointfinder": "disabled"},
 "advanced": {"genome_size_lower_bound": "4000000", "genome_size_upper_bound": "6000000",
  "minimum_N50_value": "10000", "minimum_contig_length": "300", "mlst_scheme": "auto",
  "pid_threshold": "98.0", "plasmidfinder_type": "include_all", "plength_plasmidfinder": "60.0",
  "plength_resfinder": "60.0", "report_all_blast": false}}
```
The genome-size "quality-failed" warning is expected for *S. aureus* (~2.8–2.9 Mb vs the 4–6 Mb window); ResFinder/PlasmidFinder calls are unaffected. Outputs used: `resfinder.tsv`, `mlst.tsv`, `summary.tsv`, `plasmidfinder.tsv` collections.

### Step 2 — ISEScan `…/isescan/1.7.3+galaxy0`
```json
{"remove_short_is": true, "log_activate": false}
```
**CRITICAL GOTCHA:** `remove_short_is` MUST be `true`. The default (`false`) keeps partial/unclassified elements (`family=new`) → spurious distance-0 IS overlaps → corrupted context matrix (KUN1163 shows 25 vs the validated 17 IS). Headline survives either way, but only `true` reproduces byte-identical results. Output used: `results in gff format` collection.

### Step 3 — Integron Finder `…/integron_finder/2.0.5+galaxy1`
```json
{"type_replicon": "--circ", "local_max": false, "promoter_attI": false, "gbk": false, "pdf": false,
 "settings": {"attc_settings": {"calin_threshold": "2", "dist_thresh": "4000", "max_attc_size": "200", "min_attc_size": "40"},
  "protein_settings": {"func_annot": false, "no_proteins": false}}}
```
Expected: zero integrons in all four (expected for *S. aureus*). Outputs: `Integron annotations`, `Summary` collections.

### Step 4 — ARG→BED (tp_awk on `resfinder.tsv` collection)
```awk
NR>1 { s=$9; e=$10; if (s>e) { t=s; s=e; e=t } print $8"\t"(s-1)"\t"e"\t"$2 }
```
Output: `contig, start(0-based), end, gene` (`$8`=contig, `$9/$10`=start/end, `$2`=gene; swap for reverse-strand hits).

### Step 5 — IS→BED (tp_awk on ISEScan gff collection)
```awk
/family=/ { fam="IS"; if (match($9, /family=[^;]+/)) fam=substr($9, RSTART+7, RLENGTH-7); print $1"\t"($4-1)"\t"$5"\t"fam }
```
Output: `contig, start(0-based), end, IS_family`.

### Steps 6 & 7 — SortBED `…/bedtools_sortbed/2.31.1+galaxy0`
Default params (lexicographic). Map over the ARG BED collection (step 6) and the IS BED collection (step 7).

### Step 8 — bedtools closest -d `…/bedtools_closestbed/2.31.1+galaxy1`
Input A = ARG sorted BED (mapped); Input B = IS sorted BED (mapped; matched element-wise).
```json
{"ties": "all", "strand": "", "addition": true, "addition2": {"addition2_select": ""}, "k": "1", "io": false, "mdb": "each"}
```
(`addition: true` = `-d`; `ties: all`; `mdb: each`.) Output (9 cols): `ARG_contig, ARG_start, ARG_end, gene, IS_contig, IS_start, IS_end, IS_family, distance`.

### Step 9 — Collapse Collection `…/collapse_dataset/5.1.0`
```json
{"one_header": false, "filename": {"add_name": true, "place_name": "same_multiple"}}
```
Prepends the element identifier as column 1. Output (10 cols): `isolate, contig, ARG_start, ARG_end, gene, IS_contig, IS_start, IS_end, IS_family, distance`.

### Step 10 — Matrix 1 (ARG location, gene × isolate) tp_awk
```awk
BEGIN{FS=OFS="\t"}
{ iso[NR]=$1; con[NR]=$2; gene[NR]=$5; n=NR; if($4+0>mx[$2]) mx[$2]=$4+0; isos[$1]=1 }
END{
  for(k=1;k<=n;k++){
    code=(mx[con[k]]<200000)?2:1; g=gene[k]; ix=iso[k];
    if(!((g SUBSEP ix) in L) || code==2) L[g,ix]=code; genes[g]=1;
  }
  ni=0; for(s in isos){ni++; A[ni]=s}
  for(a=1;a<=ni;a++)for(b=a+1;b<=ni;b++)if(A[b]<A[a]){t=A[a];A[a]=A[b];A[b]=t}
  ng=0; for(g in genes){ng++; GN[ng]=g}
  for(a=1;a<=ng;a++)for(b=a+1;b<=ng;b++)if(GN[b]<GN[a]){t=GN[a];GN[a]=GN[b];GN[b]=t}
  printf "Gene"; for(a=1;a<=ni;a++) printf "%s%s",OFS,A[a]; printf "\n";
  for(r=1;r<=ng;r++){ printf "%s",GN[r]; for(a=1;a<=ni;a++) printf "%s%d",OFS,(L[GN[r],A[a]]+0); printf "\n"; }
}
```
Self-contained plasmid classifier: `max(ARG_end)` per contig `< 200000` bp = plasmid (code 2), else chromosome (code 1); plasmid wins on mixed copies. Output: gene × isolate, 0=absent / 1=chromosome / 2=plasmid.

### Step 11 — Matrix 2 (ARG mobile context, context × isolate) tp_awk
```awk
BEGIN{FS=OFS="\t"}
{ iso[NR]=$1; con[NR]=$2; di[NR]=$10; n=NR; if($4+0>mx[$2]) mx[$2]=$4+0; isos[$1]=1 }
END{
  for(k=1;k<=n;k++){
    code=(mx[con[k]]<200000)?2:1;
    if(code==2) ctx="Plasmid-borne";
    else if(di[k]+0<1000) ctx="Chromosomal IS-adjacent (<1kb)";
    else ctx="Chromosomal distal";
    M[ctx,iso[k]]++;
  }
  ni=0; for(s in isos){ni++; A[ni]=s}
  for(a=1;a<=ni;a++)for(b=a+1;b<=ni;b++)if(A[b]<A[a]){t=A[a];A[a]=A[b];A[b]=t}
  split("Plasmid-borne|Chromosomal IS-adjacent (<1kb)|Chromosomal distal",CTX,"|");
  printf "Context"; for(a=1;a<=ni;a++) printf "%s%s",OFS,A[a]; printf "\n";
  for(r=1;r<=3;r++){ printf "%s",CTX[r]; for(a=1;a<=ni;a++) printf "%s%d",OFS,(M[CTX[r],A[a]]+0); printf "\n"; }
}
```

### Steps 12 & 13 — Heatmaps `…/ggplot2_heatmap2/3.3.0+galaxy0`
Fig 1 (Matrix 1) title "ARG genomic location (0=absent, 1=chromosome, 2=plasmid)"; Fig 2 (Matrix 2) title "ARG counts by mobile context". Both:
```json
{"transform": "none", "zscore_cond": {"scale": "none", "zscore": "none"},
 "cluster_cond": {"cluster": "no"}, "labels": "both",
 "colorchoice": {"name": "BrBG", "type": "palettes"}, "image_file_format": "png"}
```

---

## 5. Notebook directives (on-graph outputs the page displays)

One `galaxy`-fenced block per directive:
1. `history_dataset_collection_display(history_dataset_collection_id=<staramr mlst collection>)`
2. `history_dataset_collection_display(history_dataset_collection_id=<staramr summary collection>)`
3. `history_dataset_as_image(history_dataset_id=<Fig1 location heatmap PNG>)`
4. `history_dataset_collection_display(history_dataset_collection_id=<staramr plasmidfinder collection>)`
5. `history_dataset_collection_display(history_dataset_collection_id=<staramr resfinder collection>)`
6. `history_dataset_collection_display(history_dataset_collection_id=<Integron Finder Summary collection>)`
7. `history_dataset_collection_display(history_dataset_collection_id=<ISEScan tabular results collection>)`
8. `history_dataset_collection_display(history_dataset_collection_id=<bedtools closest collection>)`
9. `history_dataset_as_image(history_dataset_id=<Fig2 context heatmap PNG>)`

(Titles with spaces in `history_dataset_as_table` must be quoted.)

---

## 6. Verification

| Check | Expected |
|---|---|
| bedtools closest collection (with `remove_short_is=true`) | byte-identical across all 4 isolates |
| Matrix 2 (context) | byte-identical |
| Matrix 1 cells | identical (row order may be alphabetical) |
| KUN1163 IS count | 17 complete elements |
| `aac(6')-aph(2'')` KUN1163 | **80 bp**, IS6, plasmid |
| `aac(6')-aph(2'')` KUH140046 | **467 bp**, IS6, plasmid |
| `aac(6')-aph(2'')` KUH180129 | **84 bp**, IS256, chromosome |
| Integrons | zero in all four |
| Page extraction | 14 seeded, 8 ICJ map-over, 9 exposed, 0 warnings, 0 dangling |
| Extracted workflow | 14 steps (1 input + 13 tools) |

Headline (load-bearing science): same gene `aac(6')-aph(2'')`, different mobilizing IS family by location (IS6 plasmids vs IS256 chromosome).

---

## 7. Extraction

Page-extraction feature (PR #22860 / `extract_next`):
```
GET  /api/pages/<page_id>/workflow_extraction_summary
POST /api/workflows/extract {"from_page_id": "<page_id>", "history_id": "<history_id>"}
```
Expected: 14 steps, every input_connection resolves (zero dangling), 9 workflow outputs, report rewritten with 0 leftover instance ids. Cleanest extraction of the three — genuine collection map-over, no anti-patterns, no code change required.
