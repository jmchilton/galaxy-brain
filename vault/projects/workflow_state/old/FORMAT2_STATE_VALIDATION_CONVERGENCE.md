# Format2 State Validation Convergence

**Branch:** `wf_tool_state`
**Date:** 2026-03-28
**Status:** COMPLETE (Steps 1-6 done, 5 model gaps remain as follow-up)

## Problem

Three related issues in the format2 validation path:

1. **Duplicated validation** — `_validate_converted_result` (convert.py) and `validate_step_against` (validation_format2.py) both validate format2 state against tool definitions but with divergent implementations.
2. **Asymmetric model usage** — convert.py validates only against `WorkflowStepLinkedToolState`. validation_format2.py validates against both `WorkflowStepToolState` and `WorkflowStepLinkedToolState`.
3. **Replacement params bypassed** — convert.py skips validation entirely when `${...}` found. validation_format2.py has no handling at all. Neither validates the non-replacement parts of mixed state.

Additionally, the ConnectedValue injection logic is duplicated: `_inject_connected_value` (convert.py, path-string based) vs `_merge_into_state` (validation_format2.py, recursive descent through parameter models).

## Goal

- Single shared function for "validate format2 state + connections against tool definitions"
- Single shared function for "inject ConnectedValue markers into state dict given connections and tool inputs"
- Replacement parameters handled with classified detection — typed-field replacements bail early, text-field replacements validate normally
- Both convert.py and validation_format2.py call the same core validation

## Plan

### Steps 1-2: Classified Replacement Parameter Detection + Tool-Aware Connection Injection (COMPLETE)

**Commits:** `de1b688eda`, `5abdbd0387`

Empirical research showed replacement params are extremely rare in real-world workflows — zero IWC workflows have them, only 2 legacy Galaxy test workflows use them (both `random_lines1`). All 30 IWC `${...}`/`#{...}` occurrences are in PJA `RenameDatasetAction` output blocks, not tool state. Full Pydantic model infrastructure (new state representations, per-parameter-type wiring) would be significant work for near-zero practical benefit.

Instead of new `workflow_step_templated` / `workflow_step_linked_templated` Pydantic representations, we implemented a **classified scan-and-gate** approach:

#### Implementation: `legacy_parameters.py` (new module)

Type-aware scanner walks parameter tree, classifies replacement params:
- **YES** — found in typed field (int/float/bool/select/data_column/color) where `${...}` can't be a literal value → skip validation and conversion
- **MAYBE_ASSUMED_NO** — found only in text/hidden fields where it could be literal content → validate normally
- **NO** — no replacement patterns found → validate normally

`ReplacementScanResult` model with `ReplacementHit` per-occurrence (state_path, parameter_type, value, classification). Exported: `scan_native_state`, `scan_format2_state`.

Narrowed detection to `${...}` only — `#{...}` is PJA-only syntax for input dataset name substitution.

#### Integration into convert.py and validation_native.py

- convert.py: `scan_native_state` at top of `convert_state_to_format2_using()`, raises `ConversionValidationFailure` on YES. Removed per-value `is_replacement_param` guards from `_convert_scalar_value` and the post-conversion `_state_has_replacement_params` scan.
- validation_native.py: `scan_native_state` at top of `validate_native_step_against()`, returns early on YES. Removed per-value `is_replacement_param` checks from int/float validation.
- `_is_replacement_param` moved from `_util.py` to `legacy_parameters.py` (private).

#### Test Coverage

`test_legacy_parameters.py` — 216 lines covering all classification paths, typed vs text fields, conditional/repeat/section nesting, native and format2 scan, #{...} exclusion.

### Step 3: Unify ConnectedValue Injection (COMPLETE)

**Commit:** `f3eaa6d7b4`

New shared `inject_connections_into_state()` in `_state_merge.py`. Param-first tree walk handles conditionals (via `select_which_when_format2`), repeats (via `repeat_inputs_to_array`), and sections. Returns dict of unmatched connection paths.

Replaced:
- `_inject_connected_value` in convert.py (path-string iteration)
- `_merge_into_state` in validation_format2.py (recursive descent)

Also added section handling that was missing from validation_format2.py's original implementation.

### Step 4: Unify Format2 Validation Core (COMPLETE)

**Commit:** `61ca0f5c36`

New shared `validate_format2_state()` in validation_format2.py:
1. Validate state against `WorkflowStepToolState` (unlinked — catches value-level errors)
2. Deep-copy state, inject ConnectedValue markers for connections
3. Validate merged state against `WorkflowStepLinkedToolState`

Both callers now delegate to it:
- `_validate_converted_result` (convert.py) → `validate_format2_state(tool_inputs, result.state, result.inputs)`
- `validate_step_against` (validation_format2.py) → `validate_format2_state(tool_inputs, state, connect_dict)`

### Step 5: Remove Workarounds (MOSTLY COMPLETE)

Old duplicated functions removed in Steps 3-4. The ConnectedValue error catch in convert.py is **narrowed but retained** for 5 IWC workflows with model gaps:
- **busco 5.8.0+galaxy1** (3 workflows, 5 steps): conditional `test` field absent from state+connections — linked model requires it
- **sylph_profile / MetaProSIP** (2 workflows, 2 steps): whole-list ConnectedValue (`{"__class__": "ConnectedValue"}`) where linked model expects `List[Union[T, ConnectedValue]]`

These are model issues to fix separately — the catch prevents them from blocking conversion.

### Step 6: IWC Corpus Regression (COMPLETE)

120/120 IWC roundtrip tests passing.

## Bonus: Model Fixes During Convergence

Two model issues discovered and fixed during Step 4 validation:

### `_values_not_required` for `workflow_step` (commit `aa8e503061`)

Renamed `_is_landing_request` → `_values_not_required`, added `"workflow_step"` to the set. In format2 state, connected parameters are absent from state (they live in the connections dict), so every field must be optional. The linked model (`workflow_step_linked`) enforces required-ness after ConnectedValue injection. Also added the check to `SectionParameterModel` which was missing it entirely.

**Impact:** Fixed 47 `Field required` validation errors across the IWC corpus.

### Optional text regex validation (commits `095e387905`, `d62c3d3111`)

Empty string `''` values in optional text parameters were failing regex validators. Fixed by skipping validators for optional text params with None/empty values.

**Impact:** Fixed 43 `regex_mismatch` validation errors across the IWC corpus.

## Remaining Model Gaps (Follow-up)

5 IWC workflows still fail linked validation (masked by ConnectedValue catch):

1. **Conditional field absent from connections** — busco's `test` conditional has no discriminator in format2 state and no connection for it. The linked model requires it. Needs investigation: is the conditional truly unset, or is the connection injection not finding it?

2. **Whole-list ConnectedValue** — When an entire list/multi-select parameter is connected, the native state has `{"__class__": "ConnectedValue"}`. After conversion this becomes `ConnectedValue` where the linked model expects `List[Union[T, ConnectedValue]]`. The model needs `Union[List[...], ConnectedValue]` wrapping for list parameters in `workflow_step_linked`.

## Ordering / Dependencies (Actual)

```
Steps 1-2 (COMPLETE) → Step 3 (COMPLETE) → Step 4 (COMPLETE) → Step 5 (MOSTLY COMPLETE) → Step 6 (COMPLETE)
```

## Resolved Questions

- **Where do shared functions live?** `_state_merge.py` for injection, `validation_format2.py` for the validation function.
- **Pipe vs underscore separators?** Both use `|` via `flat_state_path`. The plan incorrectly stated `_`-separated paths.
- **RuntimeValue handling?** Orthogonal — documented in `RUNTIME_VALUES.md`.
