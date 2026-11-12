---
upstream_base_branch: main
related_records: foundry/issues/781
---
# Carry nf-core `ext.args` into the Galaxy draft as structured `_plan_state`

- [Open PR](https://github.com/galaxyproject/foundry/compare/main...jmchilton:foundry:issue-781-plan-state-resolved-args)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-781-plan-state-resolved-args)

## Status

Polishing (strengthening round done, see [subagents/strengthen.md](subagents/strengthen.md); hand-off next) at head `ef1607a8` on `~/projects/worktrees/foundry/branch/issue-781-plan-state-resolved-args`, branched from `origin/main` `df991d0d`.

No PR yet.

No CI until a PR opens; local `make -k check` at `ef1607a8` (2026-11-12) passes 501 tests, red only on `validate-roadmap` (live roadmap drift: #803, #805, #783) and `check-vendored` (machine-only).

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
