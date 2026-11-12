---
upstream_base_branch: main
parent_branch: issue-796-test-phase-removed-steps
related_records: foundry/issues/798
---
# Record Nextflow scope decisions and excluded branches in the ledger

- [Open PR](https://github.com/jmchilton/foundry/compare/issue-796-test-phase-removed-steps...issue-798-nextflow-scope-decisions)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-798-nextflow-scope-decisions)

## Status

Polishing at head `5feb4633` on `~/projects/worktrees/foundry/branch/issue-798-nextflow-scope-decisions` (parent `issue-796-test-phase-removed-steps` at `b74c6bdd`, draft PR #818): description, titles and tags written, strengthening round next.

No PR yet.

CI runs only on PRs. Local `make -k check` at `5feb4633` (2026-11-12) is red only on `validate-roadmap` (rate limit) and `check-vendored` (fails on this machine only), with 503 tests passing. Typecheck and packages-typecheck are clean.

## Open questions for John

From [domain_review.md](domain_review.md):

- The deterministic scope-record eval property has no oracle. Lift `check-scope-records` into `gxwf-foundry` now, or fold it into #784?
- Stay draft until the summarizer fixes (issues A and B) land, or accept name-only candidate citations meanwhile?
- Move the fallback ranking into summarize-nextflow, or keep it in the Mold?
- File drafted issues A–F?

## Decisions

- Scope records are marked positively: the decision carries `scope`, each excluded branch's `kind: dropped` entry carries `scope_branch`; neither sets top-level `step` or `source_arg`. Shape in [implementation_debrief.md](implementation_debrief.md).
- The direct pipeline stays autonomous; interactive scope selection is left to the `nextflow-to-workflow-brief` pipeline / #500.
- On `needs-scope-choice` the interface picks the candidate changing fewest branch controls (tiebreak: canonical file, then first listed), `confidence: low`; the brief names it and the test Molds follow it.
- The sarek citation test keeps skipping in CI, like `itIfSarekFixture`; running it needs sarek fetched before root tests.

## Files

- [pr_description.md](pr_description.md)
- [pr_titles.md](pr_titles.md)
- [pr_tags.md](pr_tags.md)
- [implementation_debrief.md](implementation_debrief.md)
- [subagents/normal_review.md](subagents/normal_review.md)
- [codex_review.md](codex_review.md)
- [thermo_nuclear_review.md](thermo_nuclear_review.md)
- [domain_review.md](domain_review.md)
- [documentation_review.md](documentation_review.md)
