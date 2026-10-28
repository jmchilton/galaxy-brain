---
upstream_base_branch: main
---
# run-workflow-test: UDT external_galaxy recipe and data-table deferral

- [Open PR](https://github.com/galaxyproject/foundry/compare/main...issue-730-udt-run-recipe)
- [View on GitHub](https://github.com/galaxyproject/foundry/tree/issue-730-udt-run-recipe)

## Hardening

Thermo-nuclear review skipped: docs/Mold-only change, no implementation code. Normal review in `subagents/normal_review.md`, Codex in `codex_review.md`.

## Status

Branched from `origin/main` at `f48c01b6`; worktree `~/projects/worktrees/foundry/branch/issue-730-udt-run-recipe`. Refs [#730](../../../issues/wip/730/index.md).

No PR yet. Polished: [PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md), [polish debrief](polish_debrief.md).

Local gate: all green except `validate-roadmap` (live GitHub roadmap drift on #672/#501) and `check-vendored` (local Galaxy checkout drift on collection-semantics), both outside the branch.

CI on `9fea5a6c` (2026-10-28): unrelated only — `Packages / test` roadmap validation, GitHub-issue-dependent, green on main; rerun failed jobs.
