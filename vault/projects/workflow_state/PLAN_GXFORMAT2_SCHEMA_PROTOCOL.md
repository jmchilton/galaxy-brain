# Plan: Symmetric Schema-Aware Protocol for gxformat2

## Goal

Add optional callback protocols to gxformat2's `from_galaxy_native()` and `python_to_workflow()` so that schema-aware consumers (like galaxy-tool-util) can inject tool-definition-aware state conversion on both the export and import paths. gxformat2 stays schema-free; the callbacks are optional with unchanged default behavior.

## Current State

**Export (native → format2):**
- `from_galaxy_native()` emits `tool_state` (decoded but per-key JSON-encoded dict) for tool steps
- Our unmerged `replace_tool_state_with_format2_state()` patches this after the fact — iterates format2 steps, finds matching native steps, calls `convert_state_to_format2()`, replaces `tool_state` with `state` + `in`

**Import (format2 → native):**
- `python_to_workflow()` → `transform_tool()` encodes `state` back to `tool_state` via `json.dumps(value)` per key
- No schema-aware post-processing exists on this path

Both post-processing approaches are fragile — they depend on matching steps between native and format2 dicts after the fact, and duplicate iteration logic that gxformat2 already does internally.

## Design

### Export Callback: `ConvertToolState`

A callable that gxformat2 accepts but doesn't implement. **Returns only `state` — connections are always handled by gxformat2's `_convert_input_connections()`.**

```python
# In gxformat2 — e.g., gxformat2/export.py

from typing import Any, Dict, Optional

# Optional[Callable[[dict], Optional[Dict[str, Any]]]]
# Accepts a native step dict (with tool_id, tool_version, tool_state).
# Returns a format2 state dict, or None to fall back to default tool_state passthrough.
ConvertToolStateFn = Optional[Callable[[dict], Optional[Dict[str, Any]]]]
```

**Why no `in_connections`?** The original plan had the callback returning both `state` and `in_connections`. Deep analysis revealed this has a fatal flaw:

1. `_convert_input_connections()` writes to `to_format2_step["in"]` — calling it after the callback would **overwrite** the callback's connections
2. The callback can't produce correct `source` references (e.g., `"MultiQC/report_json"`) because it doesn't have access to gxformat2's internal `label_map` that resolves step IDs → step labels
3. `_convert_input_connections` and the callback's connections are not disjoint — both read from the same native `input_connections` dict

The callback's real job is schema-aware **value conversion**: turning native tool_state into clean format2 `state` dicts (int strings→ints, booleans, multiple selects→lists, etc.). Connected parameters should be omitted from `state` (detectable via ConnectedValue markers in tool_state). Connections are already correctly handled by `_convert_input_connections`.

### Import Callback: `EncodeToolState`

```python
# Optional[Callable[[dict, Dict[str, Any]], Optional[Dict[str, Any]]]]
# Accepts a step dict (with tool_id, tool_version) and the format2 state dict
# (post-setup_connected_values — may contain ConnectedValue markers).
# Returns a dict of {param_name: encoded_value} for native tool_state,
# or None to fall back to default json.dumps encoding.
EncodeToolStateFn = Optional[Callable[[dict, Dict[str, Any]], Optional[Dict[str, Any]]]]
```

**ConnectedValue handling:** `setup_connected_values()` runs **before** the callback is called. It replaces `$link` references with `{"__class__": "ConnectedValue"}` marker dicts and extracts link targets into the `connect` dict for `input_connections`. The callback sees these markers in the state dict and should pass them through as `json.dumps(marker)` — exactly what the default path does. Simple detection: `isinstance(value, dict) and value.get("__class__") == "ConnectedValue"`.

**RuntimeValue is irrelevant to the callback.** RuntimeValue markers are injected in a separate loop *after* the state encoding, for `runtime_inputs`. The callback never sees them.

### Changes to `from_galaxy_native()`

```python
def from_galaxy_native(
    native_workflow_dict,
    tool_interface=None,
    json_wrapper=False,
    compact=False,
    convert_tool_state=None,   # NEW: Optional[ConvertToolStateFn]
):
```

In the tool step handling block (export.py:148-162), currently:

```python
elif module_type == "tool":
    ...
    tool_state = _tool_state(step)
    tool_state.pop("__page__", None)
    tool_state.pop("__rerun_remap_job_id__", None)
    step_dict["tool_state"] = tool_state
    _convert_input_connections(step, step_dict, label_map)
```

With the callback:

