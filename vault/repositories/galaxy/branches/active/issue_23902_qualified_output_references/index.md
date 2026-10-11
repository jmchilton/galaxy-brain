# issue_23902_qualified_output_references

Status: `branches_implemented`. Base: `dev`.

From 26.2, unqualified `format_source`/`metadata_source` fail tool load; runtime skips legacy aliases (fixes #23902).

[Implementation](implementation_debrief.md) · [Tracking history](tracking_history.md)

Stacked on [issue_23891_output_reference_resolver](../issue_23891_output_reference_resolver/index.md); open after it in the same 26.2 release. Upgrade advice depends on [upgrade_advice_structured_like](../upgrade_advice_structured_like/index.md).

## TICK — 2026-10-11

Live fork head `435099bdf8cc8dd33f61017bf8f69e2922810fd7`: unit, tool/workflow framework, API, Python lint and Integration checks pass and exercise the reference-loading/runtime change. Browser/startup/harness reds are client-cache misses before tests; packages fail importing removed `social_core.exceptions.AuthMissingParameter`, diagnosed base dependency drift. These unrelated reds do not leave its only coverage unexecuted. Promoted on green relevant backend coverage; parent #23891 and upgrade-advice dependencies remain.
