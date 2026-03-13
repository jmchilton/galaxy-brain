# IWC Workflow Review Summary

Ran `galaxy-workflow-validate` and `galaxy-workflow-clean-stale-state` against
the full IWC repository (111 native .ga workflows, 509 unique tools).

## Tool Cache

Initial `--populate-cache` via ToolShed API cached 499/509 tools. 10 failed with
HTTP 500. All 10 were resolved with `galaxy-tool-cache add-local` using source XML
from the Galaxy repo or GitHub. Final result: **509/509 cached, 0 skips**.

### ToolShed API failures (all resolved via add-local)

**Stock Galaxy tools** (XML in Galaxy repo):
- `CONVERTER_gz_to_uncompressed` 1.0.0 — `lib/galaxy/datatypes/converters/gz_to_uncompressed.xml`
- `CONVERTER_uncompressed_to_gz` 1.16+galaxy0 — `lib/galaxy/datatypes/converters/uncompressed_to_gz.xml`
- `Convert characters1` 1.0.0 / 1.0.1 — `tools/filters/convert_characters.xml`
- `Remove beginning1` 1.0.0 — `tools/filters/remove_beginning.xml`
- `Show beginning1` 1.0.2 — `tools/filters/headWrapper.xml`
- `Show tail1` 1.0.1 — `tools/filters/tailWrapper.xml`
- `__RELABEL_FROM_FILE__` 1.0.0 — `lib/galaxy/tools/relabel_from_file.xml`
- `param_value_from_file` 0.1.0 — `tools/expression_tools/parse_values_from_file.xml`

**ToolShed tools** (XML from GitHub):
- `map_param_value` 0.2.0 — `tools-iuc/tools/map_param_value/`
- `pick_value` 0.2.0 — `tools-iuc/tools/pick_value/`
- `cufflinks` 2.2.1.4 — `tools-iuc/tool_collections/cufflinks/cufflinks/` (needs adjacent macros)
- `EMBOSS: maskseq51` 5.0.0 — `tools-iuc/tools/emboss_5/` (needs adjacent macros)
- `rdock_sort_filter` 2013.1-0+galaxy0 — `bgruening/galaxytools/chemicaltoolbox/rdock/` (needs adjacent macros)

Root causes:
- Stock tools: ToolShed API doesn't serve stock Galaxy tools (they have no ToolShed repo)
- Expression tools (map_param_value, pick_value): tracked in [#22007](https://github.com/galaxyproject/galaxy/pull/22007)
- cufflinks: `hidden_data` param type not handled by `parameters/factory.py`
- EMBOSS/rdock: unknown — likely similar parameter model factory gaps

## Validation Report

```
Workflows: 111 | Steps: 2074 OK, 64 FAIL, 0 SKIP, 0 ERROR
```

### Failure categories

**`saveLog` — multiqc (14 workflows, 16 steps)**
Stale key `saveLog` in multiqc v1.24.1+galaxy0, v1.27+galaxy3, v1.33+galaxy0.

| Workflow | Step | Version |
|----------|------|---------|
| Assembly-Hifi-Trio-phasing-VGP5 | 25 | 1.27+galaxy3 |
| atacseq | 30 | 1.24.1+galaxy0 |
| consensus-peaks-atac-cutandrun | 24 | 1.33+galaxy0 |
| consensus-peaks-chip-pe | 22 | 1.33+galaxy0 |
| consensus-peaks-chip-sr | 22 | 1.33+galaxy0 |
| cutandrun | 14 | 1.33+galaxy0 |
| pe-artic-variation | 25 | 1.27+galaxy3 |
| pox-virus-half-genome | 34, 36, 45 | 1.27+galaxy3 |
| scrna-seq-fastq-to-matrix-10x-cellplex | 8.6 | 1.33+galaxy0 |
| scrna-seq-fastq-to-matrix-10x-v3 | 6 | 1.33+galaxy0 |
| se-wgs-variation | 5 | 1.27+galaxy3 |

**`trim_front2`/`trim_tail2` — fastp (4 workflows)**
Stale keys in fastp/0.23.2+galaxy0 paired-end trimming options.

| Workflow | Step |
|----------|------|
| Generic-variation-analysis-on-WGS-PE-data | 3 |
| pe-wgs-variation | 2 |
| WGS-PE-variant-calling-in-haploid-system | 3 |

**`images` — imagemagick_image_montage (2 workflows, 4 steps)**
Stale key `images` in imagemagick v7.1.2-2+galaxy1.

| Workflow | Steps |
|----------|-------|
| Assembly-Hifi-HiC-phasing-VGP4 | 70, 73 |
| Scaffolding-HiC-VGP8 | 49, 65 |

**`__workflow_invocation_uuid__` — clinicalmp-verification (1 workflow, 20 steps)**
Every step in `clinicalmp-verification.ga` carries a stale `__workflow_invocation_uuid__` key.

**`__identifier__` — various tools (3 workflows, ~10 steps)**
Stale `__identifier__` keys (e.g. `input|__identifier__`, `dadaF|__identifier__`).

| Workflow | Tools affected |
|----------|---------------|
| dada2_paired | dada2_mergePairs |
| MAGs-binning-evaluation | concoct_*, bowtie2, samtools_sort, metabat2 |
| sra-manifest-to-concatenated-fastqs | Cut1 |
| se-wgs-variation | picard_MarkDuplicates |

**Tool-specific stale keys (5 workflows)**

| Workflow | Tool | Stale keys |
|----------|------|------------|
| segmentation-and-counting | ip_filter_standard, ip_threshold | filter_type, radius, block_size, dark_bg |
| Genome-assembly-with-Flye | flye, quast, fasta-stats | i, m, mode, no_trestle, plasmids, al, circos, etc. (16 keys) |
| Assembly-polishing-with-long-reads | racon (×4) | e, f, g, m, q, u, w, x (32 keys) |
| mfassignr | mfassignr_* | cut, SN, abundance_score_threshold, etc. (9 keys) |
| Functional_annotation_of_protein_sequences | interproscan | licensed\|applications_licensed |

**Other**

| Workflow | Tool | Stale key |
|----------|------|-----------|
| ont-artic-variation | ivar_trim/1.3.1+galaxy2 | conflicting tool states for `filter_by` |
| pe-artic-variation | ivar_trim/1.4.4+galaxy0 | `min_len` |
| pox-virus-half-genome | ivar_trim/1.4.4+galaxy1 | `min_len` |
| Scaffolding-HiC-VGP8 | tp_sort_header_tool | `ignore_case` (×2) |
| clinicalmp-verification | uniprotxml_downloader | `format` |

## Stale State Report

```
Workflows: 111 | 124 stale key(s) across 25 workflow(s), 86 clean, 0 errors
```

## Summary

- **86/111 workflows are clean** — all steps validate, no stale state.
- **25 workflows have 124 stale keys** across ~50 steps.
- **0 skips** — all 509 tools cached (10 via add-local fallback).
- Top offenders by frequency:
  - `saveLog` in multiqc — 16 steps across 14 workflows
  - `__workflow_invocation_uuid__` — 20 steps in clinicalmp-verification alone
  - racon stale params — 32 keys across 4 steps in one workflow
- The `__identifier__` and `__workflow_invocation_uuid__` patterns suggest systematic
  issues with how Galaxy serializes certain runtime values into saved workflow state.