```python
elif module_type == "tool":
    ...
    converted_state = None
    if convert_tool_state is not None:
        try:
            converted_state = convert_tool_state(step)
        except Exception:
            log.warning("convert_tool_state callback failed for %s, falling back to default",
                        step.get("tool_id"), exc_info=True)

    if converted_state is not None:
        step_dict["state"] = converted_state
        # No tool_state key — state and tool_state are mutually exclusive
    else:
        tool_state = _tool_state(step)
        tool_state.pop("__page__", None)
        tool_state.pop("__rerun_remap_job_id__", None)
        step_dict["tool_state"] = tool_state

    # Connections always handled by gxformat2 — no overlap with callback
    _convert_input_connections(step, step_dict, label_map)
```

Key points:
- `state` and `tool_state` are **mutually exclusive** — when callback succeeds, only `state` is set
- `_convert_input_connections` is **always** called — it handles all connections regardless of callback
- Exception handling logs a warning instead of silently swallowing (bugs in the callback should be visible)

For subworkflows, pass `convert_tool_state` through the recursive call (export.py:142):

```python
subworkflow = from_galaxy_native(
    subworkflow_native_dict,
    tool_interface=tool_interface,
    json_wrapper=False,
    compact=compact,
    convert_tool_state=convert_tool_state,  # Pass through
)
```

### Changes to `python_to_workflow()`

Rename the boolean for clarity and add the callback:

```python
class ImportOptions:
    def __init__(self):
        self.deduplicate_subworkflows = False
        self.encode_tool_state = True          # existing: json-encode values?
        self.native_state_encoder = None       # NEW: Optional[EncodeToolStateFn]
```

In `transform_tool()` (converter.py:500-506), currently:

```python
if "state" in step or runtime_inputs:
    encode = context.import_options.encode_tool_state
    step_state = step.pop("state", {})
    step_state = setup_connected_values(step_state, append_to=connect)
    for key, value in step_state.items():
        tool_state[key] = json.dumps(value) if encode else value
```

With the callback:

```python
if "state" in step or runtime_inputs:
    encode = context.import_options.encode_tool_state
    encoder = context.import_options.native_state_encoder
    step_state = step.pop("state", {})
    step_state = setup_connected_values(step_state, append_to=connect)

    encoded = None
    if encoder is not None:
        try:
            encoded = encoder(step, step_state)
        except Exception:
            log.warning("native_state_encoder callback failed for %s, falling back to default",
                        step.get("tool_id"), exc_info=True)

    if encoded is not None:
        tool_state.update(encoded)
    else:
        for key, value in step_state.items():
            tool_state[key] = json.dumps(value) if encode else value
```

Note: `setup_connected_values` runs first regardless — the callback receives state with ConnectedValue markers already substituted, and the `connect` dict is already populated for `_populate_input_connections`.

### galaxy-tool-util Side: Implementing the Callbacks

**Forward callback (native → format2):**

```python
# In galaxy.tool_util.workflow_state.convert

def make_convert_tool_state(get_tool_info: GetToolInfo) -> ConvertToolStateFn:
    """Create a ConvertToolState callback backed by tool definitions."""
    def _convert(native_step: dict) -> Optional[Dict[str, Any]]:
        try:
            f2_state = convert_state_to_format2(native_step, get_tool_info)
            return f2_state.state  # Only the state dict, not connections
        except ConversionValidationFailure:
            return None  # Fall back to default
    return _convert
```

This replaces `replace_tool_state_with_format2_state()` entirely — step matching, subworkflow recursion, and error handling all move into gxformat2's existing iteration.

**Reverse callback (format2 → native):**

```python
def make_encode_tool_state(get_tool_info: GetToolInfo) -> EncodeToolStateFn:
    """Create an EncodeToolState callback backed by tool definitions."""
    def _encode(step: dict, state: dict) -> Optional[dict]:
        tool_id = step.get("tool_id")
        tool_version = step.get("tool_version")
        if not tool_id:
            return None
        try:
            parsed_tool = get_tool_info.get_tool_info(tool_id, tool_version)
            if parsed_tool is None:
                return None
            return encode_state_to_native(parsed_tool, state)
        except Exception:
            return None
    return _encode
```

**New function: `encode_state_to_native()`:**

Reverse of `_convert_scalar_value()`. Walks format2 state dict with tool definitions and re-encodes for native format:

```python
def encode_state_to_native(parsed_tool: ParsedTool, state: dict) -> dict:
    """Encode a format2 state dict to native tool_state encoding."""
    result = {}
    for key, value in state.items():
        # ConnectedValue markers: pass through as json.dumps
        if isinstance(value, dict) and value.get("__class__") == "ConnectedValue":
            result[key] = json.dumps(value)
            continue
        # Walk with tool definition to find parameter type
        # For multiple selects: ["35"] → "35" (join with comma)
        # For everything else: json.dumps(value)
        result[key] = _encode_value(key, value, parsed_tool)
    return result
```

The walker infrastructure already exists (`walk_native_state`). A format2 equivalent or a simpler recursive walk using `ParsedTool.inputs` can handle sections/conditionals/repeats.

