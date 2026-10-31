# workflow-brief-to-galaxy: golden brief nf-core__chipseq v0

- Worktree: `~/projects/worktrees/foundry/branch/pipeline-run-chipseq` (`origin/main` `9f83fd55` + local fixtures `40fc911d`, seed Mold fix `9b2fd539`, and this run's Mold fix `38400847`).
- Run dir: `~/foundry-runs/prose-wb2g-chipseq-v0-2026-10-30/`; kept test outputs in `.scratch/test-outputs/attempt5/`. Not yet archived (needs John: planemo logs carry ephemeral Galaxy keys).
- Plan: [golden brief](../../../../projects/foundries/plans/nf-core__chipseq/golden.md). planemo master @ `2a815808` (0.75.48.dev0), Galaxy release_26.1, `--biocontainers`.

## Status

Completed: planemo green on all 6 test cases across attempts 4 and 5 (attempt 5: primary, skip_consensus, skip_trimming 3/3; attempt 4: se_bowtie2, chromap, star green on the workflow minus one later IGV null-filter step), all 11 phases. 219 steps (154 Tool Shed over 39 repos, 65 stock, no user tools), 40 inputs, 48 outputs, 90 gated. 9 dropped (all cited; 5 with brief-change recommendations), 14 open gaps, 0 surrendered, 10 brief-change recommendations.

## Eval

| Phase | Result |
|---|---|
| 1 interface | ✅ 7/7; `samples` is a `sample_sheet:paired_or_unpaired`; 15/15 OQs as proposal decisions |
| 2 data-flow | ✅ 5/5 |
| 3 iwc-exemplar | ✅ 7, N/A 2; nearest epigenetics/chipseq-pe (Medium) |
| 4 template | ✅ 6/6; 198 steps, no step budget |
| 5 loop (39 iter) | ✅ all draft-validate rc 0; 220 steps extracted |
| 6 test-data | ✅ 3/3; a real single-end ChIP set found |
| 7 test-plan | ✅ 7/7; 6 cases |
| 8 implement-test | ✅ 3, N/A 1 |
| 9 validate | ✅; 39 repos installable; `--connections` leaves 30 steps unchecked behind multi-input gates (finding 22) |
| 10 run-workflow-test | ✅ attempt 5 |
| 11 debug | ✅ 4, N/A 1 |

Pipeline eval.md ✅ except Scope ⚠️ (9 cited drops; MACS2 in place of MACS3); case expect ✅.

Attempts (job wall time): 1 (32 min), no `--biocontainers`, host conda `gtfToGenePred` failed on `libssl.so.1.0.0` (driver harness; Mold fix `38400847`, TEST_PIPELINE now requires the flag); 2 (73 min), `__BUILD_LIST__` over per-antibody DESeq2 lists made MultiQC map over, outputs became lists; 3 (71 min), primary green; 4 (291 min, 5 variants), 3/5: IGV session named a skipped consensus BED (repaired with `__FILTER_NULL__`), and two test defects (null expression.json output asserted; whole-line samtools SN match); 5 (191 min), 3/3. Lowest MemAvailable 8.2 GiB.

Brief-scoped units: controls via an awk port of `check_samplesheet.py` pairing plus `__CROSS_PRODUCT_FLAT__`, each IP called against its own input, controls never peak-called; `macs_gsize` optional int with jellyfish k=read_length fallback (11622260 vs khmer 11624332); bwa/bowtie2/chromap/STAR as gated branches per layout merged by pick_value, all green. Primary: peaks per IP 909/655/794/999, FRiP 0.35–0.41, 1472 consensus intervals.

## Misses

- Phase 4's MultiQC `__BUILD_LIST__` wiring and the IGV consensus listing were workflow defects nothing caught statically.
- The test plan asserted a null single-dataset output (master planemo still reports it missing despite #1761).
- The source test profile's four "SPT5" IP runs are ATAC-seq reads; only the inputs are ChIP.
- Not tested: narrow-peak path, supplied `macs_gsize`.
- Master-only planemo fixes were not decisive for this run.
