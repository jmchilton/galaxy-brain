---
upstream_base_branch: main
related_records: foundry/issues/781
child_branches: issue-796-test-phase-removed-steps
pr: 809
---
# Carry nf-core `ext.args` into the Galaxy draft as structured `_plan_state`

- [Open PR](https://github.com/galaxyproject/foundry/compare/main...jmchilton:foundry:issue-781-plan-state-resolved-args)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-781-plan-state-resolved-args)

## Status

Polished (see [polish_debrief.md](polish_debrief.md)) at head `ef1607a8` on `~/projects/worktrees/foundry/branch/issue-781-plan-state-resolved-args`, branched from `origin/main` `df991d0d`.

Draft PR [#809](https://github.com/galaxyproject/foundry/pull/809), opened 2026-11-12 at John's request; base of the parity stack (#781 → #796 → #798 → #784).

CI at `ef1607a8` (2026-11-12): `test` red only at `validate-roadmap` (live roadmap drift on #803/#805/#783, same red on main's Packages run); the job stops there, so CI's later test steps did not run. Local `make -k check` at `ef1607a8` (2026-11-12) passes 501 tests, red only on `validate-roadmap` (live roadmap drift: #803, #805, #783) and `check-vendored` (machine-only).

## Stack

Parent of the #796 branch (stack #781 → #796 → #798 → #784, see [stack_plan.md](../../../issues/queued/784/stack_plan.md)). Design notes for the children are in [implementation_debrief.md](implementation_debrief.md).

## Files

- [pr_description.md](pr_description.md)
- [pr_titles.md](pr_titles.md)
- [pr_tags.md](pr_tags.md)
- [implementation_debrief.md](implementation_debrief.md)
- [codex_review.md](codex_review.md)
- [thermo_nuclear_review.md](thermo_nuclear_review.md)
- [subagents/normal_review_resolver.md](subagents/normal_review_resolver.md)
- [codex_review_resolver.md](codex_review_resolver.md)
- [subagents/normal_review_callctx.md](subagents/normal_review_callctx.md)
- [codex_review_callctx.md](codex_review_callctx.md)
- [thermo_nuclear_review_resolver.md](thermo_nuclear_review_resolver.md)
- [domain_review.md](domain_review.md)
- [documentation_review.md](documentation_review.md)
- [subagents/strengthen.md](subagents/strengthen.md)
