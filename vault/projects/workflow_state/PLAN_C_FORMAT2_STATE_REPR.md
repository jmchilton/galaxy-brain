# Plan C: Representation-Transform Architecture

## Approach

`workflow_step` and `workflow_step_linked` were already designed for format2 state validation (commit `39641f6531`). Don't create a new representation — leverage the existing pair and reframe conversion as a **representation transform** between them and the native encoding. The visitor pattern + Pydantic models already handle all parameter types; the missing piece is wiring them into the conversion pipeline.

## Why No New Representation

The research confirms `workflow_step` already encodes format2's contract:

| Property | `workflow_step` | Format2 `state` | Match? |
|---|---|---|---|
| Structured dicts | Yes | Yes | Yes |
| No ConnectedValue | Yes (rejected) | Yes (in `in` dict) | Yes |
| No `__current_case__` | Yes (discriminated union on selector) | Yes (inferred) | Yes |
| No `__page__`/`__rerun_remap_job_id__` | Yes | Yes | Yes |
| Data params | type(None), requires_value=False → absent OK | Absent (in `in` dict) | Yes |
| Defaults not required | Yes (nearly everything optional) | Yes | Yes |
| Extra fields forbidden | Yes (extra="forbid") | Yes | Yes |

Specific design choices that confirm intent:
- **DataParameterModel**: `type(None)` with `requires_value=False` — absent is valid
- **SelectParameterModel**: `py_type_workflow_step` forces all selects optional
- **HiddenParameterModel**: non-optional hidden forced optional for workflow context
- **ConditionalParameterModel**: `__absent__` branch allows entire conditional to be missing, discriminator uses test param value not `__current_case__`
- **BooleanParameterModel**: StrictBool compatible with YAML bool deserialization

Creating a 13th representation that duplicates `workflow_step` would be confusing — the old one would lose its reason to exist.

## Core Architecture: Conversion as Representation Transform

The key insight: native `tool_state` (double-encoded JSON with ConnectedValue + `__current_case__` + bookkeeping) needs to become format2 `state` (clean structured dict). This is a transform from one encoding to `workflow_step` representation. The reverse (format2→native) is a transform from `workflow_step` to the native encoding.

```
Native tool_state (JSON string)
    │
    ▼  parse + strip bookkeeping
workflow_step_linked (structured dict with ConnectedValue markers)
    │
    ▼  strip ConnectedValue → connections dict
workflow_step (clean dict)  ←→  Format2 state
    +
connections dict  ←→  Format2 in/connect
```

The existing `visit_input_values()` visitor and `pydantic_template()` infrastructure handle the parameter tree traversal. We just need conversion callbacks.

## Implementation Steps

### Phase 1: Validate That workflow_step Already Works (1-2 days)

Before building conversion, confirm the representation handles all format2 patterns.

#### Step 1.1: Audit parameter_specification.yml for workflow_step coverage
**File:** `test/unit/tool_util/parameter_specification.yml`

Check that `workflow_step_valid` and `workflow_step_invalid` entries exist for all parameter types used in format2 workflows. Identify any gaps. Key types to verify:
- gx_text, gx_integer, gx_float, gx_boolean
- gx_select (single + multiple)
- gx_conditional_boolean, gx_conditional_select
- gx_repeat, gx_section
- gx_data, gx_data_collection, gx_data_optional

#### Step 1.2: Add missing workflow_step spec entries
For any parameter type lacking `workflow_step_valid`/`workflow_step_invalid` entries, add them. These test the exact values that would appear in format2 `state` blocks.

#### Step 1.3: Test with real format2 workflow state
Write a test that:
1. Takes a format2 workflow fixture (e.g., `default_values.gxwf.yml`)
2. Extracts the `state` dict from a tool step
3. Validates it against `WorkflowStepToolState.parameter_model_for(tool.inputs)`
4. Confirms it passes

If any real format2 state fails validation, that's a bug in `workflow_step` to fix — not a reason for a new representation.

### Phase 2: Native → workflow_step_linked Parsing (1 week)

The first conversion step: parse native `tool_state` JSON into a `workflow_step_linked` dict.

#### Step 2.1: Build native state parser
**File:** `lib/galaxy/tool_util/workflow_state/convert.py`

