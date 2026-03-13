# Fix `data_collection_input` Default Handling for CWL Array Inputs

## Problem

CWL nojs workflows use **array inputs with defaults** (e.g. `type: int[], default: [1, 2, 3]`) and an **empty job file** (`empty.json`). Galaxy's CWL parser creates `data_collection_input` steps for array types but **never sets `optional` or `default` in the tool_state**. At runtime, `run_request.py` checks `step.input_optional` (False) and `step.get_input_default_value()` (not set) → rejects the workflow with:

```
Workflow cannot be run because input step '{step.id}' ({step.label}) is not optional and no input provided.
```

### Affected Tests

- `conditionals_multi_scatter_nojs` — `cond-wf-013_nojs.cwl` with `empty.json`
- `conditionals_nested_cross_scatter_nojs` — `cond-wf-011_nojs.cwl` with `empty.json`

### Example CWL Input

```yaml
# cond-wf-013_nojs.cwl
inputs:
  in1:
    type: int[]
    default: [1, 2, 3, 4, 5, 6]
  test1:
    type: boolean[]
    default: [false, true, false, true, false, true]
```

## Root Cause

In `parser.py:cwl_input_to_galaxy_step()` (lines 1006-1008):

```python
elif isinstance(input_type, dict) and input_type.get("type") == "array":
    input_as_dict["type"] = "data_collection_input"
    input_as_dict["collection_type"] = "list"
```

No `tool_state` is created — no `optional` flag, no `default` value. Compare with `parameter_input` handling (lines 1013-1029) which properly sets both:

```python
# parameter_input path (working)
tool_state["parameter_type"] = "field"
default_set = "default" in input
optional = default_set
if default_set:
    tool_state["default"] = {"src": "json", "value": default_value}
tool_state["optional"] = optional
input_as_dict["tool_state"] = tool_state
```

### Runtime Validation Chain

1. `run_request.py:149` — `step.get_input_default_value(default_not_set)` → not set (no tool_state)
2. `run_request.py:151` — `step.input_optional` → False (no tool_state["optional"])
3. `run_request.py:158` — `not has_input_value and not has_default and not optional` → **raises**

### Key Code Paths

| File | Location | Role |
|------|----------|------|
| `lib/galaxy/tool_util/cwl/parser.py` | `cwl_input_to_galaxy_step()` ~line 1006 | CWL input → Galaxy step conversion (bug is here) |
| `lib/galaxy/workflow/run_request.py` | `_normalize_inputs()` ~line 148-160 | Validates inputs have values/defaults |
| `lib/galaxy/model/__init__.py` | `get_input_default_value()` ~line 8827 | Retrieves default from tool_state or step_input |
| `lib/galaxy/model/__init__.py` | `input_optional` ~line 8842 | Reads optional from tool_state |
| `lib/galaxy/workflow/run.py` | `_ensure_input_step_outputs_populated()` ~line 833 | Pre-populates step outputs from defaults |
| `lib/galaxy/workflow/modules.py` | `InputDataCollectionModule` ~line 1486 | Module for data_collection_input steps |

## Fix

Three changes needed, in dependency order:

### Step 1: Store `optional` and `default` in tool_state for array inputs

**File: `lib/galaxy/tool_util/cwl/parser.py`** — `cwl_input_to_galaxy_step()`

```python
elif isinstance(input_type, dict) and input_type.get("type") == "array":
    input_as_dict["type"] = "data_collection_input"
    input_as_dict["collection_type"] = "list"
    tool_state = {"collection_type": "list"}
    default_set = "default" in input
    optional = default_set
    if default_set:
        tool_state["default"] = input["default"]
    tool_state["optional"] = optional
    input_as_dict["tool_state"] = tool_state
```

This fixes the immediate rejection in `run_request.py` — `input_optional` returns True, and `get_input_default_value` finds the default.

### Step 2: Extend `get_input_default_value()` for `data_collection_input` steps

**File: `lib/galaxy/model/__init__.py`** — `get_input_default_value()`

Currently only `parameter_input` reads from `tool_state["default"]`. The `else` branch checks `step_input.default_value_set` which won't be populated for CWL-imported array defaults.

