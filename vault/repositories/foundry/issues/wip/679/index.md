# foundry#679 — test-plan `evidence` / `family` gaps

Issue: https://github.com/galaxyproject/foundry/issues/679 (scottcain, AI-posted, `needs-triage`)
Branch: `issue-679-test-plan-evidence` on `origin`, worktree `~/projects/worktrees/foundry/branch/issue-679`, commit `5692fa87` on `f264e588`.
PR draft: [pr_description.md](pr_description.md)

## Triage (2026-10-21)

All three claims verified on `origin/main` @ `f264e588`:

- `AssertionIntent.evidence` enum was `test-evidence | intent`; the
  `nextflow-test-to-galaxy-test-plan` Mold said "prefer `evidence: test-evidence`".
- `family` was a free string documented as assertion family/compare operator; `element_count`,
  `ftype`, `checksum` are tests-format output fields beside `asserts:`. `implement-galaxy-workflow-test`
  gave no plan-field → tests-format mapping at all.
- `element_identifier` had no nested-address notation.

Foundry is the right fix site: the test-plan schema's source of truth is
`packages/gxwf-foundry/src/schemas/galaxy-workflow-test-plan/*.schema.json` (TS generated from it).
The vendored tests-format schema needs no change.

## Fix choices

- `fixture-derived` added at the assertion level only; plan/case `derived_from` unchanged (they describe
  the case basis, which is still upstream fixtures).
- Widened the `family` description (Scott's cheaper option), not a `kind` discriminator.
  `collection_type` excluded (lives in `collection_shape`); `element_tests` excluded (implied by
  `element_identifier`).
- Nested ids: `/`-joined, outermost first.
- CWL Mold unchanged: CWL tests carry real expected outputs, so `test-evidence` stays accurate.

## Verification

- Red→green: new `fixture-derived` acceptance test failed before the schema edit; 11/11 pass after. gxwf-foundry 97/97.
- `make check` parts: validate, check-generated, check-casts, check-verify, check-assemble-pipelines,
  check-fixtures, test all green. `check-vendored` red on unrelated files vs local upstream checkouts
  (env). `summarize-nextflow` integration test timed out at 5s (untouched package, env).

## Related

- #675 (nested sub-collection arity): tests-format now accepts nested `count`/`min`/`max`
  (`.changeset/gxwf-1-14-nested-count.md`), so #675 may already be fixed — check next.
- #576 changes the same schema.

## Codex review (2026-10-21)

One P1, confirmed and fixed in the amended commit `5692fa87`: the Mold said snapshot-only nf-tests yield no
`test-evidence`, but `nextflow-snapshot-to-galaxy-assertions` translates `.snap` md5 tokens into
`checksum` — an upstream expected value. The rule now keeps md5→checksum as `test-evidence`;
captures that record only names or paths are `fixture-derived`/`intent`, and a case with no
`test-evidence` warns `no-upstream-expected-outputs`.
