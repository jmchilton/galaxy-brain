# Run 3: dengueseq-denv3 (paper A/B)

Vogels et al. 2024, *BMC Genomics* 25:433, DengueSeq ([DOI](https://doi.org/10.1186/s12864-024-10350-x), OA). Agent-driven, human-reviewed. Plan: [brief-run-plan.md](../brief-run-plan.md). This run decides whether the freeform and brief Mold families merge.

## Setup

- Arms, in separate workspaces with identical `sources/` and `source-selection.md`:
  - brief arm: `~/projects/foundry-runs/dengueseq-denv3/`, `paper-to-workflow-brief` → John's review → `workflow-brief-to-galaxy`;
  - direct arm: `~/projects/foundry-runs/dengueseq-denv3-direct/`, `paper-to-galaxy`, no expert review.
- Sources: the paper PDF, Europe PMC full-text XML, 6 additional files, and `grubaughlab/DENV_pipeline` v1.0 (`8214cfbb`) as a worktree.
- Plugin: `git archive` of foundry `f275059e` (#688 merged) `casts/claude`, via `--plugin-dir`.
- IWC clone at `e8cd4de3d` at launch. `compare-against-iwc-exemplar` reads it in both arms.
- Headless `claude -p`, `--permission-mode auto`, the same flags and budget in both arms.
- Order: brief arm to review, then the direct arm end to end while John reviews, then the brief arm's Galaxy phase. Only one `planemo` run at a time.
- Scope: Illumina DENV3 amplicon consensus with variants and per-base depth. Excluded: the multi-reference serotype loop and everything else.
- Test sample: `SRR25366733`, MiSeq 2×251, about 183k pairs. It is named in the selection so both arms test on the same data.

## Ground truth (scoring only, not given to either arm)

- From `DENV_pipeline` `scripts/mapper.sh` at v1.0:
  - `bwa mem` → `ivar trim -e -b DENV3.bed`;
  - consensus: `samtools mpileup -aa -A -d 10000 -Q 0 | ivar consensus -t 0.75 -m 10`;
  - variants: `ivar variants -q 20 -t 0.03`.
- The paper gives depth two ways: 10 is the pipeline default, and the validation reports 20×.
- IWC equivalent: `virology/generic-non-segmented-viral-variant-calling`.
  - It adds fastp, a proper-pair/MAPQ 20 filter and lofreq.
  - Its consensus depth is hard-coded at 20.
  - It requires a GTF, which the paper never uses.

## Comparison criteria (fixed before either arm ran)

1. Scope: the multi-reference loop and serotype tables stayed out, and nothing excluded crept in.
2. Depth, frequency threshold and GTF: what was chosen, and where it is recorded. A ledger decision, a brief open question, or a silent choice.
3. Tool choices and parameters vs. the paper's code and vs. IWC.
4. Gates: `gxwf` validation and `planemo test`.
5. Human interventions with causes. John's brief edits count as interventions, and the direct arm has none by design.
6. Wall-clock and cost.
7. Brief arm only: the chain from open-question proposals to ledger decisions to the Done report (#688).

## Results

Not run yet.
