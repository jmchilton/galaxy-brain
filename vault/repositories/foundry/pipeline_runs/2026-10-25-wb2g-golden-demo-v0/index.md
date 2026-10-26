# workflow-brief-to-galaxy: golden brief nf-core__demo v0

- Worktree: `~/projects/worktrees/foundry/branch/pipeline-run-golden-demo`, branch `pipeline-run-golden-demo` @ `99cbe837` (`origin/main` `08d534a3` + #720 eval fixes), Mold fix `96f1aefe` local.
- Run dir: `~/foundry-runs/prose-wb2g-demo-v0-2026-10-25/`.
- Plan: [golden brief](../../../../projects/foundries/plans/nf-core__demo/golden.md), [debrief](../../../../projects/foundries/plans/nf-core__demo/debriefs/2026-10-25-v0.md).

## Status

Completed: planemo green 1/1, all 11 phases.

## Eval

| Phase | Result |
|---|---|
| 1 interface | ✅ 7/7; `list:paired_or_unpaired` input |
| 2 data-flow | ✅ 5/5; flatten before FastQC |
| 3 iwc-exemplar | ✅ short-read-quality-control-and-trimming (Medium); local-clone ⚠️ partial |
| 4 template | ✅ 6/6 |
| 5 loop (3 iter) | ✅ deterministic; miss: no terminal extract (fixed `96f1aefe`) |
| 6 test-data | ✅ 6 URLs 200 with SHA-1 |
| 7 test-plan | ✅ 7/7; consulted a sibling run (warning) |
| 8 implement-test | ✅ |
| 9 validate | ✅ strict + connections; 2 lint warnings (creator, license) |
| 10 run-workflow-test | ✅ 1/1 (Galaxy 26.1.2.dev0, ~65 min) |
| 11 debug | no-op |

Pipeline eval.md 4/4 ✅; case expect ✅.

## Misses

- Draft loop never extracts the final workflow (Mold fix `96f1aefe`, unpushed; needs issue + branch decision).
- Test-plan Mold lacks concrete workflow and test-data refs inputs; implement-test planemo loop overlaps phase 10; result artifact unschematized.
