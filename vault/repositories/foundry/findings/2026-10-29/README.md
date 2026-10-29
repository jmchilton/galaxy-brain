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

Seen in: `~/foundry-runs/prose-wb2g-demo-v1-2026-10-29/` (all six).
