# workflow-brief-to-galaxy: golden brief CRG-CNAG__CalliNGS-NF v0

- Worktree: `~/projects/worktrees/foundry/branch/pipeline-run-callings` (`origin/main` `9f83fd55` + local `0d8daf0e` (summarize-nextflow, unused), `1782eefb`, `619ae0a7`).
- Run dir: `~/foundry-runs/prose-wb2g-callings-v0-2026-10-29/`; kept test outputs in `.scratch/test-outputs/`.
- Plan: [golden brief](../../../../projects/foundries/plans/CRG-CNAG__CalliNGS-NF/golden.md), [debrief](../../../../projects/foundries/plans/CRG-CNAG__CalliNGS-NF/debriefs/2026-10-29-v0.md).

## Status

Completed: planemo green 1/1 (23/23 assertions, 24 jobs) on attempt 5, all 11 phases; 18 steps, both replicates consumed; 2 dropped, 4 surrendered; folded into golden v1 (13 → 6 open questions, 3 → 13 decisions).

## Eval

| Phase | Result |
|---|---|
| 1 interface | ✅ 7/7; 13 OQs recorded as brief-proposal decisions; reads as sample > replicate > mates |
| 2 data-flow | ✅ 5/5; per-replicate map-over, per-sample reduction for HaplotypeCaller/ASE |
| 3 iwc-exemplar | ✅ no GATK, STAR two-pass or nested-list input in IWC; nearest rnaseq-pe (Medium) |
| 4 template | ✅ 6/6; 18 steps, 17 drafty |
| 5 loop (17 iter) | ✅ except iter 12 (went to a stock converter, not authoring) → Mold fix `1782eefb` |
| 6 test-data | ✅ 3/3; 7 commit-pinned URLs, SHA-1 match |
| 7 test-plan | ✅ 7/7 |
| 8 implement-test | ✅ schema, static CLI; cross-check is labels only (#734) |
| 9 validate | ✅ strict + connections (18 tool states, 31 connections) |
| 10 run-workflow-test | ✅ attempt 5 (Galaxy release_26.1 via `planemo serve` + `external_galaxy`, ~10 min) |
| 11 debug | ✅ 5/5 on attempt 2 (user-tool multiple-input shape) |

Pipeline eval.md ✅ (`UR:` rewrite and `--refactor-cigar-string` recorded as drops; PNG histogram allowed by the brief); case expect ✅.

GATK wrapper search: no GATK4 VariantFiltration or ASEReadCounter wrapper on the Tool Shed or in tools-iuc PRs (gatk2/GATK 1.4 need a licensed jar); both, and vcftools diff-site, ran as embedded user tools with the source's exact commands.

## Misses

- planemo 0.75.47 `planemo test` KeyErrors on embedded user tools; route is `planemo serve` + a `user_tool_execute` role + `--engine external_galaxy` (#733), and an empty-dir serve lacks stock `Filter1`; see [finding 19](../../findings/2026-10-29/19-planemo-serve-user-tool-route.md).
- Galaxy 26.1 hands a user tool's `multiple: true` input `[{rep1: File, rep2: File}]` for a workflow reduction; see [finding 17](../../findings/2026-10-29/17-user-tool-reduced-collection-shape.md). Authoring note fix `619ae0a7` (local).
- advance-galaxy-draft-step had no route to stock `CONVERTER_*` on a shed miss; Mold fix `1782eefb` (local), [finding 20](../../findings/2026-10-29/20-stock-converter-routing.md).
- `gxwf --connections` ignores datatypes; [finding 18](../../findings/2026-10-29/18-gxwf-connection-datatypes.md).
- Seed brief called the plain-gzip known-variants file "bgzipped"; another case of [finding 9](../../findings/2026-10-29/09-brief-source-fidelity.md).
- Environment: concurrent smrnaseq v1 run caused the STAR OOM (attempt 3); RAM-backed `/tmp` needs a short on-disk TMPDIR (attempt 4).
