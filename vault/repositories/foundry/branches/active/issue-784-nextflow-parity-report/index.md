---
upstream_base_branch: main
parent_branch: issue-798-nextflow-scope-decisions
related_records: foundry/issues/784
---
# Report Nextflow-vs-Galaxy parity at the end of a nextflow-to-galaxy run

- [Open PR](https://github.com/jmchilton/foundry/compare/issue-798-nextflow-scope-decisions...issue-784-nextflow-parity-report)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-784-nextflow-parity-report)

## Status

Implemented and through normal, Codex and thermo reviews (fixes in `9530080f`, `d63d5b66`, `c111bb97`) at head `c111bb97` on `~/projects/worktrees/foundry/branch/issue-784-nextflow-parity-report`, branched from parent `jmchilton/issue-798-nextflow-scope-decisions` at `4ff48eda`; pushed to `jmchilton`. Polish not yet run.

No PR yet.

CI runs only on PRs. Local `make -k check` at `c111bb97` (2026-11-12) is red only on `validate-roadmap` (rate limit) and `check-vendored` (fails on this machine only), with 503 root tests and 149 gxwf-foundry tests passing; format, lint, typecheck and packages-typecheck clean.

## Decisions

- Report only: `foundry nextflow-parity` exits 0 whenever the files join; findings live in its JSON, never in the exit code.
- #798's issue F (lift `check-scope-records` into `gxwf-foundry`) folded in here pending John's answer (open on #798's record); interface Mold rev 8 runs it.
- The report diffs the pre-loop snapshot, not the extracted copy.

## Files

- [implementation_debrief.md](implementation_debrief.md)
- [subagents/normal_review.md](subagents/normal_review.md)
- [subagents/codex_review.md](subagents/codex_review.md)
- [subagents/thermo_review.md](subagents/thermo_review.md)
