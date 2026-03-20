# Model Non-Data Connections in Connection Validation

## Context

Connection validation currently only models data/collection connections. Non-data connections (parameter values) are invisible — `parameter_input` steps have no outputs, expression tool parameter outputs (`integer_param`, `text_param`, etc.) are skipped, and subworkflow inputs aren't modeled. This causes 861 skips across IWC (705 parameter connections + 124 subworkflow inputs + 32 other).

The workflow editor validates all these connections. Our validator should too.

## Skip Breakdown (861 total)

| Category | Count | Fix |
|----------|-------|-----|
| `parameter_input` source — no output modeled | 531 | Model parameter outputs |
| Expression tool parameter outputs skipped | 161 | Include non-data outputs in `_collect_outputs` |
| Subworkflow inputs not modeled | 124 | Synthesize inputs from inner graph |
| Subworkflow unresolved inner output | 27 | Improved by parameter output modeling |
| pick_value parameter outputs | 13 | Covered by expression tool fix |
| Toolshed fetch failure (fasttree) | 3 | Cache miss — not actionable here |
| ANY_COLLECTION_TYPE genuinely unknown | 2 | Correct behavior |

## Design: Unified Type Field

Replace `is_collection: bool` on `ResolvedOutput` and `ResolvedInput` with a `type` field that treats all connection types as first-class:

```
"data"        — plain dataset
"collection"  — dataset collection (has collection_type, collection_type_source, etc.)
"text"        — text parameter value
"integer"     — integer parameter value
"float"       — float parameter value
"boolean"     — boolean parameter value
"color"       — color parameter value
```

This mirrors Galaxy's existing type system (`ToolOutputDataset.type="data"`, `ToolOutputCollection.type="collection"`, `ToolOutputText.type="text"`, etc.) and the `parameter_type` field on `parameter_input` steps.

## Implementation

### Step 1: Refactor `ResolvedOutput` — replace `is_collection` with `type`

**File:** `connection_graph.py`

Before:
```python
@dataclass
class ResolvedOutput:
    name: str
    is_collection: bool
    collection_type: Optional[str] = None
    collection_type_source: Optional[str] = None
    collection_type_from_rules: Optional[str] = None
    structured_like: Optional[str] = None
    format: Optional[str] = None
    format_source: Optional[str] = None
```

After:
```python
@dataclass
class ResolvedOutput:
    name: str
    type: str  # "data", "collection", "text", "integer", "float", "boolean"
    collection_type: Optional[str] = None
    collection_type_source: Optional[str] = None
    collection_type_from_rules: Optional[str] = None
    structured_like: Optional[str] = None
    format: Optional[str] = None
    format_source: Optional[str] = None
```

Update all construction sites:
- `is_collection=False` → `type="data"`
- `is_collection=True` → `type="collection"`

Update all `output.is_collection` checks in `connection_validation.py`:
- `output.is_collection` → `output.type == "collection"`

### Step 2: Refactor `ResolvedInput` — replace `is_collection` with `type`

**File:** `connection_graph.py`

Before:
```python
@dataclass
class ResolvedInput:
    name: str
    state_path: str
    is_collection: bool
    collection_type: Optional[str] = None
    multiple: bool = False
    optional: bool = False
    extensions: List[str] = field(default_factory=lambda: ["data"])
```

After:
```python
@dataclass
class ResolvedInput:
    name: str
    state_path: str
    type: str  # "data", "collection", "text", "integer", "float", "boolean"
    collection_type: Optional[str] = None
    multiple: bool = False
    optional: bool = False
    extensions: List[str] = field(default_factory=lambda: ["data"])
```

Update all construction sites and `input_.is_collection` checks.

### Step 3: Model `parameter_input` step outputs

**File:** `connection_graph.py` — `_resolve_input_step()`

Currently `parameter_input` returns a step with no outputs. Add:

```python
elif step_type == "parameter_input":
    param_type = tool_state.get("parameter_type", "text") if tool_state else "text"
    output = ResolvedOutput(name="output", type=param_type)
    return ResolvedStep(
        step_id=step_id, tool_id=None, step_type=step_type,
        outputs={"output": output},
    )
```

### Step 4: Include non-data outputs in `_collect_outputs`

**File:** `connection_graph.py` — `_collect_outputs()`

Add handling for `ToolOutputText`, `ToolOutputInteger`, `ToolOutputFloat`, `ToolOutputBoolean` (from `galaxy.tool_util_models.tool_outputs`):

```python
elif isinstance(output, (ToolOutputText, ToolOutputInteger, ToolOutputFloat, ToolOutputBoolean)):
    result[output.name] = ResolvedOutput(
        name=output.name,
        type=output.type,  # "text", "integer", "float", "boolean"
    )
```

