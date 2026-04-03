# Plan: Schema-Aware Single-Pass State Decoding

**Status:** Draft
**Branch:** `wf_tool_state`
**Date:** 2026-03-27

## Problem

Native workflow `tool_state` uses double-encoding: the outer dict is JSON, and each
value inside is also a JSON string. Decoding this requires knowing which values are
containers (should decode to dict/list) and which are leaf strings (should stay as
strings). Currently `decode_double_encoded_values()` in `_util.py:66` does a blind
recursive `json.loads()` on every string value. This corrupts leaf types:

- `"2"` (hidden param string) → `2` (int)
- `"false"` (text param) → `False` (bool)
- `"null"` (text param) → `None`

The corruption happens *before* any schema-aware code sees the state. The walker,
convert, and validate callbacks all receive already-damaged values. Band-aids like
`coerce_select_value()` and the `ConnectedValue` exception swallowing in
`_validate_converted_result` exist to paper over this.

### Root Cause

`decode_double_encoded_values()` is schema-unaware. It cannot distinguish:
- `"2"` meaning the literal string `"2"` (a `gx_hidden`/`gx_text` value)
- `"2"` meaning JSON-encoded integer `2` (never actually occurs for leaves)

The function was written as a convenience to flatten the double-encoding before
handing state to consumers. But without the tool schema, it guesses wrong for any
leaf value that happens to be valid JSON.

### Why the Walker's Container Decoding Is Fine

The walker's `as_dict()`/`as_list()` functions also call `json.loads()`, but they
are only invoked when the tool schema says "this parameter is a conditional/section/
repeat." Container values in native tool_state ARE always JSON-encoded dicts or
lists — there is no ambiguity. Leaf values never pass through these functions.

### Encoding Is One Level Deep

Empirical analysis of all 25 IWC .ga workflows shows the per-value JSON encoding
is exactly one level deep:

- **Depth 0 (root dict values)**: 33 values across the corpus required
  `json.loads()` to decode containers (repeats, conditionals, sections).
- **Depth 1+ (values inside decoded containers)**: **0** values needed further
  `json.loads()`. All values were already native Python types (str, int, bool).

The encoding structure is uniform: `json.dumps()` is applied once to each
root-dict value during serialization. Container nesting (e.g. a repeat inside
a section) does NOT add additional layers of JSON string encoding — the inner
values are plain Python types embedded in the container's JSON string.

This means `decode_double_encoded_values()`'s recursive descent is doing
unnecessary work — it recurses into decoded containers and tries `json.loads()`
on values that are already native types. When it happens to succeed (e.g.
`json.loads("2")` → `2`), that's the corruption.

## Approach

Introduce a **state-normalized step** type that guarantees tool_state has been
decoded with schema guidance. Use the type system to enforce that downstream
operations only receive correctly-decoded state.

### Key Insight

The walker already does schema-guided container decoding (via `as_dict()`/`as_list()`)
and conditional branch selection. Normalization requires this same traversal —
you cannot enumerate a conditional's children without resolving the test value to
pick a branch. So normalization uses the walker (or walker-like code), not a
separate simpler function.

## Design

### New Type: `StateResolvedToolState`

A dict-like container produced by walking native tool_state with the tool schema.
Guarantees:

1. **Containers are unwrapped** — conditional/section values are dicts, repeat
   values are lists of dicts. No more JSON-encoded strings for containers.
2. **Leaf values are schema-decoded** — each leaf is decoded according to its
   parameter type. `gx_integer` `"2"` → `2` (int), `gx_text` `"2"` → `"2"`
   (string), `gx_boolean` `"false"` → `False` (bool). No blind `json.loads`,
   no type corruption. The resolved state contains correctly-typed values —
   validated by construction.
3. **Bookkeeping keys are stripped** — `__current_case__`, `__page__`,
   `__rerun_remap_job_id__`, `chromInfo`, etc. are removed during construction.
