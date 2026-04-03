# Plan: Schema-Aware Depth-0 Decode for Native tool_state

**Status:** Draft
**Branch:** `wf_tool_state`
**Date:** 2026-03-27

## Problem

Native `tool_state` is a JSON string. After the outer `json.loads()` (done by
`NormalizedNativeStep`), the root dict values are plain strings like `"2"`,
`"true"`, `'{"__class__": "ConnectedValue"}'`. These come from Galaxy's
`params_to_strings()` which stringifies everything before the dict is
`json.dumps`'d.

`decode_double_encoded_values()` blindly `json.loads()` every string value,
recursively. This corrupts leaf types:

- `"2"` (gx_text/gx_hidden) → `json.loads("2")` → `2` (int)
- `"false"` (gx_text) → `json.loads("false")` → `False` (bool)
- `"null"` (gx_text) → `json.loads("null")` → `None`

The corruption happens at **every depth** — both root-level values and values
inside decoded containers. Band-aids: `coerce_select_value()`, ConnectedValue
exception swallowing in `_validate_converted_result`.

### Encoding Is One Level Deep

IWC corpus analysis (25 .ga workflows): values inside decoded containers are
already native Python types (str, int, bool). Zero instances of further JSON
strings needing decode at depth 1+.

The walker's `as_dict()`/`as_list()` already handle containers correctly at
all depths — they `json.loads()` strings, pass through dicts/lists. The gap
is leaf values: blind `json.loads()` can't distinguish `"2"` meaning string
`"2"` (gx_text) from `"2"` meaning integer candidate (gx_integer).

## Approach

Replace `decode_double_encoded_values()` with a schema-aware decode that runs
once at depth 0. For each root value:

1. Try `json.loads()` — needed to unwrap containers and structured values
2. Check: did the decode lose string-y-ness that the schema says to keep?
3. If so, restore the original string

After this pass, the dict is fully decoded — containers are dicts/lists, leaves
are correctly-typed Python values. The walker and all downstream callbacks never
think about JSON decoding. At depth 1+, values are already native (IWC
evidence), and `as_dict()`/`as_list()` in the walker are no-ops.

## Design

### New function: `decode_state_values()`

```python
# Set of parameter types whose values must remain strings even if
# json.loads() would produce a non-string (int, bool, None, etc.).
_STRING_PARAM_TYPES = frozenset({
    "gx_text",
    "gx_hidden",
    "gx_color",
    "gx_genomebuild",
    "gx_baseurl",
    "gx_directory_uri",
    "gx_group_tag",
    "gx_select",
})


def decode_state_values(
    state: dict,
    tool_inputs: List[ToolParameterT],
) -> dict:
    """Decode root-level values in a native tool_state dict, schema-aware.

    Tries json.loads() on each string value. If the parameter type says the
    value should be a string and json.loads() produced a non-string (int, bool,
    None), restores the original string. This prevents type corruption for
    gx_text/gx_hidden params whose values happen to be valid JSON ("2", "true",
    "null", "false").

    Containers (conditionals, sections, repeats) are decoded to dicts/lists.
    Values inside those containers are already native types (encoding is 1
    level deep) and are not touched.

    Only operates on root-level values. Does not recurse.
    """
    param_type_map = {inp.name: inp.parameter_type for inp in tool_inputs}

    for key, value in list(state.items()):
        if not isinstance(value, str):
            continue
        try:
            decoded = json.loads(value)
        except (json.JSONDecodeError, TypeError):
            continue  # genuinely a plain string, leave as-is

        param_type = param_type_map.get(key)
        if param_type in _STRING_PARAM_TYPES and not isinstance(decoded, str):
            # json.loads("2") gave int 2, but schema says this should be a
            # string. Restore original.
            continue

        state[key] = decoded
```

Key properties:
- **Centralizes all JSON decoding** — downstream code receives a fully-decoded
  dict and never calls `json.loads()` on state values
- **Schema-aware** — uses the tool parameter type to decide whether string-y-ness
  should be preserved
- **Non-recursive** — only touches root-level values. Depth 1+ values are
  already native types (IWC evidence). Walker's `as_dict()`/`as_list()` remain
  as fallback if any container value is unexpectedly still a string at depth 1+.
- **Conservative** — only restores the original when json.loads produced a
  non-string. If json.loads("hello") somehow succeeded and gave a string,
  that's fine — string-y-ness is preserved either way.

### What about values not in the schema?

Bookkeeping keys (`__current_case__`, `__page__`, etc.) and stale keys won't
be in `param_type_map`. For these, `param_type` is `None`, which is not in
`_STRING_PARAM_TYPES`, so they get the blind decode. This is correct —
`__current_case__` stores an integer, and stale keys are best-effort.

### Wire it into `step_tool_state()`

`step_tool_state()` needs tool_inputs to call `decode_state_values()`. Today
it only takes a step. Two options:

**Option A: Add tool_inputs parameter to `step_tool_state()`**

