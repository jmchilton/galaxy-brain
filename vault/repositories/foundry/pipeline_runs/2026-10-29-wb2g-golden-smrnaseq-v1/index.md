# workflow-brief-to-galaxy: golden brief nf-core__smrnaseq v1

- Worktree: `~/projects/worktrees/foundry/branch/pipeline-run-smrnaseq-v1`, branch `pipeline-run-smrnaseq-v1` @ `e0aefee0` (`origin/main` `9f83fd55` + local Mold fix `e0aefee0`).
- Run dir: `~/foundry-runs/prose-wb2g-smrnaseq-v1-2026-10-29/`; kept test outputs in `.scratch/test-outputs/attempt2/`.
- Plan: [golden brief](../../../../projects/foundries/plans/nf-core__smrnaseq/golden.md), [debrief](../../../../projects/foundries/plans/nf-core__smrnaseq/debriefs/2026-10-29-v1.md).

## Status

Completed: planemo green 2/2 on attempt 2 of 2 (v0 took 9), all 11 phases; 0 dropped (v0: 8), 12 surrendered (v0: 16); miRDeep2 exercised; folded into golden v2.

## Eval

| Phase | Result |
|---|---|
| 1 interface | ✅ 7/7; 7 OQs recorded as brief-proposal decisions; 9 inputs |
| 2 data-flow | ✅ 5/5; stop rule overridden (brief anticipated the gaps); gap plane not emitted |
| 3 iwc-exemplar | ✅ no small-RNA exemplar; nearest rnaseq-sr (Medium) |
| 4 template | ✅ 6/6; 68 steps, 57 shed steps as versioned GUIDs |
| 5 loop (58 iter) | ✅ every draft-validate rc 0; 0 dropped units |
| 6 test-data | ✅ 3/3; `test` reads have 4N randomized ends, so used miRNA-enriched `test_full` plasma subsets |
| 7 test-plan | ✅ 6, ❌ 1 (label/fixture assumptions, known Mold gap #577) |
| 8 implement-test | ✅ 2 cases (genome + below-threshold sample; no genome + raised threshold) |
| 9 validate | ✅ strict + connections; 2 shed steps lacked `tool_shed_repository` → Mold fix |
| 10 run-workflow-test | ✅ attempt 2 (Galaxy release_26.1, ~45 min per attempt) |
| 11 debug | ✅ attempt 1: MultiQC tokens, Galaxy 26.1 skipped-model-operation bug |

Pipeline eval.md ✅ (scope narrowed by recorded gaps); case expect ✅.

## Misses

- `gxwf validate --strict --connections` passes shed steps with no `tool_shed_repository`; planemo then doesn't install them. Implement-step fix `e0aefee0` (local, unpushed); CLI gap remains.
- Galaxy 26.1 (and dev) runs a `when`-skipped model operation's `produce_outputs` before the skip; worked around by ungating `genome_suffix_ids`. Feedback entry open; see [finding 11](../../findings/2026-10-29/11-galaxy-when-skip-model-operation.md).
- `find-test-data` doesn't check library layout against the protocol; v0's miRDeep2 "data failure" was a 4N-adapter fixture problem.
- Data-flow stop rule ignores gaps the brief anticipated; test-plan Mold assumes template-era inputs; asserts idioms omit planemo collection routing.
- Concurrent CalliNGS planemo pushed host memory to 13.3/14.6 GB; the OOM killer killed its STAR job, not ours.