### Step 5: Collect non-data inputs in `_collect_inputs` (rename from `_collect_data_inputs`)

**File:** `connection_graph.py`

Add handling for parameter input types:

```python
elif param.parameter_type in ("gx_text", "gx_integer", "gx_float", "gx_boolean", "gx_color"):
    # Strip "gx_" prefix to get the type name
    param_type = param.parameter_type[3:]  # "text", "integer", "float", "boolean", "color"
    result[state_path] = ResolvedInput(
        name=param.name,
        state_path=state_path,
        type=param_type,
    )
```

Also handle `gx_select` — select params accept connections from parameter sources.

### Step 6: Update `_output_to_type` and `_input_to_type` in connection_validation.py

**File:** `connection_validation.py`

```python
def _output_to_type(output: ResolvedOutput) -> CollectionTypeOrSentinel:
    if output.type == "collection":
        if output.collection_type:
            return COLLECTION_TYPE_DESCRIPTION_FACTORY.for_collection_type(output.collection_type)
        return ANY_COLLECTION_TYPE
    return NULL_COLLECTION_TYPE  # data AND parameter types all map to NULL

def _input_to_type(input_: ResolvedInput) -> CollectionTypeOrSentinel:
    if input_.type == "collection":
        if input_.collection_type:
            return COLLECTION_TYPE_DESCRIPTION_FACTORY.for_collection_type(input_.collection_type)
        return ANY_COLLECTION_TYPE
    return NULL_COLLECTION_TYPE
```

Parameter types return `NULL_COLLECTION_TYPE` (same as dataset). A parameter→parameter connection becomes NULL→NULL which is ok. A parameter→data connection also becomes NULL→NULL which is ok (matches workflow editor behavior — Galaxy coerces at runtime).

The `target_resolved_input.multiple` check needs updating:
```python
# Before: target_resolved_input.multiple and not target_resolved_input.is_collection
# After:  target_resolved_input.multiple and target_resolved_input.type == "data"
```

### Step 7: Synthesize subworkflow inputs from inner graph

**File:** `connection_graph.py` — `_resolve_subworkflow_step()`

After building the inner graph, create `ResolvedInput` entries by looking up inner input steps via `input_subworkflow_step_id`:

```python
def _input_from_inner_step(inner_step: ResolvedStep, input_path: str) -> ResolvedInput:
    if inner_step.step_type == "data_collection_input":
        return ResolvedInput(
            name=input_path, state_path=input_path,
            type="collection",
            collection_type=inner_step.declared_collection_type,
        )
    elif inner_step.step_type == "data_input":
        return ResolvedInput(name=input_path, state_path=input_path, type="data")
    elif inner_step.step_type == "parameter_input":
        # Get parameter type from the inner step's output
        inner_output = inner_step.outputs.get("output")
        param_type = inner_output.type if inner_output else "text"
        return ResolvedInput(name=input_path, state_path=input_path, type=param_type)
    else:
        return ResolvedInput(name=input_path, state_path=input_path, type="data")
```

## Files Modified

| File | Change |
|------|--------|
| `connection_graph.py` | `ResolvedOutput.type` replaces `is_collection`, `ResolvedInput.type` replaces `is_collection`, `_resolve_input_step` for parameter_input, `_collect_outputs` for non-data types, `_collect_data_inputs` → `_collect_inputs` + parameter params, `_resolve_subworkflow_step` synthesize inputs, new imports |
| `connection_validation.py` | Update all `is_collection` refs → `.type == "collection"`, `_output_to_type`/`_input_to_type` handle parameter types, multi-data check update |
| `connection_test_fixtures.py` | Update `make_data_input`/`make_data_output`/`make_collection_input`/`make_collection_output` + add `make_parameter_output` |
| `test_connection_validation.py` | Parameter connection tests |
| `test_connection_graph.py` | Update `is_collection` assertions |

## Tests

1. `parameter_input` → tool text param: ok, no skip
2. Expression tool `integer_param` output → downstream tool param: ok
3. `parameter_input` → subworkflow parameter_input: ok
4. Subworkflow data_collection_input connection validates type
5. Mixed: data + parameter connections on same step both validate
6. Existing tests updated for `type=` instead of `is_collection=`

## Verification

1. All existing 222 tests pass (after updating `is_collection` refs)
2. New tests pass
3. IWC scan: skip count drops from 861 to ~30 (fasttree cache miss + genuinely unresolvable)

## Unresolved Questions

- Should `gx_select` inputs be modeled? They can receive parameter connections.
- `gx_hidden` and `gx_baseurl` — skip or model?