### Changes to roundtrip.py

`roundtrip_validate()` becomes much simpler:

```python
def roundtrip_validate(workflow_dict, get_tool_info, ...):
    # Forward: native → format2 with schema-aware conversion
    convert_cb = make_convert_tool_state(get_tool_info)
    format2_dict = from_galaxy_native(
        copy.deepcopy(workflow_dict),
        convert_tool_state=convert_cb,
    )

    # Reverse: format2 → native with schema-aware encoding
    import_options = ImportOptions()
    import_options.native_state_encoder = make_encode_tool_state(get_tool_info)
    native_prime = python_to_workflow(
        copy.deepcopy(format2_dict),
        galaxy_interface=None,
        import_options=import_options,
    )

    # Compare
    diffs = compare_workflow_steps(workflow_dict, native_prime)
    ...
```

**Removed:** `replace_tool_state_with_format2_state()`, `find_matching_native_step()`, `ensure_export_defaults()` — all absorbed by gxformat2's internal step iteration + the callbacks.

## Implementation Order

### Step 1: gxformat2 PR — Add callback parameters

1. Add `convert_tool_state` parameter to `from_galaxy_native()` as `Optional[Callable]` with docstring
2. Add `native_state_encoder` to `ImportOptions` as `Optional[Callable]`
3. Wire both into tool step handling code with fallback to default behavior
4. Log warnings on callback failure (not silent `except: pass`)
5. Ensure `state` and `tool_state` are mutually exclusive on export when callback succeeds
6. Pass `convert_tool_state` through subworkflow recursion in `from_galaxy_native`
7. Tests: verify default behavior unchanged, verify callbacks are called when provided

### Step 2: galaxy-tool-util — Implement `encode_state_to_native()`

1. New function in `convert.py` (or new module `encode.py`)
2. Reverse of `_convert_scalar_value()` — walks format2 state with tool definitions
3. Key conversions:
   - `multiple: true` select lists → comma-delimited strings
   - ConnectedValue markers → `json.dumps(marker)` (passthrough)
   - Everything else: `json.dumps(value)` (same as default)
4. Unit tests with the specific parameter types from the artifacts

### Step 3: galaxy-tool-util — Wire callbacks into roundtrip, remove post-processing

1. Create `make_convert_tool_state()` and `make_encode_tool_state()` factory functions
2. Update `roundtrip_validate()` to use the callbacks instead of post-processing
3. Remove `replace_tool_state_with_format2_state()`, `find_matching_native_step()`, `ensure_export_defaults()` — the forward callback replaces all step-matching and post-processing code
4. Update `galaxy-workflow-export-format2` CLI to use the callback
5. Run full roundtrip test suite — the multiple-select diffs should disappear

### Step 4: Pin gxformat2 >= new version

1. Update Galaxy's gxformat2 dependency pin
2. Run CI

## Resolved Questions

### Q: Should the export callback return `in_connections`?
**No.** `_convert_input_connections()` and the callback's connections fully overlap — both read from the same native `input_connections` dict. Worse, `_convert_input_connections` ends with `to_format2_step["in"] = in_dict` which would overwrite the callback's output. And the callback can't produce correct `source` references without gxformat2's internal `label_map`. The callback returns only `state`; connections are always handled by `_convert_input_connections`.

### Q: Should `encode_state_to_native` handle ConnectedValue/RuntimeValue markers?
**ConnectedValue: yes, trivially.** `setup_connected_values()` runs before the callback, replacing `$link` with `{"__class__": "ConnectedValue"}` markers. The callback should detect these and `json.dumps` them — same as default path. Detection: `isinstance(value, dict) and value.get("__class__") == "ConnectedValue"`.

**RuntimeValue: N/A.** RuntimeValue markers are injected in a separate loop after state encoding, for `runtime_inputs`. The callback never sees them.

### Q: Should the export callback receive workflow context (step_id, position)?
**No.** The current `convert_state_to_format2()` only needs the native step dict (tool_id, tool_version, tool_state). The step dict already contains everything needed for tool lookup.

### Q: Should the callback handle `pick_value` steps?
**No** (per user input). gxformat2 already understands this format — don't mess with it as part of this work.

### Q: Naming for the import-side callback?
`native_state_encoder` on `ImportOptions` — avoids confusion with the existing `encode_tool_state` boolean.

### Q: Does the import callback's `step` dict still have tool_id/tool_version?
**Yes.** In `transform_tool()`, by the time the callback would be called, only `state` and `in`/`connect` have been popped. `tool_id` is validated on entry (line 373) and never removed. `tool_version` is set as a default (line 379) and never removed. The callback receives `(step, step_state)` where `step` still has `tool_id`, `tool_version`, `name`, `post_job_actions`, etc.

## Unresolved Questions

None.