```python
def parse_native_to_workflow_step_linked(
    tool_state_json: str,
    input_connections: dict,
    input_models: ToolParameterBundle,
) -> dict:
    """Parse native tool_state JSON → workflow_step_linked dict.

    - Outer JSON.loads to get the double-encoded dict
    - Per-value JSON.loads to decode string values
    - Type coercion using parameter type info (string "5" → int 5)
    - Inject ConnectedValue for connected params
    - Strip __page__, __rerun_remap_job_id__, __current_case__
    """
```

This uses `visit_input_values()` with a callback that:
- For each leaf parameter, decodes the JSON string value and coerces to the correct Python type
- For connected params (in `input_connections`), returns `{"__class__": "ConnectedValue"}`
- For conditionals, strips `__current_case__` (the discriminated union handles it)
- Skips `__page__`, `__rerun_remap_job_id__`

#### Step 2.2: Validate result
After parsing, validate the result against `WorkflowStepLinkedToolState`:
```python
linked_model = WorkflowStepLinkedToolState.parameter_model_for(input_models)
linked_model.model_validate(parsed_state)
```

This catches any parsing errors immediately.

### Phase 3: workflow_step_linked → workflow_step (Format2 State) (3-4 days)

Strip ConnectedValue markers and separate into state + connections.

#### Step 3.1: Build stripping converter
**File:** `lib/galaxy/tool_util/workflow_state/convert.py` or new `convert_format2.py`

```python
def linked_to_format2(
    linked_state: dict,
    input_models: ToolParameterBundle,
) -> tuple[dict, dict]:
    """workflow_step_linked → (workflow_step dict, connections dict).

    Walk the parameter tree. For each ConnectedValue, remove from state
    and record in connections dict. Return clean state + connections.
    """
    connections = {}

    def callback(parameter, value, prefix_path):
        if isinstance(value, dict) and value.get("__class__") == "ConnectedValue":
            connections[prefix_path] = True
            return VISITOR_REMOVE
        return VISITOR_NO_REPLACEMENT

    clean_state = visit_input_values(input_models, linked_state, callback)
    return clean_state, connections
```

#### Step 3.2: Validate result
```python
step_model = WorkflowStepToolState.parameter_model_for(input_models)
step_model.model_validate(clean_state)
```

#### Step 3.3: Build connections dict → format2 `in` dict
Map the internal connection paths to format2 `in` syntax. The connections dict keys are parameter paths (e.g., `anno|reference_gene_sets`). These become entries in the format2 `in` block, with the actual source step/output resolved from `input_connections`.

### Phase 4: Full Pipeline (convert_state_to_format2) (2-3 days)

#### Step 4.1: Wire the pipeline together
**File:** `lib/galaxy/tool_util/workflow_state/convert.py`

Replace the current per-type `_convert_state_at_level()` approach:

```python
def convert_state_to_format2(native_step_dict, get_tool_info):
    parsed_tool = get_tool_info.get_tool_info(tool_id, tool_version)

    # Step 1: Parse native → workflow_step_linked
    linked_state = parse_native_to_workflow_step_linked(
        native_step_dict["tool_state"],
        native_step_dict.get("input_connections", {}),
        parsed_tool.inputs,
    )

    # Step 2: Validate as workflow_step_linked
    WorkflowStepLinkedToolState.parameter_model_for(parsed_tool.inputs) \
        .model_validate(linked_state)

    # Step 3: Strip connections → workflow_step + connections
    clean_state, connections = linked_to_format2(linked_state, parsed_tool.inputs)

    # Step 4: Validate as workflow_step
    WorkflowStepToolState.parameter_model_for(parsed_tool.inputs) \
        .model_validate(clean_state)

    # Step 5: Build format2 in dict from connections + input_connections
    format2_in = build_format2_in(connections, native_step_dict)

    return Format2State(state=clean_state, in_=format2_in)
```

**This replaces per-type conversion with representation transforms.** All parameter types work automatically because the visitor pattern + Pydantic models already handle them.

#### Step 4.2: Reverse pipeline (format2 → native)
For round-trip support:

```python
def convert_format2_to_native(format2_state, format2_in, input_models):
    # Step 1: Validate as workflow_step
    WorkflowStepToolState.parameter_model_for(input_models) \
        .model_validate(format2_state)

    # Step 2: Inject ConnectedValue markers from in dict
    linked_state = inject_connections(format2_state, format2_in, input_models)

    # Step 3: Validate as workflow_step_linked
    WorkflowStepLinkedToolState.parameter_model_for(input_models) \
        .model_validate(linked_state)

    # Step 4: Encode to native format (per-value JSON.dumps, outer JSON.dumps)
    native_tool_state = encode_to_native(linked_state)
    return native_tool_state
```

