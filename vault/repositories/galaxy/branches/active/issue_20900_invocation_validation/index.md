# issue_20900_invocation_validation

Status: `branches_reference` — waiting on smaller PRs to be pulled out of it (John, 2026-10-16). Base: `dev`. Implementation: BLOCKED by inherited validation regressions; requested rebase complete.

Validates workflow invocation requests before creating histories or other side effects (#20900).

[Implementation](implementation_debrief.md) · [Further split candidates](remaining_split_candidates.md) · [Rebase review](subagents/rebase_normal_review.md) · [Tracking history](tracking_history.md)

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

- [Missing invocation input 404s](../invocation_missing_input_404/index.md): pushed as `invocation_missing_input_404`; reviewed, four missing-input cases and a valid collection invocation passed.

- [Unknown scheduler rejection](../invocation_unknown_scheduler/index.md): pushed as `invocation_unknown_scheduler`; reviewed and 3 API cases passed.

All four branches start independently at dev `c63ffc2ccae`, are pushed to the fork, and are handed off under `branches_implemented_needs_ci`. The source branch was not rewritten; eventual reconciliation can drop the extracted patches once upstream contains them. These extractions do not resolve the broader branch's recorded validation regressions or conflicts.

## Polished-fix reconciliation — 2026-10-15

Published `07377e10531` on current dev `88127f42979`, incorporating all nine polished commits before replaying the larger validation work. Four polished branches unchanged. Original head preserved at `backup/issue_20900_before_polished_rebase_20261015`. Independent review passed. API: 72 passed, 4 inherited failures (mapping, cached rerun, replacement parameters); workflow/doctests: 209 distinct passed, 1 skipped; landing units: 8 passed; generator: 3 passed. Main change remains blocked for upstreaming. No further extraction or PR created.

## Four further release 26.2 extractions — 2026-10-15

John requested all four remaining candidates as standalone branches. Each starts directly at `release_26.2` commit `0c70fdd5182`, has one independent commit, is pushed and reviewed, and is queued under `branches_implemented_needs_ci`. Source branch remains `07377e10531`; its recorded blockers are unchanged.

- [invocation_object_store_validation](../invocation_object_store_validation/index.md) — Validate workflow object-store preferences.
- [invocation_completion_action_validation](../invocation_completion_action_validation/index.md) — Reject unknown completion actions.
- [invocation_tool_compatibility](../invocation_tool_compatibility/index.md) — Reject incompatible workflow tools early.
- [invocation_subworkflow_input_connections](../invocation_subworkflow_input_connections/index.md) — Reject disconnected required subworkflow inputs.

Combined focused local runs: 216 passed, 2 skipped. All applicable hooks and branch-specific review processes passed. Fresh fork CI has not been assessed; no PRs created.
