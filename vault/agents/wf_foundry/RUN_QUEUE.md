# Run queue

Golden-plan runs on the Linux host (x86_64, 4 CPUs, 14 GiB RAM). At most two journeys at a time, for memory. When one finishes: record and fold it, triage its findings per [RUN_FINDINGS.md](RUN_FINDINGS.md), apply fix-now changes, then start the next.

Each new pipeline runs seed (step 0) then build (step 1) then fold, per [GOLDEN_PLANS.md](GOLDEN_PLANS.md), in its own worktree; the seed and build share it. Pre-plans: `vault/projects/foundries/plans/<wf>/PREPLAN.md`.

| Slot order | Workflow | Step | Worktree | Run dir | State |
|---|---|---|---|---|---|
| 1 | nf-core__demo | build v1 → v2 | `pipeline-run-demo-v1` | `~/foundry-runs/prose-wb2g-demo-v1-2026-10-29/` | done: green 1/1, folded to v2 (2026-10-29) |
| 2 | nf-core__smrnaseq | build v1 → v2 | `pipeline-run-smrnaseq-v1` | `~/foundry-runs/prose-wb2g-smrnaseq-v1-2026-10-29/` | done: green on attempt 2 (v0: 9), dropped 0 (v0: 8), surrendered 12 (v0: 16); folded to v2 |
| 3 | CRG-CNAG__CalliNGS-NF | seed v0, build v0 → v1 | `pipeline-run-callings` | seed `~/foundry-runs/prose-nf2wb-callings-2026-10-29/`; build `~/foundry-runs/prose-wb2g-callings-v0-2026-10-29/` | seed done (v0 `f8993830`); build green on attempt 5 (1 OOM from concurrency, 2 harness); folded to v1 (6 open / 13 decisions) |
| 4 | nf-core__bacass--test-profile | seed v0, build v0 → v1 | `pipeline-run-bacass` | seed `~/foundry-runs/prose-nf2wb-bacass-test-2026-10-29/` | seed done (v0 `c0df6a03`); build waits on BUSCO decision; seed run dir not yet archived (needs John) |
| 5 | nf-core__bacass | seed v0, build v0 → v1 | `pipeline-run-bacass-full` | seed `~/foundry-runs/prose-nf2wb-bacass-full-2026-10-29/` | seed done (v0 `7844e898` + fixes); build needs reference-DB decision |
| 6 | nf-core__atacseq | seed v0, build v0 → v1 | `pipeline-run-atacseq` | seed `~/foundry-runs/prose-nf2wb-atacseq-2026-10-29/`; build `~/foundry-runs/prose-wb2g-atacseq-v0-2026-10-29/` | seed done (v0 `5c32c662`); build running |
| 7 | nf-core__chipseq 2.1.0 | seed v0, build v0 → v1 | `pipeline-run-chipseq` | — | proposed: atacseq sibling, same test reference; IWC chipseq-pe/sr |
| 8 | nf-core__cutandrun 3.2.2 | seed v0, build v0 → v1 | `pipeline-run-chipseq` | — | proposed: all refs explicit URLs + spike-in; IWC cutandrun |
| 9 | nf-core__viralrecon 3.0.0 | seed v0, build v0 → v1 | `pipeline-run-chipseq` | — | proposed: ARTIC/ivar amplicon test; IWC sars-cov-2 workflows |
| 10 | nf-core__hic 2.1.0 | seed v0, build v0 → v1 | `pipeline-run-chipseq` | — | proposed: yeast ref by URL; IWC hic-hicup-cooler |
| 11 | already pinned, never run: nf-core__hlatyping, nf-core__bamtofastq, nextflow-io__rnaseq-nf | seed v0, build v0 → v1 | new per run | — | proposed: small, light on references |

## Seed objectives (John, 2026-10-29)

- **CalliNGS-NF:** whole pipeline, the expansive reading. The workflow test uses both replicates so per-sample grouping is exercised. Keep ASEReadCounter and VariantFiltration in scope: search for GATK4 or equivalent wrappers and drop only with cited evidence.
- **bacass--test-profile:** "convert the pipeline's default test-profile path (`conf/test.config` and its sample sheet, including run merging) to an equivalent Galaxy workflow".
- **bacass:** whole pipeline (all modes, assemblers, annotators).
- **atacseq:** whole pipeline. `macs_gsize` and the merged-replicate level stay in scope.
- **BUSCO in bacass tests:** open; see the 2026-10-29 conversation. The IUC wrapper (6.1.0) is `--offline` only and reads the `busco_database` data table.

Worktrees are on `origin/main` @ `9f83fd55` with packages and Nextflow fixtures built.

Rows 7-10 (2026-10-30) need fixtures not on `origin/main`. They are pinned in local commit `40fc911d` on worktree `pipeline-run-chipseq` (unpushed; a fixtures.yaml PR is John's call), and fetched and SHA-verified there. Each has a close IWC workflow, so the IWC compare phase gets a real reference and the build can be diffed against it. Skipped for now: ampliseq and mag (taxonomy/DB downloads, the same blocker as bacass), scrnaseq (large STARsolo indexes).

## Machine and process log

- 2026-10-29: cloned `galaxyproject/foundry` to `~/projects/repositories/foundry` (`origin` upstream, `jmchilton` fork); `npm i -g pnpm@10.33.0` (no corepack on Node 26). planemo via `uvx --from planemo==0.75.47`; `gxwf` from each worktree's `node_modules/.bin`.
- 2026-10-29: two concurrent planemo Galaxies (smrnaseq 68 steps + CalliNGS STAR) peaked at 13.3/14.6 GiB and the OOM killer took CalliNGS's STAR. Added a persistent 16 GiB `/swapfile`; drivers now wait before a planemo attempt when another runs and `MemAvailable` < 8 GiB (TEST_PIPELINE.md).
- 2026-10-29: GOLDEN_PLANS build step now copies `caller-request.md` and `summary-nextflow.json` from the seed run dir (the demo v1 driver had to find them itself).
