# Multiple workflow parameter values are normalized only when submitted through a run request

Agent-to-agent draft. Found 2026-10-07 during review of `issue_21015_multiple_text_param` (fixes #21015; stacked on #23939, now merged to dev). That branch leaves the gap open on purpose because it's shared with integers.

## Symptom

A `parameter_input` step with `multiple: true` produces different output shapes depending on where its value comes from:

- **Run request** (`run_request.build_workflow_run_configs`): normalized via `input_param.to_python(...)`, so `5` becomes `[5]`. On dev this applies to `IntegerToolParameter` only; the 21015 branch widens it to every multiple `TextToolParameter` (text, integer, float).
- **Step default** (`InputParameterModule.get_input_value` → `step.get_input_default_value`): reads `tool_inputs["default"]` raw. A gxformat2 `[int]` input with `default: 5` outputs `5`.
- **Subworkflow input from a parent connection** (`progress.inputs_by_step_id`): passed through raw. A parent scalar connected to a child multiple param outputs a scalar.

`InputParameterModule.execute` (`lib/galaxy/workflow/modules.py`, ~line 1783) calls `input_param.validate(input_value, trans)`, which accepts both shapes, and then does `step_outputs = dict(output=input_value)` with the raw value.

## Evidence

This is from reading the code on `origin/dev` `8f0e4d1116e`; it has not been reproduced end to end yet.
- `run_request.py:404`: `if isinstance(input_param, IntegerToolParameter) and input_param.multiple: normalized_inputs[key] = input_param.to_python(input_dict, trans.app)`. The comment says "Store the validated values, not the submitted ones."
- `execute` does no equivalent normalization.
- `recover_mapping` also outputs the raw `get_input_value`.

## Suggested fix

In `InputParameterModule.execute`, after validation, for non-dataset values, replace `input_value` with `input_param.to_python(input_value, trans.app)` when `input_param` is a multiple `TextToolParameter` subclass. This is the same predicate as `run_request`.
- After that, consider dropping the `run_request` special case, or keep it so stored invocation inputs stay normalized.
- Check `recover_mapping` for consistency. It re-reads the same value, so it may need the same treatment, or a persisted normalized output may be enough.
- Watch out for `NO_REPLACEMENT` / `None` optional values, and the expression.json dataset case that is already skipped.

## Tests

Red first:
- A framework workflow test (`lib/galaxy_test/workflow/`) or an API test, with a `[int]` input whose `default: 5` feeds an expression or `param_value_from_file`-style tool. Assert the output parameter value is `[5]`.
- A subworkflow variant: the parent passes scalar `5` to the child's `[int]` input.
- After 21015 lands, add a `[string]` case: `default: "ex2"` → `["ex2"]`.

## Ordering

The integer part can be fixed on dev now. The text/float part depends on the `issue_21015_multiple_text_param` branch (it widens `to_python` multiple handling to text and float). Either fix after it merges, or write the predicate as `isinstance(input_param, TextToolParameter) and input_param.multiple` once it's in.