```python
def step_tool_state(step: StepLike, tool_inputs: Optional[List[ToolParameterT]] = None) -> dict:
    if isinstance(step, NormalizedNativeStep):
        tool_state = dict(step.tool_state)
    else:
        tool_state = step.get("tool_state")
        assert tool_state is not None
        if isinstance(tool_state, str):
            tool_state = json.loads(tool_state)
    if tool_inputs is not None:
        decode_state_values(tool_state, tool_inputs)
    else:
        # Fallback: blind decode for callers that don't have tool_inputs.
        # Same as today. Allows incremental migration.
        decode_double_encoded_values(tool_state)
    return tool_state
```

This allows incremental migration — callers that have tool_inputs pass them
and get correct decoding. Callers that don't still get the old behavior. Once
all callers are migrated, remove the fallback.

**Option B: Callers call `decode_state_values()` themselves**

`step_tool_state()` stops doing per-value decode entirely (just returns the
outer-decoded dict). Callers that have tool_inputs call `decode_state_values()`
explicitly. This is simpler but requires all callers to change at once.

**Recommendation: Option A** — allows incremental migration and keeps
`step_tool_state()` as the single entry point.

### Walker impact

After `decode_state_values()`, the walker receives a dict where:
- Containers are already dicts/lists → `as_dict()`/`as_list()` are no-ops
- Leaves are correctly-typed Python values → callbacks receive correct types

No walker changes needed.

### Leaf callback impact

Callbacks receive the same types they do today for most values. The difference
is for string params with JSON-valid values:

- `gx_text` with value `"2"`: was `2` (int), now `"2"` (string). **The fix.**
- `gx_hidden` with value `"false"`: was `False` (bool), now `"false"` (string).
- `gx_select` with value `"true"`: was `True` (bool), now `"true"` (string).
  `coerce_select_value()` int/bool branches become dead code.

No callback changes required — they already handle string inputs for these
types. The corruption was the input being wrong, not the callback being wrong.

## Steps

### Step 1: Add `decode_state_values()` to `_util.py`

- New function with `_STRING_PARAM_TYPES` set
- Modify `step_tool_state()` with optional `tool_inputs` parameter (Option A)
- Unit tests:
  - `gx_hidden` value `"2"` → stays `"2"` (string, not int)
  - `gx_text` value `"false"` → stays `"false"` (string, not bool)
  - `gx_text` value `"null"` → stays `"null"` (string, not None)
  - `gx_integer` value `"2"` → decoded to `2` (int) — not a string param
  - `gx_data` value `'{"__class__":"ConnectedValue"}'` → decoded to dict
  - Container value `'{"test": "val"}'` → decoded to dict
  - `__current_case__` value `"0"` → decoded to `0` (int) — not in schema
  - `gx_text` value `"hello world"` → stays `"hello world"` (json.loads
    fails, left as-is)

### Step 2: Migrate callers to pass tool_inputs

Each caller of `step_tool_state()` that has access to tool_inputs:

| Caller | Has tool_inputs? | Migration |
|---|---|---|
| `convert.py:_convert_valid_state_to_format2()` | Yes (`parsed_tool.inputs`) | Pass tool_inputs |
| `validation_native.py:validate_native_step_against()` | Yes (`parsed_tool.inputs`) | Pass tool_inputs |
| `connection_graph.py` | Yes (has parsed_tool) | Pass tool_inputs |
| `stale_keys.py:classify_stale_keys()` | Yes (`tool_inputs` param) | Call `decode_state_values()` instead of `decode_double_encoded_values()` directly |
| `roundtrip.py` | Indirectly (via convert/validate) | Gets correct state from callers above |

### Step 3: Verify IWC corpus

- Run conversion sweep — lofreq `defqual`, deeptools `scaleFactors` as strings
- Run validation sweep — all 120 pass
- Run roundtrip sweep — same or better results

### Step 4: Remove fallback and dead code

- Remove `decode_double_encoded_values()` from `_util.py`
- Remove `tool_inputs=None` fallback from `step_tool_state()`
- Remove `coerce_select_value()` int/bool branches (or leave for safety)
- Remove ConnectedValue exception swallowing in `_validate_converted_result`
  if sweep passes without it

## Open Questions

1. **`roundtrip.py` `_try_json_decode()` for comparison.** With correctly-
   decoded state, this may simplify. Needs testing — roundtrip compares
   original vs re-encoded state where encoding levels may differ.

2. **Edge cases beyond IWC.** Encoding depth assumption is empirical. Walker's
   `as_dict()`/`as_list()` still handle unexpected JSON strings at depth 1+
   for containers. For leaves at depth 1+ that are unexpectedly JSON strings,
   no protection — but IWC evidence says this doesn't occur. Monitor via
   roundtrip on broader corpora.

3. **Conditional test parameters as select — N/A.** The test param lives
   inside the conditional's container dict, so it's at depth 1+ where values
   are already native strings. `decode_state_values()` only operates at
   depth 0 and never sees it.
