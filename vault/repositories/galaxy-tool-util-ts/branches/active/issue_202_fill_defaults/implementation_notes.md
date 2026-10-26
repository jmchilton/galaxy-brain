# Implementation notes — optional default expansion

Current revision: `37264be13d0d` (2026-10-26). PR #207 targets `main`, with merge-base `539c16c9d425`.

## Contract

Omitted conditional selectors with declared defaults are valid request/workflow state. Galaxy must resolve those defaults when adapting state for legacy import or execution. The Galaxy fix is queued separately for `release_26.1`. This PR does not require default expansion before validation and does not claim the Galaxy fix has landed.

## Final implementation

- `gxwf fill-defaults` exposes the existing optional static-default expansion helper for native and format2 workflows, `$graph`, inline subworkflows, and embedded tools.
- `expandToolStateDefaults(..., { connectedPaths })` preserves absent connected leaves and creates repeat instances required by connections. Existing connection markers are preserved.
- Strict validation retains the base branch's semantics. `findMissingConditionalTests`, `StepStateChecks`, `completenessResult`, and all associated validator plumbing are removed from the PR.
- CLI documentation and the `optional-workflow-defaults` changeset describe explicit expansion as optional. No compatibility-validation flag is added.
- Unresolved tools, JSON-string state, and external subworkflows warn and remain unchanged. `/`-separated connection paths remain unsupported. The helper does not validate output or guarantee importability.

## Verification

- Updated contract regressions first: 10 CLI failures under the previous completeness-check implementation.
- Focused suites: 57 passing tests across CLI fastp, CLI default expansion, and schema default expansion.
- `pnpm build`, `make check`, and `make test` pass. CLI: 429 passed / 14 skipped. Schema: 5169 passed / 5 expected failures / 79 skipped. gxwf-web: 117 passed.
- Exact fastp fixture passes strict Effect and JSON Schema validation before expansion, with input files unchanged. Optional expansion supplies all six reported selectors and preserves its dataset connection and explicit paired-collection branch.
- Sparse-state acceptance also covers native workflows, subworkflows, tree validation, lint, and concrete drafts. Invalid explicit selectors still fail in both backends.
- No live Galaxy import or execution was run for this revision.

The original implementation/polish debriefs are historical. Their completeness-check recommendation was superseded by John's 2026-10-26 direction.
