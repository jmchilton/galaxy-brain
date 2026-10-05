# IWC Exemplar Comparison: TAL1 peaks → candidate regulated genes

> Inputs: `freeform-galaxy-interface.md` + `freeform-galaxy-data-flow.md`
> (galaxy-brain #13, INTERVIEW → GALAXY pipeline).
> IWC clone: `~/projects/repositories/iwc` @ `ed959c92a`
> (galaxyproject/iwc). Candidates inspected as native `.ga` JSON (tool_id / label
> / topology extraction); `gxwf convert` normalization not required for structural
> comparison at this granularity. `gxwf` is not installed locally — flagged for
> the downstream template/validate step, not needed here.

## Headline

**The workflow splits cleanly into two halves with opposite corpus support.**

- **Interval substrate (front half):** promoter-window expansion + peak/promoter
  overlap map onto tools IWC epigenetics uses today (`bedtools_slopbed`,
  `bedtools_intersectbed`, `bedtools_multiintersectbed`). Exemplar-backed.
- **Interpretive half (back half):** strand-aware TSS extraction, **nearest-gene +
  distance**, gene-annotation input, and peak→gene table outputs have **no IWC
  precedent anywhere in the corpus**. This confirms the data-flow brief's
  corpus-gap warning on node [C]. Exemplar comparison provides **no structural
  validation** for the back half.

## Nearest exemplar & ranking

| Exemplar | Path | Match |
|---|---|---|
| **consensus-peaks (chip-pe / chip-sr)** | `epigenetics/consensus-peaks/consensus-peaks-chip-{pe,sr}.ga` | nearest |
| atacseq | `epigenetics/atacseq/atacseq.ga` | secondary (only IWC `slopbed` user) |
| chipseq-pe / chipseq-sr | `epigenetics/chipseq-{pe,sr}/` | upstream context (FASTQ→peaks) |

**Confidence: split.**

- Interval substrate ([A] slop, [B] intersect): **Medium-High** — same domain
  (epigenetics ChIP-seq), same tool family, current tool versions in corpus.
- Workflow as a whole / interpretive half ([A] TSS, [C] nearest-gene, gene
  outputs): **No nearest exemplar** — domain matches but the defining intent
  (gene assignment) and primary nodes are corpus-absent.

Net: do **not** treat any single IWC workflow as a canonical template here. Borrow
tool/idiom choices for the front half; author the back half greenfield.

## Feature-hierarchy diff

**1. Domain / intent** — *partial.* Domain matches (epigenetics, ChIP-seq peaks,
mm-scale). Intent diverges: consensus-peaks computes **reproducible peaks across
replicates** (multi-intersect → count-threshold → consensus BED); ours computes
**candidate genes from peak classes** (annotate + nearest-gene). consensus-peaks
sits **upstream** of our insertion point — it *produces* the peak sets we consume.

**2. Input collection topology** — *partial.* Both are depth-1 `list`. But:
- consensus-peaks: `list` of **per-replicate BAMs** (`n rmDup BAMPE`).
- ours: `list` of **3 named peak-classes** (`common`/`G1E_only`/`megakaryocyte_only`),
  pre-called BED, plus a **single shared gene-annotation File** broadcast as fan-in.
- IWC lists are per-sample/per-replicate; a **semantic-class list with fixed named
  identifiers is novel** (no precedent, but not anti-pattern). The shared
  gene-annotation reference File has no analogue in the peak workflows.

**3. Primary tool families** — *partial.*
- Shared & corpus-current: `bedtools_intersectbed` 2.31.1, `bedtools_multiintersectbed`
  2.31.1, `bedtools_slopbed` 2.31.1, `bedtools_mergebed`, plus reduction idioms
  `tp_sorted_uniq`, `collapse_dataset` (nml/collapse_collections), `table_compute`,
  `Filter1`, `Cut1`, `param_value_from_file`.
- **Absent corpus-wide:** `bedtools_closestbed` / any nearest-feature tool, any
  promoter/TSS derivation, `computeMatrix`. (Two corpus "nearest" string hits are
  unrelated genome-annotation text, **not** bedtools closest.)

**4. DAG motifs** — *diverges.* consensus-peaks motif = fan-out peak calling →
**multi-intersect consensus** ([[interval-consensus-by-multi-intersect]]) → text
dedup → collapse. Our motif = shared-reference **annotate-by-overlap** + **anti-overlap
branch** → **nearest-gene** → per-class dedup → reduce-to-table. Only the
intersect/slop primitives are shared; the overall recipe is different.

**5. Output / report shape** — *no match.* consensus-peaks emits narrowPeak BEDs +
bigwig + MultiQC. Ours emits **gene tables** (candidate summary, per-class peak→gene,
nearest-gene) + counts + plots. No peak→gene table output exists anywhere in IWC
epigenetics.

**6. Test style / fixtures** — *partial precedent, wrong shape.* consensus-peaks has
sibling `-tests.yml` + `test-data/` (per-replicate BAMs: `rep1/2/3.bam`,
`ChIP_SR_rep*.bam`). Confirms IWC convention (sibling tests, label-keyed, small
fixtures) the testability brief already targets — but our fixtures need **peak BEDs
+ a gene-annotation BED**, a fixture shape IWC has no precedent for.

## Specific structural findings (routed)

| # | Finding | Surface |
|---|---|---|
| 1 | **`bedtools_closestbed` confirmed corpus-absent** (0 hits across all of IWC, not just epigenetics). Back-half subgraph ships without exemplar backing; expect no diff to catch errors there. | Template/data-flow — author greenfield; consider raising a `requires-iwc-inputs` pattern-gap note |
| 2 | **`slopbed` exists but strand-aware mode is unexercised.** The only IWC `slopbed` (atacseq `get summits +/-500kb`) is **symmetric, `strand: false`**. Our [A] needs `-s` + asymmetric `−1000/+500`. Tool is corpus-proven; our parameterization is not. | Tool-step — set `strand`/asymmetric `l`/`r` params; verify in per-step loop |
| 3 | **Tool versions to pin:** bedtools `2.31.1+galaxy0` (intersect/slop), `iuc/bedtools` suite — same repo the data-flow named for closest. Reduction idioms `tp_sorted_uniq` / `collapse_dataset` are the IWC-proven path for [D] dedup and [E] collection→table. | Template — prefer these over inventing dedup/reduce steps |
| 4 | **TSS extraction has no tool precedent.** No IWC workflow derives TSS from BED12. The [A1] sub-node is the least-supported front-half step (slop [A2] is fine). | Tool-step / discovery — `discover-shed-tool` for a TSS/get-flanks tool |
| 5 | **Semantic-class list input is novel but sound.** No IWC precedent for a fixed-identifier class list, but it's consistent with collection semantics and aids element-keyed tests. Keep it; don't force it into a per-sample shape. | Template — proceed; note absence of precedent |
| 6 | **Gene-annotation fixture has no IWC analogue.** Plan a small mm10 RefSeq BED fixture; can't crib one from the peak corpus. | Test — defer to `implement-galaxy-workflow-test` |

## Does NOT change the briefs

The interface + data-flow briefs are structurally sound; this comparison **confirms**
rather than redirects them. No node should be added/removed on exemplar grounds.
The corpus check's value here is negative evidence: it **validates the front half**
against real IWC tools and **hardens the data-flow's existing warning** that the
back half is greenfield — so reviewers shouldn't expect exemplar cover for [C].

## Open questions carried forward

- Front half: lock `bedtools_slopbed` params — `strand: true`, asymmetric
  `l=upstream`, `r=downstream` (the one corpus exemplar doesn't show this mode).
- [A1] TSS-from-BED12: which tool? No corpus precedent — needs discovery.
- [C] nearest-gene: `bedtools_closestbed -d` ships without exemplar; the per-step
  loop carries full validation burden (sorting, `-d` distance column, tie behavior).
- Fixtures: author a small mm10 RefSeq BED + per-class peak BEDs; no IWC fixture to
  adapt.
- (Carried from data-flow) isoform tie-break, MACS2-column survival,
  identifier-as-column reduction — none resolvable from the corpus.
