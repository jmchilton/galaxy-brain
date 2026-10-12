# yaml_boolean_defaults

Status: `branches_implemented`.

Honors explicit YAML Boolean defaults with user-tool API contract coverage (#23888).

[Implementation](implementation_debrief.md) · [Tracking history](tracking_history.md)

## TICK — 2026-10-12

Current fork tip `01027324b35b860fd2136d1baf442a882c3a80f6` conflicts with dev in `lib/galaxy/tool_util/parameters/convert.py`, `lib/galaxy/tool_util/parser/interface.py`, `lib/galaxy/tool_util/parser/util.py`, `lib/galaxy/tools/__init__.py`, `lib/galaxy_test/base/populators.py`. The overlapping production behavior/schema or linter changes require a substantive reconciliation; left branch intact under the automatic small/mechanical-conflict limit. Existing workflow status and review decisions remain.
