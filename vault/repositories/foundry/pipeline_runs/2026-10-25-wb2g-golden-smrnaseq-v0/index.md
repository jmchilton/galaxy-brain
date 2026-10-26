# workflow-brief-to-galaxy: golden brief nf-core__smrnaseq v0

- Worktree: `~/projects/worktrees/foundry/branch/pipeline-run-nf2g-smrnaseq`, branch `pipeline-run-nf2g-smrnaseq` @ `79f5dfb6` (`origin/main` `08d534a3` + local #718 scenarios, #720 eval fixes, seed brief-Mold fix), Mold fix `1c675e1a` local.
- Run dir: `~/foundry-runs/prose-wb2g-smrnaseq-v0-2026-10-25/`; seed run `~/foundry-runs/prose-nf2wb-smrnaseq-2026-10-25/`.
- Plan: [golden brief](../../../../projects/foundries/plans/nf-core__smrnaseq/golden.md), [seed debrief](../../../../projects/foundries/plans/nf-core__smrnaseq/debriefs/2026-10-25-v0-seed.md), [build debrief](../../../../projects/foundries/plans/nf-core__smrnaseq/debriefs/2026-10-25-v0.md).

## Status

Completed: planemo green on attempt 9 (93/93 jobs, 9 skipped by `when`), all 11 phases; scope narrowed by tooling (mirtop, seqcluster, edgeR QC plots dropped; miRDeep2 skipped in test).

## Eval

| Phase | Result |
|---|---|
| 1 interface | ✅ 8 OQs recorded as brief-proposal decisions |
| 2 data-flow | ⚠️ no shed wrapper for mirtop/seqcluster/edgeR QC; ledger stop rule overridden |
| 3 iwc-exemplar | ✅ no small-RNA exemplar; nearest rnaseq-sr |
| 4 template | ✅ 47 steps; miss: versionless shed `tool_id`s |
| 5 loop (42 iter) | ✅ each `draft-validate --concrete --strict-state` green |
| 6 test-data | ✅ 3 samples × first 100k reads + reference FASTAs |
| 7–8 test plan/implement | ✅ |
| 9 validate | ✅ strict + connections (3 `when`-only connections skipped) |
| 10 run-workflow-test | ✅ attempt 9 |
| 11 debug | ✅ 4 failures triaged |

## Misses

- Template writes versionless shed `tool_id`s → HTTP 400 at invocation; `gxwf validate` doesn't catch it. Implement-step fix `1c675e1a` (unpushed); template Mold unfixed.
- Route doesn't dispatch reference-data or test-translation chains (done by hand).
- planemo 0.75.47: GalaxyUserTool `KeyError 'tool_id'`; `TypeError` asserting elements of skipped null collections.
- Stale `~/.planemo/gx_venv_3` breaks Galaxy master; arm64 docker warning on stderr fails legacy tools without `--platform=linux/amd64`.
- `--no_cleanup` Galaxy temp dirs took free disk to 3.1 GiB.
