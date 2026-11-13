---
upstream_base_branch: main
parent_branch: issue-796-test-phase-removed-steps
child_branches: issue-784-nextflow-parity-report
related_records: foundry/issues/798
pr: 821
---
# Record Nextflow scope decisions and excluded branches in the ledger

- [Open PR](https://github.com/jmchilton/foundry/compare/issue-796-test-phase-removed-steps...issue-798-nextflow-scope-decisions)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-798-nextflow-scope-decisions)

## Status

Polished (see [polish_debrief.md](polish_debrief.md)); rebased 2026-11-12 onto parent `issue-796-test-phase-removed-steps` at `a40ff6ae` (see [rebase_debrief.md](rebase_debrief.md)), head `872b1e11` on `~/projects/worktrees/foundry/branch/issue-798-nextflow-scope-decisions`.

Draft PR [#821](https://github.com/galaxyproject/foundry/pull/821), mergeable (depends on #818 → #809); Part of #798.

CI at `872b1e11` is red only at `validate-roadmap` (live roadmap drift, on base), and the local gate is otherwise clean apart from machine-only `check-vendored` and an rnaseq integration-test timeout flake.

## Open questions for John

From [domain_review.md](domain_review.md):

- The deterministic scope-record eval property has no oracle. Lift `check-scope-records` into `gxwf-foundry` now, or fold it into #784?
- Stay draft until the summarizer fixes (issues A and B) land, or accept name-only candidate citations meanwhile?
- Move the fallback ranking into summarize-nextflow, or keep it in the Mold?
- File drafted issues A–F?

From [subagents/strengthen.md](subagents/strengthen.md):

- Confirm `Part of #798` rather than `Closes`: proposal 1 (summary path report) isn't met, there's no scope parameter, and no end-to-end run.
- Commit a trimmed sarek summary so the citation test runs in CI?
- An end-to-end sarek run before undrafting?

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
- [subagents/strengthen.md](subagents/strengthen.md)
- [codex_review.md](codex_review.md)
- [thermo_nuclear_review.md](thermo_nuclear_review.md)
- [domain_review.md](domain_review.md)
- [documentation_review.md](documentation_review.md)
