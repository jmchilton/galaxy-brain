---
upstream_base_branch: main
pr: 296
blocking: galaxy-tool-util-ts/branches/issue_232_workflow_diff
related_records:
  - foundry/issues/796
  - galaxy-tool-util-ts/branches/issue_232_workflow_diff
---

# Structural diff of two Format2 workflows: `diff_workflows` / `gxwf-diff` (#295)

- [Open PR](https://github.com/galaxyproject/gxformat2/compare/main...jmchilton:gxformat2:issue_295_workflow_diff?expand=1)
- [View on GitHub](https://github.com/jmchilton/gxformat2/tree/issue_295_workflow_diff)
- [PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [polish debrief](polish_debrief.md)

## Status

Polished at `4440404` on the `jmchilton` fork (base `origin/main` `83b59e7`), after normal, Codex and thermo-nuclear reviews and the [strengthening round](subagents/strengthen.md).

Draft PR [#296](https://github.com/galaxyproject/gxformat2/pull/296), opened 2026-11-11 at John's request (stacked parity work; TS port PR to follow).

Fork CI at `4440404`: Java, TypeScript, docs and Python 3.10/3.11/3.12/3.14 green; 3.13 red is unrelated, from IWC merge #1541 adding a `scripts/tests` that pytest collects from the `iwc/` clone ([verdict](subagents/strengthen.md#ci-verdict)); 3.15 cancelled by it.

## Notes

- Issue: [gxformat2#295](https://github.com/galaxyproject/gxformat2/issues/295), record [issues/wip/295](../../../issues/wip/295/index.md). Consumer: foundry#796 / #784 ([stack plan](../../../../foundry/issues/queued/784/stack_plan.md)).
- Worktree: `~/projects/worktrees/gxformat2/branch/issue_295_workflow_diff`.
- Owns the shared fixtures (`format2/diff/`) and `expectations/diff.yml`; the galaxy-tool-util-ts `gxwf diff` port syncs them, so this lands first.
- [Implementation debrief](implementation_debrief.md) holds the contract decisions the TS port must mirror.
- Local gate: AGENTS.md lint list plus tox `lintdocstrings` (`flake8-docstrings`) and `make lint-docs`.