4. **Branch selection is resolved** — only the active conditional branch's
   parameters are present.
5. **The schema is attached** — carries a reference to the `tool_inputs` used
   for resolution, so consumers don't need to re-resolve.

This is NOT a Pydantic model — it's a thin wrapper around a dict that proves
"this state was decoded correctly." Construction requires tool_inputs; if tool
info is unavailable, you don't get one.

```python
class StateResolvedToolState:
    """Native tool_state decoded with schema guidance.

    Container values are unwrapped dicts/lists. Leaf values are decoded
    per their parameter type — integers are ints, booleans are bools,
    text/hidden values are strings. No blind json.loads has been applied.
    The state dict contains correctly-typed values, validated by
    construction.
    """
    state: dict  # correctly-structured, correctly-typed tree
    tool_inputs: List[ToolParameterT]  # schema used for resolution
    input_connections: dict  # needed for repeat sizing
```

### Construction

A new function `resolve_tool_state()` walks native tool_state with the tool
schema:

```python
def resolve_tool_state(
    tool_inputs: List[ToolParameterT],
    raw_state: dict,  # outer-JSON-decoded, values still JSON strings
    input_connections: dict,
) -> StateResolvedToolState:
```

**Important: `raw_state` is already outer-JSON-decoded.** The caller has already
done `json.loads()` on the `tool_state` string to produce a Python dict. The
values within that dict are still per-value JSON strings (the second layer of
double-encoding). `resolve_tool_state()` does NOT re-decode the root dict — it
only operates on the values inside it, guided by the schema.

#### Two-Phase Decode (Optimized for 1-Level Encoding)

