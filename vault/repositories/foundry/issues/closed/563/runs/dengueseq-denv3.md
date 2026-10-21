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

### Brief arm, phase A: paper → brief (2026-10-20)

- 7 min, 31 turns, $3.21. `validate-workflow-brief` and `check-workflow-brief` are ready, with no blockers. Unedited brief sha256 `560f0bfa…`.
- Scope held. It excluded the multi-reference loop, the serotype tables, the co-infection filter and the publish rule at ≥50% coverage, each with a reason.
- 10 open questions, all with `Proposed:` and `Evidence:`, low confidence first (5 low). The depth conflict (10 vs 20) was raised as predicted.
- It also found that the paper's Fig. 6A says Florida validated the **pan-serotype** primers, which conflicts with the selection's "DENV3 primer scheme". It raised this as low confidence and proposed the expert's wording, as #688 says.
- No GTF question. The paper uses none.
- 3 feedback entries:
  - `summarize-paper` (major): it never defines the freeform summary shape;
  - `summarize-paper` (minor): no guidance on linked code or supplements;
  - brief design (minor): the preflight result has no named artifact.

### Brief arm, expert review (2026-10-20)

- John edited 1 of the 10 questions. Claude applied the edit as `6b8b630`, and `review.md` is local. The reviewed brief's sha256 is `e52aca4e…`, and both gates pass.
- The edit confirmed the test sample's metadata from ENA. It also passes along the FL-BPHL-0005 filename mismatch, which the direct arm found. That is a small flow of information from the direct arm to the brief arm.
- The other 9 proposals were accepted unedited, 4 of them low confidence. This deliberately exercises #688's chain from proposal to ledger decision to Done report.
- Environment asymmetry: John kept the global `@galaxy-tool-util/cli` at 1.14.0, the version the direct arm installed. So the brief arm's preflight won't meet the 1.8.2 gap.
- The direct arm's red test is left as it is. A fix would count as an intervention.

### Brief arm, phase B: brief → Galaxy (2026-10-20)

- 147 min, 59 turns, $34.05. All 11 phases ran, with no phase done by hand. The brief hash is unchanged (`e52aca4e…` in both copies).
- **planemo: green.** The case `srr25366733-defaults` ran 7/7 jobs ok and every assertion passed, on Planemo 0.75.47 with Docker and Galaxy master `b18269a1`.
  - The second case, on the repo's `denv3_test` reads (178 MB), is defined but wasn't run.
  - The first attempt hung because a long temp path broke a macOS socket. The rerun used the default tmp.
- The workflow is the same topology as the direct arm's: `bwa_mem` → `samtools_view` → `ivar_trim -e` → `ivar_consensus` → `tp_sed`, `ivar_variants -q 20 -t 0.03`, and `bedtools genomecov -d`.
  - It uses newer wrapper revisions than the direct arm: `bwa_mem` +galaxy1, `samtools_view` +galaxy2, `tp_sed` 9.11.
  - It has no awk step after genomecov.
  - No GTF or snpEff, and no fastp or lofreq.
- **#688 chain worked end to end:**
  - 10 `open_question` decisions, all `basis: brief-proposal`, with 4 carrying `confidence: low`. None were superseded.
  - The Done report listed them low confidence first, followed by 2 proposed brief-change recommendations (`consensus-pileup-baq-off` and `variants-pileup-baq-off`).
- **Evidence the brief arm measured that the direct arm only asserted:**
  - It ran the source pipeline's commands on the test sample. The consensus is byte-identical to the Galaxy output.
  - BAQ-off in the iVar wrappers changes one consensus call on `denv3_test` (position 5591) and adds 6–8 variant rows. PASS rows are 472 vs the source's 467.
  - Only about 16.5% of reads were primer-trimmed and 73% start outside primer regions. That fits a pan-serotype or Nextera library, so the low-confidence primer proposal is the one to recheck.
  - The published consensus OR150748.1 (FL-BPHL-0001) sits on BioSample SAMN35803652, not the run's ...653, and differs at 34 positions. Together with the FL-BPHL-0005 filename, the test sample's identity is in doubt.
