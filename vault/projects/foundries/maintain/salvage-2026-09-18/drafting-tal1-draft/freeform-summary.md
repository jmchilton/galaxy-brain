# Freeform Summary: TAL1 peaks → candidate regulated genes

> Source: galaxy-brain issue #13 ("Galaxy Notebooks demo: TAL1 peaks to candidate
> regulated genes"). Normalized from the issue text in lieu of a live interview.
> This is **source evidence with explicit uncertainty**, not a fully specified
> workflow. Confidence is tagged inline.

## Workflow intent

Take existing TAL1 ChIP-seq peak outputs and turn them into a compact biological
interpretation: which genes are plausible TAL1 targets in the G1E and
megakaryocyte cell states. The analytical loop is candidate-gene prioritization
by **promoter overlap** and **nearest-gene assignment** over already-called peak
sets — no new upstream plumbing, no raw RNA-seq processing.

- **MVP:** peak/proximity-based candidate-gene prioritization (promoter overlap +
  nearest-gene).
- **Stretch:** layer expression evidence on top, only after processed same-study
  RNA-seq tables are verified.

Framing target is a Galaxy Notebook vignette for the Galaxy Notebooks paper/demo
work; the natural insertion point is *after* common / G1E-only /
megakaryocyte-only TAL1 peaks have been identified in the existing tutorial.

## Methods (analytical steps)

1. **Reuse existing TAL1 outputs** — G1E TAL1 narrowPeak, megakaryocyte TAL1
   narrowPeak, common peaks, G1E-only peaks, megakaryocyte-only peaks, and the
   RefSeq mm10 gene annotation BED.
2. **Derive TSS intervals** from the RefSeq BED12 annotation, handling strand
   correctly (TSS = start for + strand, end for − strand).
3. **Expand TSS into promoter windows** — likely `-1000/+500 bp` relative to TSS,
   or a clearly documented symmetric window. *(parameter, see Open questions)*
4. **Intersect peak sets with promoter windows** for common, G1E-only, and
   megakaryocyte-only peaks.
5. **Assign nearest genes to non-promoter peaks** (peaks that did not overlap a
   promoter window).
6. **Collapse duplicate transcript isoforms** by gene symbol so a gene is not
   double-counted across isoforms.
7. **Summarize candidate genes** by peak class, promoter overlap, nearest-gene
   distance, and MACS2 score/q-value (if those columns are retained in the peak
   outputs).
8. **(Stretch) Join expression evidence** — import verified processed expression
   tables and join by a compatible gene identifier or symbol.

## Tools / algorithms

- **`bedtools Intersect intervals`** — promoter-overlap step (4). *(named in source)*
- **`bedtools ClosestBed`** — nearest-gene assignment (5); a documented Galaxy
  interval-tool fallback is acceptable if ClosestBed is unavailable. *(named in
  source; exact Galaxy tool id unconfirmed)*
- **Strand-aware interval manipulation** — to derive TSS points and expand to
  promoter windows from BED12 (steps 2–3). Specific Galaxy tool not named.
  *(inference)*
- **De-duplication / group-by gene symbol** — isoform collapse (step 6). Tool not
  named. *(inference)*
- **Tabulation / summary** — per-peak-class candidate summaries (step 7).
- **Plotting** — bar chart (counts by peak class) and a distance-to-TSS
  distribution.
- **Genome-browser visualization** — Trackster (or IGV-style) snapshot around the
  `Runx1` locus.

## Inputs / sample data

Genome build: **mm10**. MVP inputs already present in the TAL1 tutorial:

- G1E and megakaryocyte TAL1 **narrowPeak** outputs.
- **Common**, **G1E-only**, and **megakaryocyte-only** peak sets.
- `RefSeq_gene_annotations_mm10.bed` — gene symbols in BED **column 4** *(to be
  verified)*.
- `ChIPseq_regions_of_interest_v4.bed` — loci including `Runx1`, `Gata1`,
  `Gata2`, `Tal1`.

ChIP-seq data source: Zenodo DOI `10.5281/zenodo.197100`.

Expression stretch candidates (not MVP):

- GSE51338 (original Wu et al. study).
- RNA-seq data from Zenodo record `583140` (same study ecosystem, used by the GTN
  de novo transcriptomics tutorial).
- Processed expression TSVs usable only after sample labels, genome build,
  columns, and identifiers are verified.

## Parameters

- **Promoter window:** `-1000/+500 bp` around TSS is the working default; a
  symmetric window is acceptable if documented. *(not finalized)*
- **MACS2 score / q-value thresholds:** mentioned as columns to summarize/retain;
  no filtering threshold specified. *(open)*

## Expected outputs / artifacts

- Peak-set summary table: peak set, # peaks, # promoter-overlapping,
  # nearest-gene-assigned.
- Candidate promoter-bound TAL1 target table: peak class, coordinates, gene
  symbol, strand, TSS, overlap/distance, MACS2 score/q-value.
- Nearest-gene table for non-promoter peaks.
- Bar chart of candidate gene counts by peak class.
- Distance-to-TSS distribution for common, G1E-only, and megakaryocyte-only peaks.
- Trackster/IGV-style example around the `Runx1` locus.
- (Stretch) table/figure: candidate genes with processed G1E and megakaryocyte
  expression evidence.

## Constraints

- Peak-to-nearest-gene is a **heuristic**; enhancer regulation can skip the
  nearest gene.
- Tutorial data are **downsampled and locus-focused** — conclusions must be
  framed as demo-scale examples, not genome-wide biology.
- RefSeq BED carries transcript isoforms; **duplicate gene symbols must be
  collapsed** or clearly handled.
- Expression integration is **not MVP** until processed RNA-seq metadata and
  identifiers are confirmed.
- **Do not** add raw RNA-seq alignment / counting / differential expression to
  this vignette.

## References

- TAL1 ChIP-seq tutorial:
  https://training.galaxyproject.org/training-material/topics/epigenetics/tutorials/tal1-binding-site-identification/tutorial.html
- Same-study de novo RNA-seq tutorial (G1E + megakaryocyte):
  https://training.galaxyproject.org/training-material/topics/transcriptomics/tutorials/de-novo/tutorial.html
- ChIP-seq data Zenodo DOI: https://doi.org/10.5281/zenodo.197100
- RNA-seq data Zenodo record: https://zenodo.org/record/583140
- GSE51338 study page:
  https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE51338
- Source issue: galaxyproject/galaxy-brain (jmchilton/galaxy-brain) #13

## Open questions / unresolved assumptions

- Confirm `RefSeq_gene_annotations_mm10.bed` is BED12 and that gene symbols are in
  column 4; confirm strand/TSS handling.
- Finalize the promoter window (`-1000/+500 bp` vs a documented symmetric window).
- Confirm `bedtools ClosestBed` is available in the target Galaxy, or pin the
  interval-tool fallback (exact tool id).
- Confirm MACS2 score/q-value columns survive in the reused narrowPeak/peak-set
  outputs; decide whether any thresholding is applied.
- (Stretch) Verify GSE51338 / GTN RNA-seq sample metadata, genome build, column
  layout, and gene identifiers before any expression join.
- Confidence flag: tool selection for TSS/promoter derivation and isoform
  collapse is inferred — source names only the two bedtools operations.
