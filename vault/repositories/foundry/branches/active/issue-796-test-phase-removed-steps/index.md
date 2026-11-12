---
upstream_base_branch: main
parent_branch: issue-781-plan-state-resolved-args
related_records: foundry/issues/796
---
# Fail a green test run that lost steps without a drop label

- [Open PR](https://github.com/jmchilton/foundry/compare/issue-781-plan-state-resolved-args...issue-796-test-phase-removed-steps)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-796-test-phase-removed-steps)

## Status

Implemented, normal review fixes at head `ccf4a817` on `~/projects/worktrees/foundry/branch/issue-796-test-phase-removed-steps`, branched from parent `issue-781-plan-state-resolved-args` at `ef1607a8` (draft PR #809); normal review done ([subagents/normal_review.md](subagents/normal_review.md)); harden and polish not yet run.

No PR yet; it must stay draft until `gxwf diff` ships in a `@galaxy-tool-util/cli` release (gtu-ts #233) with a Foundry pin bump, and `@galaxy-foundry/gxwf-foundry` publishes `check-step-removals`.

CI runs only on PRs; local `make -k check` at `ccf4a817` (2026-11-12) is red only on `validate-roadmap` (live roadmap state) and `check-vendored` (machine-only).

## Decisions

- Two snapshots, not one: the gate diffs the first extract against the final workflow; the pre-loop draft keeps `_plan_*` for #784. Why: see [implementation_debrief.md](implementation_debrief.md).

## Files

- [implementation_debrief.md](implementation_debrief.md)
