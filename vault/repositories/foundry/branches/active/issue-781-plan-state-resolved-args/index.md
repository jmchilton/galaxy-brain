---
upstream_base_branch: main
related_records: foundry/issues/781
---
# Carry nf-core `ext.args` into the Galaxy draft as structured `_plan_state`

- [Open PR](https://github.com/galaxyproject/foundry/compare/main...jmchilton:foundry:issue-781-plan-state-resolved-args)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-781-plan-state-resolved-args)

## Status

Implemented and hardened (normal, Codex, thermo reviews), selector ranking moved into `summarize-nextflow`, then per John (2026-11-12) `effective_args` keyed by Nextflow call path (`call`) with qualified selectors matched along real call chains, and a selected profile beating root at equal rank; head `9727baa6` on `~/projects/worktrees/foundry/branch/issue-781-plan-state-resolved-args`, branched from `origin/main` at `df991d0d`.

No PR yet.

No CI (runs only on PRs). Local `make check` green apart from `validate-roadmap` (pre-existing live-state roadmap drift: #803, #805, #783) and `check-vendored` (machine-only).

## Stack

Parent of the #796 branch (stack #781 → #796 → #798 → #784, see [stack_plan.md](../../../issues/queued/784/stack_plan.md)). Design notes for the children are in [implementation_debrief.md](implementation_debrief.md).

## Files

- [implementation_debrief.md](implementation_debrief.md)
- [codex_review.md](codex_review.md)
- [thermo_nuclear_review.md](thermo_nuclear_review.md)
- [subagents/normal_review_resolver.md](subagents/normal_review_resolver.md)
- [codex_review_resolver.md](codex_review_resolver.md)
