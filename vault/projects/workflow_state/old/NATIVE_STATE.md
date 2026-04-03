# Native Tool State Schema (`workflow_step_native`)

**Date:** 2026-03-30
**Branch:** `wf_tool_state`
**Status:** Phase 1-3 complete, Phase 5 ready

## Problem

Native (.ga) workflow validation uses an imperative walker+callback approach in `validation_native.py`. The walker (`walk_native_state`) traverses the tool state tree and calls a `merge_and_validate` callback that performs per-type validation with if/elif chains. This works but:

1. **No schema export** — the native validation logic can't produce a JSON Schema, unlike format2's `WorkflowStepToolState` which generates Pydantic models and exports JSON Schemas for external tooling.
2. **Duplicated logic** — the imperative validation reimplements type checks that `pydantic_template()` already encodes declaratively for `workflow_step`/`workflow_step_linked`.
3. **No test spec coverage** — there are no `workflow_step_native_valid`/`workflow_step_native_invalid` entries in `parameter_specification.yml`. Native validation bypasses the spec-driven test infrastructure entirely.
4. **Loose validation** — the imperative code doesn't validate many types at all (text, boolean, color, data_column, drill_down, rules all pass unconditionally). The Pydantic approach validates everything structurally.
5. **No RuntimeValue model** — `ConnectedValue` has a Pydantic model; `RuntimeValue` does not. Native state uses both markers but only ConnectedValue is schema-modeled.

## Goal

Add a new state representation `workflow_step_native` that produces Pydantic models matching the structure of **cleaned** native (.ga) tool_state. Use these models to:
- Replace the imperative validation in `validation_native.py` with declarative Pydantic validation
- Export JSON Schemas for native tool state (enables external tooling to validate .ga files)
- Drive development via `parameter_specification.yml` test entries, validated against IWC workflows

## What's Done (Phases 1-4)

### Commits

1. `54f4335b6e` — Add workflow_step_native state representation with RuntimeValue model.
2. `528f986204` — Tighten workflow_step_native to mirror workflow_step_linked semantics.

### Infrastructure Added

- `RuntimeValue` Pydantic model in `parameters.py` (parallel to `ConnectedValue`)
- `allow_connected_or_runtime_value()` helper
- `"workflow_step_native"` in `StateRepresentationT`
- `create_workflow_step_native_model` factory
- `WorkflowStepNativeToolState` class in `state.py`
- `validate_workflow_step_native` in `model_validation.py`
- All exports wired through `__init__.py`
- Test runner wired with `workflow_step_native_valid`/`workflow_step_native_invalid` in `test_parameter_specification.py`

### Native Type Broadening (Evidence-Driven)

Types broadened based on actual IWC corpus failures, not by reading imperative validation code:

| Type | `NativeInt` | `Union[StrictInt, StrictStr]` + `AfterValidator` ensuring string is int-parseable |
|---|---|---|
| `NativeFloat` | `Union[StrictInt, StrictFloat, StrictStr]` + `AfterValidator` ensuring string is number-parseable |
| Boolean | `Union[StrictBool, Literal["true","false","True","False"]]` |
| Multiple select | `Union[List[options], StrictStr]` (accepts comma-delimited string) |
| Data/DataCollection | `Union[ConnectedValue, RuntimeValue]` (required); `Optional[Union[ConnectedValue, RuntimeValue]]` (optional) |
| DataColumn | Uses `NativeInt`; multiple allows `StrictStr` |
| Conditional boolean test | Branch models accept both `Literal[True/False]` and `Literal["true"/"false"]` |

### All Parameter Types Handled

Every `pydantic_template()` method has a `workflow_step_native` branch accepting ConnectedValue and RuntimeValue markers.

### IWC Corpus: 1803/1803 Steps Pass

Full 120-workflow corpus validated with pipeline: clean → inject connections → validate.

## Key Design Decisions (Resolved)

### 1. Modeled After `workflow_step_linked`, Not `workflow_step`

**Decision:** `workflow_step_native` mirrors `workflow_step_linked` semantics — params follow their normal required-ness rules. NOT in `_values_not_required`.

**Why:** Native .ga tool_state already has ConnectedValue/RuntimeValue markers inline. Out of 455 connected params across 10 IWC workflows, 448 already had their marker in tool_state. Only 7 were truly absent (all the special `when` conditional execution parameter, not regular tool params).

**Implication:** No need for a separate `workflow_step_native_linked` variant. The single representation handles both state and connections.

### 2. Connection Injection Still Needed (Rare Cases)

A small number of connected params (~2 out of 1803 steps in full corpus) have `None` in tool_state despite being connected via `input_connections`. These are required data params where Galaxy never wrote the ConnectedValue marker.

**Solution:** Reuse `_state_merge.inject_connections_into_state()` (same code format2 uses) before validation. Build connections dict from `input_connections`:

