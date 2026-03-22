# Plan: Symmetric Schema-Aware Protocol for gxformat2

## Goal

Add optional callback protocols to gxformat2's `from_galaxy_native()` and `python_to_workflow()` so that schema-aware consumers (like galaxy-tool-util) can inject tool-definition-aware state conversion on both the export and import paths. gxformat2 stays schema-free; the callbacks are optional with unchanged default behavior.

## Status

### Step 1: gxformat2 PR — DONE

Branch: `state_callbacks` at `/Users/jxc755/projects/worktrees/gxformat2/branch/state_callbacks`
Commit: `4bcae5f` "Add convert_tool_state and native_state_encoder callback protocols."

Implemented:
- `ConvertToolStateFn` type alias + `convert_tool_state` param on `from_galaxy_native()`
- `NativeStateEncoderFn` type alias + `native_state_encoder` on `ImportOptions`
- Renamed `encode_tool_state` → `encode_tool_state_json`
- `state` and `tool_state` mutually exclusive on export
- Subworkflow recursion passes `convert_tool_state` through
- Warning logged on callback exception (not silent swallow)
- Both type aliases exported from `gxformat2.__init__`
- 12 new tests (7 export, 5 import), 100/100 suite passing

### Step 2: galaxy-tool-util — encode_state_to_native — DONE

Commit: `8345935718` on `wf_tool_state` branch

Implemented in `convert.py`:
- `encode_state_to_native(parsed_tool, state)` — recursive walker reverses format2 conversions
  - Multiple select lists → comma-delimited strings
  - Recurses into conditionals, sections, repeats
  - ConnectedValue markers passed through as json.dumps
  - Everything else: json.dumps (same as default)
- `_reverse_format2_values()` / `_reverse_value()` — recursive walk using tool input defs
- `_find_conditional_branch()` — branch selection for format2 conditional state

### Step 3: galaxy-tool-util — Wire callbacks, remove post-processing — DONE

Same commit as Step 2.

Implemented:
- `make_convert_tool_state(get_tool_info)` — factory for export callback
- `make_encode_tool_state(get_tool_info)` — factory for import callback
- `roundtrip_validate()` rewritten to use callbacks
- `replace_tool_state_with_format2_state()` removed from roundtrip.py
- `find_matching_native_step()` and `ensure_export_defaults()` kept (still used by export_format2.py)
- Added list↔string equivalence to `_values_equivalent` for multiple selects
- 230/230 unit tests passing
- IWC corpus: 33 OK, 23 MISMATCH, 53 CONVERSION_FAIL, 3 ERROR (out of 112)

### Step 4: Pin gxformat2 >= new version — TODO

- gxformat2 PR not yet opened/merged
- Galaxy's `encode_tool_state` reference in `lib/galaxy/workflow/format2.py` will break — not used, but import will fail if the attribute is removed. Current rename is `encode_tool_state` → `encode_tool_state_json`; Galaxy never sets it so no code change needed, but the pin bump will surface it.
- `export_format2.py` still uses the old post-processing approach (not roundtrip — it's the export CLI). Could be migrated to callbacks too but is a separate task.

## Design

### Export Callback: `ConvertToolStateFn`

A callable that gxformat2 accepts but doesn't implement. **Returns only `state` — connections are always handled by gxformat2's `_convert_input_connections()`.**

```python
ConvertToolStateFn = Optional[Callable[[dict], Optional[Dict[str, Any]]]]
```

**Why no `in_connections`?** `_convert_input_connections()` would overwrite the callback's `in` dict, the callback can't produce correct `source` references without gxformat2's `label_map`, and they fully overlap on the same native `input_connections` dict.

### Import Callback: `NativeStateEncoderFn`

```python
NativeStateEncoderFn = Optional[Callable[[dict, Dict[str, Any]], Optional[Dict[str, Any]]]]
```

`setup_connected_values()` runs before the callback. ConnectedValue markers are passed through as `json.dumps(marker)`. RuntimeValue markers are injected separately after — the callback never sees them.

### Encoding Flow

1. gxformat2 `transform_tool()` pops `state`, runs `setup_connected_values`
2. Calls `native_state_encoder(step, step_state)` — our callback
3. Our callback calls `encode_state_to_native(parsed_tool, state)` which walks format2 state with tool defs, reverses multiple select lists → comma strings, json.dumps each value
4. gxformat2 does `tool_state.update(encoded)` with callback result
5. gxformat2 calls `_populate_tool_state(step, tool_state)` — outer json.dumps envelope

## Resolved Questions

### Q: Should the export callback return `in_connections`?
**No.** Fully overlaps with `_convert_input_connections`, would be overwritten, can't resolve step labels.

### Q: Should `encode_state_to_native` handle ConnectedValue/RuntimeValue?
**ConnectedValue: yes, trivially.** RuntimeValue: N/A (injected after callback).

### Q: Should the export callback receive workflow context?
**No.** Native step dict has everything needed.

### Q: Should the callback handle `pick_value` steps?
**No.** gxformat2 already handles them.

### Q: Naming for the import-side callback?
`native_state_encoder`. Boolean renamed to `encode_tool_state_json`.

### Q: Does the import callback's `step` dict still have tool_id/tool_version?
**Yes.** Only `state` and `in`/`connect` have been popped at callback time.

## Unresolved Questions

None.
