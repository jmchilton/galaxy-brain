# Run findings, 2026-10-29

From golden-plan runs on the Linux host. Process: [RUN_FINDINGS.md](../../../../agents/wf_foundry/RUN_FINDINGS.md). Nothing here is posted; John reviews first.

| # | Finding | Target | Existing | Status |
|---|---|---|---|---|
| 01 | [Template design precedence](01-template-design-precedence.md): which of data-flow brief, IWC phase, ledger decision may change topology | galaxyproject/foundry | related #318; conflicts with PR #696 | draft |
| 02 | [Test-plan forces `assumed` labels](02-test-plan-assumed-labels.md) though the workflow exists | galaxyproject/foundry | widen #577 (comment drafted) | draft |
| 03 | [`gxwf validate-tests` ignores collection type and format](03-gxwf-validate-tests-shape.md) | jmchilton/galaxy-tool-util-ts | #210 upstream; Foundry #731, PR #734 | draft; drop local Mold fix `8758f9ee` (superseded by #734) |
| 04 | [Tool summaries have no command or requirements](04-tool-summary-no-command.md) | jmchilton/galaxy-tool-util-ts | Foundry #553 (comment corrects it), #648 | draft |
| 05 | [Debug Mold undefined on a green run](05-debug-mold-green-handoff.md); nobody owns the ledger close | galaxyproject/foundry | related #662, PR #732 | draft |
| 06 | [Weak test assertions](06-weak-test-assertions.md): values fixed before any run, never tightened | galaxyproject/foundry | related #662 | draft; run-output retention fixed in TEST_PIPELINE.md |
| 07 | [`summarize-nextflow` CLI misreads ad hoc pipelines](07-summarize-nextflow-adhoc-pipeline.md): five resolver bugs (anonymous workflow, tuple IO, params, containers, license) | galaxyproject/foundry | related #666, #111, #211, #176 | draft |
| 08 | [Test selection falls back to defaults only](08-test-selection-default-fallback.md) when there's no nf-test or test profile | galaxyproject/foundry | related #67, #211, #666, PRs #528, #529 | draft; revise local Mold fix `0d8daf0e`; rev 19 collides with two unpushed branches |
| 09 | [Brief changes cited facts without re-reading source](09-brief-source-fidelity.md) | galaxyproject/foundry | same class as #647 | draft; v0 corrected by hand |
| 10 | [Brief Mold has no inputs for caller request or environment](10-brief-mold-input-contract.md); test-requirement placement and confidence scale undefined | galaxyproject/foundry | related #694/PR #696, #725/PR #728 | draft |
| 11 | [Galaxy runs a skipped model-operation step's outputs](11-galaxy-when-skip-model-operation.md): `__RELABEL_FROM_FILE__` fails the invocation | galaxyproject/galaxy | none; related galaxy #16632, #21142, #24286 | draft; Foundry tracking comment drafted |
| 13 | [find-test-data never checks library layout](13-test-data-library-layout.md): random-N reads hid miRNA signal, v0 misdiagnosed miRDeep2 | galaxyproject/foundry | related #575, #735, PRs #690, #328, #684 | draft |
| 15 | [Tool Shed search misses `seqkit stats`](15-toolshed-search-recall.md): ids unsearched, multi-word AND | galaxyproject/galaxy (tool shed) | Foundry #574 (comment drafted), galaxy #2285 | draft; no Mold change |

Seen in: 11–15 `~/foundry-runs/prose-wb2g-smrnaseq-v1-2026-10-29/`; 01–06 `~/foundry-runs/prose-wb2g-demo-v1-2026-10-29/`; 07–10 `~/foundry-runs/prose-nf2wb-callings-2026-10-29/`.