IWC corpus analysis shows encoding is exactly 1 level deep (see "Encoding Is
One Level Deep" above). `resolve_tool_state()` exploits this with a two-phase
approach:

**Phase 1 — Depth 0 (root dict values are JSON strings):**
- Strip bookkeeping keys
- For containers: `json.loads()` to unwrap the JSON string → dict/list,
  then recurse with child tool_inputs
- For leaves: `json.loads()` to unwrap the JSON string → Python primitive,
  then schema-aware type-decode (see table below)

**Phase 2 — Depth 1+ (values are already native Python types):**
- For containers: values are already dicts/lists — recurse directly,
  **no `json.loads()`**
- For leaves: values are already Python strings/ints/bools — schema-aware
  type-decode only, **no `json.loads()`**
- For conditionals: resolve branch via test value, recurse into active branch
- For repeats: size from state length (+ `input_connections` padding)

**Fallback for deeper encoding:** If a value at depth 1+ is unexpectedly a
JSON string where the schema expects a container, `as_dict()`/`as_list()`
will detect `isinstance(value, str)` and fall back to `json.loads()`. This
handles any edge cases beyond IWC without a separate code path — the fast
path (already native type) is an isinstance check, and the slow path
(unexpected JSON string) transparently decodes. The walker already has this
behavior via its existing isinstance guards.

#### Leaf Decoding Rules

At depth 0, leaf values arrive as JSON strings (e.g. `'"2"'` which
`json.loads` gives `"2"`). At depth 1+, leaf values are already Python
types (e.g. `"2"` is already a str). Either way, the type-decode table
operates on the unwrapped Python value:

| Parameter type | Value (example) | Decoded | Rule |
|---|---|---|---|
| `gx_integer` | `"2"` (str) | `2` (int) | `int(value)` — validates it's a valid integer |
| `gx_float` | `"3.14"` (str) | `3.14` (float) | `float(value)` — validates it's a valid float |
| `gx_boolean` | `"false"` (str) | `False` (bool) | `_coerce_bool(value)` — validates boolean |
| `gx_text`, `gx_hidden`, `gx_color`, `gx_genomebuild`, `gx_baseurl`, `gx_directory_uri`, `gx_group_tag` | `"2"` (str) | `"2"` (str) | **No decode** — value is already the correct type |
| `gx_select` | `"option_a"` (str) | `"option_a"` (str) | String passthrough (multiple-select: stays comma-delimited string, split deferred to convert) |
| `gx_data`, `gx_data_collection` | `{"__class__": "ConnectedValue"}` | same (dict) | At depth 0: `json.loads()`. At depth 1+: already a dict. |
| `gx_rules` | `{"rules": [...]}` | same (dict) | At depth 0: `json.loads()`. At depth 1+: already a dict. |

This makes `StateResolvedToolState` **validated by construction** — if a
`gx_integer` leaf contains `"not_a_number"`, resolution fails at construction
time rather than silently passing through to a downstream callback.

Values that are `None`, `"null"`, ConnectedValue/RuntimeValue dicts, or
replacement parameters (`${...}`) are passed through without type coercion.

The function is structurally similar to `walk_native_state()` but with a
built-in type-aware leaf decode instead of an external callback. Could be
implemented as a walker mode or as a separate function that reuses the
container/branch helpers. The depth-aware optimization is internal — the
external API is just `resolve_tool_state(tool_inputs, raw_state,
input_connections)`.

### Walker Changes

Once callers pass `StateResolvedToolState.state` to the walker:

- Container values are already dicts/lists — `as_dict()`/`as_list()` become
  no-ops (value is already the right type, the `isinstance(value, dict)` /
  `isinstance(value, list)` fast paths fire)
- Branch selection runs again (harmless — same result since state structure
  matches)
- Leaf callbacks receive **already-typed values** — ints are ints, bools are
  bools, strings are strings. Callbacks operate on correct Python types, not
  raw JSON strings.

The walker itself doesn't need structural changes. It already handles pre-decoded
containers gracefully.

### Leaf Callback Changes

Currently leaf callbacks in `convert.py` and `validation_native.py` receive
values that have been through `decode_double_encoded_values()` — ints are already
ints, bools are already bools, etc. (but with type corruption for text/hidden
params). After this change, they'll receive **correctly-typed values from
`StateResolvedToolState`** — the resolution step has already done the
schema-aware decode.

This is a significant simplification: callbacks no longer need to do type
coercion themselves. The type coercion that `decode_double_encoded_values()`
did blindly (and incorrectly) is now done correctly during resolution. Callbacks
receive values that are already the right Python type.

**convert.py `convert_leaf`:**
- `gx_integer`: receives `int`. `_convert_scalar_value` can return as-is.
  The `int(value)` call becomes a no-op (already an int). Could simplify.
- `gx_boolean`: receives `bool`. `_coerce_bool()` handles bools already.
  Could simplify to passthrough.
- `gx_text`/`gx_hidden`: receives `str`. **This is the fix** — `"2"` is a
  string, returned as-is. No blind decode ever corrupted it.
- `gx_select`: receives `str`. `coerce_select_value()` still works but the
  `bool`/`int` branches are dead code — values are always strings now.
  Can simplify to remove those branches.
- `gx_rules`: receives `dict` (already decoded during resolution). The
  explicit `json.loads(value)` / `isinstance(value, str)` branch becomes
  dead code. Can simplify.
- `gx_data`/`gx_data_collection`: receives `dict` (ConnectedValue/RuntimeValue
  already decoded during resolution) or `None`. The `isinstance(value, dict)`
  checks work directly. **Open question #1 resolved** — normalization decodes
  these since the schema identifies them as data params with structured values.

**validation_native.py `merge_and_validate`:**
- `gx_integer`: receives `int`. `int(value)` is a no-op. Could simplify to
  just `isinstance(value, int)` check.
- `gx_float`: receives `float` (or `int` for whole numbers). `float(value)`
  is a no-op. Could simplify.
- `gx_select`: receives `str`. `coerce_select_value()` passthrough works.
  Can remove int/bool coercion branches.
- `gx_text` etc.: receives `str`. `pass` — no change needed.
- `gx_data`/`gx_data_collection`: receives `dict` or `None`.
  `isinstance(value, dict)` works directly. No decode needed.

**Key benefit:** Validation errors that previously surfaced only in callbacks
now surface at resolution time. If `gx_integer` has value `"not_a_number"`,
`resolve_tool_state()` raises — you don't need to wait for a downstream
callback to catch it.

### Removal of `decode_double_encoded_values()`

Once all callers go through `StateResolvedToolState`:

1. **`step_tool_state()`** — no longer calls `decode_double_encoded_values()`.
   Returns raw outer-decoded dict. Or: replaced entirely by callers constructing
   `StateResolvedToolState` directly.
2. **`stale_keys.py:classify_stale_keys()`** — uses its own recursive walk
   (`_classify_recursive` + `_recurse_into_containers`), does its own
   `as_dict()` calls for containers. Currently calls
   `decode_double_encoded_values()` at line 96. After: remove that call,
   the recursive walk already handles containers schema-guided.
3. **`roundtrip.py:compare_tool_state()`** — uses `_try_json_decode()` for
   blind comparison. Needs rework to compare resolved states or to be aware
   that leaf values are strings.

### Consumer Migration

Each consumer of `step_tool_state()` migrates to accept
`StateResolvedToolState`:

| Consumer | Current | After |
|---|---|---|
| `convert.py:_convert_valid_state_to_format2` | `step_tool_state(step)` | `resolve_tool_state(tool_inputs, raw_state, connections)` |
| `validation_native.py:validate_native_step_against` | `step_tool_state(step)` | same |
| `connection_graph.py` | `step_tool_state(step)` | same |
| `stale_keys.py:classify_stale_keys` | `decode_double_encoded_values(tool_state)` | remove decode call |
| `roundtrip.py` comparison | `_try_json_decode()` everywhere | compare resolved states |

The `convert_state_to_format2_using()` function is the ideal first migration
target — it already has `parsed_tool` available and calls both
`step_tool_state()` and the walker.

## Steps

### Step 1: Implement `StateResolvedToolState` and `resolve_tool_state()`

- New class in `_walker.py` or a new `_resolved.py` module
- Construction function that walks tool_inputs, strips bookkeeping, unwraps
  containers, schema-decodes leaf values per parameter type
- Reuse `as_dict()`, `as_list()`, `_select_which_when_native()` from walker
- Leaf decode logic: type-aware decode table (see Construction section above)
- Unit tests:
  - `gx_hidden value="2"` → leaf is `"2"` (string, not int)
  - `gx_integer value="2"` → leaf is `2` (int, not string)
  - `gx_boolean value="false"` → leaf is `False` (bool, not string)
  - `gx_text value="false"` → leaf is `"false"` (string, not bool)
  - `gx_data value='{"__class__": "ConnectedValue"}'` → leaf is `dict`
  - `gx_integer value="not_a_number"` → resolution raises

### Step 2: Migrate `convert.py`

- `_convert_valid_state_to_format2()` constructs `StateResolvedToolState`
  instead of calling `step_tool_state()`
- Pass `.state` to `walk_native_state()` — containers already decoded,
  walker's `as_dict()`/`as_list()` are no-ops
- Simplify leaf callbacks: remove type coercion that resolution already did.
  `_convert_scalar_value` receives correctly-typed values. `gx_rules` receives
  dict. `gx_data`/`gx_data_collection` receives dict. Remove `isinstance`
  guards and `json.loads` calls that are now dead code.
- Remove `coerce_select_value()` int/bool branches (values always strings)
- **Test**: run IWC conversion sweep, verify lofreq `defqual` and deeptools
  `scaleFactors` come through as strings, validate successfully

### Step 3: Migrate `validation_native.py`

- Same pattern: construct `StateResolvedToolState`, pass to walker
- Simplify `merge_and_validate`: type coercion already done. `int(value)`/
  `float(value)` calls are no-ops on already-typed values. `isinstance(value,
  dict)` checks for data params work directly.
- Remove `coerce_select_value()` int/bool branches
- **Test**: IWC validation sweep passes

### Step 4: Migrate `stale_keys.py`

- Remove `decode_double_encoded_values()` call
- `_classify_recursive` + `_recurse_into_containers` already do their own
  schema-guided container walks — verify they work on non-pre-decoded state
- **Test**: stale key classification unchanged on IWC corpus

### Step 5: Migrate `roundtrip.py`

- `compare_tool_state()` needs rework — currently uses `_try_json_decode()`
  for blind value comparison
- Option A: compare two `StateResolvedToolState` trees (both sides resolved)
- Option B: compare with awareness that leaf values are strings, use
  type-aware comparison
- **Test**: roundtrip validation results unchanged on IWC corpus

### Step 6: Remove `decode_double_encoded_values()`

- Remove function from `_util.py`
- Remove `step_tool_state()` or simplify it to just outer-JSON decode
  without per-value decode
- Verify no remaining callers

### Step 7: Remove `_validate_converted_result` Workaround

- The TODO/exception handler in `convert.py:117-120` was swallowing
  ConnectedValue validation errors caused by type corruption
- With schema-aware decoding, the empty-string validator fix (separate work)
  plus correct leaf types should make all IWC workflows validate cleanly
- Remove the workaround, run full IWC sweep to confirm

## Open Questions

1. **ConnectedValue/RuntimeValue as leaf containers — RESOLVED.** With
   schema-aware leaf decoding, `gx_data`/`gx_data_collection` values are
   decoded during resolution (they're in the leaf decode table). Their values
   are always structured objects (dict or None), never ambiguous strings.
   Callbacks receive dicts directly.

2. **`connection_graph.py` usage.** Calls `step_tool_state(step)` to read
   conditional test values for `when` synthesis. Needs review — may only
   need the test parameter value, not the full resolved state.

3. **Where does `StateResolvedToolState` live?** Options:
   - `_walker.py` — close to the traversal code it depends on
   - `_resolved.py` — new module, cleaner separation
   - `_types.py` — alongside other type definitions
   Leaning toward `_walker.py` or `_resolved.py`.

4. **Should `step_tool_state()` survive?** It's a convenience function used
   in 5 places. Options:
   - Kill it — callers construct `StateResolvedToolState` explicitly
   - Keep it as "outer JSON decode only" (no per-value decode) for cases
     where you just need the raw dict without schema resolution
   - Rename to `step_raw_tool_state()` to make clear it's not fully decoded

5. **Multiple-select values.** Native double-encoding stores multiple-select
   as a comma-delimited string (`"a,b,c"`). `gx_select` is decoded as a
   string passthrough (see leaf decode table), so this stays as `"a,b,c"`.
   The convert callback splits it. Unchanged from current behavior since
   `decode_double_encoded_values()` also leaves this as a string (not valid
   JSON).

6. **`gx_rules` blobs.** With schema-aware leaf decoding, `gx_rules` values
   are decoded during resolution (in the leaf decode table as `json.loads()`).
   Callbacks receive the dict directly — the explicit `json.loads()` /
   `isinstance(value, str)` branch in `convert_leaf` becomes dead code.

7. **Validation errors during resolution — RESOLVED: raise immediately.**
   Consumers split into two groups: (A) convert.py and validation_native.py
   validate leaf values and already bail on first error, and (B)
   connection_graph.py, stale_keys.py, and roundtrip.py never validate leaf
   values — they only use state structurally (conditional branches, repeat
   counts, key classification). Group A already expects exceptions; Group B
   doesn't need typed leaves at all (could use raw outer-decoded dict or a
   structural-only API). No consumer wants "all errors at once." Raising
   keeps `StateResolvedToolState` honest — if you hold one, all types are
   correct. In practice, convert.py validates before resolving, so a raise
   during resolution is a defensive assertion (shouldn't happen on
   pre-validated state).
