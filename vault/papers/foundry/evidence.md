# Evidence

Status tracker for what the paper can stand on. The manuscript's Evidence section states the requirements; this file tracks what is built versus what is still owed.

## Built (citable as system description)

- Typed content base: 54 Patterns, 41 Molds, 6 Pipelines, 13 Schemas, 6 CLI reference sets, 63 research notes (regenerates from repo; pin commit SHA in SI).
- Validator with strict frontmatter + controlled tags + cross-file checks (reference dispatch, pipeline-phase resolution, Molds = union-of-phases invariant, artifact graph).
- Casting pipeline producing 31 Claude-target casts, each with `_provenance.json` (schema v2).
- Five `@galaxy-foundry/*` packages; Astro site with raw-Markdown endpoints.

## Still owed (the real gap — in progress)

The central efficacy claim is **not yet demonstrated**. Tracked in `case-study.md`:

- One clean **construction** case study (the path that runs): real analysis intent → freeform-summary → design Molds → exemplar comparison → `gxformat2` draft → per-step resolution → `gxwf` validation → `planemo test` → provenance trace. Conversion (Nextflow/CWL/paper → Galaxy) follows once a path is exercised end-to-end; only `summarize-nextflow` ships runtime code today.
- A failure-comparison vignette (monolithic skill / unguided agent vs. the decomposed loop) on the construction task — fabrication-catch is the load-bearing metric.
- A provenance walkthrough (one `SKILL.md` paragraph traced to Mold + source ref).

**Not evidence:** the `_emulated-runs/` dev test-drives in the project repo. They are internal harness shake-outs that surface gaps; they are not publishable end-to-end conversions and must not be presented as results.

## Risks

- Without a completed case study this reads as architecture only — own that explicitly (the manuscript does).
- Keep comparisons primary-source backed and dated; no vendor-landscape overclaiming.
- Present as an early model, not a mature automated conversion system.