```python
def get_input_default_value(self, default_default):
    if self.type == "parameter_input":
        tool_state = self.tool_inputs
        default_value = tool_state.get("default", default_default)
    elif self.type == "data_collection_input":
        tool_state = self.tool_inputs
        default_value = tool_state.get("default", default_default)
        if default_value is default_default:
            # Fall back to step_input mechanism
            for step_input in self.inputs:
                if step_input.name == "input" and step_input.default_value_set:
                    default_value = step_input.default_value
                    break
    else:
        # ... existing data_input logic unchanged
```

### Step 3: Materialize list defaults as HDCAs

**File: `lib/galaxy/workflow/run.py`** — `_ensure_input_step_outputs_populated()`

When a `data_collection_input` step has a raw list default (e.g. `[1, 2, 3, 4, 5, 6]`), it must be materialized as an HDCA of expression.json HDAs. The downstream scattered steps expect a real collection.

```python
if step.id not in self.inputs_by_step_id:
    default_value = step.get_input_default_value(NO_REPLACEMENT)
    if step.type == "parameter_input" and isinstance(default_value, dict):
        default_value = default_value.get("value", default_value)
    elif step.type == "data_collection_input" and isinstance(default_value, list):
        # Materialize CWL array default as HDCA of expression.json HDAs
        default_value = self._materialize_collection_default(
            trans, step, default_value
        )
    outputs["output"] = default_value
```

New method `_materialize_collection_default()`:

```python
def _materialize_collection_default(self, trans, step, values):
    """Convert a raw list of scalar values into an HDCA of expression.json HDAs."""
    history = self.workflow_invocation.history
    elements = []
    for i, val in enumerate(values):
        hda = model.HistoryDatasetAssociation(
            name=f"{step.label}_{i}",
            extension="expression.json",
            history=history,
            create_dataset=True,
            flush=False,
        )
        object_store_populator = ObjectStorePopulator(trans.app, trans.user)
        hda.dataset.set_total_size(0)
        trans.sa_session.add(hda)
        # Write JSON-encoded value as content
        import json
        content = json.dumps(val)
        # ... write content to hda dataset file ...
        elements.append(dict(name=str(i), src="hda", id=hda.id))

    collection_manager = trans.app.dataset_collection_manager
    hdca = collection_manager.create(
        trans, history,
        name=f"{step.label} (default)",
        collection_type="list",
        element_identifiers=elements,
    )
    return hdca
```

**Note**: The exact HDA creation + content writing pattern should mirror how `ObjectUploadTarget` staging works in `staging.py` — writing `json.dumps(value)` as the file content with extension `expression.json`.

## Scope

This is a CWL-specific change. Upstream Galaxy `data_collection_input` steps never have embedded defaults — users always provide collections explicitly. All changes are in the CWL parser + runtime path.

## Testing

Run the nojs conformance tests:

```bash
. .venv/bin/activate
VIRTUAL_ENV=$(pwd)/.venv \
GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES="true" \
GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS="true" \
GALAXY_TEST_DISABLE_ACCESS_LOG=1 GALAXY_TEST_LOG_LEVEL=WARN \
GALAXY_SKIP_CLIENT_BUILD=1 GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false \
GALAXY_CONFIG_OVERRIDE_TOOL_CONFIG_FILE="test/functional/tools/sample_tool_conf.xml" \
pytest -s -v lib/galaxy_test/api/cwl/test_cwl_conformance_v1_2.py::TestCwlConformance::test_conformance_v1_2_conditionals_multi_scatter_nojs
```

Also regression-check the JS variants (should still pass):
- `test_conformance_v1_2_conditionals_multi_scatter`
- `test_conformance_v1_2_conditionals_nested_cross_scatter`

## Unresolved Questions

- Should `_materialize_collection_default` live in `run.py` or in `InputDataCollectionModule.execute()`? `run.py` is where `parameter_input` defaults get pre-populated, so it's the natural place. But it means `run.py` needs to know about expression.json creation.
- The nojs cond-wf-011 also has a scalar default (`in3: int, default: 23`) — that should already work via the existing `parameter_input` path. Only the array defaults are broken.
- cond-wf-011_nojs scatters over `[in1, in2, another_input]` but NOT `in3` — `in3` is a plain int fed to all scatter iterations. Need to verify this works once arrays are fixed.
- Boolean array defaults (`[false, true, ...]`) — need to confirm these round-trip correctly through expression.json encoding (`json.dumps(False)` → `"false"` → read back as Python bool).
