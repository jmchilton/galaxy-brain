# Run queue

Golden-plan runs on the Linux host (x86_64, 4 CPUs, 14 GiB RAM). At most two journeys at a time, for memory. When one finishes: record and fold it, triage its findings per [RUN_FINDINGS.md](RUN_FINDINGS.md), apply fix-now changes, then start the next.

Each new pipeline runs seed (step 0) then build (step 1) then fold, per [GOLDEN_PLANS.md](GOLDEN_PLANS.md), in its own worktree; the seed and build share it. Pre-plans: `vault/projects/foundries/plans/<wf>/PREPLAN.md`.

| Slot order | Workflow | Step | Worktree | Run dir | State |
|---|---|---|---|---|---|
| 1 | nf-core__demo | build v1 → v2 | `pipeline-run-demo-v1` | `~/foundry-runs/prose-wb2g-demo-v1-2026-10-29/` | running |
| 2 | nf-core__smrnaseq | build v1 → v2 | `pipeline-run-smrnaseq-v1` | `~/foundry-runs/prose-wb2g-smrnaseq-v1-2026-10-29/` | running |
| 3 | CRG-CNAG__CalliNGS-NF | seed v0, build v0 → v1 | `pipeline-run-callings` | | queued |
| 4 | nf-core__bacass--test-profile | seed v0, build v0 → v1 | `pipeline-run-bacass` | | queued |
| 5 | nf-core__bacass | seed v0, build v0 → v1 | `pipeline-run-bacass-full` | | queued |
| 6 | nf-core__atacseq | seed v0, build v0 → v1 | `pipeline-run-atacseq` | | queued |

## Seed objectives (John, 2026-10-29)

- **CalliNGS-NF:** whole pipeline, the expansive reading. The workflow test uses both replicates so per-sample grouping is exercised. Keep ASEReadCounter and VariantFiltration in scope: search for GATK4 or equivalent wrappers and drop only with cited evidence.
- **bacass--test-profile:** "convert the pipeline's default test-profile path (`conf/test.config` and its sample sheet, including run merging) to an equivalent Galaxy workflow".
- **bacass:** whole pipeline (all modes, assemblers, annotators).
- **atacseq:** whole pipeline. `macs_gsize` and the merged-replicate level stay in scope.
- **BUSCO in bacass tests:** open; see the 2026-10-29 conversation. The IUC wrapper (6.1.0) is `--offline` only and reads the `busco_database` data table.

Worktrees are on `origin/main` @ `9f83fd55` with packages and Nextflow fixtures built.

## Machine and process log

- 2026-10-29: cloned `galaxyproject/foundry` to `~/projects/repositories/foundry` (`origin` upstream, `jmchilton` fork); `npm i -g pnpm@10.33.0` (no corepack on Node 26). planemo via `uvx --from planemo==0.75.47`; `gxwf` from each worktree's `node_modules/.bin`.
