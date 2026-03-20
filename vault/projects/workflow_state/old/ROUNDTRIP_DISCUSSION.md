# Roundtrip Conversion: Schema-Aware State Re-encoding

## Problem

`python_to_workflow()` in gxformat2 is schema-unaware — it does `json.dumps(value)` for each state key without knowing parameter types. So `["35"]` (correct typed list for a `multiple: true` select) stays a list instead of becoming `"35"` (comma-delimited string that native format expects).

## Current Flow

```
1. native dict
   ↓  from_galaxy_native()          [schema-unaware, produces tool_state not state]
2. format2 dict (with tool_state)
   ↓  replace_tool_state_with_format2_state()  [schema-AWARE, replaces tool_state → state]
3. format2 dict (with state)
   ↓  python_to_workflow()           [schema-unaware, re-encodes state → tool_state BADLY]
4. native' dict (with mangled tool_state)
```

## Options

### Option A: Post-process after `python_to_workflow`

After step 3, walk the reimported native tool_state with tool definitions and fix up encodings. Contained entirely in our code.

```
4. native' dict
   ↓  normalize_native_tool_state(native', get_tool_info)  [schema-aware fixup]
5. native'' dict (correctly encoded)
```

**Pro:** No gxformat2 changes. **Con:** Patching up gxformat2's output — fragile if gxformat2 changes encoding.

### Option B: Protocol/callback in gxformat2's `python_to_workflow`

Add an optional `encode_tool_state` callback to `python_to_workflow`:

```python
# gxformat2 side
def python_to_workflow(workflow_dict, galaxy_interface=None, encode_tool_state=None):
    ...
    if encode_tool_state:
        tool_state = encode_tool_state(step, state_dict)
    else:
        tool_state = {k: json.dumps(v) for k, v in state_dict.items()}
```

```python
# Our side - provide the callback
def _schema_aware_encode(step, state_dict):
    parsed_tool = get_tool_info(step["tool_id"], step["tool_version"])
    return encode_state_to_native(parsed_tool, state_dict)

native_prime = python_to_workflow(f2, encode_tool_state=_schema_aware_encode)
```

**Pro:** Clean integration point, gxformat2 stays tool-definition-free. **Con:** Requires gxformat2 release.

### Option C: Bypass `python_to_workflow` for state encoding entirely

We already have schema-aware native→format2 conversion. Build the reverse (`convert_state_to_native`) and use `python_to_workflow` only for structural conversion (steps, connections, topology), then overwrite tool_state ourselves.

```
3. python_to_workflow()              [structural only]
4. for each tool step:
     convert_state_to_native(format2_state, parsed_tool) → tool_state
```

Mirrors how `replace_tool_state_with_format2_state` already works on the forward path.

**Pro:** Symmetric with existing forward path, no gxformat2 changes needed. **Con:** Duplicates some of gxformat2's state encoding logic.

## Recommendation

**Option C** feels most natural given existing architecture — we already intercept the forward path with `replace_tool_state_with_format2_state`, doing the same on the reverse is symmetric. New pieces:

1. **`convert_state_to_native()`** — reverse of `convert_state_to_format2()`. Walks format2 state dict with tool definitions, re-encodes multi-selects to comma-delimited, wraps values in double-encoded JSON strings native format expects.

2. **`replace_native_tool_state_with_schema_aware()`** — analogous to `replace_tool_state_with_format2_state()`, walks reimported native steps and replaces schema-unaware tool_state with schema-aware encoding.

3. Wire into `roundtrip_validate()` after `python_to_workflow()`.

Long-term, Option B (gxformat2 callback) is worth pursuing too — it would let any consumer of `python_to_workflow` bring their own encoder. But Option C unblocks us now with zero upstream dependencies.

## Unresolved Questions

- Does `convert_state_to_native` need to handle `ConnectedValue` / `RuntimeValue` re-encoding?
- Is there value in making `convert_state_to_native` a standalone CLI tool (`galaxy-workflow-export-native`)?

## Related

- gxformat2 issue for unlabeled input sentinel: https://github.com/galaxyproject/gxformat2/issues/143
- The `comment_char` example: `query_tabular` tool has a `gx_select` with `multiple: true`, values are ASCII codes as strings. Native stores `"35"`, our converter correctly produces `["35"]`, but `python_to_workflow` can't reverse it.
