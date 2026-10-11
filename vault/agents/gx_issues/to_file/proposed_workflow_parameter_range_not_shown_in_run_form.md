# Workflow numeric input bounds are enforced but missing from the run form

An integer or float workflow input with bounds set in the editor retains its server-side range validator, but the numeric field generated for the run form receives neither bound, leaving its range slider and out-of-range warning unavailable.

For an input configured with minimum **1** and maximum **5**:

| Input | Server validation | Bounds sent to the run form | Form behavior implied by those bounds |
| --- | --- | --- | --- |
| Integer, value `7` | Rejects `7` | `min: null`, `max: null` | No slider; no range warning |
| Float, value `7.0` | Rejects `7.0` | `min: null`, `max: null` | No slider; no range warning |
| Multiple integer, value `[1, 7]` | Rejects `7` | `min: null`, `max: null` | Each row lacks the slider and warning |

The validation and serialized bounds above were reproduced at module level on `dev` [`c8708636c2f`](https://github.com/galaxyproject/galaxy/commit/c8708636c2f29a233dcce4b9c1fa75f2c5aea24f). The UI consequences follow from `FormNumber.vue`; this reproduction does not run a browser or submit an invocation.

For manual verification, create an integer workflow input, set its minimum to 1 and maximum to 5, save the workflow, and open its run form. Expected: the same slider and range warning that bounded numeric tool inputs provide. Behavior implied by the generated field: an ordinary number box with no range information; entering 7 receives no warning or correction on field change, although the server-side parameter validator rejects it. A single bound should still produce the warning; it does not need a slider.

<details><summary>Reproduction: validation works, but the serialized bounds are null</summary>

Save this as `test/unit/workflows/test_parameter_range_repro.py` and run `PYTHONPATH=lib python -m pytest test/unit/workflows/test_parameter_range_repro.py -q` with Galaxy's unit-test environment. All three cases fail at the final assertion, after confirming that the parameter validator rejects the out-of-range value.

```python
import pytest

from galaxy import model
from galaxy.tools.parameters.workflow_utils import workflow_building_modes
from galaxy.workflow import modules
from .workflow_support import MockTrans


@pytest.mark.parametrize("parameter_type,multiple,value", [
    ("integer", False, 7),
    ("float", False, 7.0),
    ("integer", True, [1, 7]),
])
def test_range_reaches_run_form(parameter_type, multiple, value):
    trans = MockTrans()
    trans.workflow_building_mode = workflow_building_modes.DISABLED
    step = model.WorkflowStep()
    step.type = "parameter_input"
    step.label = "Count"
    step.tool_inputs = {
        "parameter_type": parameter_type,
        "optional": False,
        "multiple": multiple,
        "validators": [{"type": "in_range", "min": 1, "max": 5}],
    }
    module = modules.module_factory.from_workflow_step(trans, step)
    parameter = module.get_runtime_inputs(step)["input"]
    with pytest.raises(ValueError, match="must fulfill"):
        parameter.validate(value, trans)
    field = parameter.to_dict(trans)
    assert (field["min"], field["max"]) == (1, 5)
```

Actual: `(None, None)` for every case. The float validator's message uses `1.0 <= value <= 5.0`; the integer cases use `1 <= value <= 5`.

</details>

<details><summary>Where the bounds are lost</summary>

- [`InputParameterModule._parse_state_into_dict`](https://github.com/galaxyproject/galaxy/blob/c8708636c2f29a233dcce4b9c1fa75f2c5aea24f/lib/galaxy/workflow/modules.py) stores the editor's bounds as an `in_range` validator. `step_state_to_tool_state` restores them to the editor's minimum and maximum fields.
- `get_runtime_inputs` forwards `validators`, but never sets the numeric parameter's `min` or `max`. `IntegerToolParameter` and `FloatToolParameter` therefore serialize both attributes as null.
- [`WorkflowsManager._workflow_to_dict_run`](https://github.com/galaxyproject/galaxy/blob/c8708636c2f29a233dcce4b9c1fa75f2c5aea24f/lib/galaxy/managers/workflows.py) builds the run-form input using `get_runtime_inputs` and `to_dict`, the same calls used in the reproduction.
- [`FormNumber.vue`](https://github.com/galaxyproject/galaxy/blob/c8708636c2f29a233dcce4b9c1fa75f2c5aea24f/client/src/components/Form/Elements/FormNumber.vue) needs two numeric bounds with `max > min` to show its slider. Its warning and correction on field change support either bound independently, but neither works with null bounds. [`FormNumberList.vue`](https://github.com/galaxyproject/galaxy/blob/c8708636c2f29a233dcce4b9c1fa75f2c5aea24f/client/src/components/Form/Elements/FormNumberList.vue) already forwards bounds to each row.

The editor's separate **Default Value** field is also built without these bounds by `get_default_parameter`. That is a related follow-up; the reproduction above covers the runtime field.

</details>

## Context

Bug discovered while recording screenshots for 🌿 [`issue_21015_multiple_text_param`](https://github.com/jmchilton/galaxy/tree/issue_21015_multiple_text_param), which addresses multiple text inputs in 🎯 #21015. The range feature originated in 🔀 #19092 ([`d8b980b3e6b`](https://github.com/galaxyproject/galaxy/commit/d8b980b3e6b95ffadaf50dabfd5f0224355df36c)); that change persisted the bounds as validators without exposing them as runtime field attributes. Multiple integer inputs added in 🔀 #23802 and refined in 🔀 #23939 share the same gap. The single-value integer and float cases can be addressed independently of the #21015 work.

## Proposed Approach

Expose bounds from the ordinary inclusive, non-negated `in_range` validator created by the editor when building the integer or float runtime field. Preserve server validation and reuse the existing `FormNumber` behavior for sliders, warnings, and value correction.

<details><summary>Approach details</summary>

- Cover minimum-only, maximum-only, zero, negative, and float bounds. A slider requires two distinct bounds; warnings should work with one.
- Verify correction with a missing bound serialized as `null`. The scalar field passes that null through, and `FormNumber.onInputChange` chooses the correction with `value > this.max`: for `min: 5`, `max: null`, and value `3`, that expression selects null instead of 5. The multiple-integer component normalizes missing bounds to `undefined`. Exposing one-sided bounds needs to account for this existing client behavior.
- Avoid treating every `in_range` validator as a slider interval: API/imported validators can be negated, exclude endpoints, or occur more than once. Define conservative handling for those cases, without changing their validation semantics.
- Setting numeric `min`/`max` also makes the numeric parameter constructor add a range validator. Account for that so custom validation messages and existing rules keep their behavior.
- Keep the failing serialization tests above and add client coverage for the resulting single-value and multiple-integer controls. Check layout when the slider appears beside a row's remove button.
- Passing bounds to the editor's Default Value field can be a separate change; it also needs to respond to bounds being edited.

</details>

## Alternative Approaches

The client could interpret serialized validators, or show static range help instead of using the existing controls. Interpreting validators introduces another copy of their semantics; static help improves discoverability but leaves the established warning and slider unavailable. Exposing compatible numeric field bounds reuses the UI already provided for tools.

<details><summary>Alternatives in detail</summary>

### Interpret validators in the client

Send structured validator metadata and teach the form to derive bounds. This could support richer feedback later, but requires API and client work for a case the numeric field already supports, with particular care around negation and exclusive bounds.

### Display range help only

Include the allowed range in the field's help text. This is a smaller UI improvement if a slider is undesirable, but does not give users the normal numeric range warning and correction. It could complement the proposed approach.

</details>
