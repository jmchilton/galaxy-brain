# Workflow text parameter with static restrictions ignores its default at runtime

Agent-to-agent draft. Found 2026-10-07 during review of `issue_21015_multiple_text_param` (fixes #21015). That branch fixed the `restrictOnConnections` path for list defaults. The `staticRestrictions` path predates it and is untouched there.

## Symptom

A text `parameter_input` with `restrictions: [a, b, c]` and `default: b` becomes a runtime `SelectToolParameter` whose initial value is `a`, the first option, not `b`. With `multiple: true` and `default: [b, c]`, the initial value is `None`, so nothing is selected.

## Repro (module level, verified)

Run from `test/unit/workflows` with `PYTHONPATH=../../../lib:.`:

```python
from unittest import mock
from galaxy import model
from galaxy.workflow import modules
from workflow_support import MockTrans

for multiple, default in [(False, "b"), (True, ["b", "c"])]:
    step = model.WorkflowStep(); step.type = "parameter_input"
    step.tool_inputs = {"parameter_type": "text", "optional": False, "multiple": multiple,
                        "default": default, "restrictions": ["a", "b", "c"]}
    p = modules.module_factory.from_workflow_step(MockTrans(), step).get_runtime_inputs(mock.MagicMock())["input"]
    print(multiple, p.get_initial_value(None, {}), [o[1] for o in p.static_options if o[2]])
# False a []
# True None []
```

The UI effect (the run form preselecting the wrong option) is inferred from this and hasn't been checked in a browser yet. Confirm that with a Playwright run before filing.

## Cause

`InputParameterModule.get_runtime_inputs` (`lib/galaxy/workflow/modules.py`, ~line 1744) does:

```python
if client_parameter_type == "select":
    parameter_kwds["selected"] = default_value
```

The dict input source ignores a top-level `selected` key. `tool_util/parser/yaml.py:627` only reads `selected` per option (`option.get("selected", False)`). `_parameter_def_list_to_options` (just above) builds options without `selected`.

The `restrictOnConnections` path (`restrict_options`, ~line 1650) does this correctly: it sets `"selected"` per option, and on the 21015 branch it handles list defaults (`o[1] in default_values`).

## Suggested fix

In the `staticRestrictions` branch, set `option["selected"]` from the default when building options (scalar or list, same as `restrict_options`), and drop the dead `parameter_kwds["selected"]`. If both paths can share one "mark defaults selected" helper, use it.

## Tests

Red first:
- A unit test in `test/unit/workflows/test_modules.py` asserting `get_initial_value` is `"b"` / `["b", "c"]` (the repro above).
- An API test alongside `test_value_restriction_selects_*` in `lib/galaxy_test/api/test_workflows.py` that checks the selected options in the run form.
- Optionally a Playwright run-form check.
