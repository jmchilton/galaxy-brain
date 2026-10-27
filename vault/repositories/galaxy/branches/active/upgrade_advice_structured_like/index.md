---
upstream_base_branch: dev
---

# upgrade_advice_structured_like

Status: `branches_ready_for_final_review` — polished 2026-10-27. Base: `dev`, head `a9580538c98`.

Tool upgrade advisor: `structured_like` advice 18.01→26.0 (fixes #23884) plus 26.1/26.2 migrations and advisor bug fixes.

[PR description](pr_description.md) · [Titles](pr_titles.md) · [Tags](pr_tags.md) · [Polish](polish_debrief.md) · [Implementation](implementation_debrief.md) · [Initial](initial_implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Scope eval](scope_evaluation.md) · [Codex](codex_review.md) · [Thermo-nuclear](thermo_nuclear_review.md) · [Test challenges](test_challenges_debrief.md) · [Baseline refactor](baseline_refactor.md) · [Alt: original scope](alts/original_scope.md) · [Tracking history](tracking_history.md)

## TICK — 2026-10-12

Current fork tip `051335c00d16014676ba36536437085cde720353` conflicts with dev in `lib/galaxy/tool_util/linters/output.py`, `lib/galaxy/tool_util/xsd/galaxy.xsd`. The overlapping production behavior/schema or linter changes require a substantive reconciliation; left branch intact under the automatic small/mechanical-conflict limit. Existing workflow status and review decisions remain.


## GOOD_MORNING — 2026-10-13

Current fork head `051335c00d16014676ba36536437085cde720353` conflicts with actual dev in `lib/galaxy/tool_util/linters/output.py`, `lib/galaxy/tool_util/xsd/galaxy.xsd`. The overlapping output linter/schema changes require deliberate reconciliation; branch left intact.

## Morning refresh — 2026-10-16

Conflict preview against `origin/dev` at `051335c00d16014676ba36536437085cde720353` found overlapping changes in 2 paths (`lib/galaxy/tool_util/linters/output.py`, `lib/galaxy/tool_util/xsd/galaxy.xsd`). These include behavior/schema/assertion changes beyond a small mechanical rebase; fork and development worktree left intact. Existing status/review holds remain.
