# UC1 Setup Recipe — MRSA Mobile AMR Context Across Isolates

**Issue:** https://github.com/jmchilton/galaxy-brain/issues/12
**Science:** Comparative ARG↔IS proximity across 4 *S. aureus* isolates. Headline: `aac(6')-aph(2'')` is IS6-adjacent on the plasmids of KUN1163/KUH140046 but IS256-adjacent on the KUH180129 chromosome.
**Faithful workflow:** `UC1_MRSA_Bakta_JBrowse_faithful.ga` — 35 steps, 1 input collection, 6 `__BUILD_LIST__` nests, 4 `__EXTRACT_DATASET__` anchors, Bakta + JBrowse integrated. Extracts cleanly and re-runs byte-identical to golden.

> Server-agnostic recipe to recreate the UC1 notebook on another Galaxy. Tool versions/parameters confirmed against the reference server (Galaxy 26.2.dev0). Instance-specific values (encoded dataset ids) come with the step that regenerates them.

---

## 0. Two techniques this pipeline depends on

Read these first — they govern *how* you wire several steps below.

### A. Per-isolate map-over of a `multiple="true"` input

Some tool inputs accept a whole collection (`type="data" multiple="true"`): here staramr `genomes`, both bedtools closest `inputB` (`-b`), and all three JBrowse track `annotation` inputs. Feeding a flat `list` into one of these **reduces** — a single job sees all 4 elements — which is wrong when you want per-isolate results.

Per-isolate mapping nests the upstream `list` one level deeper as a `list:list` (`__BUILD_LIST__`), then maps over its *outer* dimension so the `multiple` input consumes one element at a time:

```
list  --map __BUILD_LIST__-->  list:list  -->  multiple input
        (4 singleton inner lists)        outer list maps → 4 jobs;
                                         singleton inner reduces → 1 each → list-depth output
```

**Map-over forms via `/api/tools` — this is how you build the history (no UI, no clicking):**

