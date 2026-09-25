# Issue 534 scenario results — 2026-09-16

Worktree: `/Users/jxc755/projects/worktrees/foundry/branch/issue-534`  
Branch: `issue-534-concrete-nextflow-scenarios`  
Commit: `2ba1f4a6` (clean worktree; commit hooks passed).  
Base: latest `origin/main`, `715cd2c3f3d997bfe54c091f477590c400e1ecb8` (fetched at start and reconfirmed before commit).

Replaced every abstract input in [issue 534](https://github.com/galaxyproject/foundry/issues/534)
with a manifest-pinned corpus path or committed package fixture. Built the full
workspace from locked dependencies and materialized all 26 exact fixture pins.
Fixed three defects exposed by exercising the scenarios: explicit DSL1 extraction,
quoted comments hiding nf-tests, and container evidence missing without a warning.
Updated the companion eval, regenerated the cast/navigation, and refreshed both
regression summaries through the built CLI, with the Mold revision documenting
why the old baselines changed.

All 21 scenarios were exercised: 18 deterministic scenario contracts pass through
45 automated checks; two downstream scenarios pass manual evaluation; standalone
row authoring is partial because of the consumer input-contract mismatch. Manual
runs were performed by Codex following the committed casts, without a Pi worker.
Generated UDT/test-plan artifacts were validated with built CLI tooling. The UDT
is a PAF-only adaptation; no Nextflow pipeline or generated Galaxy job was run.

| Scenario | Result | Evidence |
| --- | --- | --- |
| tier-tagged fixtures validate | Pass | Built CLI output at all seven named nf-core pins validates. |
| missing source.workflow rejected | Pass | One required-field diagnostic; CLI exits 3, empty stdout, and preserves absent/existing --out. |
| DSL1 tree short-circuits | Pass | Explicit DSL1 emits a valid envelope and empty process/tool/workflow arrays. |
| process inventory vs grep ground truth | Pass | All 26 pins satisfy the 80% declaration threshold within the chosen pipeline root. |
| process discovery across layouts | Pass | Six exact committed layout rows; all ten ad-hoc corpus pins have inventories. |
| CalliNGS-NF multi-process-per-file | Pass | Exactly 11 rows from root modules.nf. |
| pipeline-root auto-detect | Pass | MOP2 keeps . with explicit shared-root warning; egapx selects nf with workflow-block warning. |
| non-main entrypoint detection | Pass | What_the_Phage selects phage.nf. |
| bacass alias sweep | Pass | Exact MINIMAP2 and FASTQC alias sets on canonical definitions. |
| egapx commented duplicate and subworkflow aliases | Pass | Live take/emit/call/alias evidence preserved; commented duplicate excluded. |
| bacass nf-core module metadata and tests | Pass | Metadata and test-block inventories match files; FastQC comment-induced loss fixed. |
| bacass subworkflow tests | Pass | Test-block inventories and compact snapshot paths preserved. |
| container directive coverage | Pass | Unrepresented containers and unreadable Conda directives warn; non-null tool FKs resolve. |
| nf-test enumeration matches filesystem | Pass | Two blocks in one package file; nine bacass cases retain snapshot captures. |
| test-fixture localization round-trip | Pass | Two committed remote-response inputs localized twice with stable on-disk SHA-1 hashes. |
| ad-hoc DSL2 fallback | Pass | Declared IO and script evidence preserved without invented metadata. |
| bacass downstream binding | Manual pass with recorded gaps | Produced data-flow brief/ledger and all 34 tool decisions. Exact partial graph wiring remains open. |
| bacass single process row standalone | Partial | Row-only PAF UDT validates; the cast's whole-summary input validator rejects the row with exit 3 / 26 diagnostics. |
| nf-test to Galaxy test-plan translation | Manual pass | Schema-valid nine-case plan explicitly records all 36 capture dispositions; no invented content expectations. |
| bacass regression pin | Pass | Normalized equality against deliberately regenerated current-tooling baseline. |
| demo regression pin | Pass | Independent normalized equality against deliberately regenerated baseline. |

## Validation and limits

- Final deterministic scenario run: **45 passed, zero skipped**.
- Full summarize-nextflow suite: **158 passed, one failed**. The pre-existing
  remote `test_liftoff` integration test exceeded its 120-second subprocess
  timeout twice. Its reference FASTA is 47,488,493 bytes; the committed-response
  localization scenario passes independently. No existing test assertion or timeout was weakened.
- Other package suites: note schema 51, planemo CLI metadata 3, planemo report
  schema 5, foundry CLI 46, Pi harness 31 (two opt-in skips), build CLI 66 passed.
- Full workspace tooling build and 420-page site build passed.
- Final content validation: zero errors, 50 advisory warnings. Changed TypeScript
  files pass ESLint and package typechecking; git diff whitespace checks pass.
- `make check` passed content/roadmap/generated/pin checks, then failed vendored
  drift against local Galaxy and galaxy-tool-util checkouts. Those unrelated
  files were not refreshed. Remaining cast, cast-verification, assembly, fixture and root-test gates passed
  separately; the root suite finished with **387 passed**.

## Retained artifacts

- [Data-flow brief](issue-534-run/nextflow-galaxy-data-flow.md) and
  [carried requirements](issue-534-run/open-requirements.ledger.yml).
- [All 34 tool decisions](issue-534-run/tool-decisions.json).
- [Standalone process input](issue-534-run/minimap2-process.json),
  [generated UDT](issue-534-run/galaxy-user-tool.yml),
  [UDT validation](issue-534-run/udt-validation.json), and
  [critic pass](issue-534-run/critic.md).
- [Galaxy test plan](issue-534-run/galaxy-test-plan.yml) and
  [validation](issue-534-run/test-plan-validation.log).
- [Feedback ledger](issue-534-run/foundry-feedback.ledger.yml) records the
  whole-summary/single-row mismatch and cross-statement channel extraction.
- [Final scenario log](issue-534-run/issue-534-final-scenarios.log),
  [full workspace test log](issue-534-run/issue-534-workspace-tests.log),
  [other package log](issue-534-run/issue-534-other-package-tests.log),
  [full gate log](issue-534-run/issue-534-check.log), and
  [remaining gates log](issue-534-run/issue-534-remaining-gates.log).

Reproduce deterministic scenarios from the worktree:

```sh
pnpm install --frozen-lockfile
pnpm packages-build
make fixtures-nextflow
FOUNDRY_REQUIRE_NEXTFLOW_FIXTURES=1 pnpm --filter @galaxy-foundry/summarize-nextflow exec vitest run test/scenarios.test.ts test/corpus-scenarios.test.ts
```
