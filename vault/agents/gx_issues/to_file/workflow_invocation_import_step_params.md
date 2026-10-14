# Request export of an imported invocation 500s (step parameters keyed by stale step ids)

Source: spike. Not in the original issue. Branch `jmchilton/workflow_rerun_step_parameters` (commits f4b95406098 server, ec3c52c4443 client, 1ad053b1fb3 review fixes); debrief `vault/repositories/galaxy/branches/active/workflow_rerun_step_parameters/spike_debrief.md`. Split out of `vault/agents/gx_issues/local/workflow_rerun_drops_step_parameters.md`.

## Problem
Run-time step params are persisted as `WorkflowRequestInputParameter(type="step", name=str(step.id), value=json)` - name is a raw DB step id, no FK. Invocation store export serializes them verbatim; import (`model/store/__init__.py`, ~L1214) copies `name` verbatim. The imported workflow has new step ids, so `GET /api/invocations/{imported}/request` does `steps_by_id[step_id]` -> `KeyError` -> 500 (or silently the wrong step if ids collide). Nested subworkflow values are keyed by inner DB ids too. Contrast `WorkflowRequestStepState` (FK, serialized with `order_index`, remapped by `attach_workflow_step`).

Repro (API test, red on dev): run `WORKFLOW_RUNTIME_PARAMETER_SIMPLE` with step params, `download_invocation_to_store` -> `create_invocation_from_store` -> `invocation_to_request` -> 500 `KeyError: 6`. Existing `test_export_reimport_reexport_invocation_with_subworkflow` doesn't catch it (no step params).

## Fix in spike (no DB migration)
- Serialization (`WorkflowRequestInputParameter._serialize`): for step params also emit `order_index` + index-keyed `step_parameters` (same shape as request export).
- Import: if `order_index` present, re-key `name` to the new step id and value via `step.step_parameters_by_id`.
- Stores exported before the fix have no old->new id map: export now skips unknown step ids with a warning instead of 500.
- Test: `test_workflow_request_step_parameters_after_invocation_import` parametrized top-level + nested subworkflow (red->green).

Store-format addition, not schema change. Migration considered and rejected: an FK column would duplicate `WorkflowRequestStepState`; backfill means rewriting nested DB ids inside JSON of terminal invocations.

## Related
Depends on model helpers from `workflow_subworkflow_step_params_rerun`; could be the same PR.
