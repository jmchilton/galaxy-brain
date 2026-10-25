# foundry#716 — summarize-nextflow eval counts nf-test files, resolver emits one row per test case

[Issue](https://github.com/galaxyproject/foundry/issues/716) · [PR #717](https://github.com/galaxyproject/foundry/pull/717) · [surfacing run](../../../pipeline_runs/2026-10-25-nf2g-demo/index.md)

Opened 2026-10-25 with `roadmap/off`, `priority/mvp`, `agent/implement`.

Verified root cause: `parseNfTestsInDir` (`packages/summarize-nextflow/src/resolver.ts`) maps each `test("…")` block to a row. nf-core/demo's fastqc test file has 12 blocks, so the summary has 12 rows, but the eval expected 1. Fix is eval and scenario wording only, on branch `issue-716-summarize-nextflow-eval-test-cases`.

Closed 2026-10-25: PR #717 merged.
