# nextflow-to-galaxy — nf-core/demo end to end (2026-10-25)

Driven per [TEST_PIPELINE.md](../../../../agents/wf_foundry/TEST_PIPELINE.md). Foundry `origin/main` @ `bc790960`, worktree `~/projects/worktrees/foundry/branch/pipeline-run-nf2g-demo`, run dir `~/foundry-runs/prose-nf2g-demo-2026-10-25/` (per-phase git history, `run-summary.md`, `foundry-feedback.ledger.yml`).

## Status

Complete: phases 1–12 done, `planemo test` green (1 test, 0 failures, 305 s, Galaxy 26.1, biocontainers); phase 13 debug skipped.

## Results

| # | Phase | Result |
|---|---|---|
| 1 | summarize-nextflow | Schema valid, process and test counts match; eval wording wrong ([#716](../../issues/closed/716/index.md)) |
| 2 | reference-data | "No reference data" sound; Mold has no `eval.md` |
| 3 | interface | 6/6; sample sheet → `sample_sheet:paired_or_unpaired` |
| 4 | data-flow | Pass, but claimed nested `paired_or_unpaired` feeds MultiQC (invalid; caught in 6) |
| 5 | compare-against-iwc-exemplar | short-read-qc-trimming, medium confidence; shared IWC mirror stale |
| 6 | template | `draft-validate` 0 errors |
| 7 | draft loop (2 iterations) | `draft: false`, 0 TODOs, `gxwf validate --strict --connections` rc0 |
| 8 | test-data branch | `nextflow-to-test-data`, refs valid; Mold has no `eval.md` |
| 9–10 | test plan, workflow test | Valid; md5 on gz swapped for line counts |
| 11 | validate | validate rc0, lint rc1 (creator/license), roundtrip rc2 (reported gxwf `when` defect, unconfirmed) |
| 12 | run-workflow-test | Pass, all 4 outputs |

Case expectations: all met except round-trip.

## Follow-ups

- [#716](https://github.com/galaxyproject/foundry/issues/716) / [PR #717](https://github.com/galaxyproject/foundry/pull/717): summarize-nextflow eval counts test cases.
- Ledger holds 35 open entries; candidates for issues: missing `eval.md` for reference-data and nextflow-to-test-data; summarize-nextflow CLI misses `nextflow.config` defaults, `modules.config` publishDir, `getGenomeAttribute`; no schema field for scalar inputs or per-row sample-sheet columns; no documented `sample_sheet` test-job form; gxwf roundtrip on `when`-gated steps; concurrent planemo guidance.
- Process: the driver handed back while phase 12 was still waiting; the brief now forbids that.
