---
upstream_base_branch: main
parent_branch: issue-781-plan-state-resolved-args
related_records: foundry/issues/796
child_branches: issue-798-nextflow-scope-decisions
pr: 818
---
# Fail a green test run that lost steps without a drop label

- [Open PR](https://github.com/jmchilton/foundry/compare/issue-781-plan-state-resolved-args...issue-796-test-phase-removed-steps)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-796-test-phase-removed-steps)

## Status

Implemented, reviewed and strengthened at head `b74c6bdd` on `~/projects/worktrees/foundry/branch/issue-796-test-phase-removed-steps`, restacked onto parent `issue-781-plan-state-resolved-args` at `7d001a3d` (draft PR #809); polished (see [polish_debrief.md](polish_debrief.md)).

Draft PR [#818](https://github.com/galaxyproject/foundry/pull/818), opened 2026-11-12 at John's request (depends on #809); it stays draft until a `@galaxy-tool-util/cli` release carries `gxwf diff` with the nested + relabel fix (gtu-ts #233 at `a5c6cd57`) and Foundry's pin is bumped to it; publishing `@galaxy-foundry/gxwf-foundry` with `check-step-removals` follows merge.

CI runs only on PRs; local `make -k check` at `e5ba105e` (2026-11-12) is red only on `validate-roadmap` (GitHub rate limit) and `check-vendored` (machine-only), 501 + 122 package tests pass; at `b74c6bdd` root `npm run typecheck` and `packages-typecheck` are clean.

## Polish

- [pr_description.md](pr_description.md)
- [pr_titles.md](pr_titles.md)
- [pr_tags.md](pr_tags.md)

## Decisions

- Two snapshots, not one: the gate diffs the first extract against the final workflow; the pre-loop draft keeps `_plan_*` for #784. Why: see [implementation_debrief.md](implementation_debrief.md).

## Files

- [implementation_debrief.md](implementation_debrief.md)
- [subagents/normal_review.md](subagents/normal_review.md)
- [codex_review.md](codex_review.md)
- [thermo_nuclear_review.md](thermo_nuclear_review.md)
- [domain_review.md](domain_review.md)
- [documentation_review.md](documentation_review.md)
- [subagents/upstream_fix_followup.md](subagents/upstream_fix_followup.md)
- [subagents/strengthen.md](subagents/strengthen.md)
- [upstream_issue_diff_inline_subworkflows.md](upstream_issue_diff_inline_subworkflows.md) (superseded, fixed upstream)
- [upstream_issue_diff_list_form_relabel.md](upstream_issue_diff_list_form_relabel.md) (superseded, fixed upstream)
- [foundry_issue_debug_scenario_fixtures.md](foundry_issue_debug_scenario_fixtures.md) (draft)
