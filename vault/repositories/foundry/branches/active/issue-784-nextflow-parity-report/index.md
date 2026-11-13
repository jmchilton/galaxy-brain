---
upstream_base_branch: main
parent_branch: issue-798-nextflow-scope-decisions
related_records: foundry/issues/784
pr: 827
---
# Report Nextflow-vs-Galaxy parity at the end of a nextflow-to-galaxy run

- [Open PR](https://github.com/jmchilton/foundry/compare/issue-798-nextflow-scope-decisions...issue-784-nextflow-parity-report)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-784-nextflow-parity-report)

## Status

Reviewed and polished ([polish_debrief.md](polish_debrief.md)); rebased 2026-11-12 onto parent `issue-798-nextflow-scope-decisions` at `872b1e11` (see [rebase_debrief.md](rebase_debrief.md)), head `a702bb6e` on `~/projects/worktrees/foundry/branch/issue-784-nextflow-parity-report`, pushed to `jmchilton`.

Draft PR [#827](https://github.com/galaxyproject/foundry/pull/827), mergeable (depends on #821 → #818 → #809); Part of #784, completes the report half of #781.

CI at `a702bb6e` is red only at `validate-roadmap` (live roadmap drift, on base), which hides a relevant local red: build-cli's `run-dashboard-model.test.ts` fails because the recorded `tiny-nextflow-run` fixture lacks the new parity phase (decision needed, see [rebase_debrief.md](rebase_debrief.md)).

## Decisions

- Report only: `foundry nextflow-parity` exits 0 whenever the files join; findings live in its JSON, never in the exit code.
- #798's issue F (lift `check-scope-records` into `gxwf-foundry`) folded in here pending John's answer (open on #798's record); interface Mold rev 8 runs it. #821's description now says it lands here.
- The report diffs the pre-loop snapshot, not the extracted copy.

## Files

- [pr_description.md](pr_description.md) — Part of #784; completes #781's report half
- [pr_titles.md](pr_titles.md)
- [pr_tags.md](pr_tags.md)
- [implementation_debrief.md](implementation_debrief.md)
- [subagents/normal_review.md](subagents/normal_review.md)
- [subagents/codex_review.md](subagents/codex_review.md)
- [subagents/thermo_review.md](subagents/thermo_review.md)
- [domain_review.md](domain_review.md) — includes two drafted, unfiled gtu-ts issues
- [documentation_review.md](documentation_review.md)
- [subagents/strengthen.md](subagents/strengthen.md)
