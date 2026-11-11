---
upstream_base_branch: main
related_records: foundry/issues/796
---

# Structural diff of two Format2 workflows: `diff_workflows` / `gxwf-diff` (#295)

- [Open PR](https://github.com/galaxyproject/gxformat2/compare/main...jmchilton:gxformat2:issue_295_workflow_diff?expand=1)
- [View on GitHub](https://github.com/jmchilton/gxformat2/tree/issue_295_workflow_diff)
- [PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md)

## Status

Polishing at `e5439cf` on the `jmchilton` fork (base `origin/main` `83b59e7`), after normal, Codex and thermo-nuclear reviews; strengthening round pending.

No PR yet.

Fork CI at `e5439cf`: Java, TypeScript and docs green; Python CI red only on the 3.13 job (pytest collects the cloned IWC's `scripts/tests`, needing `planemo`, plus a `schema_rules.yml` FileNotFoundError), likely from IWC `1b00b8bc` landing after main's last green but unconfirmed; 3.11/3.12 passed on `cbe75dc`, others cancelled.

## Notes

- Issue: [gxformat2#295](https://github.com/galaxyproject/gxformat2/issues/295), record [issues/wip/295](../../../issues/wip/295/index.md). Consumer: foundry#796 / #784 ([stack plan](../../../../foundry/issues/queued/784/stack_plan.md)).
- Worktree: `~/projects/worktrees/gxformat2/branch/issue_295_workflow_diff`.
- Owns the shared fixtures (`format2/diff/`) and `expectations/diff.yml`; the galaxy-tool-util-ts `gxwf diff` port syncs them, so this lands first.
- [Implementation debrief](implementation_debrief.md) holds the contract decisions the TS port must mirror.
- Local gate: AGENTS.md lint list plus tox `lintdocstrings` (`flake8-docstrings`) and `make lint-docs`.