```python
ic = step.get('input_connections', {})
connections = {key: (val if isinstance(val, list) else [val]) for key, val in ic.items()}
state = copy.deepcopy(tool_state)
inject_connections_into_state(list(parsed_tool.inputs), state, connections)
model.model_validate(state)
```

### 3. Broad Union Types + Validators (Not BeforeValidator Coercion)

**Decision:** Use broad union types (e.g., `Union[StrictInt, StrictStr]`) so JSON Schema exports show both accepted types explicitly. Add `AfterValidator` to reject malformed strings (e.g., `"foobar"` for an int field).

**Why:** JSON Schema consumers see the full accepted type surface. Failures in JSON Schema validation will be "too lax" (accepts some invalid strings) rather than "too strict" (rejects valid native values).

### 4. Clean Before Validate

Schema does NOT model bookkeeping keys. Pipeline: `strip_bookkeeping_from_workflow()` + `strip_stale_keys()` → `inject_connections_into_state()` → `model.model_validate()`.

### 5. `extra="forbid"` Everywhere

Rely on stale key cleaner to remove unknown keys before validation. Confirmed with full IWC corpus.

## Validation Pipeline (Full)

```
1. strip_bookkeeping_from_workflow(wf)     # remove __current_case__, __page__, etc.
2. strip_stale_keys(step, parsed_tool)      # remove keys not in tool definition
3. tool_state = step_tool_state(step)       # one level of JSON decode
4. inject_connections_into_state(inputs, state, connections)  # fill missing markers
5. model = WorkflowStepNativeToolState.parameter_model_for(inputs)
6. model.model_validate(state)              # Pydantic validation
```

## Remaining Work

### Phase 5: Replace Imperative Native Validation

**File:** `lib/galaxy/tool_util/workflow_state/validation_native.py`

Replace the `merge_and_validate` walker callback with the Pydantic pipeline above. The current imperative code (~110 lines) becomes ~20 lines.

**Approach:**
1. Rewrite `validate_native_step_against()` to use Pydantic
2. Keep the legacy parameter scan (`ReplacementClassification.YES` → skip)
3. Add connection injection step (reuse `inject_connections_into_state`)
4. Run full IWC corpus to confirm identical behavior
5. Remove dead imperative code

**Key simplification:** The walker is still needed for conversion and cleaning, but validation no longer needs it. The entire `merge_and_validate` callback and its per-type if/elif chain goes away.

### Phase 6: More Spec Entries

Add `workflow_step_native_valid`/`workflow_step_native_invalid` entries for more tool types in `parameter_specification.yml`. Currently only `gx_int`, `gx_text`, `gx_boolean`, `gx_data`, and `gx_select` have entries. Should add: `gx_float`, `gx_hidden`, `gx_color`, `gx_data_collection`, `gx_data_column`, `gx_conditional_boolean`, `gx_repeat`, `gx_section`, `gx_int_optional`, `gx_data_optional`, etc.

### Phase 7: JSON Schema Export for Native State

```bash
galaxy-tool-cache schema <tool_id> --representation workflow_step_native
```

Requires wiring the `--representation` flag into the cache schema export. Enables external .ga validators.

### Phase 8: Wire Into Existing CLI Tools

Update `gxwf-state-validate` to support `--mode pydantic-native` or auto-detect native workflows and use the new Pydantic validation path instead of the imperative walker.

## What Changes Where (Remaining)

| File | Change |
|---|---|
| `validation_native.py` | Replace imperative validation with Pydantic pipeline |
| `parameter_specification.yml` | Add more native spec entries |
| `cache.py` | Wire `--representation` for schema export |
| `validate.py` | Wire native Pydantic path into CLI |

## What Does NOT Change

- `_walker.py` — still needed for conversion and cleaning
- `clean.py` — cleaning runs before validation; no change
- `convert.py` — conversion is a separate concern
- `validation_format2.py` — format2 path unchanged
- `_state_merge.py` — connection injection reused as-is for native

## Resolved Questions

1. **String integer/float** — Broad union types (`Union[StrictInt, StrictStr]`) with `AfterValidator`. JSON Schema shows both types; validator rejects non-numeric strings.

2. **Comma-delimited multiple selects** — Accepted in schema via `Union[List[options], StrictStr]`. No normalization step.

3. **`"null"` string** — Not observed as an issue in IWC corpus after cleaning. Not modeled.

4. **Unknown keys at root** — `extra="forbid"`. Stale key cleaner handles removal.

5. **Normalize before validate?** — No. Schema accepts native artifacts directly. Matches on-disk format.

6. **`workflow_step_native_linked`** — Not needed. `workflow_step_native` already mirrors `workflow_step_linked` semantics. Connection injection via `inject_connections_into_state` handles the rare missing-marker cases.
