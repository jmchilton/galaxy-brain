# workflow-brief-to-galaxy: golden brief nf-core__demo v1

- Worktree: `~/projects/worktrees/foundry/branch/pipeline-run-demo-v1`, branch `pipeline-run-demo-v1` @ `8758f9ee` (`origin/main` `9f83fd55` + local Mold fix `8758f9ee`).
- Run dir: `~/foundry-runs/prose-wb2g-demo-v1-2026-10-29/`.
- Plan: [golden brief](../../../../projects/foundries/plans/nf-core__demo/golden.md), [debrief](../../../../projects/foundries/plans/nf-core__demo/debriefs/2026-10-29-v1.md).

## Status

Completed: planemo green 1/1 on the first attempt, all 11 phases; folded into golden v2.

## Eval

| Phase | Result |
|---|---|
| 1 interface | ✅ 7/7; `list:list:paired_or_unpaired` input |
| 2 data-flow | ✅ 5/5; flatten after FastQC (superseded in phase 3) |
| 3 iwc-exemplar | ✅ short-read-quality-control-and-trimming (Medium); moved flatten before FastQC (rnaseq-pe idiom) |
| 4 template | ✅ 6/6; followed the superseding ledger decision |
| 5 loop (2 iter) | ✅; extracted the final workflow on the last call |
| 6 test-data | ✅ 3/3; 4 URLs 200 with SHA-1 |
| 7 test-plan | ✅ 7/7; labels forced to `assumed` (Mold friction) |
| 8 implement-test | ✅; validate-tests checks labels only (fixed `8758f9ee`) |
| 9 validate | ✅ strict + connections; 1 lint warning (creator) |
| 10 run-workflow-test | ✅ 1/1, 13/13 jobs (Galaxy 26.1.3.dev0, 9m14s) |
| 11 debug | N/A (green) |

Pipeline eval.md 4/4 ✅; case expect ✅.

## Misses

- `gxwf validate-tests --workflow` doesn't check job shape or filetype (Mold fix `8758f9ee`, unpushed; needs issue + branch decision; CLI gap and `content/cli/gxwf/validate-tests.md` overclaim remain).
- Phase 3 overrode a phase 2 decision; the template Mold is silent on which wins. Test-plan Mold still ignores the concrete workflow; debug Mold undefined on a passing handoff.
