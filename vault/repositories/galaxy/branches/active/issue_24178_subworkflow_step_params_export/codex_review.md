# Codex review debrief

Codex reviewed `88127f42979...b03ec938bc6` with a read-only sandbox and structured findings, and found 1 issue, P2 with "certain" confidence. I confirmed it with a red API test and fixed it in `118dfeb6d94`. Nothing was left unaddressed.

## Acted on

- **The `parameter_input` "must specify an 'input' value" check was skipped for steps inside a subworkflow.** It is at `lib/galaxy/workflow/run_request.py` `_normalize_step_parameters`.
  - **Confirmed.** `test_run_with_invalid_legacy_parameter_input_in_subworkflow` sends `{"0": {"0|parameter_value": 100}}` to a subworkflow that wraps an optional integer input. It got a 200 before the fix; with the fix it gets the 400 it got on dev.
  - The normal review had judged this narrowing immaterial. Codex reproduced a concrete acceptance, which is the same top-level validation from d8c6b0c76fa silently regressing.
  - **Fix.** The check now lives in a new `_validate_normalized_step_parameters(step, param_dict)`. It recurses through subworkflow param dicts nested by inner step id, after `step_parameters_by_id`.
  - **No change to `WorkflowStep.step_parameters_by_index` / `step_parameters_by_id`.** Their signatures and semantics are unchanged.

## Not acted on

- Nothing.

<details><summary>Full Codex output</summary>

Coverage: model/__init__.py, services/invocations.py, workflow/run_request.py, workflow/modules.py, schema/workflows.py, model/store/__init__.py, test_workflows.py, workflow_fixtures.py, populators.py, test_run_parameters.py, workflow_support.py. Codex did not run the API tests because its environment was read-only. It reproduced the regression by calling normalization directly.

> **P2 api-contract, run_request.py:187: Preserve parameter-input validation inside subworkflows.** Replacing recursive `_normalize_step_parameters` with `step_parameters_by_id` bypasses the `parameter_input` validation for every inner step. The helper only rekeys dictionaries, so inner parameter dictionaries missing `input` are now accepted. Runtime state computation ignores unknown fields, potentially using the input's default instead of rejecting the request.
>
> Failure: a subworkflow at index 0 contains an unconnected parameter_input at index 0 with default 5. Submit `parameters_normalized=true` and `parameters={"0":{"0|value":2}}`. Previously normalization returned a 400 because `input` was missing. It now accepts the dictionary, and runtime computation ignores `value` and uses default 5.

</details>
