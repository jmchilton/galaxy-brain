---
upstream_base_branch: main
parent_branch: issue-781-plan-state-resolved-args
related_records: foundry/issues/796
---
# Fail a green test run that lost steps without a drop label

- [Open PR](https://github.com/jmchilton/foundry/compare/issue-781-plan-state-resolved-args...issue-796-test-phase-removed-steps)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-796-test-phase-removed-steps)

## Status

Implemented, reviewed and strengthened at head `e5ba105e` on `~/projects/worktrees/foundry/branch/issue-796-test-phase-removed-steps`, branched from parent `issue-781-plan-state-resolved-args` at `ef1607a8` (draft PR #809); polishing: strengthening round done (drops now need a non-empty `because`), hand-off pending.

No PR yet; it must stay draft until a `@galaxy-tool-util/cli` release carries `gxwf diff` with the nested + relabel fix (gtu-ts #233 at `a5c6cd57`) and Foundry's pin is bumped to it; publishing `@galaxy-foundry/gxwf-foundry` with `check-step-removals` follows merge.

CI runs only on PRs; local `make -k check` at `e5ba105e` (2026-11-12) is red only on `validate-roadmap` (GitHub rate limit) and `check-vendored` (machine-only), 501 + 122 package tests pass.

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
