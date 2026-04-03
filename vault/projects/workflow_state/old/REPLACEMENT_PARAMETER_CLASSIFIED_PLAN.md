# Plan: Classified Replacement Parameter Detection

**Branch:** `wf_tool_state`
**Date:** 2026-03-27
**Status:** Implemented
**Parent:** FORMAT2_STATE_VALIDATION_CONVERGENCE.md (Step 2 prerequisite)

## Goal

New module `legacy_parameters.py` in `workflow_state/` with two public functions: one scans native state, one scans format2 state. Both walk the parameter tree type-aware and return a classification of whether replacement parameters are present, not just a boolean.

## Classification Model

```python
class ReplacementClassification(str, Enum):
    YES = "yes"           # ${...}/#{...} found in a type where it can't be a literal value
    MAYBE = "maybe"       # ${...}/#{...} found only in text/hidden fields where it could be a literal
    NO = "no"             # no replacement patterns found anywhere
```

Logic per parameter type:

| parameter_type | `${...}` found | Classification |
|---|---|---|
| `gx_integer` | yes | YES |
| `gx_float` | yes | YES |
| `gx_boolean` | yes | YES |
| `gx_color` | yes | YES |
| `gx_data_column` | yes | YES |
| `gx_select` (not multiple) | yes | YES (not a valid option literal) |
| `gx_select` (multiple, element) | yes | YES |
| `gx_text` | yes | MAYBE |
| `gx_hidden` | yes | MAYBE |
| `gx_data` / `gx_data_collection` | N/A | skipped (always ConnectedValue/RuntimeValue/None) |
| `gx_rules` | N/A | skipped (opaque blob) |
| `gx_drill_down` | yes | YES (structured value expected) |

Aggregation: `YES` wins over `MAYBE` wins over `NO`. If any leaf is YES the result is YES. If no YES but some MAYBE, result is MAYBE. Otherwise NO.

## API

```python
# legacy_parameters.py

@dataclass
class ReplacementScanResult:
    classification: ReplacementClassification
    hits: list[ReplacementHit]  # details for debugging/reporting

@dataclass
class ReplacementHit:
    state_path: str            # e.g. "seed_source|seed" or "num_lines"
    parameter_type: str        # e.g. "gx_integer"
    value: str                 # the actual value containing ${...}
    classification: ReplacementClassification  # per-hit classification

def scan_native_state(
    tool_inputs: List[ToolParameterT],
    tool_state: dict,
    input_connections: dict,
) -> ReplacementScanResult:
    """Scan decoded native tool_state for replacement parameters."""

def scan_format2_state(
    tool_inputs: List[ToolParameterT],
    state: dict,
) -> ReplacementScanResult:
    """Scan format2 state dict for replacement parameters."""
```

## Implementation

### `scan_native_state`

Uses `walk_native_state(input_connections, tool_inputs, tool_state, callback)`.

Callback:
```python
def check_leaf(tool_input, value, state_path):
    parameter_type = tool_input.parameter_type
    # skip non-string values, connected/runtime markers, data/rules params
    if not isinstance(value, str) or is_connected_or_runtime(value):
        return SKIP_VALUE
    if parameter_type in ("gx_data", "gx_data_collection", "gx_rules"):
        return SKIP_VALUE
    if is_replacement_param(value):
        hit_class = _classify_hit(parameter_type)
        hits.append(ReplacementHit(state_path, parameter_type, value, hit_class))
    return SKIP_VALUE
```

Native values are already strings (double-encoded then decoded by walker) so `isinstance(value, str)` catches them naturally. The walker handles conditional branch selection, repeat expansion, section descent.

### `scan_format2_state`

Uses `walk_format2_state(tool_inputs, state, callback)`.

Same callback logic. Format2 values for int/float are already typed (int, float) after conversion — but if replacement params were passed through by the converter they remain as strings. So checking `isinstance(value, str) and is_replacement_param(value)` still works.

### `_classify_hit` helper

```python
_MAYBE_TYPES = frozenset({"gx_text", "gx_hidden"})

def _classify_hit(parameter_type: str) -> ReplacementClassification:
    if parameter_type in _MAYBE_TYPES:
        return ReplacementClassification.MAYBE
    return ReplacementClassification.YES
```

### Aggregation

```python
def _aggregate(hits: list[ReplacementHit]) -> ReplacementClassification:
    if not hits:
        return ReplacementClassification.NO
    if any(h.classification == ReplacementClassification.YES for h in hits):
        return ReplacementClassification.YES
    return ReplacementClassification.MAYBE
```

## Test Plan

**File:** `test/unit/tool_util/test_legacy_parameters.py`

Use `parameter_bundle_for_file` to load real tool definitions. Tests use the `random_lines1` tool (stock tool, available via `parameter_bundle_for_framework_tool`).

### Red-to-green cases

