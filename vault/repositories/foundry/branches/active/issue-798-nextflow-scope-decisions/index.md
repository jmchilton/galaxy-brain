---
upstream_base_branch: main
parent_branch: issue-796-test-phase-removed-steps
related_records: foundry/issues/798
---
# Record Nextflow scope decisions and excluded branches in the ledger

- [Open PR](https://github.com/jmchilton/foundry/compare/issue-796-test-phase-removed-steps...issue-798-nextflow-scope-decisions)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-798-nextflow-scope-decisions)

## Status

Implemented at head `06913c8a` on `~/projects/worktrees/foundry/branch/issue-798-nextflow-scope-decisions`, branched from parent `issue-796-test-phase-removed-steps` at `b74c6bdd` (draft PR #818); reviews, harden and polish not yet run.

No PR yet.

CI runs only on PRs. Local `make -k check` at `06913c8a` (2026-11-12) is red only on `validate-roadmap` (rate limit) and `check-vendored` (fails on this machine only), with 503 tests passing. Typecheck, packages-typecheck, format and lint are clean.

## Decisions

- Scope records are marked positively: the decision carries `scope`, each excluded branch's `kind: dropped` entry carries `scope_branch`; neither sets top-level `step` or `source_arg`. Shape in [implementation_debrief.md](implementation_debrief.md).
- The direct pipeline stays autonomous; interactive scope selection is left to `nextflow-to-workflow-brief` / #500.

## Files

- [implementation_debrief.md](implementation_debrief.md)
