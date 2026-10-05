# Galaxy Interface Brief: TAL1 peaks → candidate regulated genes

> Source provenance: `freeform-summary.md` (normalized from galaxy-brain issue
> #13). This is a **design handoff**, not a gxformat2 skeleton. Interface choices
> the source underdetermines are carried as open questions, not invented.
>
> **Framing caveat:** the source frames this as a Galaxy *Notebook* vignette. This
> brief designs the underlying **Galaxy workflow** that the notebook narrates /
> invokes — the peak→gene analytical core. Browser visualization and prose
> interpretation stay in the notebook layer, not the workflow.

## Workflow scope

Inputs are already-called TAL1 peak sets plus a gene annotation; the workflow
derives promoter windows, classifies peaks by promoter overlap vs nearest-gene,
collapses isoforms, and emits candidate-gene tables per peak class. Expression
integration is **out of scope for the MVP workflow** (stretch; see below).

## Workflow inputs

| Label | Type | Shape | Notes |
|---|---|---|---|
| `TAL1 peak sets` | collection (`list`) | 3 elements: `common`, `G1E_only`, `megakaryocyte_only` | narrowPeak/BED. The three sets get identical downstream treatment → map-over a `list`. Element identifiers are the peak-class names and must survive to outputs (see testability §3). **Recommended shape; see open questions for the 3×File alternative.** |
| `RefSeq gene annotations (mm10)` | `data` (File) | single BED12 | `RefSeq_gene_annotations_mm10.bed`; gene symbols in column 4 *(to verify)*. Source for TSS/promoter derivation. |
| `Promoter upstream (bp)` | `int` param | scalar | Default `1000`. Explicit typed param so tests/users can set it (testability §5). |
| `Promoter downstream (bp)` | `int` param | scalar | Default `500`. Window is `-1000/+500` working default; not finalized. |
| `Regions of interest (BED)` | `data` (File), **optional** | single BED | `ChIPseq_regions_of_interest_v4.bed` (Runx1, Gata1, Gata2, Tal1). Likely a notebook/QC anchor rather than a workflow input — included optionally for a focused locus check. *(low confidence it belongs in the workflow)* |

Not workflow inputs in the MVP: the raw per-state `G1E`/`megakaryocyte` TAL1
narrowPeak files. The source lists them under "reuse," but the derived
common/G1E-only/mega-only sets are what the intersect/nearest-gene steps consume.
Flagged as an open question in case the per-state peaks are needed to recompute
the class split inside the workflow.

### Stretch inputs (not MVP)

| Label | Type | Notes |
|---|---|---|
| `Expression tables` | collection (`list`) or `data` | Processed G1E / megakaryocyte expression TSVs. Join by gene symbol/id. Gated on verified sample metadata, genome build, columns, identifiers — do **not** wire until confirmed. |

## Workflow outputs

Promotion follows testability §2/§4: prefer deterministic tables/BEDs as
assertable checkpoints; treat plots as weak (smoke) outputs. Per-class outputs
stay as `list` collections keyed by `common` / `G1E_only` / `megakaryocyte_only`
so element-level assertions are addressable (§3).

| Label | Type | Strength | Notes |
|---|---|---|---|
| `Candidate gene summary` | `data` (tabular) | **strong** | Primary deliverable: candidate genes by peak class, promoter overlap, nearest-gene distance, MACS2 score/q-value. Isoform-collapsed by gene symbol. |
| `Promoter-bound peak-to-gene tables` | collection (`list`, tabular) | **strong** | Per peak class: peaks overlapping promoter windows joined to gene symbol/strand/TSS/distance. |
| `Nearest-gene tables (non-promoter peaks)` | collection (`list`, tabular) | **strong** | Per peak class: peaks not overlapping a promoter, with nearest gene + distance. |
| `Peak-set summary counts` | `data` (tabular) | **strong** | Per class: # peaks, # promoter-overlapping, # nearest-gene-assigned. |
| `Promoter windows (BED)` | `data` (bed) | **medium (checkpoint)** | Strand-aware TSS expanded to promoter window. Promote as an intermediate checkpoint; needs producer-side `change_datatype: bed` if the interval tool reports a weaker type (testability §6). |
| `Candidate counts by peak class (plot)` | `data` (png/image) | weak (smoke) | Bar chart. `has_size`/image-dimension checks only; the counts table behind it is the real checkpoint. |
| `Distance-to-TSS distribution (plot)` | `data` (png/image) | weak (smoke) | Per-class distance distribution. Same: expose underlying distances in a table if cheap. |

Out of automated workflow scope: the Trackster/IGV snapshot around `Runx1`
(notebook/interactive layer, not a deterministic workflow output).

## Collection-shape rationale

- The three peak classes are **parallel, same-pipeline** inputs → a single `list`
  collection mapped over beats three duplicated File branches, and it preserves
  `common`/`G1E_only`/`megakaryocyte_only` identifiers end-to-end for
  element-keyed tests (testability §3).
- RefSeq annotation is a single shared reference → plain `data` File, fanned in
  against each collection element.
- No paired/nested/sample-sheet shapes are implied by the source — collection
  depth stays at `list` (depth 1). No `paired`, `list:paired`, or `record` needed.

## Label discipline (testability §1)

Labels above are chosen as the stable public API. Element identifiers
`common` / `G1E_only` / `megakaryocyte_only` are part of that API — renaming any
of them is a breaking change for downstream `-tests.yml`. `G1E_only` /
`megakaryocyte_only` use underscores to stay clean as YAML test-job keys; confirm
this casing against whatever the upstream tutorial emits before locking it.

## Confidence

- **High:** peak sets are list-collection-shaped; tables are the strong
  checkpoints; promoter-window BED is worth promoting; expression is out of MVP.
- **Medium:** exact promoter-window parameters; whether MACS2 score/q-value
  columns survive in the reused peak files to populate the summary.
- **Low:** whether raw per-state narrowPeaks and the regions-of-interest BED
  belong as workflow inputs vs notebook-only; whether nearest-gene assignment is a
  single tool (`ClosestBed`) or a fallback chain.

## Open questions

- **Peak-set input shape:** `list` collection (recommended) vs three separate
  `data` File inputs? Collection is cleaner + testable; confirm the tutorial's
  peak sets are naturally collectable.
- **Raw per-state peaks:** are `G1E` / `megakaryocyte` narrowPeak files needed as
  inputs (to recompute the class split), or are common/G1E-only/mega-only supplied
  ready-made?
- **Promoter window:** lock `-1000/+500 bp` vs a documented symmetric window;
  these become the `int` param defaults.
- **MACS2 columns:** do reused peak files retain score/q-value columns the
  `Candidate gene summary` is supposed to report? If not, drop those columns or
  re-derive.
- **Nearest-gene tool:** `bedtools ClosestBed` available, or pin the Galaxy
  interval-tool fallback? Affects whether the nearest-gene step is one map-over or
  a small sub-chain.
- **Regions-of-interest BED:** workflow input (focused locus QC) or notebook-only
  anchor for the Runx1 visualization?
- **Element-identifier casing:** confirm `G1E_only` / `megakaryocyte_only` match
  upstream naming before treating them as the test API.
- **(Stretch) expression join:** input shape (`list` collection vs single merged
  table) and join key (symbol vs id) — deferred until metadata is verified.
