# A multiple workflow parameter outputs `5` or `[5]` depending on where the value came from

A `parameter_input` step with `multiple: true` only normalizes its value to a list when the value arrives in the run request; a default or a subworkflow connection passes through as a bare scalar, so a `when` expression written against the list silently skips the step or fails the invocation.

```yaml
class: GalaxyWorkflow
inputs:
  columns:
    type: [integer]
    default: 5
steps:
  cut:
    tool_id: cat1   # any tool
    in:
      columns: columns
    when: $(inputs.columns.length == 1)   # or $(inputs.columns.includes(5))
```

Same step, same value, on current `dev` (02a2e659909):

| How `columns` gets `5` | Step output / recorded input | `inputs.columns.length == 1` | `inputs.columns.includes(5)` |
| --- | --- | --- | --- |
| Run request: `inputs: {columns: 5}` | `[5]` ✅ | `true`, step runs ✅ | `true`, step runs ✅ |
| Nothing submitted, `default: 5` used | `5` ❌ | `false`, step skipped ❌ | JS error, invocation fails 💥 |
| Inside a subworkflow, parent connects scalar `5` | `5` ❌ | `false`, step skipped ❌ | JS error, invocation fails 💥 |

✅ expected · ❌ wrong shape or silently wrong result · 💥 invocation fails (`expression_evaluation_failed`)

The `when` columns come from evaluating each expression with Galaxy's `do_eval` against the step output the module produced (the same value `evaluate_value_from_expressions` passes in), not from a full server run. The same shape split shows up in the invocation's recorded inputs (`5` vs `[5]`) for API clients and workflow tests. Validation accepts both shapes, so nothing flags it. No tool input we checked breaks on `5`, since a scalar works as a one-item multiple `data_column` selection; the visible damage is in `when` expressions and anything reading the recorded value.

<details><summary>Module-level reproduction</summary>

Drops into `test/unit/workflows/` (needs `node` for `do_eval`) and drives `InputParameterModule.execute` through a real `WorkflowProgress`. The run-request row applies the same `validate` + `to_python` call that `build_workflow_run_configs` makes.

```python
from galaxy import model
from galaxy.tools.expressions import do_eval
from galaxy.tools.parameters.workflow_utils import workflow_building_modes
from galaxy.workflow import modules
from galaxy.workflow.run import WorkflowProgress
from .workflow_support import MockTrans, yaml_to_model

WF = """
steps:
  - type: "parameter_input"
    label: "columns"
    tool_inputs: {"parameter_type": "integer", "optional": false, "multiple": true, "default": 5}
"""

def run(inputs_by_step_id_fn):
    trans = MockTrans()
    trans.workflow_building_mode = workflow_building_modes.DISABLED
    workflow = yaml_to_model(WF)
    step = workflow.steps[0]
    step.module = module = modules.module_factory.from_workflow_step(trans, step)
    step.state, _ = module.compute_runtime_state(trans, step, {})
    param = module.get_runtime_inputs(module)["input"]
    invocation = model.WorkflowInvocation()
    invocation.workflow = workflow
    progress = WorkflowProgress(invocation, inputs_by_step_id_fn(step, param, trans), None, {})
    inv_step = model.WorkflowInvocationStep()
    inv_step.workflow_step, inv_step.workflow_invocation = step, invocation
    module.execute(trans, progress, inv_step)
    return progress.outputs[step.id]["output"], invocation.input_step_parameters[0].parameter_value

def run_request(step, param, trans):
    param.validate(5, trans=trans)
    return {step.id: param.to_python(5, trans.app)}  # as in run_request.py

def when(expr, value):
    try:
        return do_eval(expr, {"columns": value})
    except Exception as e:
        return type(e).__name__

def test_repro():
    for fn in (run_request, lambda s, p, t: {}, lambda s, p, t: {s.id: 5}):
        output, recorded = run(fn)
        print(output, recorded,
              when("$(inputs.columns.length == 1)", output),
              when("$(inputs.columns.includes(5))", output))
    # [5] [5] True True
    # 5 5 False WorkflowException
    # 5 5 False WorkflowException
```

</details>

<details><summary>Where the shapes diverge</summary>

- `build_workflow_run_configs` (`lib/galaxy/workflow/run_request.py`) normalizes submitted values: `if isinstance(input_param, IntegerToolParameter) and input_param.multiple: normalized_inputs[key] = input_param.to_python(input_dict, trans.app)`.
- `InputParameterModule.get_input_value` (`lib/galaxy/workflow/modules.py`) reads `step.get_input_default_value(...)` raw when nothing was submitted, and `progress.inputs_by_step_id` raw when a parent workflow supplied it.
- `InputParameterModule.execute` (same file) calls `input_param.validate(input_value, trans)`, which accepts both shapes, then emits `dict(output=input_value)` unchanged. `recover_mapping` re-reads the same raw value.
- `evaluate_value_from_expressions` (same file) hands that output to the `when` expression via `to_cwl`, which passes ints and lists through as is.

</details>

## Context

A follow-up to 🔀 #23939 (multiple integer parameters through subworkflows and editor defaults), which builds on 🔀 #23802 (the "Allow multiple values" toggle for integer parameters). Related to 🎯 #21015: 🌿 [`issue_21015_multiple_text_param`](https://github.com/jmchilton/galaxy/tree/issue_21015_multiple_text_param) widens the run-request normalization from integers to every multiple text, integer and float parameter, so the same gap then applies to `[string]` and `[float]` inputs.

## Proposed Approach

Normalize in `InputParameterModule.execute`: after validation, for non-dataset values, replace `input_value` with `input_param.to_python(input_value, trans.app)` when the parameter is multiple, using the same predicate as `run_request.py`. `execute` is the one place every source (submitted, default, parent connection) passes through, so it closes all three rows at once.

<details><summary>Approach details</summary>

- Keep the `run_request.py` normalization so recorded invocation inputs stay lists for submitted values; with the `execute` change it becomes belt-and-braces rather than the only guard.
- Apply the same normalization in `recover_mapping`, or the value re-read on a resumed invocation reverts to the raw shape.
- Leave `NO_REPLACEMENT` / `None` (optional, unset) alone, and keep skipping the expression.json dataset case that `execute` already skips.
- Tests, red first: a unit test like the reproduction above asserting `[5]` for the default and subworkflow rows, and a framework workflow test (`lib/galaxy_test/workflow/`) with a `[integer]` input `default: 5` feeding a step with `when: $(inputs.columns.length == 1)`, asserting the step runs. Once the 21015 branch lands, a `[string]` variant (`default: "ex2"` → `["ex2"]`).

</details>

## Alternative Approaches

The values could instead be normalized where they originate, or the default could be stored as a list at save time. Both leave at least one path uncovered or need edits in several places; normalizing once at `execute` matches what the run request already does and covers every source.

<details><summary>Alternatives In Detail</summary>

### Alternative: Normalize at each source

<details><summary>Description</summary>

#### Details

Wrap the default in `get_input_value` and the parent replacement in `WorkflowProgress.subworkflow_progress`, leaving `execute` as is.

#### Why the proposed approach is preferred

Two (or more) call sites to keep in sync instead of one, and `subworkflow_progress` is generic over input types, so it would need parameter-specific knowledge it doesn't have today.

</details>

### Alternative: Store list defaults at save time

<details><summary>Description</summary>

#### Details

Have the editor and gxformat2 import coerce `default: 5` to `[5]` when `multiple` is on.

#### Why the proposed approach is preferred

Doesn't fix workflows already saved with scalar defaults, and doesn't touch the subworkflow-connection row at all.

</details>

</details>