- **Single `data` input over a `list`** (ISEScan, Integron, Bakta, SortBED, tbl2gff3, awk on a collection, closest `inputA`, JBrowse `reference`, and `__BUILD_LIST__`'s own input): `{"batch": true, "values": [{"src":"hdca","id": <list>}]}` → one job per element.
- **`multiple` input that pairs with a batched sibling** (closest `inputB`, paired with the batched `inputA`): feed its `list:list` as `{"values": [{"src":"hdca","id": <list:list>}]}` — the plain multiple-value form, **not** `batch`. In the *same* tool call Galaxy subcollection-maps its outer list against the batched sibling → per-isolate jobs, `list`-depth output. (Wrapping it in `batch:true` fails — *"Cannot match collection types"* — you'd be matching a `list` against a `list:list`.)
- **staramr `genomes` is the exception:** it's the tool's *only* input, so there's no sibling to pair against, and **no `list:list` form works** — each either reduces to one job or mirrors the `list:list` into the output (over-nest), which makes Collapse later key on the inner index (`"0"`) instead of the isolate. Map it over the **plain input `list`** with `batch:true` → `list` output, one job per isolate. So a hand-built history uses build_list for the 4 closest/JBrowse track inputs, **not** staramr — the `.ga`'s build_list→staramr edge is a workflow-editor artifact.
- **JBrowse track `annotation` (3× `multiple`, nested in `track_groups`/`data_tracks` repeats):** the pairing above does **not** currently take through that repeat nesting via `/api/tools` (each browser gets every isolate's tracks). Per-isolate JBrowse is the one step that still needs `extract`/engine handling — open item (§4e).

> Caveat: `__BUILD_LIST__` pairing is **positional** — it zips by index and ignores element identifiers. Safe only while every branch stays 1:1 and order-preserving from the shared input collection. A branch-local filter/sort would silently mispair with no error.

### B. Per-isolate display of a mapped output → `__EXTRACT_DATASET__`

JBrowse runs mapped, so its output is a *collection* of 4 browsers. A notebook directive that embeds a single collection **element** is silently dropped on extraction. To show one isolate's browser, first run `__EXTRACT_DATASET__` (by identifier) to pull that element out as a standalone dataset, then point the directive at the standalone id. UC1 does this 4× (one per isolate).

---

## 1. Tools to Install

### Tool Shed repos (install via ephemeris shed-tools)

```bash
uv tool install ephemeris   # isolated; do NOT pip-install into Galaxy's .venv

shed-tools install -g http://<SERVER>:8080 -a <ADMIN_KEY> \
  -t mrsa-mobile-amr-tools.yml \
  --skip-install-resolver-dependencies
```

`mrsa-mobile-amr-tools.yml` installs: staramr (nml), bakta (iuc), isescan (iuc), integron_finder (iuc), plasmidfinder (iuc), tbl2gff3 (iuc), text_processing (bgruening), bedtools (iuc), jbrowse (iuc). Also install `iuc/ggplot2_heatmap2` and `nml/collapse_collections`.

### Confirmed tool IDs and versions

| Tool | Full tool ID | Version |
|---|---|---|
| staramr | `toolshed.g2.bx.psu.edu/repos/nml/staramr/staramr_search` | `0.12.3+galaxy0` |
| isescan | `toolshed.g2.bx.psu.edu/repos/iuc/isescan/isescan` | `1.7.3+galaxy0` |
| integron_finder | `toolshed.g2.bx.psu.edu/repos/iuc/integron_finder/integron_finder` | `2.0.5+galaxy1` |
| bakta | `toolshed.g2.bx.psu.edu/repos/iuc/bakta/bakta` | `1.9.4+galaxy1` |
| jbrowse | `toolshed.g2.bx.psu.edu/repos/iuc/jbrowse/jbrowse` | `1.16.11+galaxy1` |
| tbl2gff3 | `toolshed.g2.bx.psu.edu/repos/iuc/tbl2gff3/tbl2gff3` | `1.2` |
| bedtools closest | `toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_closestbed` | `2.31.1+galaxy1` |
| bedtools sortbed | `toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_sortbed` | `2.31.1+galaxy0` |
| tp_awk_tool | `toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_awk_tool` | `9.5+galaxy3` |
| ggplot2_heatmap2 | `toolshed.g2.bx.psu.edu/repos/iuc/ggplot2_heatmap2/ggplot2_heatmap2` | `3.3.0+galaxy0` |
| collapse_collections | `toolshed.g2.bx.psu.edu/repos/nml/collapse_collections/collapse_dataset` | `5.1.0` |

Builtin (no install): `__DATA_FETCH__` (collection upload), `__BUILD_LIST__`, `__EXTRACT_DATASET__`.

### Docker / container setup
Enable Docker for containerized jobs (`docker_enabled` job env + `enable_mulled_containers: true`, `conda_auto_install: false`). Pre-pull BioContainer images before running, especially on Apple Silicon (amd64 emulation is correct but slow).

### Bakta DB setup
- Download Bakta light DB v5.1 (1.48 GB tar → 3.4 GB) to `database/bakta_db/db-light`.
- **Critical:** move the bundled `amrfinderplus-db/` OUT of `db-light` (the wrapper does `ln -s db-light/*` and fails if it exists there).
- Update AMRFinder DB: `amrfinder_update --force_update --database <amrfinderplus-db-dir>` inside `quay.io/biocontainers/bakta:1.9.4--pyhdfd78af_0` (bundled 2023-11-15.1 is too old for amrfinder 3.12.8 → need ≥ 2023-12-15.2; UC1 used `amrfinderplus_V3.12_2024-07-22.1`).
- Register both DBs in `.loc` (bakta `bakta_version` col = `1.7`; amrfinder `db_version` col = `3.12`); repoint `shed_tool_data_table_conf.xml` off `.loc.sample`; restart (no working reload endpoint for data tables).
- On Apple Silicon run Bakta **serially** (one isolate at a time), not mapped 4-wide (OOM under concurrent amd64-emulated diamond/blast).

---

## 2. Reference Data / DB Setup

Only the Bakta DB above. The AMR/IS analysis is assembly-based (FASTA→BED); no genome index or `.loc` registration.

---

## 3. Input Data

One `list` collection of 4 combined chromosome+plasmid FASTA files, fetched from ENA via a single `POST /api/tools/fetch` (set `history_id`):

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

Element names (isolate IDs) must be exactly `KUH140013`, `KUH140046`, `KUH180129`, `KUN1163` — they become matrix column labels and the `__EXTRACT_DATASET__` selectors.

| Element | MLST | Chr | Plasmid | Genome bp |
|---|---|---|---|---|
| KUH140013 | ST8 | AP020311.1 | AP020312.1 | 2,837,394 |
| KUH140046 | ST8 | AP020313.1 | AP020314.1 | 2,859,431 |
| KUH180129 | ST6313 | AP020322.1 | AP020323.1 | 2,897,282 |
| KUN1163 | ST764 | AP020324.1 | AP020325.1 | 2,944,787 |

Source: Hikichi et al. 2019, BioProject PRJDB8599.

---

## 4. Pipeline

Everything maps over the input collection so each isolate gets its own result. Single-data inputs map natively (connect the collection; `batch:true` in direct API). The `multiple` inputs flagged **[nest]** below need a `__BUILD_LIST__` per §0-A.

### 4a. Annotation branches (off the input list)

**Step — staramr** `…/staramr_search/0.12.3+galaxy0` — `genomes` **[nest]**
```json
{"pointfinder_db": {"use_pointfinder": "disabled"},
 "advanced": {"genome_size_lower_bound": "4000000", "genome_size_upper_bound": "6000000",
  "minimum_N50_value": "10000", "minimum_contig_length": "300", "mlst_scheme": "auto",
  "pid_threshold": "98.0", "plasmidfinder_type": "include_all", "plength_plasmidfinder": "60.0",
  "plength_resfinder": "60.0", "report_all_blast": false}}
```
`genomes` is `multiple="true"` → map staramr over the **plain input `list`** with `batch:true` (`{"batch":true,"values":[{"src":"hdca","id":<input list>}]}`) so each isolate gets its own job (else all 4 collapse into one). Do **not** feed it a `__BUILD_LIST__` `list:list`: staramr's sole input has no sibling to pair against, so every `list:list` form either reduces or over-nests the output and corrupts the whole ARG chain (§0-A). The genome-size "quality-failed" warning is expected for *S. aureus* (~2.8–2.9 Mb vs the 4–6 Mb window); calls are unaffected. Outputs used: `resfinder.tsv`, `mlst.tsv`, `summary.tsv`, `plasmidfinder.tsv` collections.

**Step — ISEScan** `…/isescan/1.7.3+galaxy0` (single input → native map)
```json
{"remove_short_is": true, "log_activate": false}
```
**CRITICAL:** `remove_short_is` MUST be `true`. Default `false` keeps partial/unclassified elements (`family=new`) → spurious distance-0 overlaps → corrupted matrix (KUN1163 shows 25 vs the validated 17 IS). Output used: `results in gff format` collection.

**Step — Integron Finder** `…/integron_finder/2.0.5+galaxy1` (single input → native map)
```json
{"type_replicon": "--circ", "local_max": false, "promoter_attI": false, "gbk": false, "pdf": false,
 "settings": {"attc_settings": {"calin_threshold": "2", "dist_thresh": "4000", "max_attc_size": "200", "min_attc_size": "40"},
  "protein_settings": {"func_annot": false, "no_proteins": false}}}
```
Expected: zero integrons in all four (expected for *S. aureus*). Outputs: `Integron annotations`, `Summary`.

**Step — Bakta** `…/bakta/1.9.4+galaxy1` (single input → native map)
```json
{"organism": {"genus": "Staphylococcus", "species": "aureus"},
 "annotation": {"translation_table": "11", "keep_contig_headers": true},
 "input_option": {"min_contig_length": "200",
   "bakta_db_select": "V5.1_light_2024-01-19",
   "amrfinder_db_select": "amrfinderplus_V3.12_2024-07-22.1"},
 "output_files": {"output_selection": ["file_tsv", "file_gff3"]}}
```
`keep_contig_headers: true` keeps the ENA accessions as seqids so Bakta GFF3 coordinates line up with the JBrowse reference. Output used: GFF3 (genome-wide CDS calls). On Apple Silicon run serially (see §1).

### 4b. Feature prep (BED for proximity, GFF3 for browser tracks)

**ARG → BED** — tp_awk on staramr `resfinder.tsv` collection:
```awk
NR>1 { s=$9; e=$10; if (s>e) { t=s; s=e; e=t } print $8"\t"(s-1)"\t"e"\t"$2 }
```
→ **SortBED** (default lexicographic) → ARG sorted BED. ($8=contig, $9/$10=start/end, $2=gene.)

**IS → BED** — tp_awk on ISEScan gff collection:
```awk
/family=/ { fam="IS"; if (match($9, /family=[^;]+/)) fam=substr($9, RSTART+7, RLENGTH-7); print $1"\t"($4-1)"\t"$5"\t"fam }
```
→ **SortBED** → IS sorted BED.

**Bakta CDS → BED** — tp_awk on Bakta GFF3 collection (gene/product/locus_tag name, stop at FASTA section):
```awk
BEGIN{FS=OFS="\t"}
/^##FASTA/{exit} /^#/{next}
$3=="CDS"{
  g="";p="";lt="";
  if(match($9,/gene=[^;]+/)) g=substr($9,RSTART+5,RLENGTH-5);
  if(match($9,/product=[^;]+/)) p=substr($9,RSTART+8,RLENGTH-8);
  if(match($9,/locus_tag=[^;]+/)) lt=substr($9,RSTART+10,RLENGTH-10);
  name=(g!="")?g:((p!="")?p:((lt!="")?lt:"CDS")); gsub(/[ \t]+/,"_",name);
  print $1,($4-1),$5,name;
}
```
→ **SortBED** → Bakta gene sorted BED.

**GFF3 tracks for JBrowse** — `tbl2gff3` (`begin=2, end=3, Name attr=col 4, strand=infer`) converts a 4-col BED back to GFF3:
- on the **IS BED** (pre-sort copy): `source=ISEScan`, `type=mobile_genetic_element` → IS track GFF3.
- on the **ARG BED**: `source=staramr`, `type=gene` → ARG track GFF3.

### 4c. Proximity (two `closest` runs, both `inputB` nested)

bedtools closest `…/bedtools_closestbed/2.31.1+galaxy1`, params for both:
```json
{"ties": "all", "strand": "", "addition": true, "addition2": {"addition2_select": ""},
 "k": "1", "io": false, "mdb": "each"}
```
(`addition:true`=`-d`; `mdb:each` keeps per-element B databases.) `inputA` = ARG sorted BED (native map). `inputB` = `-b`, `multiple="true"` **[nest]** — build a `list:list` from the B collection so each isolate's ARG features are measured only against *its own* B features (a flat list reduces and every job sees all isolates → pairing lost).

- **closest #1**: inputB = IS sorted BED → 9-col `ARG_contig, ARG_start, ARG_end, gene, IS_contig, IS_start, IS_end, IS_family, distance`.
- **closest #2**: inputB = Bakta gene sorted BED → nearest annotated gene to each ARG.

### 4d. Matrices, heatmaps, flanking-gene table

**Collapse Collection** `…/collapse_dataset/5.1.0` (prepends the element identifier as column 1), on each closest output:
```json
{"one_header": false, "filename": {"add_name": true, "place_name": "same_multiple"}}
```

From **closest #1** collapse (10 cols: `isolate, contig, ARG_start, ARG_end, gene, IS_contig, IS_start, IS_end, IS_family, distance`):

*Matrix 1 — ARG location (gene × isolate)* tp_awk → heatmap Fig 1:
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
Self-contained plasmid classifier: `max(ARG_end)` per contig `< 200000` bp = plasmid (code 2), else chromosome (code 1); plasmid wins on mixed copies. Cells: 0=absent / 1=chromosome / 2=plasmid.

*Matrix 2 — mobile context (context × isolate)* tp_awk → heatmap Fig 2:
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

From **closest #2** collapse — *nearest flanking gene table* tp_awk (Bakta gene neighborhood of each ARG):
```awk
BEGIN{FS=OFS="\t"; print "Isolate","ARG","Nearest_flanking_gene","Distance_bp"}
{ print $1,$5,$9,$10 }
```

**Heatmaps** `…/ggplot2_heatmap2/3.3.0+galaxy0` — Fig 1 title "ARG genomic location (0=absent, 1=chromosome, 2=plasmid)"; Fig 2 title "ARG counts by mobile context". Both:
```json
{"transform": "none", "zscore_cond": {"scale": "none", "zscore": "none"},
 "cluster_cond": {"cluster": "no"}, "labels": "both",
 "colorchoice": {"name": "BrBG", "type": "palettes"}, "image_file_format": "png"}
```

### 4e. JBrowse + per-isolate extraction

**JBrowse** `…/jbrowse/1.16.11+galaxy1` — `reference_genome|genome` = input collection (native map → one browser per isolate). One track group "MRSA mobile-AMR" with three `gene_calls` tracks, each `annotation` input being `multiple="true"` **[nest]**:
- ARG GFF3 (from tbl2gff3)
- IS GFF3 (from tbl2gff3)
- Bakta GFF3 (direct from Bakta)

Without the nests every browser would load all 4 isolates' tracks; with them each browser shows only its own isolate's reference + ARG/IS/Bakta features.

> **Open item — per-isolate JBrowse via `/api/tools`.** The `{"values":[{list:list}]}` pairing that works for closest `inputB` does **not** take through JBrowse's three `annotation` inputs (they sit inside `track_groups`/`data_tracks` repeats): each browser ends up with all 4 isolates' tracks and JBrowse errors. Closest/matrices build cleanly with the §0-A forms; this step is the one that still needs the workflow engine (or a per-isolate workaround). Tracked alongside #4623 / #22710.

**Per-isolate display** — run `__EXTRACT_DATASET__` 4× on the JBrowse output collection, `which_dataset=by_identifier` with `identifier` = each isolate ID (`KUH140013`, `KUH140046`, `KUH180129`, `KUN1163`). Each yields a standalone browser dataset the page can embed (§0-B).

---

## 5. Notebook directives (on-graph outputs the page displays)

One `galaxy`-fenced block per directive:
1. `history_dataset_collection_display(...staramr mlst collection)`
2. `history_dataset_collection_display(...staramr summary collection)`
3. `history_dataset_as_image(...Fig 1 location heatmap PNG)`
4. `history_dataset_collection_display(...staramr plasmidfinder collection)`
5. `history_dataset_collection_display(...staramr resfinder collection)`
6. `history_dataset_collection_display(...Integron Finder Summary collection)`
7. `history_dataset_collection_display(...ISEScan tabular results collection)`
8. `history_dataset_collection_display(...bedtools closest #1 collection)`
9. `history_dataset_as_image(...Fig 2 context heatmap PNG)`
10. `history_dataset_as_table(...nearest-flanking-gene table)` — quote titles with spaces
11–14. `history_dataset_embedded(history_dataset_id=...)` — the 4 `__EXTRACT_DATASET__` browser datasets, one per isolate (embed the extracted *dataset*, never a collection element).

> **Use `history_dataset_embedded`, not `history_dataset_display`.** Both render the identical 16:9 iframe (`/datasets/<id>/display/?preview=True`); `display` only adds a `Dataset: <name>` + Download/Import header bar, which is redundant here since the narrative already labels each browser. `embedded` gives the clean browser.
>
> **Interactive JBrowse needs a sanitize-allowlist entry for `__EXTRACT_DATASET__`.** With the default `sanitize_all_html: true`, Galaxy serves `html` datasets as `text/plain` (raw source, browser won't boot) unless the dataset's **creating tool** is in `sanitize_allowlist`. Extraction re-tags the creating tool from jbrowse to `__EXTRACT_DATASET__`, so an allowlist entry for jbrowse does **not** cover the extracted per-isolate browsers — add `__EXTRACT_DATASET__` to `config/sanitize_allowlist.txt` (each entry on its own line) and reload (gunicorn `SIGHUP`). The JBrowse *assets* (`data/trackList.json`, …) already resolve under the display path; only the `index.html` mime-type is gated.

---

## 6. Verification

| Check | Expected |
|---|---|
| staramr jobs | 4 (mapped, not 1 reduced) |
| bedtools closest #1 collection (`remove_short_is=true`) | byte-identical across all 4 isolates |
| Matrix 2 (context) | byte-identical |
| Matrix 1 cells | identical (row order may be alphabetical) |
| KUN1163 IS count | 17 complete elements |
| `aac(6')-aph(2'')` KUN1163 | **80 bp**, IS6, plasmid |
| `aac(6')-aph(2'')` KUH140046 | **467 bp**, IS6, plasmid |
| `aac(6')-aph(2'')` KUH180129 | **84 bp**, IS256, chromosome |
| Integrons | zero in all four |
| JBrowse | 4 browsers; each shows only its own isolate's reference + ARG/IS/Bakta tracks (≈7 inputs/browser, not 16) |
| Extracted workflow | 35 steps: 1 input, 6 `__BUILD_LIST__`, 4 `__EXTRACT_DATASET__`, rest tools; 0 dangling |

Headline (load-bearing science): same gene `aac(6')-aph(2'')`, different mobilizing IS family by location (IS6 plasmids vs IS256 chromosome).

---

## 7. Extraction

Page-extraction feature (PR #22860 / `extract_next`):
```
GET  /api/pages/<page_id>/workflow_extraction_summary
POST /api/workflows/extract {"from_page_id": "<page_id>", "history_id": "<history_id>"}
```
The faithful workflow (with its `__BUILD_LIST__` nests and `__EXTRACT_DATASET__` anchors) round-trips: 35 steps, every input_connection resolves, 0 dangling, and a re-run reproduces the golden matrices/flank table and per-isolate browsers. Build the source history with the `/api/tools` map-over forms in §0-A — `batch:true` for single-data map-overs, and the `{"values":[{hdca}]}` multiple-value form (paired with a batched sibling) for closest `inputB`. staramr maps over the plain input list; JBrowse per-isolate tracks are the open item (§4e). The API-batch-vs-extraction asymmetry for `multiple` inputs is tracked on #4623 / #22710.
