# workflow-brief-to-galaxy: golden brief nf-core__hic v0

- Worktree: `~/projects/worktrees/foundry/branch/pipeline-run-chipseq` (`origin/main` `9f83fd55` + local `40fc911d`, `9b2fd539`, `38400847`, `a1d2e24a`, `f766287a`, `f947b792`, `52808616`, `131ad3b4`, and this run's Mold fixes `c7ab66fa`, `2139033d`).
- Run dir: `~/foundry-runs/prose-wb2g-hic-v0-2026-11-01/`; kept test outputs in `.scratch/test-outputs/attempt{4,5}/`; driver notes in its `.bin/driver-notes.md`. Not archived (planemo logs; archive policy needs John).
- Plan: [golden brief](../../../../projects/foundries/plans/nf-core__hic/golden.md) v0, sha256 `96272762…ee99`, unchanged throughout. planemo master @ `2a815808`, Galaxy release_26.1, `--biocontainers`.

## Status

Completed: planemo green on all 6 cases on the final workflow (coordinator checked: `test`, `test_hicpro_maps`, `test_motifs`, `test_multi_run`, `test_overrides` in attempt 4; `test_dnase` in attempt 5 after a test-only fix, on a byte-identical workflow, sha256 `ca907c22…`). 97 steps: 58 Tool Shed (17 tool ids, 16 repos), 21 stock, 18 embedded user-tool steps (16 tools running the source's containers; `cutsite_trimming` and `build_matrix` compiled from `bin/src` in the job); 26 gated; 30 inputs, 45 outputs. Ledger: 2 open gaps (no source reference outputs; committed `cutsite_trimming` binary doesn't match `bin/src`), 2 dropped (prebuilt Bowtie2 index override, free-text Bowtie2 option strings), 0 surrendered, 6 brief-change recommendations; 17 feedback entries.

## Eval

| Phase | Result |
|---|---|
| 1 interface | ✅ 7/7; one entry point gated on `dnase`; `sample_sheet:paired` |
| 2 data-flow | ✅ 5/5; Bowtie2 effective seed length 20; binary/source mismatch found |
| 3 iwc-exemplar | ✅ 7, N/A 2; hic-hicup-cooler (Medium) |
| 4 template | ✅ 6/6; 97 steps, 0 drafty |
| 5 loop (1 iter) | ✅ 179 connections ok, 0 skipped |
| 6 test-data | ✅ data inputs; ❌ literal coverage (no ref form for 26 parameter inputs, finding 25) |
| 7 test-plan | ✅ 7/7; 6 cases, every gate both ways |
| 8 implement-test | ✅ 4, N/A 1 |
| 9 validate | ✅; 17/17 tool ids installable, 8 user-tool containers exist |
| 10 run-workflow-test | ✅ after 5 attempts |
| 11 debug | ✅ 4, N/A 1 |

Pipeline eval.md ✅ except Scope ⚠️ (2 cited drops, each with a recommendation); case expect ✅.

Attempts: 1 (892 s) name-sorted BAM declared `bam`, Galaxy's metadata step failed indexing it (R1: `unsorted.bam`/`qname_sorted.bam`); 2 (981 s) a `while read` loop dropped an unterminated last line (R2); 3 (1314 s) collection expectations without `element_tests`, MultiQC rows named forward/reverse (R3); 4 (7837 s, all 6) 5/6, test_dnase asserted a dangling-end class the source never writes in DNase mode (R4, test-only); 5 (1129 s) test_dnase green. Lowest MemAvailable 7.99 GB, no kills.

Science (`test`): 29,437 valid pairs, 29,418 after dedup; cooler pixels 27,361 at 1 kb, 26,442 at 2 kb; multi_run, overrides and motifs match `test`; DNase 59,198 / 59,174; hicFindTADs calls 0 TADs on the sparse 1 kb map (asserted structurally).

## Misses

- The template resolved every step, so the per-step loop never ran its user-tool checks; three workflow defects surfaced only in planemo.
- `gxwf validate-tests` accepts collection expectations without `element_tests` that planemo then checks as files.
- Equivalence with the source is structural only: no source reference outputs, and no Nextflow/Java here to make them.
- The no-protocol fail-fast path is untested (planemo ignores `expect_failure`, finding 39).
- `galaxy-test-plan.yml` still holds the stale test_dnase expectation.
