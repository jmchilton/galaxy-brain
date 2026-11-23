---
upstream_base_branch: dev
---
# tool_help_relative_images

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:tool_help_relative_images?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tool_help_relative_images)

## Status

Status: `branches_ready_for_final_review` (polished 2026-11-23; then CSP on `shed_tool_static` per John). Base `dev`, head `2388de41294`. Alt: `tool_help_relative_images_alt_original_scope`. Backup of pre-refactor head: `tool_help_relative_images_r3_backup`. Worktree: `~/projects/worktrees/galaxy/branch/tool_help_relative_images`.

No PR yet. [Description](pr_description.md) · [Titles](pr_titles.md) · [Tags](pr_tags.md) · [Checklist](pr_checklist.md) · [Polish debrief](polish_debrief.md).

Fork CI restarted on `2388de41294`; E2E passes locally on Playwright and Selenium.

Tool help images referenced by relative paths (e.g. `static/images/foo.png`) work for Markdown and RST help and for every tool, shed or local, via `/api/tools/{tool_id}/help_image`. Context: #18722 added Markdown help without images; galaxy-iuc/standards#95.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Research](brain_research.md) · Reviews: [subagents/](subagents/) · [Test challenges](test_challenges_debrief.md) · [Performance](performance_challenges_debrief.md) · [Codex](codex_review.md) · [Thermo-nuclear](thermo_nuclear_review.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Baseline refactor](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · [Screenshots](screenshot_debrief.md) · Alt: [original scope](alts/original_scope.md) · Earlier rounds: [earlier_drafts/1/](earlier_drafts/1/), [earlier_drafts/2/](earlier_drafts/2/)

## Decisions

- Base `dev`: new API route + help syntax.
- Plain relative image paths, rewritten client-side to `help_image`; query params for path/version.
- Re-scope: installed shed RST also uses `help_image`; SVG served under a sandboxing CSP (reversible; the alt refuses SVG).
- John (2026-11-14): do X1 (strip `$PATH_TO_IMAGES/` for non-shed RST) and X2 (icon lookup passes the user); login-only images/icons not a concern, icon caching unchanged.
- Open for John: split icon fixes (incl. X2) into their own PR? `${static_path}/images/X` legacy targets: fixing via tools-iuc PRs #9030–#9033.
