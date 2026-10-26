# Implementation notes — optional default expansion

Current revision: `37264be13d0d` (2026-10-26). PR #207 targets `main`, with merge-base `539c16c9d425`.

## Contract

Omitted conditional selectors with declared defaults are valid request/workflow state. Galaxy resolves those defaults during import using the generic selector initialization in [PR #24272](https://github.com/galaxyproject/galaxy/pull/24272), merged into `release_26.1` on October 20. The [follow-up investigation](galaxy_import_followup.md) confirms the exact fastp crash returns when that fix is removed. This PR does not require default expansion before validation.

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
- A subsequent live API import matrix passed all 13 cases on `release_26.1` at `5a5850702d0`. Removing only #24272's five-line fix produced eight HTTP 500 failures, including fastp's `eval_dups` error. Fastp execution was not tested.

The original implementation/polish debriefs are historical. Their completeness-check recommendation was superseded by John's 2026-10-26 direction.
