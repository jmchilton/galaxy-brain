# licenses

Status: `branches_implemented_needs_ci`. Base: `dev`.

Adds `<license_agreement>` tool requirements that users must accept before running the tool.

[Tracking history](tracking_history.md)

## TICK — 2026-10-11

The only current-head run found is successful Build docs. It does not exercise the license requirement behavior; retain needs CI.

## TICK — 2026-10-12

Current fork tip `b9f942426176973aa35591080ea5c47809ea1ad0` conflicts with dev in `client/src/components/Tool/ToolForm.test.ts`, `client/src/components/Tool/ToolForm.vue`, `client/src/components/Workflow/Run/WorkflowRun.test.js`, `client/src/components/Workflow/Run/WorkflowRunForm.vue`, `doc/source/dev/index.rst`, `lib/galaxy/managers/users.py`, `lib/galaxy/tool_util_models/_models.py`, `lib/galaxy/tools/execute.py`, `test/unit/tool_util/test_tool_linters.py`. The overlapping production behavior/schema or linter changes require a substantive reconciliation; left branch intact under the automatic small/mechanical-conflict limit. Existing workflow status and review decisions remain.

## GOOD_MORNING — 2026-10-13

Current fork head `b9f942426176973aa35591080ea5c47809ea1ad0` conflicts with `origin/dev` in 9 paths. Overlapping behavior, schema or assertion changes require deliberate reconciliation beyond the standing mechanical/small-conflict authorization. Branch left intact. `client/src/components/Tool/ToolForm.test.ts` · `client/src/components/Tool/ToolForm.vue` · `client/src/components/Workflow/Run/WorkflowRun.test.js` · `client/src/components/Workflow/Run/WorkflowRunForm.vue` · `doc/source/dev/index.rst` · `lib/galaxy/managers/users.py` · `lib/galaxy/tool_util_models/_models.py` · `lib/galaxy/tools/execute.py` · `test/unit/tool_util/test_tool_linters.py`
