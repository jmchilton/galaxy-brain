---
type: research
subtype: component
tags:
  - research/component
  - galaxy/tools/yaml
  - galaxy/tools/runtime
  - galaxy/tools
component: YAML Tool Runtime
status: draft
created: 2026-02-05
revised: 2026-02-05
revision: 1
ai_generated: true
---

# YAML Tool Runtime State Representation

## Overview

This document describes how YAML-defined tools (User-Defined Tools and Admin Tools) convert tool state into a runtime representation suitable for building command lines. The runtime representation uses a CWL-like format where dataset references are transformed into file objects with path, format, and metadata.

## Current Architecture

### Two Paths to Runtime State

The `UserToolEvaluator.build_param_dict()` method in `lib/galaxy/tools/evaluation.py` now supports two paths for building the CWL-style inputs dictionary:

1. **New Path (via `runtimeify`)**: Uses validated `JobInternalToolState` persisted with the job
2. **Legacy Path (via `to_cwl`)**: Falls back to the workflow modules `to_cwl` function

```python
# From lib/galaxy/tools/evaluation.py (UserToolEvaluator.build_param_dict)
if validated_tool_state is not None:
    from galaxy.tool_util.parameters.convert import runtimeify
    from galaxy.tools.runtime import setup_for_runtimeify

    hda_references, adapt_datasets = setup_for_runtimeify(self.app, compute_environment, input_datasets)
    job_runtime_state = runtimeify(validated_tool_state, self.tool, adapt_datasets)
    cwl_style_inputs = job_runtime_state.input_state
else:
    from galaxy.workflow.modules import to_cwl

    log.info(
        "Building CWL style inputs using deprecated to_cwl function - tool may work differently in the future."
    )
    hda_references = []
    cwl_style_inputs = to_cwl(incoming, hda_references=hda_references, compute_environment=compute_environment)
```

## The `to_cwl` Shortcut

### Location

`lib/galaxy/workflow/modules.py` - function `to_cwl()`

### Purpose

The `to_cwl` function was originally designed for workflow execution, transforming Galaxy model objects into CWL-compatible representations. It was repurposed as a "shortcut" for YAML tools because:

1. It recursively converts HDAs, HDCAs, and collections to file/directory objects
2. It handles nested tool state (conditionals, repeats)
3. It already produced the exact format needed for JavaScript expression evaluation

### How It Works

```python
def to_cwl(value, hda_references, step=None, compute_environment=None):
    if isinstance(value, model.HistoryDatasetAssociation):
        hda_references.append(value)
        properties = {
            "class": "File",
            "location": f"step_input://{len(hda_references)}",
            "format": value.extension,
            "path": compute_environment.input_path_rewrite(value) if compute_environment else value.get_file_name(),
        }
        set_basename_and_derived_properties(properties, value.dataset.created_from_basename or value.name)
        return properties
    elif isinstance(value, model.DatasetCollection):
        # Handle collections recursively...
    elif isinstance(value, dict):
        # Recurse into nested state
        return {k: to_cwl(v, ...) for k, v in value.items()}
    # ...
```

### Limitations of `to_cwl`

1. **No Type Information**: Recursively processes all dict values without understanding the tool parameter model
2. **Model Object Dependency**: Requires actual Galaxy model objects (HDAs, HDCAs) at evaluation time
3. **Workflow-Specific Logic**: Contains workflow-related checks (step readiness, dataset state) that aren't relevant for tool execution
4. **No Validation**: No validation against the tool's parameter model

## The New Approach: `runtimeify`

### Location

`lib/galaxy/tool_util/parameters/convert.py` - function `runtimeify()`

### Key Concept

The `runtimeify` function transforms a validated `JobInternalToolState` into a `JobRuntimeToolState`. This is a model-aware transformation that:

1. Takes strongly-typed internal state (with dataset IDs already decoded)
2. Uses the tool's parameter model to identify data parameters
3. Transforms data references into CWL-style file objects

### Implementation

```python
def runtimeify(
    internal_state: JobInternalToolState,
    input_models: ToolParameterBundle,
    adapt_dataset: DatasetToRuntimeJson,
) -> JobRuntimeToolState:

    def adapt_dict(value: dict):
        data_request_internal_hda = DataRequestInternalHda(**value)
        as_json = adapt_dataset(data_request_internal_hda).model_dump()
        as_json["class"] = as_json.pop("class_")  # Pydantic alias handling
        return as_json

    def to_runtime_callback(parameter: ToolParameterT, value: Any):
        if isinstance(parameter, DataParameterModel):
            if parameter.multiple and isinstance(value, list):
                return list(map(adapt_dict, value))
            else:
                return adapt_dict(value)
        elif isinstance(parameter, DataCollectionParameterModel):
            raise NotImplementedError("DataCollectionParameterModel runtime adaptation not implemented yet.")
        else:
            return VISITOR_NO_REPLACEMENT

    runtime_state_dict = visit_input_values(input_models, internal_state, to_runtime_callback)
    runtime_state = JobRuntimeToolState(runtime_state_dict)
    runtime_state.validate(input_models)
    return runtime_state
```

