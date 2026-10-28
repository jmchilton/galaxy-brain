---
upstream_base_branch: main
---
# debug-galaxy-workflow-output: workflow import rejection surface

- [Open PR](https://github.com/galaxyproject/foundry/compare/main...issue-726-import-rejection-surface)
- [View on GitHub](https://github.com/galaxyproject/foundry/tree/issue-726-import-rejection-surface)

## Status

Branch on `origin` from `origin/main` at `f48c01b6`, head `eec35c4b`; worktree `~/projects/worktrees/foundry/branch/issue-726-import-rejection-surface`. Refs [#726](../../../issues/wip/726/index.md).

No PR yet. Polished; waiting on John's final review.

Local `make -k check`: all green except `check-vendored` (machine-only) and `validate-roadmap` (#672 roadmap/substep label vs `content/roadmap` — live GitHub state, untouched by this branch). No CI until a PR opens.

CI on `bea1d69c` (2026-10-28): unrelated only — `Packages / test` roadmap validation, GitHub-issue-dependent, green on main; rerun failed jobs.

## Supporting files

- [Implementation debrief](implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Codex review](codex_review.md) · [Polish debrief](polish_debrief.md) · [PR description](pr_description.md) · [Titles](pr_titles.md) · [Tags](pr_tags.md)

## Red evidence

Content-only change, so no automated red test. The red is the ncbi/egapx `/test-pipeline nextflow-to-galaxy` run (phase 12/13, local `casts/claude/_emulated-runs/ncbi-egapx/` in the egapx worktree), where the Mold offered no surface and phase 13 improvised evidence location and bisection.
