# Rerunning an invocation with subworkflow step parameters 500s

Source: spike. Branch `jmchilton/workflow_rerun_step_parameters` (commits f4b95406098 server, ec3c52c4443 client, 1ad053b1fb3 review fixes); debrief `vault/repositories/galaxy/branches/active/workflow_rerun_step_parameters/spike_debrief.md`. Split out of `vault/agents/gx_issues/local/workflow_rerun_drops_step_parameters.md`.

## Problem
`GET /api/invocations/{id}/request` (`serialize_workflow_invocation_to_request`, services/invocations.py) emits run-time step params for a subworkflow step nested by *inner step DB id*: `{"1": {"<inner_db_id>": {"num_lines": 2}}}`. Resubmitting that (what rerun does, `parameters_normalized: true`) hits `key.split("|", 1)` in `_normalize_step_parameters` (workflow/run_request.py) -> unpack ValueError -> 500. The accepted input shape is `{"1": {"<inner order_index>|num_lines": 2}}` (what the run form submits for subworkflow runtime inputs, see `SubWorkflowModule.get_runtime_inputs`). Code had `# TODO: test subworkflows and ensure this works`.

Repro (API test, red on dev): run `WORKFLOW_NESTED_RUNTIME_PARAMETER` with `step_parameters: {"1": {"1|num_lines": 2}}`, export request -> `{'1': {'1': {'num_lines': 2}}}` != `{'1': {'1|num_lines': 2}}`; `workflow_populator.rerun()` 500s.

Same code: `except TypeError` around `int(parameter.name)` should be `ValueError`.

## Fix in spike
`WorkflowStep.step_parameters_by_index` / `step_parameters_by_id` on the model (inverse pair, recursive for nested subworkflows). Export uses the former; `_normalize_step_parameters` reuses the latter (dropped its inline split loop) and maps bad keys to 400 instead of 500 (behavior change: unknown inner index used to be silently ignored).

Tests: `test_workflow_request_subworkflow_step_parameters_rerun` (red->green), `test_workflow_request_step_parameters_rerun` (top-level baseline, already green - only nothing round-tripped before).

## Related
- Latent: `workflow_run_config_to_request` does `run_config.param_map.get(step.order_index)` for subworkflows but `param_map` keyed by `step.id`. Harmless today (sub values reach scheduling via `WorkflowRequestStepState`), can collide in small-id DBs. Maybe mention, maybe separate.
- Pairs naturally with `workflow_invocation_import_step_params` (same "step params not portable" root) - could be one PR.
- No migration needed.
