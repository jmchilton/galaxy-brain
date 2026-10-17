# Plan — #24188

## Root cause

`WorkflowProgress.set_outputs_for_input` (`lib/galaxy/workflow/run.py`) stores each labeled `parameter_input` value for `${label}` replacement with `str(output_value)`. In a subworkflow, `subworkflow_progress` passes the parent connection's value through unresolved. When that comes from an expression tool (`pick_value`), it is the `expression.json` HDA, so `str()` gives the model repr.

It also does not wait for the HDA. `subworkflow_progress` picks `is_data` from the parent output step type (`pick_value` is a tool, so data, no wait). `InputParameterModule.execute` doesn't wait either (see its TODO). Inner tool params work because `replacement_for_connection(is_data=False)` delays on a pending HDA, then `replace_expression_json_dataset` reads it. Post-job actions have no such dependency. In the repro, `__BUILD_LIST__` has no inputs, so it can schedule in the same iteration that queues `pick_value`, before the file exists.

So a plain `str(replace_expression_json_dataset(...))` in `set_outputs_for_input` is not enough. It hits `FileNotFoundError`, which delays only the input step for 60s and then fails, and the PJA step has already run.

## Fix

1. `runtime_replacements` keeps the raw value; `str()` happens when the dict is resolved.
2. Before `execute(...)` in `ToolModule.execute`, and in `PickValueModule` before `_apply_post_job_actions`, resolve the replacement dict once, then use it in the job callbacks. `effective_replacement_dict` runs inside the job callback, after jobs exist, so it must not raise a delay.
3. Resolve only the labels this step's PJAs reference, via the existing `get_informal_replacement_parameters(step)`. Steps without PJAs, or that don't reference the label, aren't delayed.
4. For an `expression.json` HDA value: if pending, raise `DelayedWorkflowEvaluation` with an HDA `SchedulingDependency`; if not ok, `FailWorkflowEvaluation` (`InvocationFailureDatasetFailed`); otherwise use `read_expression_json(hda, step)`. This mirrors `replacement_for_connection`'s non-data check, so pull that check into a shared helper rather than copying it.
5. User `replacement_params` still take precedence. Primitive values behave as before.

Rejected: making a subworkflow's parameter inputs wait and resolve to primitives in `subworkflow_progress`. That delays the whole subworkflow, changes recorded invocation inputs (HDA to parameter), and changes what parameter-input workflow outputs return to the parent.

## Tests (red → green)

- API test in `lib/galaxy_test/api/test_workflows.py`, beside `test_run_with_runtime_pja` and the `#{inner_text_input}` subworkflow rename test. Use the issue's workflow (text input → `pick_value` → subworkflow text input; `__BUILD_LIST__` with no input renamed `${Inner title} renamed`) and assert the HDCA name is `test renamed`. It should fail on the base with the repr.
- Variant: an inner `cat1` dataset output renamed with the same label (tool path vs DatabaseOperationTool path).
- Unit test for the resolve helper if it can be done cheaply with mocks (pending → delay, ok → value, primitive → passthrough).
- Run only the targeted API tests locally, one at a time.

## Unresolved

- Also cover `_handle_mapped_over_post_job_actions` (mapped-over subworkflow)? Same dict, so yes if cheap.
- Labeled param fed an `expression.json` *collection element* (DCE)? `replace_expression_json_dataset` handles DCEs; probably include.
