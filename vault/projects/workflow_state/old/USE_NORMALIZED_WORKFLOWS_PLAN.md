# Plan: Migrate workflow_state to gxformat2 Normalized Models

## Context

gxformat2's application layer has been rewritten to use typed Pydantic models instead of raw dict manipulation. The key changes relevant to Galaxy's `workflow_state` package:

1. **`ensure_format2()`** — single entry point that accepts any workflow (dict, path, native model, format2 model) and returns `NormalizedFormat2` (or `ExpandedFormat2` with `expand=True`). Import from `gxformat2.to_format2`.

2. **Connection resolution at normalization time** — `connect` key, `$link` entries in state, and `in` sources are ALL resolved during normalization. After calling `ensure_format2()`:
   - `step.in_` contains ALL connections as `WorkflowStepInput` with `.id` and `.source`
   - `step.state` is clean — `$link` entries replaced with `{"__class__": "ConnectedValue"}`
   - No `connect` key survives (it was never in the schema)

3. **ConversionOptions renames**:
   - `native_state_encoder` → `state_encode_to_native`
   - `convert_tool_state` → `state_encode_to_format2`
   - `expand` parameter removed from `ConversionOptions` (now a function parameter on `ensure_format2`/`ensure_native`)

4. **`NormalizedWorkflowStep` provides typed access**:
   - `step.type_` — `WorkflowStepType` enum (tool, subworkflow, pause, pick_value)
   - `step.tool_id`, `step.tool_version` — typed str | None
   - `step.in_` — `list[WorkflowStepInput]` (always a list, all connections resolved)
   - `step.state` — `dict | None` (clean, no `$link`)
   - `step.run` — `NormalizedFormat2 | str | dict | None` (subworkflow or ref)

## What to Change

### validation_format2.py

**Current** (dict-based, manual connection extraction):
```python
from gxformat2.model import (
    get_native_step_type,
    pop_connect_from_step_dict,
    setup_connected_values,
    steps_as_list,
)

def validate_workflow_format2(workflow_dict, get_tool_info):
    steps = steps_as_list(workflow_dict)
    for step in steps:
        step_type = get_native_step_type(step)
        if step_type == "subworkflow":
            run = step.get("run")
            if isinstance(run, dict):
                validate_workflow_format2(run, get_tool_info)
            continue
        validate_step_format2(step, get_tool_info)

def merge_inputs(step_dict, parsed_tool):
    connect = pop_connect_from_step_dict(step_dict)
    step_dict = setup_connected_values(step_dict, connect)
    state_at_level = step_dict["state"]
    for tool_input in tool_inputs:
        _merge_into_state(connect, tool_input, state_at_level)
    ...
```

**After** (model-based, connections pre-resolved):
```python
from gxformat2.to_format2 import ensure_format2
from gxformat2.normalized import NormalizedFormat2, NormalizedWorkflowStep

def validate_workflow_format2(workflow, get_tool_info):
    nf2 = ensure_format2(workflow) if not isinstance(workflow, NormalizedFormat2) else workflow
    for step in nf2.steps:
        if isinstance(step.run, NormalizedFormat2):
            validate_workflow_format2(step.run, get_tool_info)
            continue
        validate_step_format2(step, get_tool_info)

def validate_step_format2(step: NormalizedWorkflowStep, get_tool_info):
    if step.type_ != WorkflowStepType.tool:
        return
    tool_id = step.tool_id
    tool_version = step.tool_version
    parsed_tool = get_tool_info.get_tool_info(tool_id, tool_version)
    if parsed_tool is not None:
        validate_step_against(step, parsed_tool)

def validate_step_against(step: NormalizedWorkflowStep, parsed_tool):
    # step.state is already clean (no $link)
    # step.in_ has ALL connections (from in, connect, $link)
    state = dict(step.state) if step.state else {}

    # Build connect dict from in_ for merge_inputs
    connect: dict[str, list] = {}
    for step_input in step.in_:
        if step_input.id and step_input.source:
            src = step_input.source
            connect[step_input.id] = src if isinstance(src, list) else [src]

    # merge_inputs still walks tool params to inject ConnectedValue
    for tool_input in parsed_tool.inputs:
        _merge_into_state(connect, tool_input, state)
    for key in connect:
        raise Exception(f"Failed to find parameter definition matching workflow linked key {key}")

    linked_tool_state_model = WorkflowStepLinkedToolState.parameter_model_for(parsed_tool.inputs)
    linked_tool_state_model.model_validate(state)
```

