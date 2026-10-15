# issue_20900_invocation_validation

Status: `branches_implemented_needs_ci`. Base: `dev`.

Validates workflow invocation requests before creating histories or other side effects (#20900).

[Implementation](implementation_debrief.md) · [Tracking history](tracking_history.md)

## TICK — 2026-10-11

Current-SHA fork workflow framework reports many request-500 failures, and both browser engines reject the nested-collection extraction request (400, list:paired supplied to list). Integration rejects dataset supplied to collection input. These exercise the changed validation; do not label them unrelated or promote.

## TICK — 2026-10-12

Current fork tip `9b18c329c8f28d2063113f249438dc47e43254cf` conflicts with dev in `lib/galaxy/workflow/run_request.py`, `lib/galaxy_test/api/test_workflows.py`. The overlapping production behavior/schema or linter changes require a substantive reconciliation; left branch intact under the automatic small/mechanical-conflict limit. Existing workflow status and review decisions remain.

## GOOD_MORNING — 2026-10-13

Current fork head `9b18c329c8f28d2063113f249438dc47e43254cf` conflicts with `origin/dev` in 3 paths. Overlapping behavior, schema or assertion changes require deliberate reconciliation beyond the standing mechanical/small-conflict authorization. Branch left intact. `lib/galaxy/tools/parameters/basic.py` · `lib/galaxy/workflow/run_request.py` · `lib/galaxy_test/api/test_workflows.py`
