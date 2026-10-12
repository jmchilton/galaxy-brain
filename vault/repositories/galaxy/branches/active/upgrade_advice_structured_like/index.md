# upgrade_advice_structured_like

Status: `branches_implemented`. Base: `dev`.

Moves `structured_like` qualification upgrade advice from 18.01 to a new 26.0 migration (fixes #23884).

[Implementation](implementation_debrief.md) · [Tracking history](tracking_history.md)

## TICK — 2026-10-12

Current fork tip `051335c00d16014676ba36536437085cde720353` conflicts with dev in `lib/galaxy/tool_util/linters/output.py`, `lib/galaxy/tool_util/xsd/galaxy.xsd`. The overlapping production behavior/schema or linter changes require a substantive reconciliation; left branch intact under the automatic small/mechanical-conflict limit. Existing workflow status and review decisions remain.
