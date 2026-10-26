---
upstream_base_branch: main
---
# UDT authoring note: flat collection outputs, vendoring recipes, `inputs.x` shape (#672)

- [Open PR](https://github.com/galaxyproject/foundry/compare/main...issue-672-udt-authoring-note) (draft [#710](https://github.com/galaxyproject/foundry/pull/710) already open)
- [View on GitHub](https://github.com/galaxyproject/foundry/tree/issue-672-udt-authoring-note)

## Status

Branch `issue-672-udt-authoring-note` on `origin` (galaxyproject), rebased 2026-10-26 onto `origin/main` `f48c01b6`; worktree `~/projects/worktrees/foundry/branch/issue-672-udt-authoring-note`.

Draft PR #710; its live body predates the 2026-10-26 collection-input commit. Updated text: [pr_description.md](pr_description.md).

Head `21431450`, ready for final review. Local `make check` green except `check-vendored` (stale local clones) and `validate-roadmap` (GitHub state: #672 not linked as a native sub-issue of #501).

## Decisions

- §5 keeps the flat collection-output shape (Galaxy 26.1/dev). gxwf 1.14.0 rejects it; fix is gtu-ts #198 (merged 2026-10-25, unreleased). Needs a gxwf release + pin bump, not a note change.
- Collection-input shapes documented from runtimeify (code-read, Galaxy dev `87d295c9`); legacy `to_cwl` shape differs and is named as such.

Polished 2026-10-26: [pr_description.md](pr_description.md), [pr_titles.md](pr_titles.md), [pr_tags.md](pr_tags.md), [polish_debrief.md](polish_debrief.md), [implementation_debrief.md](implementation_debrief.md), [codex_review.md](codex_review.md), [normal review](subagents/normal_review.md).

Issue notes: [#672](../../../issues/wip/672/index.md).