### Support Infrastructure

#### `lib/galaxy/tools/runtime.py`

```python
def setup_for_runtimeify(app, compute_environment, input_datasets):
    hdas_by_id = {d.id: (d, i) for (i, d) in enumerate(input_datasets.values()) if d is not None}

    def adapt_dataset(value: DataRequestInternalDereferencedT) -> DataInternalJson:
        hda, index = hdas_by_id[value.id]
        properties = {
            "class": "File",
            "location": f"step_input://{index}",
            "format": hda.extension,
            "path": compute_environment.input_path_rewrite(hda) if compute_environment else hda.get_file_name(),
            "size": int(hda.dataset.get_size()),
            "listing": [],
        }
        set_basename_and_derived_properties(properties, hda.dataset.created_from_basename or hda.name)
        return DataInternalJson(**properties)

    return hda_references, adapt_dataset
```

## State Classes Involved

### `JobInternalToolState`

- **Representation**: `"job_internal"`
- **Data References**: `{src: "hda", id: <decoded_int>}`
- **Purpose**: Internal state after decoding, dereferencing, and expansion - per-job state

### `JobRuntimeToolState`

- **Representation**: `"job_runtime"`
- **Data References**: `DataInternalJson` (CWL-style File objects)
- **Purpose**: Runtime state suitable for JavaScript expression evaluation

### `DataInternalJson`

```python
class DataInternalJson(StrictModel):
    class_: Literal["File"]
    basename: str
    location: str
    path: str                # Absolute path to file
    listing: Optional[List[str]]
    nameroot: Optional[str]
    nameext: Optional[str]
    format: str              # Galaxy extension (txt, bam, etc.)
    checksum: Optional[str]
    size: int
```

## How Job Tool State Gets Persisted

Commit `5ad27b8ca8fe759e2f6ad7cec5670c07374ca1c7` ("Persist validated job tool state") added:

1. **New `tool_state` column on Job model**: Stores `JobInternalToolState.input_state` as JSON
2. **`ToolSource.source_class` column**: Stores the tool source class name for reconstruction

```python
# From lib/galaxy/tools/execute.py
if execution_slice.validated_param_combination:
    tool_state = execution_slice.validated_param_combination.input_state
    job.tool_state = tool_state
```

The `validated_param_combination` flows through:
1. Tool Request API creates `JobInternalToolState` via state transformations
2. `MappingParameters` carries validated state through expansion
3. `ExecutionSlice` receives validated state for each job
4. State persisted to `job.tool_state` at job creation

## State Transformation Flow

```
RequestToolState (API)
        |
        | decode()
        v
RequestInternalToolState (persisted in ToolRequest)
        |
        | dereference() - URI inputs -> HDA references
        v
RequestInternalDereferencedToolState
        |
        | expand() - collection mapping
        v
JobInternalToolState (persisted in job.tool_state)
        |
        | runtimeify() - at job evaluation time
        v
JobRuntimeToolState (used for command building)
```

## Current Gaps and Future Work

### Not Yet Implemented

1. **Collection inputs**: `DataCollectionParameterModel` runtime adaptation raises `NotImplementedError`
2. **Nested collections**: More complex collection types need handling in `runtimeify`

### Path Forward

The goal is to:
1. Fully implement `runtimeify` to handle all parameter types
2. Add comprehensive testing of the state transformation pipeline
3. Eventually deprecate the `to_cwl` fallback path
4. Use the validated state for more than just YAML tools (command-line construction, provenance, etc.)

## Relevant Code Locations

| Component | Location |
|-----------|----------|
| `runtimeify` | `lib/galaxy/tool_util/parameters/convert.py` |
| `setup_for_runtimeify` | `lib/galaxy/tools/runtime.py` |
| `to_cwl` (legacy) | `lib/galaxy/workflow/modules.py` |
| `UserToolEvaluator` | `lib/galaxy/tools/evaluation.py` |
| `JobRuntimeToolState` | `lib/galaxy/tool_util/parameters/state.py` |
| `DataInternalJson` | `lib/galaxy/tool_util_models/parameters.py` |
| State persistence | `lib/galaxy/tools/execute.py` |
| `job_runtime` model factory | `lib/galaxy/tool_util_models/parameters.py` |

## Testing

The state conversion is tested via:
- Tool test cases that exercise the new API path
- Unit tests in `test/unit/tool_util/test_parameter_test_cases.py`
- Integration tests that verify tool execution through the Jobs API

The `GALAXY_TEST_USE_LEGACY_TOOL_API` environment variable controls whether tests use the legacy `POST /api/tools` or new `POST /api/jobs` endpoint.
