---
upstream_base_branch: dev
---

# upgrade_advice_structured_like

Status: `branches_implemented`. Base: `dev`.

Moves `structured_like` qualification upgrade advice from 18.01 to a new 26.0 migration (fixes #23884).

[Implementation](implementation_debrief.md) · [Tracking history](tracking_history.md)

## TICK — 2026-10-12

Current fork tip `051335c00d16014676ba36536437085cde720353` conflicts with dev in `lib/galaxy/tool_util/linters/output.py`, `lib/galaxy/tool_util/xsd/galaxy.xsd`. The overlapping production behavior/schema or linter changes require a substantive reconciliation; left branch intact under the automatic small/mechanical-conflict limit. Existing workflow status and review decisions remain.


## GOOD_MORNING — 2026-10-13

Current fork head `051335c00d16014676ba36536437085cde720353` conflicts with actual dev in `lib/galaxy/tool_util/linters/output.py`, `lib/galaxy/tool_util/xsd/galaxy.xsd`. The overlapping output linter/schema changes require deliberate reconciliation; branch left intact.

## Morning refresh — 2026-10-16

Conflict preview against `origin/dev` at `051335c00d16014676ba36536437085cde720353` found overlapping changes in 2 paths (`lib/galaxy/tool_util/linters/output.py`, `lib/galaxy/tool_util/xsd/galaxy.xsd`). These include behavior/schema/assertion changes beyond a small mechanical rebase; fork and development worktree left intact. Existing status/review holds remain.
