# workflow-brief-to-galaxy: golden brief nf-core__cutandrun v0

- Worktree: `~/projects/worktrees/foundry/branch/pipeline-run-chipseq` (`origin/main` `9f83fd55` + local `40fc911d`, `9b2fd539`, `38400847`, `a1d2e24a`, and this run's Mold fix `f766287a`).
- Run dir: `~/foundry-runs/prose-wb2g-cutandrun-v0-2026-10-31/`; kept test outputs in `.scratch/test-outputs/attempt{4,5,6}/`. Not yet archived (archive policy for planemo logs needs John).
- Plan: [golden brief](../../../../projects/foundries/plans/nf-core__cutandrun/golden.md). planemo master @ `2a815808`, Galaxy release_26.1, `--biocontainers`.

## Status

Completed: planemo green on all 7 cases. Final workflow (298 steps): test_primary and variant_cpm_macs2_primary (attempt 5), test_full_small (attempt 6); spikein_failfast fails at the intended fail-fast step. test_no_control, test_tech_reps and variant_none_controls_off passed in attempt 4, before repair R4, which only touched code paths those cases share with the later-green ones; they were not re-run on the final workflow. 205 Tool Shed steps over 32 repos, 93 stock, 0 user tools, 111 gated; 56 inputs, 57 outputs. 5 dropped (cited), 8 open gaps, 0 surrendered, 12 brief-change recommendations.

## Eval

| Phase | Result |
|---|---|
| 1 interface | ✅ 7/7; `sample_sheet:paired`; 17 OQs as proposal decisions |
| 2 data-flow | ✅ 5/5; ~268 abstract steps |
| 3 iwc-exemplar | ✅ 7, N/A 2; epigenetics/cutandrun (Medium; no IgG, SEACR or spike-in in IWC) |
| 4 template | ✅ 6/6; 289 steps |
| 5 loop (33 iter) | ✅ all draft-validate rc 0; 288 steps |
| 6 test-data | ✅ 3/3; test-datasets @ `42442e98` |
| 7 test-plan | ✅ 6, ❌ 1 (labels bound to the real draft, deliberately) |
| 8 implement-test | ✅ 3 |
| 9 validate | ✅ 4/4; 621 connections ok, 0 skipped; all 32 repos installable |
| 10 run-workflow-test | ✅ attempt 6 |
| 11 debug | ✅ 3, N/A 2 |

Pipeline eval.md ✅ except Scope ⚠️ (5 cited drops, 9 deviations, each with a recommendation); case expect ✅.

Attempts: 1 (7 min), `.gz` fixtures uploaded compressed (Mold fix `f766287a`: `decompress: true`); 2 (42 min), collapse_dataset over an empty list renders `( )`; 3 (44 min), UpSet wrapper fails on one set; 4 (255 min, 6 cases) 4/6: collapse stub row for a 0-peak sample, deepTools computeMatrix rejects MACS2 BED5 summits; 5 (184 min) primary + cpm_macs2 green, failfast as intended, test_full_small test-regex defect; 6 (90 min) green. Lowest MemAvailable 6.7 GiB, no OOM.

Scope items: IgG pairing replicate-to-replicate (else control replicate 1) via the chipseq cross-product recipe, threshold path when `use_control` false; spike-in factor 10000 / E. coli aligned pairs, 1 when none, fail-fast without a spike-in FASTA; SEACR (4 mode variants) and MACS2 (8) by text gates; all 5 normalisation modes built, RPKM and BPM untested; prebuilt bowtie2 index tarballs dropped (wrapper takes a data-table index or a history FASTA; chr20 rebuild ~50 s).

## Misses

- Nothing foresaw empty-list reductions, single-set UpSet, collapse stub rows or BED5 into computeMatrix.
- MultiQC labels FastQC/cutadapt rows `forward`/`reverse`/`input_1`, so libraries overwrite each other (ledgered, not fixed).
- preseq 3.2.0 fails on the 10k-pair libraries; every case sets `skip_preseq` (the source ignores the error).
