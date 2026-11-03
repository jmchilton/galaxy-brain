# Component - Workflow Invocation Request and Step Parameters

Document how a `POST /api/workflows/{id}/invocations` payload becomes a recorded invocation request and how its step parameters reach tool state, then how `GET /api/invocations/{id}/request` turns the record back into a payload.

Cover:

- **Payload to run config.** `build_workflow_run_configs` in `lib/galaxy/workflow/run_request.py`: `_normalize_step_parameters` (legacy, tool-id, step-id/uuid and `parameters_normalized` forms; the unknown-index 400), `expand_workflow_inputs` and batch expansion of step parameters, `replacement_params` / `replacement_dict`, `resource_params`, and the vestigial `step_parameters` payload key.
- **Applying parameters.** `populate_module_and_state`, `module_injector.compute_runtime_state` and `ToolModule.compute_runtime_state` / `WorkflowModule.compute_runtime_state` in `lib/galaxy/workflow/modules.py`: how `visit_input_values` walks the current state with `|`-prefixed names, why keys for inactive conditional cases, missing repeat instances or unknown names are silently ignored, how `__`-prefixed keys (runtime PJAs, step meta) are handled, and where value coercion and `step_errors` come from.
- **Subworkflows.** How a subworkflow step's dict is keyed (`<inner index>|name`, nested `i|j|name`), `WorkflowStep.step_parameters_by_index` / `step_parameters_by_id`, and how `param_map` reaches the sub-invocation and is re-applied there.
- **Recording.** `workflow_run_config_to_request`: which rows (`WorkflowRequestInputStepParameter`, `WorkflowRequestInputParameter` types `step`/`meta`/`replacements`/`resource`, `WorkflowRequestStepState`) store what, and how the scheduler re-reads them on later iterations.
- **Export and import.** `WorkflowInvocationsService.as_request` / `serialize_workflow_invocation_to_request`, `recover_inputs`, `WorkflowRequestInputParameter.resolve_step_parameters`, and how step rows travel through model-store `_serialize` and invocation import.
- **Tests.** Where step-parameter invoke, subworkflow, request-export and import behaviour is covered (`lib/galaxy_test/api/test_workflows.py`, `test/unit/workflows/`).

Leave out ORM table definitions and serialization views already in [[Component - Workflow Invocation Models]], scheduling iterations (pending `workflow_scheduling_iterations.md`), and the client run form.

## Why

`workflow_step_parameter_overrides` adds a nested `step_parameter_overrides` invoke field that translates into the internal step parameter map, records it with the request and carries it through `/request` and import/export. No note traces this path. [[Component - Workflow API]] lists the payload fields only, [[Component - Workflow Invocation Models]] covers the tables, and [[Component - CWL Workflow State]] traces `populate_module_and_state` only for CWL steps with empty state. The facts the branch relies on are scattered across project specs and four branch debriefs (#24175–#24178).

## Requested by

- vault/repositories/galaxy/branches/active/workflow_step_parameter_overrides/brain_research.md: needed the payload-to-tool-state path for step parameters, strict-key hooks, subworkflow nesting, and request recording/export.