### Phase 5: Improve validation_format2.py (1-2 days)

#### Step 5.1: Use the conversion pipeline for validation
**File:** `lib/galaxy/tool_util/workflow_state/validation_format2.py`

The current `validate_step_against()` already uses `WorkflowStepToolState` and `WorkflowStepLinkedToolState`. Simplify to use the pipeline:

```python
def validate_step_against(step_dict, parsed_tool):
    if "state" in step_dict:
        # Phase 1: Validate raw format2 state
        model = WorkflowStepToolState.parameter_model_for(parsed_tool.inputs)
        model.model_validate(step_dict["state"])

    # Phase 2: Merge connections and validate linked state
    linked_step = merge_inputs(step_dict, parsed_tool)
    linked_model = WorkflowStepLinkedToolState.parameter_model_for(parsed_tool.inputs)
    linked_model.model_validate(linked_step["state"])
```

This is already close to what exists — just ensure it's clean.

### Phase 6: Schema Generation for External Tools (Optional, 1 day)

#### Step 6.1: JSON Schema from workflow_step model
```python
def format2_state_json_schema(parsed_tool):
    model = WorkflowStepToolState.parameter_model_for(parsed_tool.inputs)
    return model.model_json_schema(mode="validation")
```

Serve via Tool Shed 2.0 API. External tools validate format2 state without Galaxy.

## How This Enables Each Deliverable

| Deliverable | How It Works |
|---|---|
| **D1: Conversion** | `parse_native_to_workflow_step_linked()` + `linked_to_format2()` — representation transforms using visitor pattern. No per-type code. |
| **D2: Validation** | `WorkflowStepToolState.parameter_model_for(inputs).model_validate(state)` — already exists, just needs wiring. |
| **D3: Native Validator** | `parse_native_to_workflow_step_linked()` validates native state by parsing and validating as `workflow_step_linked`. |
| **D4: Format2 Validator** | `validate_step_against()` in validation_format2.py — already uses both representations. |
| **D5: Round-Trip** | Full pipeline: native → `workflow_step_linked` → `workflow_step` → validate → reverse → compare. Both directions validated. |
| **D6: Export** | Export calls `convert_state_to_format2()` per step, producing `state` (not `tool_state`). Falls back on failure. |

## Advantages

1. **No new representation** — reuses existing `workflow_step`/`workflow_step_linked` pair. No 13th representation to maintain.
2. **All parameter types work immediately** — `pydantic_template("workflow_step")` already defined for every parameter model class. No per-type conversion code.
3. **Visitor pattern handles tree traversal** — conditionals, repeats, sections all handled by `visit_input_values()` recursion.
4. **Validated at every step** — parse → validate → transform → validate → output. Errors caught early.
5. **Testable via existing infrastructure** — `parameter_specification.yml` already has `workflow_step_valid`/`workflow_step_invalid` entries.
6. **JSON Schema for free** — `model.model_json_schema()` on existing models.

## Risks

1. **Native parsing complexity** — The double-encoded JSON with per-value string encoding is the hardest part. The visitor callback needs to handle type coercion (string "5" → int 5, string "true" → bool True) correctly for each parameter type.
2. **Legacy native encodings** — Some older workflows have triple-encoded JSON or other legacy formats. The parser needs to handle these gracefully.
3. **`workflow_step` model completeness unknown** — We won't know if the models are complete until we start validating real workflows. Expect to discover and fix gaps.

## Resolved Decisions

- **Defaults:** Don't fill defaults. Native (.ga) workflows are essentially always fully filled in. Format2 workflows may have absent defaults from hand-coding — that's expected and valid.
- **`$link` in state:** `workflow_step` should fail validation if `$link` markers appear. `$link` is frowned upon and not expected in real workflows. `workflow_step_linked` handles connection markers and may be used as an intermediary during conversion.
- **Dynamic selects:** Lenient pass-through when options aren't available at validation time.
- **`__current_case__` in reverse pipeline:** Assume omitting it works fine. Validate via Galaxy framework tests and IWC corpus — fixing any defects is a project deliverable.

## Open Questions

- Where does round-trip utility live — galaxy-tool-util, gxformat2, or both?