**Key simplifications:**
- `steps_as_list()` → `nf2.steps` (already a list with ids)
- `get_native_step_type()` → `step.type_` (already typed)
- `pop_connect_from_step_dict()` → gone (connections already in `step.in_`)
- `setup_connected_values()` → gone (`$link` already resolved to ConnectedValue in `step.state`)
- Subworkflow check: `isinstance(step.run, NormalizedFormat2)` instead of `step.get("run")` dict check

### validate.py `_validate_format2()`

**Current:**
```python
from gxformat2.model import get_native_step_type, steps_as_list

def _validate_format2(workflow_dict, get_tool_info, prefix=""):
    steps = steps_as_list(workflow_dict)
    for i, step_dict in enumerate(steps):
        step_type = get_native_step_type(step_dict)
        ...
```

**After:**
```python
from gxformat2.to_format2 import ensure_format2

def _validate_format2(workflow_dict, get_tool_info, prefix=""):
    nf2 = ensure_format2(workflow_dict)
    for i, step in enumerate(nf2.steps):
        if isinstance(step.run, NormalizedFormat2):
            sub_results = _validate_format2(step.run, get_tool_info, prefix=f"{prefix}{i}.")
            results.extend(sub_results)
            continue
        if step.type_ != WorkflowStepType.tool:
            continue
        tool_id = step.tool_id
        ...
```

### roundtrip.py (callback renames)

**Current:**
```python
import_options.native_state_encoder = make_encode_tool_state(get_tool_info)
format2_dict = from_galaxy_native(native_copy, convert_tool_state=convert_cb)
```

**After** (if migrating to new API):
```python
from gxformat2.options import ConversionOptions
from gxformat2.to_format2 import to_format2
from gxformat2.to_native import to_native

# native → format2
options = ConversionOptions(state_encode_to_format2=make_convert_tool_state(get_tool_info))
nf2 = to_format2(native_copy, options=options)

# format2 → native
options = ConversionOptions(state_encode_to_native=make_encode_tool_state(get_tool_info))
nnw = to_native(format2_dict, options=options)
```

Or keep using the deprecated shims (`from_galaxy_native`, `ImportOptions`) — they still work but map the old param names internally. The deprecated shim `from_galaxy_native` keeps its `convert_tool_state` parameter name; it maps to `state_encode_to_format2` internally. `ImportOptions.state_encode_to_native` is the new name (was `native_state_encoder`).

## Functions to Stop Importing from gxformat2.model

| Old import | Replacement |
|---|---|
| `steps_as_list(workflow_dict)` | `ensure_format2(workflow_dict).steps` |
| `get_native_step_type(step_dict)` | `step.type_` on `NormalizedWorkflowStep` |
| `pop_connect_from_step_dict(step_dict)` | Gone — connections in `step.in_` |
| `setup_connected_values(state, connect)` | Gone — state already clean after normalization |

## _merge_into_state stays Galaxy-side

The `_merge_into_state` function walks Galaxy's tool parameter tree (conditionals, repeats) to inject `ConnectedValue` for connected params. This is tool-model-aware logic that belongs in Galaxy. The only change is how it gets its `connect` dict — from `step.in_` instead of `pop_connect_from_step_dict`.

## Unresolved Questions

- Do we want `validate_workflow_format2` to accept `NormalizedFormat2` directly (avoiding re-normalization if caller already has a model)?
- Should `_validate_format2` in validate.py normalize once at the top and pass the model through, or normalize per-call for simplicity?
- The `Format2StepDict` / `Format2WorkflowDict` type aliases in `_types.py` become less useful once we're passing models — worth removing?
