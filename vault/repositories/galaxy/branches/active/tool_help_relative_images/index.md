---
upstream_base_branch: dev
---
# tool_help_relative_images

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:tool_help_relative_images?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tool_help_relative_images)

## Status

Status: `branches_need_decision`. BLOCKED on a scope decision: re-scoped once, hardened twice; second scope evaluation suggests X1/X2. Base `dev`, head `d0798eda166`. Alt: `tool_help_relative_images_alt_original_scope`. Worktree: `~/projects/worktrees/galaxy/branch/tool_help_relative_images`.

No PR yet. CI not yet seen; Selenium tests never run.

Tool help images referenced by relative paths (e.g. `static/images/foo.png`) work for Markdown and RST help and for every tool, shed or local, via `/api/tools/{tool_id}/help_image`. Context: #18722 added Markdown help without images; galaxy-iuc/standards#95.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Research](brain_research.md) · Reviews: [subagents/](subagents/) · [Test challenges](test_challenges_debrief.md) · [Performance](performance_challenges_debrief.md) · [Codex](codex_review.md) · [Thermo-nuclear](thermo_nuclear_review.md) · [Baseline refactor](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · Alt: [original scope](alts/original_scope.md) · Round 1 hardening: [earlier_drafts/1/](earlier_drafts/1/)

## Decisions

- Base `dev`: new API route + help syntax.
- Plain relative image paths, rewritten client-side to `help_image`; query params for path/version.
- Re-scope: installed shed RST also uses `help_image`; SVG served under a sandboxing CSP (reversible; the alt refuses SVG).
- Open for John: X1 (`$PATH_TO_IMAGES` for non-shed RST), X2 (icon `user=`), ship as-is, or the alt. Also: split icon fixes into their own PR?
