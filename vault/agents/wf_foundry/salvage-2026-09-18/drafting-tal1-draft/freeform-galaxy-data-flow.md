# Galaxy Data-Flow Brief: TAL1 peaks → candidate regulated genes

> Source provenance: `freeform-summary.md` (galaxy-brain #13) + `freeform-galaxy-interface.md`.
> This is an **abstract, target-shaped DAG** for Galaxy — deliberately **not**
> gxformat2 and **not** resolved to exact Tool Shed tools/changesets (per the
> data-flow draft contract). Candidate tool/idiom names are non-binding hints for
> the template + discovery steps, not decisions. Confidence is attached per node.

## Workflow inputs (from interface brief)

- `TAL1 peak sets` — `list` collection, 3 elements `common` / `G1E_only` /
  `megakaryocyte_only` (narrowPeak/BED).
- `RefSeq gene annotations (mm10)` — `data` File, BED12, gene symbol in col 4 *(to verify)*.
- `Promoter upstream (bp)` int (default 1000), `Promoter downstream (bp)` int (default 500).
- *(optional)* `Regions of interest (BED)` — locus QC anchor; not on the main flow.

## Abstract DAG

```
RefSeq BED12 ──▶ [A] derive promoter windows (strand-aware)
                       │ promoter-window BED (carries gene symbol)
                       ▼
TAL1 peak sets ─(map)─▶ [B] classify by promoter overlap ──┬─▶ B-hit:  promoter-bound peak→gene  (list)
   (list, 3)                                                └─▶ B-miss: non-promoter peaks        (list)
                                                                         │
                                              [C] nearest gene + distance ◀┘ (map)  ⚠ corpus gap
                                                                         │ nearest-gene table (list)
   B-hit (list) ─(map)─▶ [D] collapse isoforms by gene symbol ─▶ deduped promoter-bound (list)
   C    (list) ─(map)─▶ [D'] collapse isoforms by gene symbol ─▶ deduped nearest-gene  (list)
                                                                         │
            [E1] concat collection → candidate summary table (reduce, class as column)
            [E2] per-class counts → peak-set summary table     (reduce)
            [F1] bar chart from E2   [F2] distance distribution from C
```

## Nodes (abstract operations)

### [A] Derive promoter windows from BED12 — *confidence: medium*
- In: `RefSeq BED12` File + upstream/downstream ints. Out: promoter-window BED File.
- Two coordinate sub-transforms: (A1) reduce transcripts to **strand-aware TSS**
  (start for `+`, end for `−`); (A2) expand TSS to the asymmetric promoter window
  (`−upstream / +downstream`, strand-aware).
- Idiom: A2 maps onto **`interval-window-flank`** (`bedtools slop -s`, corpus-grounded).
  A1 (TSS extraction from BED12) is the **uncertain half** — no clean corpus
  pattern; candidate is a "Get flanks / TSS" interval tool or a text transform on
  BED12. The window must **carry the gene symbol** forward so [B] can emit
  peak→gene without a separate join.
- Shape: File → File. Not mapped (shared reference built once).

### [B] Classify peaks by promoter overlap — *confidence: high (idiom), medium (wiring)*
- In: `TAL1 peak sets` (list) ⨯ promoter-window BED (shared). Out: two lists.
- **map-over** the peak-set `list`; promoter BED is fan-in (same for every element).
  `reduce_or_iterate: iterate`. Element identifiers `common`/`G1E_only`/`megakaryocyte_only`
  preserved.
- Idiom: **`interval-overlap-filter`** (`bedtools intersect`). Two modes off the
  same intersect:
  - **B-hit** — peaks overlapping a promoter window, annotated with the
    overlapping gene (`intersect -wa -wb`) → per-class promoter-bound peak→gene list.
  - **B-miss** — peaks with no promoter overlap (`intersect -v`) → per-class
    non-promoter list, feeds [C].
- Not a conditional `when` gate — both branches always run; deterministic split.

### [C] Nearest gene + distance (non-promoter peaks) — *confidence: medium ⚠ corpus gap*
- In: B-miss (list) ⨯ gene annotation / TSS (shared). Out: per-class nearest-gene
  table list (gene symbol + signed/abs distance).
- **map-over** the B-miss list. Idiom: **`bedtools_closestbed -d`**.
- ⚠ **Corpus gap (interval MOC):** nearest-feature-plus-distance has **zero IWC
  uptake** — no pattern page, no exemplar. Reach for `bedtools_closestbed` directly;
  **exemplar comparison will find no precedent**, so don't expect a structural diff
  to validate this subgraph. Two consequences:
  - `closest` requires **coordinate-sorted** inputs → likely a **[C0] sort** step
    before it (peaks and gene file). Coordinate-aware sort is itself a corpus gap
    (IWC sorts with tabular `sort1`). Flagged as possibly-needed.
  - Alternative idiom (`window`/neighborhood join) is also corpus-absent; closest+`-d`
    is the cleaner fit. Decide in open questions.

### [D]/[D'] Collapse isoforms by gene symbol — *confidence: high (idiom), medium (tie-break)*
- In: B-hit list (D) and C list (D'). Out: deduped per-class tables.
- **map-over** each list. Idiom: **`tabular-group-and-aggregate-with-datamash`**
  (group by symbol) or sort|uniq.
- Tie-break is undecided: when a symbol has multiple isoforms/peaks, keep min TSS
  distance? best MACS2 score? Carry as open question — affects aggregation keys.

### [E1] Candidate gene summary (reduce) — *confidence: high*
- In: deduped promoter-bound list (+ optionally deduped nearest-gene list). Out:
  one tabular File.
- **Reduction** collection → File. Idiom: **`tabular-concatenate-collection-to-table`**
  (row-bind), with the **element identifier (peak class) preserved as a column** —
  this is the key reshape; concat must not drop the class label. Columns: peak
  class, coords, gene symbol, strand, TSS, overlap/distance, MACS2 score/q-value
  *(if those columns survive the inputs — see open questions)*.

### [E2] Peak-set summary counts (reduce) — *confidence: high*
- In: peak sets / B-hit / C lists. Out: one tabular File: per class — # peaks,
  # promoter-overlapping, # nearest-gene-assigned.
- **Reduction**. Idiom: count per element (`datamash`/line-count) row-bound with
  class as column.

### [F1] Bar chart / [F2] distance distribution — *confidence: medium (cosmetic)*
- F1 from E2 counts; F2 from C distances (concatenated). Tool need: generic
  bar-plot and histogram/distribution plot. Weak (smoke) outputs per interface brief.

## Collection map/reduce summary

- **map axis:** the single `list` peak-set collection threads through [B] → [C] →
  [D]/[D'] at depth 1; identifiers `common`/`G1E_only`/`megakaryocyte_only`
  preserved end-to-end (required for element-keyed tests).
- **fan-in / shared references:** promoter-window BED ([B]) and gene annotation
  ([C]) are single Files broadcast against every mapped element — not collections.
- **reductions:** [E1]/[E2] collapse the `list` to single tabular Files; the
  element identifier must be re-materialized as a **column** during row-bind
  (collection→tabular bridge).
- No nesting (`list:list`, `paired`) anywhere — depth stays 1.

## Placeholder transformations (shape/semantic, not implemented)

- **BED12 → TSS points → promoter windows** ([A]) — coordinate transform; the
  gene symbol must ride through.
- **intersect split** ([B]) — one logical overlap test producing hit/miss branches.
- **collection → tabular with identifier-as-column** ([E1]/[E2]) — reduction reshape.

## Unresolved tool needs (abstract; in/out shapes)

| # | Need | In → Out | Candidate idiom | Confidence | Notes |
|---|---|---|---|---|---|
| 1 | Strand-aware TSS/promoter derivation | BED12 File + ints → promoter BED File | Get-flanks / TSS tool + `bedtools slop -s` | medium | TSS-extraction half has no clean corpus pattern; symbol must survive |
| 2 | Interval overlap + anti-overlap | list peaks + promoter File → list (peak+gene) / list (non-overlap) | `bedtools intersect -wa -wb` / `-v` (`interval-overlap-filter`) | high | corpus-grounded |
| 3 | Nearest gene + distance | list peaks + gene File → list nearest-gene tables | `bedtools_closestbed -d` | medium ⚠ | **corpus gap**, no exemplar; needs sorted inputs |
| 4 | Coordinate sort (pre-closest) | File/list → sorted | `bedtools sort` / tabular `sort1` | low | only if [C] tool requires it |
| 5 | Isoform collapse by symbol | list tables → deduped list | `datamash` group / sort\|uniq | medium | tie-break rule undecided |
| 6 | Collection → candidate table | list → File (class column) | `tabular-concatenate-collection-to-table` | high | keep identifier as column |
| 7 | Per-class counts | lists → File | `datamash` / line-count | high | |
| 8 | Bar chart | table → image | generic plotting | medium | smoke output |
| 9 | Distance distribution | distances → image | histogram plot | medium | smoke output |

### Stretch (out of MVP DAG)
- **Expression join** — gated optional branch: import verified processed G1E/mega
  expression tables, join to the candidate summary by symbol/id
  (`tabular-join-on-key`). A real conditional/optional step; do not wire until
  metadata verified. Confidence: low (blocked on inputs).

## Open questions

- **Nearest-gene scope:** confirm [C] runs on **non-promoter peaks only** (source
  says so) vs all peaks.
- **`closest` vs window-join:** lock `bedtools_closestbed -d`; both alternatives
  are corpus-absent, so this subgraph ships without exemplar backing.
- **Sort requirement:** does the chosen closest tool need coordinate-sorted inputs
  ([C0])? If yes, where (peaks, gene file, both)?
- **Promoter window carries symbol:** does [A] preserve the gene symbol into the
  window BED so [B] emits peak→gene directly, or is a separate join needed after?
- **MACS2 columns:** do reused peak files retain score/q-value for [E1]'s columns?
  If not, drop or re-derive.
- **Isoform tie-break:** min TSS distance vs best MACS2 score vs keep-all — sets
  [D]/[D'] aggregation semantics.
- **Identifier-as-column reduction:** confirm the concat idiom can stamp the
  collection element identifier (peak class) into the merged table; if not, a
  relabel step precedes [E1].
- **TSS source:** derive from RefSeq BED12 at runtime ([A]) vs accept a prepared
  TSS/promoter file as an alternate input.
