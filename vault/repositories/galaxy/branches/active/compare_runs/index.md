---
upstream_base_branch: dev
---

# Compare runs of a workflow step, workflow outputs, or a tool

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:compare_runs?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/compare_runs)

## Status

READY: implemented and hardened ×3 at `be7415d94dd`; open decisions in [design questions](design_questions.md), summary in [implementation debrief](implementation_debrief.md).

No PR.

No CI run yet (fork CI not checked).

## Decisions

- Plan: [compare_runs project](../../../../../projects/compare_runs/plan.md); targets `dev` (new API + UI, no migration).
- Not stacked on #24173: mode 1 row links emit #24173's `?step_label=` query, ignored until it lands.
- John asked for at least three harden iterations, expanded scope and polish; design questions collected for the morning.
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/compare_runs`
- Alt: `compare_runs_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)). Backups `compare_runs_pre_*` on `jmchilton` can be deleted once John is happy.
