# workflow-brief-to-galaxy: golden brief nf-core__atacseq v0

- Worktree: `~/projects/worktrees/foundry/branch/pipeline-run-atacseq` (`origin/main` `9f83fd55` + local `bedb13d4` (summarize-nextflow, seed only)).
- Run dir: `~/foundry-runs/prose-wb2g-atacseq-v0-2026-10-29/`; kept test outputs in `.scratch/test-outputs/attempt3/`. Not yet archived (needs John: planemo logs carry ephemeral Galaxy keys).
- Plan: [golden brief](../../../../projects/foundries/plans/nf-core__atacseq/golden.md).

## Status

Completed: planemo green 1/1 (25/25 output assertions, 340 jobs ok) on attempt 3, all 11 phases; 149 steps (116 Tool Shed over 33 repos, 33 stock, no user tools), 39 inputs, 52 outputs; 16 dropped (all cited), 18 open gaps, 0 surrendered, 4 brief-change recommendations.

## Eval

| Phase | Result |
|---|---|
| 1 interface | ✅ 7/7; 15/15 OQs as brief-proposal decisions; reads one `list:paired_or_unpaired` collection |
| 2 data-flow | ✅ 5/5; ~162 steps estimated |
| 3 iwc-exemplar | ✅ 7, N/A 2; nearest epigenetics/atacseq (Medium) |
| 4 template | ✅ 6/6; 133 steps; step budget capped, controls and alt aligners dropped with cited because |
| 5 loop (91 iter) | ✅ all draft-validate rc 0; 149 steps extracted |
| 6 test-data | ✅ 2, ❌ 1 (schema has no form for scalar/absent-optional inputs); test profile at test-datasets `cd022b09` |
| 7 test-plan | ✅ 7/7 |
| 8 implement-test | ✅ 3, N/A 1 |
| 9 validate | ✅ strict + connections after repairing non-installable `map_param_value` pin (foundry #644/#645); `--connections` skipped 252/362 |
| 10 run-workflow-test | ✅ attempt 3 (~59 min; peak 6.6 GB) |
| 11 debug | ✅ 4, N/A 1 |

Pipeline eval.md ✅ except Scope ⚠️ (narrowed by 16 cited drops); case expect ✅.

Attempts: 1, tp_awk forces `FS='\t'` on a space-separated jellyfish histogram, so `--gsize 0` and MACS2 ZeroDivisionError; 2, workflow green but a collection output test had `element_count` without `element_tests`; 3, green.

macs_gsize: optional int; absent → jellyfish k=read_length count/histo/sum feeds MACS2 (11622260 vs khmer 11624332, 0.018%), asserted. Merged-replicate level built and tested (MR peaks 1134/1291, FRiP 0.45/0.42).

## Misses

- No child raised brief-change recommendations for accepted proposals the build couldn't honour; the driver added 4 at close.
- `trim_nextseq` is an inert input; FastQC raw sample names collide in MultiQC (open ledger entry).