**1. Native — YES: integer field with replacement param**
```python
# Modeled on test_workflow_randomlines_legacy_params.ga
tool_state = {"num_lines": "${num}", "input": {"__class__": "RuntimeValue"},
              "seed_source": {"seed_source_selector": "no_seed"}}
result = scan_native_state(random_lines_inputs, tool_state, input_connections={})
assert result.classification == ReplacementClassification.YES
assert len(result.hits) == 1
assert result.hits[0].parameter_type == "gx_integer"
assert result.hits[0].state_path == "num_lines"
```

**2. Native — YES: integer + text replacement in conditional**
```python
# seed is gx_text, num_lines is gx_integer — integer wins
tool_state = {"num_lines": "${num}", "input": {"__class__": "RuntimeValue"},
              "seed_source": {"seed_source_selector": "set_seed", "seed": "${seed}"}}
result = scan_native_state(random_lines_inputs, tool_state, input_connections={})
assert result.classification == ReplacementClassification.YES
assert len(result.hits) == 2
# One YES (integer), one MAYBE (text)
```

**3. Native — MAYBE: only text field has replacement**
```python
tool_state = {"num_lines": "5", "input": {"__class__": "RuntimeValue"},
              "seed_source": {"seed_source_selector": "set_seed", "seed": "${seed}"}}
result = scan_native_state(random_lines_inputs, tool_state, input_connections={})
assert result.classification == ReplacementClassification.MAYBE
assert len(result.hits) == 1
assert result.hits[0].parameter_type == "gx_text"
```

**4. Native — NO: normal state, no replacements**
```python
tool_state = {"num_lines": "5", "input": {"__class__": "RuntimeValue"},
              "seed_source": {"seed_source_selector": "no_seed"}}
result = scan_native_state(random_lines_inputs, tool_state, input_connections={})
assert result.classification == ReplacementClassification.NO
assert len(result.hits) == 0
```

**5. Format2 — YES: integer field**
```python
state = {"num_lines": "${num}", "seed_source": {"seed_source_selector": "no_seed"}}
result = scan_format2_state(random_lines_inputs, state)
assert result.classification == ReplacementClassification.YES
```

**6. Format2 — NO: normal typed values**
```python
state = {"num_lines": 5, "seed_source": {"seed_source_selector": "no_seed"}}
result = scan_format2_state(random_lines_inputs, state)
assert result.classification == ReplacementClassification.NO
```

**7. Format2 — NO: integer value is int, not string (post-conversion normal case)**
```python
# After proper conversion, integers are ints not strings — no false positives
state = {"num_lines": 42}
result = scan_format2_state(random_lines_inputs, state)
assert result.classification == ReplacementClassification.NO
```

**8. Edge: `${` in text value that isn't a replacement — still MAYBE**
```python
# A text field could legitimately contain "${" — that's why it's MAYBE not YES
tool_state = {"num_lines": "5", "input": {"__class__": "RuntimeValue"},
              "seed_source": {"seed_source_selector": "set_seed", "seed": "literal ${braces} in text"}}
result = scan_native_state(random_lines_inputs, tool_state, input_connections={})
assert result.classification == ReplacementClassification.MAYBE
```

### Additional test tool coverage

For `gx_float`, `gx_boolean`, `gx_select`, `gx_data_column` — use `parameter_bundle_for_file("gx_float")` etc. from the existing parameter test tools. Construct minimal states with replacement values and confirm YES classification.

## Integration Points

Once this exists:

1. **convert.py** replaces `_state_has_replacement_params` with:
   ```python
   scan = scan_format2_state(parsed_tool.inputs, linked_state)
   templated = scan.classification != ReplacementClassification.NO
   ```
   Then passes `templated` to the unified validation (per FORMAT2_STATE_VALIDATION_CONVERGENCE Step 4).

2. **validation_format2.py** can call `scan_format2_state` before validation to select model pair.

3. **CLI reporting** — scan results can feed into validation reports ("step X uses legacy replacement parameters").

## File Layout

```
packages/tool_util/galaxy/tool_util/workflow_state/
    legacy_parameters.py     # NEW — scan + classify
test/unit/tool_util/
    test_legacy_parameters.py  # NEW — unit tests
```

## Unresolved Questions

- Should `scan_native_state` accept raw (double-encoded) `tool_state` strings, or require pre-decoded dicts? The walker handles decoding, so pre-decoded dicts (what we have after `json.loads`) seem right — matches existing callers.
- `gx_select` with `${...}` — should we check if the value happens to match a valid option before classifying YES? (Probably not worth it — if someone has an option literally named `${foo}` they have bigger problems.)
- Should we also detect `#{...}` separately from `${...}` in the hits, or treat them identically? Current `is_replacement_param` treats both the same. Separate tracking could help with PJA-vs-state distinction.
