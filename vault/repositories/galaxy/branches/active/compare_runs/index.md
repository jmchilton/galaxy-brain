---
upstream_base_branch: dev
---

# Compare runs of a workflow step, workflow outputs, or a tool

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:compare_runs?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/compare_runs)

## Status

Polished, ready for final review at `9bd004da99e`: [description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md), [checklist](pr_checklist.md), [polish debrief](polish_debrief.md); open decisions in [design questions](design_questions.md).

No PR.

Fork CI green on `be7415d94dd`; queued on `9bd004da99e`.

## Decisions

- Plan: [compare_runs project](../../../../../projects/compare_runs/plan.md); targets `dev` (new API + UI, no migration).
- Not stacked on #24173: mode 1 row links emit #24173's `?step_label=` query, ignored until it lands.
- John asked for at least three harden iterations, expanded scope and polish; design questions collected for the morning.
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/compare_runs` (behind: polished on chickenstraws at `~/projects/worktrees/galaxy/branch/compare_runs`, which also holds the PR screenshots).
- Client presentation: [slide doc](presentation/slides.md) and [published deck](https://claude.ai/artifact/PLBbWy4DqURbomwhT7cxw6); capture harness and debriefs in `presentation/`.
- Alt: `compare_runs_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)). Backups `compare_runs_pre_*` on `jmchilton` can be deleted once John is happy.
