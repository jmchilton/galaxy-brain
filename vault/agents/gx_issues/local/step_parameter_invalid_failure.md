# Invalid tool-step parameter at scheduling fails the invocation with a raw, unstructured message

If a value supplied before the run (e.g. column 9 for a 3-column file) turns out invalid once the step's real input exists, the invocation fails with a generic "unexpected failure" carrying the raw tool-parameter error — not which step, which parameter, or what would have been valid.

| | Today | Proposed |
| --- | --- | --- |
| Reason | `unexpected_failure` | `step_parameter_invalid` |
| Message | `Failed to create 1 job(s) for workflow step 3: ...` | **Step 3 (Cut columns):** value `9` for **Column** is not valid for the input dataset; valid options: 1, 2, 3. |
| Machine-readable | details string | `workflow_step_id`, parameter name + label, rejected value, valid options (when enumerable) |

Input-parameter steps already get a structured `workflow_parameter_invalid`; tool-step parameters don't.

<details><summary>Path (code read, unverified)</summary>

`ToolModule.execute` defers the step until upstream data is ready; job creation runs `populate_state` / `check_param` against the real dataset and records a `ParameterValueError` in `execution_tracker.execution_errors`. Unless the error is a not-ok dataset, it raises a bare `MessageException("Failed to create N job(s) for workflow step K: ...")`, which `workflow/run.py` turns into `InvocationUnexpectedFailure(details=str(e))`.

</details>

## Context

Pairs with `dynamic_select_run_form_dead_end.md` and `dynamic_select_editor_explain_and_expose.md`: once a select's value is typed or exposed up front, this is how "validated against the data" surfaces to the runner. Note `ColumnListParameter` deliberately accepts any column for an empty file (pinned by `test_empty_file_data_column_specified`) — keep that.

## Proposed Approach

When the execution error is a parameter validation error, raise `FailWorkflowEvaluation` with a new `InvocationFailureStepParameterInvalid` next to `InvocationFailureWorkflowParameterInvalid`, and render it in the invocation messages component. Schema change → OpenAPI/client regeneration, so a separate PR.

## Alternative Approaches

Minimal version: keep `unexpected_failure` but compose a readable details string (step, parameter label, valid options). Cheaper, no schema change, but not machine-readable and can't drive a "fix and rerun" affordance later.