- The open-requirements ledger has 19 entries, 25 discoveries and 34 decisions. The feedback ledger has 28 entries. One of them says no phase may write the ledger after phase 7, so two BAQ checks that the evidence would close stay open.

### Direct arm: paper → Galaxy (2026-10-20)

- 93 min, 50 turns, $23.23. All 12 phases ran and no phase was done by hand. Test data came from `paper-to-test-data` (SRR25366733 via ENA, with the ref and BED from the repo pin).
- Workflow: `bwa_mem` 0.7.19 → `samtools_view` (exclude 4 and 2048) → `ivar_trim` 1.4.4 (`-e`) → `ivar_consensus` and `ivar_variants` → `sed` header rename. A depth branch runs `bedtools genomecov -d` → `awk`.
  - Exposed parameters: min depth 10 and frequency 0.75.
  - No fastp, no lofreq, no GTF or snpEff.
- **planemo:** all 8 jobs ok, and 1 assertion fails. `has_line_matching '^REGION\tPOS\tREF\tALT\t.*\tPASS'` must match the whole line, and the iVar header has more columns. **This is the same whole-line `has_line_matching` defect as run 2's GFA assertions.**
- Results on the test sample: consensus 10,707 bp with 2.05% N, 484 variant rows (472 PASS).
- IWC comparison: the primary match was `sars-cov-2-pe-illumina-artic-ivar-analysis` (medium), and the generic viral workflow was secondary. The agent explicitly declined to import fastp, the proper-pair/MAPQ filter, `filter_by: yes_compute` and the reductions.
- Divergences it documented:
  - Galaxy's iVar wrappers run their own pileup and skip BAQ, so calls near the thresholds may differ from the source.
  - SRA filename FL-BPHL-0005 vs sample record FL-BPHL-0001.
- Agent decisions, made silently with no review: raw iVar table, no completeness metric, depth 10.
- Open-requirements ledger: 10 entries, 10 discoveries, 27 decisions. Feedback ledger: 27 entries (5 major).
- **Side effect:** the agent upgraded the global `@galaxy-tool-util/cli` from 1.8.2 to 1.14.0. As a result, the brief arm's Galaxy preflight no longer meets the same gap.
- planemo ran via `uvx` at 0.75.47. The first attempt failed because a flag re-enabled conda (ivar 1.4.4 has no osx-arm64 conda build). The rerun used Docker only.

## Comparison (criteria fixed before the runs)

| Criterion | Brief arm | Direct arm |
|---|---|---|
| 1 Scope | held | held |
| 2 Depth / freq / GTF | 10 / 0.75 / none. Each is a ledger decision from a reviewed brief proposal. | 10 / 0.75 / none. Agent decisions, no review. |
| 3 Tools vs paper and IWC | same spine as the paper's code. Declined IWC's fastp, lofreq and snpEff. | same |
| 4 Gates | `gxwf` ok, **planemo green** | `gxwf` ok, planemo red: 1 whole-line `has_line_matching` assertion |
| 5 Interventions | 1 brief edit (sample metadata) | none, by design |
| 6 Wall-clock / cost | 7 + 147 min, $3.21 + $34.05 = $37.26, plus John's review | 93 min, $23.23 |
| 7 #688 chain | 10/10 open questions → decisions → Done report | n/a |

**Reading (n = 1, John's call):**

- The two Mold families converged on essentially the same workflow. The design Molds aren't what separates them.
- The brief buys two things:
  - an expert checkpoint, with every judgment call recorded as a reviewed decision;
  - more verification: source-command parity, the BAQ measurements and the doubt about the sample's identity.
- It costs about 1.6× the money and wall-clock, mostly in the Galaxy phase.
- The red/green difference comes from test-plan assertion guidance (the same defect as run 2), not from the Mold families.
- If the families merge, `paper-to-galaxy` could become brief + Galaxy, with the review optional because unedited proposals are accepted. Then the freeform design Molds go.
