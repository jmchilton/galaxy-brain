# Implementation debrief — `issue_210_test_kind_checks`

Phase B of the [#210 plan](../../../issues/wip/210/plan.md): issue asks 1 + 2. `checkTestsAgainstWorkflow` gains input kind / `collection_type` / `filetype`-vs-`format` checks and output dataset-vs-collection / `collection_type` checks; output shapes come from the connection graph via new `resolveWorkflowOutputCollectionTypes`; diagnostics gain optional `severity`, reports gain `warnings`; CLI gets `--cache-dir` (read-only) and one shared loader.

Red→green: schema kind tests, connection-validation resolver test and CLI end-to-end tests each failed before their implementation.

Verification ([details](verification.md)): real egapx run — main `valid: true`, branch flags the real `star_bam` defect. Galaxy `lib/galaxy_test/workflow` + IWC sweeps found two false-positive classes in the first cut (Collection→data inputs map over in Galaxy; IWC `element_tests` without `class`), both fixed; review found a third (accepted-but-different job collection types). Final: 0 new errors vs main on both corpora.

Decisions taken as defaults (open questions for John):
- Warnings: `filetype` ∉ `format`, collection map-over (incl. Collection→data). Errors: `File` on collection input, unacceptable `collection_type`, output form / `collection_type`.
- Output shape checks skipped for a test whose job collections differ from declared inputs (alternative: per-test seeded resolution — follow-up).
- `--cache-dir` read-only; no fetching in validate-tests.
- Ask 3 (output `ftype`) deferred: needs datatype propagation; planemo never checks dataset `ftype`.

Gate: `make check`, `make test` green at `1cb4b41a`. Reviews: [normal](subagents/normal_review.md), [Codex](codex_review.md), [thermo](thermo_nuclear_review.md).
