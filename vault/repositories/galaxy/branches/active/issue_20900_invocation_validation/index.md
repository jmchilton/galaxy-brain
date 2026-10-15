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

## Bug-fix extractions — 2026-10-14

John requested four independent dev-based fixes before the larger validation branch. The original implementation branch remains intact.

- [Honor no_add_to_history false](../invocation_no_add_to_history_false/index.md): pushed as `invocation_no_add_to_history_false`; reviewed and 3 API regressions passed.

- [Expected parameter failures](../invocation_parameter_expected_failure/index.md): pushed as `invocation_parameter_expected_failure`; reviewed and 194 workflow unit tests passed (1 skipped).

Missing-input 404s and unknown-scheduler rejection are being extracted separately. These extractions do not resolve the broader branch's recorded validation regressions or conflicts.
