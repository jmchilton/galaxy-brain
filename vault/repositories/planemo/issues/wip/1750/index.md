# planemo#1750 — Fill undeclared workflow replacement parameters with a loud sentinel and warn

[Issue](https://github.com/galaxyproject/planemo/issues/1750)

Root cause confirmed: `planemo/galaxy/activity.py` invokes workflows without `replacement_params`, so Galaxy leaves `${name}` literal in PJA arguments.

Addressed by branch [`workflow-informal-params-sentinel`](../../../branches/active/workflow-informal-params-sentinel/index.md).

Open question from issue (tool-state `${X}` run-time warning) left lint-only.
