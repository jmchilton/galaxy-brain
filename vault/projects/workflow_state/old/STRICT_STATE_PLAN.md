# Plan: Decompose --strict into --strict-structure, --strict-encoding, --strict-state

## Goal

Replace the current `--strict` flag (which means slightly different things across CLIs) with three orthogonal flags that can be composed. `--strict` becomes shorthand for all three enabled at once.

| Flag                 | What it enforces                                                                                                                                                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--strict-structure` | Workflow envelope (inputs, outputs, steps, metadata) validates against `extra="forbid"` Pydantic models — no unknown keys at any structural level                                                                                         |
| `--strict-encoding`  | No JSON-string-where-dict-is-expected at input or output. Native tool_state must be a dict (not a JSON string). Format2 must use `state` (not `tool_state`). Container values inside state must already be dicts/lists, not JSON strings. |
| `--strict-state`     | Tool cache must resolve every tool step. Every step's state must validate against typed Pydantic models. No skips allowed.                                                                                                                |

`--strict` = `--strict-structure --strict-encoding --strict-state` (backwards compatible — current behavior is roughly `--strict-state` already for validate/lint).

## Current State

### What --strict does today (per CLI)
- **gxwf-state-validate / lint-stateful**: Treat `skip_tool_not_found` as failure (exit 2)
- **gxwf-to-format2-stateful / to-native-stateful**: Raise exception on any step conversion failure
- **gxwf-roundtrip-validate**: Require zero diffs (benign diffs become errors)
- **galaxy-tool-cache structural-schema**: Use strict gxformat2 model for JSON Schema export

### What exists for strict structure
- gxformat2 already has `gxformat2_strict.GalaxyWorkflow` and `native_strict.NativeGalaxyWorkflow` (auto-generated, `extra="forbid"`)
- `lint.py:lint_pydantic_validation()` does two-phase: try strict, fall back to lax, report extras as warnings
- `json_schema.py:workflow_json_schema(strict=True)` / `native_workflow_json_schema(strict=True)` export strict schemas
- Normalized models (`NormalizedNativeWorkflow`, `NormalizedFormat2`, `NormalizedNativeStep`, `NormalizedWorkflowStep`) all use `extra="allow"` — **no strict normalized models exist**

### What exists for strict encoding
- `_util.py:step_tool_state()` accepts `tool_state` as either `str` or `dict` (does `json.loads` if string)
- **`_walker.py:as_dict()` / `as_list()` removed** (commit `67aa42d`) — walker now requires containers to be proper dicts/lists, no silent JSON decode. Legacy-encoded workflows with JSON-string containers are rejected by precheck.
- gxformat2 `NativeStep.tool_state` is typed `str | dict[str, Any] | None`
- gxformat2 `WorkflowStep.state` is `dict[str, Any] | None`, but `WorkflowStep.tool_state` is also `str | dict[str, Any] | None`
- `normalized_native()` calls `load_native(strict=False)` — normalizes Galaxy serialization quirks
- `legacy_encoding.py` classifies encoding as legacy/modern but only for skip decisions, not enforcement

### What exists for strict state
- Current `--strict` on validate/lint is essentially this — treat missing tool defs as failure
- Validation against `WorkflowStepToolState` / `WorkflowStepLinkedToolState` / `WorkflowStepNativeToolState` already works
- `precheck.py` skips legacy-encoded workflows entirely

---

## Implementation Plan

### Step 0: Fix `encode_state_to_native()` double-encoding

**Prerequisite for everything else.** `encode_state_to_native()` in `convert.py` currently does:

```python
return {key: json.dumps(value) for key, value in reversed_state.items()}
```

This produces the double-encoded format where each top-level value is a JSON string — the exact format that `--strict-encoding` would reject. The walker (post-67aa42d) refuses to decode JSON-string containers, and `--strict-encoding` will reject `tool_state` as a JSON string. The conversion path should not produce output that the validation path rejects.

**Change:** `encode_state_to_native()` returns a clean dict — `{key: value}` with proper Python types (dicts, lists, numbers, booleans, strings). No `json.dumps` per-key.

**Downstream impact:** Anything that calls `encode_state_to_native()` and expects JSON-string values needs updating:
- `to_native_stateful.py` — the `state_encode_to_native` callback passed to gxformat2's `to_native()`
- gxformat2's `to_native()` default encoding path — currently does `json.dumps` per-key when no callback is provided. The callback should now return clean dicts, and gxformat2 should place them as-is.
- Roundtrip comparison — `compare_tool_state()` may need adjusting if it expected JSON-string values from the reimported side
- Test fixtures — any assertions on `encode_state_to_native()` output format

**gxformat2 side:** The `state_encode_to_native` callback protocol (in `options.py`) says "Returns `{param_name: encoded_value}` for native tool_state." The meaning of "encoded" needs to shift from "JSON string" to "clean Python value." The default path in `to_native()` that does `json.dumps` encoding when no callback is provided should also be updated — native `tool_state` should be a dict of values, not a dict of JSON strings.

**Approach:** Do this in isolation. Change `encode_state_to_native()`, fix all callers and tests, get green on unit tests and IWC sweep. This is the same pattern as 67aa42d — remove a legacy accommodation, work through fallout. Land as a standalone commit before any strictness decomposition.

**Tests:**
- `encode_state_to_native()` output is a dict of clean values (not JSON strings)
- Roundtrip: native → format2 → native produces clean dict tool_state
- IWC sweep: all workflows roundtrip successfully with clean encoding
- `to_native()` default path (no callback) also produces clean tool_state

### Step 1: Define shared strict options model (Galaxy workflow_state)

**File:** `lib/galaxy/tool_util/workflow_state/_cli_common.py`

Add a `StrictOptions` model and update `ToolCacheOptions`:

```python
class StrictOptions(BaseModel):
    strict: bool = False  # shorthand for all three
    strict_structure: bool = False
    strict_encoding: bool = False
    strict_state: bool = False

    @model_validator(mode="after")
    def expand_strict(self):
        if self.strict:
            self.strict_structure = True
            self.strict_encoding = True
            self.strict_state = True
        return self
```

Add `add_strict_args(parser)` helper that adds all four flags to argparse. All existing `--strict` uses remain compatible.

Update all options models (`_ValidateCommonOptions`, `_LintStatefulCommonOptions`, `ExportOptions`, `ToNativeOptions`, roundtrip options) to inherit from or compose `StrictOptions` instead of having bare `strict: bool`.

**Tests:** Unit test that `--strict` expands to all three. Unit test that individual flags work independently.

### Step 2: Implement --strict-structure validation (gxformat2 side)

**Goal:** Validate the workflow dict against strict Pydantic models before normalization.

#### 2a: Add strict parameter to normalized_native() and normalized_format2()

**File:** `gxformat2/normalized/_native.py`

```python
def normalized_native(
    workflow: ...,
    *,
    strict_structure: bool = False,
) -> NormalizedNativeWorkflow:
    ...
    if isinstance(workflow, dict):
        if strict_structure:
            # Validate against strict model first — raises ValidationError on extra keys
            from ..schema.native_strict import NativeGalaxyWorkflow as StrictModel
            StrictModel.model_validate(workflow)
        workflow = load_native(workflow, strict=False)
    ...
```

**File:** `gxformat2/normalized/_format2.py`

```python
def normalized_format2(
    workflow: ...,
    *,
    strict_structure: bool = False,
) -> NormalizedFormat2:
    ...
    if isinstance(workflow, dict):
        ...
        if strict_structure:
            from ..schema.gxformat2_strict import GalaxyWorkflow as StrictModel
            StrictModel.model_validate(workflow)
        ...
```

This approach validates the raw dict against the strict schema before any normalization munging happens. If it fails, `ValidationError` propagates with clear extra-key locations.

#### 2b: Thread strict_structure through to_format2() and to_native()

**File:** `gxformat2/normalized/_conversion.py`

- `to_format2()`: When input is a raw dict, pass `strict_structure` to `normalized_native()`
- `to_native()`: When input is a raw dict, pass `strict_structure` to `normalized_format2()`

**Option A (preferred):** Add `strict_structure: bool = False` to `ConversionOptions`. This keeps the API clean — callers already pass `ConversionOptions`.

**File:** `gxformat2/options.py`
```python
class ConversionOptions:
    def __init__(self, ..., strict_structure: bool = False, strict_encoding: bool = False):
        ...
```

#### 2c: Also validate output structure

When `strict_structure=True`, validate the **output** of conversion against the strict model for the target format. This catches cases where the conversion itself introduces extra keys.

- `to_format2()` output → validate against `gxformat2_strict.GalaxyWorkflow`
- `to_native()` output → validate against `native_strict.NativeGalaxyWorkflow`

This requires serializing the `NormalizedFormat2`/`NormalizedNativeWorkflow` back to dict for validation. Use `model.model_dump(by_alias=True, exclude_none=True)` or the existing dict export paths.

**Tests:**
- Workflow with extra keys at top level → strict-structure rejects, non-strict accepts
- Workflow with extra keys in step → strict-structure rejects
- Clean workflow → strict-structure passes
- IWC sweep with strict-structure to identify any structural issues

### Step 3: Implement --strict-encoding validation

**Goal:** Reject workflows where tool_state or container values are JSON strings instead of proper dicts/lists.

#### 3a: Add encoding validation to Galaxy workflow_state

**Prerequisite (done):** `as_dict()`/`as_list()` removed from `_walker.py` (commit `67aa42d`). The walker, clean, and stale_keys modules now require containers to be proper dicts/lists. Legacy-encoded workflows with JSON-string containers will fail at the walker level rather than being silently decoded. Declarative tests using legacy-encoded framework fixtures (`test_workflow_1.ga`, `test_workflow_2.ga`) removed — same behaviors covered by IWC and synthetic fixtures.

**File:** `lib/galaxy/tool_util/workflow_state/_encoding.py` (new module)

```python
def validate_encoding_native(workflow_dict: dict) -> list[str]:
    """Check that native workflow tool_state values are properly encoded.
    
    Only checks the outer tool_state type — nested containers are always
    proper dicts/lists in modern encoding (nested=True). Legacy encoding
    (nested=False) is caught by precheck.py / --strict-state. The walker
    no longer silently decodes JSON-string containers (as_dict/as_list removed).
    
    Returns list of error messages. Empty = clean encoding.
    """
    errors = []
    for step_id, step in workflow_dict.get("steps", {}).items():
        tool_state = step.get("tool_state")
        if isinstance(tool_state, str):
            errors.append(f"Step {step_id}: tool_state is a JSON string, expected dict")
    return errors

def validate_encoding_format2(workflow_dict: dict) -> list[str]:
    """Check that format2 workflow uses state (not tool_state) and values are clean."""
    errors = []
    for i, step in enumerate(workflow_dict.get("steps", [])):
        if isinstance(step, dict):
            if step.get("tool_state") is not None and step.get("state") is None:
                errors.append(f"Step {i}: uses tool_state instead of state")
            state = step.get("state") or step.get("tool_state")
            if isinstance(state, str):
                errors.append(f"Step {i}: state is a JSON string, expected dict")
    return errors
```

#### 3b: Wire into validation/lint/export/to_native pipelines

Each CLI that accepts `--strict-encoding`:
1. Before normalization, run `validate_encoding_native()` or `validate_encoding_format2()`
2. If errors, fail with structured error messages
3. For export/conversion, also validate the **output** encoding

**Where to wire:**
- `validate.py:validate_workflow_cli()` — run encoding check before delegation
- `lint_stateful.py:run_structural_lint()` — add encoding lint messages  
- `export_format2.py:export_workflow_to_format2()` — validate input encoding
- `to_native_stateful.py:convert_to_native_stateful()` — validate input and output encoding
- `roundtrip.py` — validate encoding at each stage

#### 3c: Tighten gxformat2 normalization path (optional, longer term)

Add `strict_encoding` to `load_native()` — when true, reject `tool_state` strings at parse time rather than silently decoding. Lower priority now: the Galaxy walker already fails hard on JSON-string containers (commit `67aa42d`), and `_encoding.py` will catch the outer `tool_state` type before normalization even runs.

**Tests:**
- Native workflow with `tool_state` as string → strict-encoding rejects
- Format2 workflow using `tool_state` instead of `state` → strict-encoding rejects
- Format2 workflow with `state` as JSON string → strict-encoding rejects
- Clean workflows pass strict-encoding
- Round-trip output passes strict-encoding (verify conversion produces clean encoding)

### Step 4: Refactor --strict-state from current --strict

**Goal:** Make the existing "strict = treat skips as failures" behavior live under `--strict-state`.

#### 4a: Update exit code logic

**File:** `validate.py`

```python
# Before:
elif has_skips and options.strict:
    exit_code = 2

# After:
elif has_skips and options.strict_state:
    exit_code = 2
```

Same pattern in `lint_stateful.py`, `export_format2.py`, `to_native_stateful.py`, `roundtrip.py`.

#### 4b: Strict-state also requires validation success

Currently `--strict` on validate only treats skips as failures. With `--strict-state`, also enforce:
- No validation failures (already an error, but make it explicit in the flag semantics)
- Legacy-encoded workflows that would be skipped by precheck → fail instead of skip
- Steps with `${...}` replacement parameters → fail instead of skip

This is about making `--strict-state` mean "every tool step must have its state fully validated, no exceptions."

#### 4c: Backwards compatibility

`--strict` still works and expands to all three. The only behavior change: `--strict` now also checks structure and encoding, which it didn't before. This is intentionally stricter — that's the point.

**Tests:**
- `--strict-state` alone: skips become failures, but extra keys and bad encoding allowed
- `--strict` alone: equivalent to all three
- Legacy workflow with `--strict-state`: fails (not skipped)

### Step 5: Roundtrip with strict flags

The roundtrip pipeline has a natural multi-stage structure. Each strict flag applies at the stages where it's meaningful:

#### Pipeline stages and which flags apply

```
Stage 1: Load input native .ga
  → --strict-structure: validate input dict against native_strict model
  → --strict-encoding: validate input tool_state is dict (not JSON string), no JSON-string containers
  → --strict-state: precheck skip → failure (legacy encoding, replacement params)

Stage 2: Clean stale state (existing, unchanged)

Stage 3: Per-step conversion check (roundtrip_native_workflow)
  → --strict-state: every step must convert (tool_not_found → failure instead of skip)

Stage 4: Forward conversion — native → format2 via to_format2()
  → --strict-structure: validate format2 output dict against gxformat2_strict model
  → --strict-encoding: verify output uses `state` not `tool_state`, no JSON-string containers

Stage 5: Reverse conversion — format2 → native via to_native()
  → --strict-structure: validate reimported native dict against native_strict model
  → --strict-encoding: verify reimported tool_state is dict, no JSON-string containers

Stage 6: Compare original vs reimported
  → --strict (existing behavior): benign diffs become errors (zero-diff requirement)
```

The key principle: **strict flags validate both sides of each conversion**. `--strict-structure` checks the input dict AND both output dicts. `--strict-encoding` checks input encoding AND output encoding. `--strict-state` checks that nothing gets skipped at any stage.

#### Implementation in roundtrip.py

`roundtrip_validate()` currently takes `strip_bookkeeping` and `clean_stale`. Add `strict_structure`, `strict_encoding`, `strict_state`:

```python
def roundtrip_validate(
    workflow_dict: dict,
    get_tool_info: GetToolInfo,
    workflow_path: str = "",
    strip_bookkeeping: bool = False,
    clean_stale: bool = True,
    strict_structure: bool = False,
    strict_encoding: bool = False,
    strict_state: bool = False,
) -> RoundTripValidationResult:
```

**Stage 1 — input validation:**
```python
if strict_encoding:
    enc_errors = validate_encoding_native(workflow_dict)
    if enc_errors:
        result.error = f"Encoding errors: {'; '.join(enc_errors)}"
        return result

if strict_structure:
    NativeStrictModel.model_validate(workflow_dict)  # raises on extra keys

precheck = precheck_native_workflow(workflow_dict, get_tool_info)
if not precheck.can_process:
    if strict_state:
        result.error = f"Cannot process: {precheck.skip_reasons[0]}"
        return result
    result.skipped_reason = precheck.skip_reasons[0]
    return result
```

**Stage 4 — validate format2 output:**
```python
format2_dict = format2_model.to_dict()
result.format2_dict = format2_dict

if strict_structure:
    Format2StrictModel.model_validate(format2_dict)

if strict_encoding:
    enc_errors = validate_encoding_format2(format2_dict)
    if enc_errors:
        result.error = f"Format2 output encoding errors: {'; '.join(enc_errors)}"
        return result
```

**Stage 5 — validate reimported native:**
```python
reimported_dict = native_prime.to_dict()
result.reimported_dict = reimported_dict

if strict_structure:
    NativeStrictModel.model_validate(reimported_dict)

if strict_encoding:
    enc_errors = validate_encoding_native(reimported_dict)
    if enc_errors:
        result.error = f"Reimported encoding errors: {'; '.join(enc_errors)}"
        return result
```

**Stage 6 — comparison (existing strict behavior migrates to strict_state):**

The current `_is_passing()` strict behavior (benign diffs → errors) stays tied to `--strict` overall, not to any single sub-flag. This is the roundtrip's own concern — it's about conversion fidelity, not structure/encoding/state. Keep it as-is: `--strict` (the shorthand) activates it, and it could optionally get its own name if needed later.

```python
def _is_passing(result: RoundTripValidationResult, strict: bool) -> bool:
    # 'strict' here is the overall --strict flag (all three combined)
    # benign-diffs-as-errors is a roundtrip-specific concern
    ...
```

#### Update RoundTripValidateOptions

```python
class RoundTripValidateOptions(ToolCacheOptions, StrictOptions):
    strip_bookkeeping: bool = False
    output_native: Optional[str] = None
    output_format2: Optional[str] = None
    report_json: Optional[str] = None
    report_markdown: Optional[str] = None
```

#### Report model changes

Add optional fields to `RoundTripValidationResult`:
- `structure_errors: list[str]` — extra-key violations from strict-structure
- `encoding_errors: list[str]` — encoding violations from strict-encoding

These give structured output rather than just stuffing everything into `error`.

**Tests:**
- Native workflow with extra keys → strict-structure fails at stage 1
- Native workflow with JSON-string tool_state → strict-encoding fails at stage 1
- Legacy-encoded workflow → strict-state fails at stage 1 (precheck skip → failure)
- Clean workflow with missing tool → strict-state fails at stage 3
- Verify format2 output from clean roundtrip passes strict-structure and strict-encoding
- Verify reimported native from clean roundtrip passes strict-structure and strict-encoding
- IWC corpus: all 120 workflows pass full `--strict` roundtrip

### Step 6: Update all CLIs

For each of the 12 `gxwf-*` CLIs:

1. Add `--strict-structure`, `--strict-encoding`, `--strict-state` flags via shared `add_strict_args()`
2. Keep `--strict` as shorthand
3. Update help text to explain decomposition
4. Update `--output-schema` output to document the strict options

**Priority order for CLI updates:**
1. `gxwf-state-validate` / tree (most used, validation is primary use case)
2. `gxwf-lint-stateful` / tree (combines structural + state)
3. `gxwf-roundtrip-validate` / tree (full pipeline, most stages)
4. `gxwf-to-format2-stateful` / tree (export quality gate)
5. `gxwf-to-native-stateful` / tree (import quality gate)

### Step 7: Test against IWC corpus

Run full IWC sweep with each strict flag individually and all combined:

```bash
GALAXY_TEST_IWC_DIRECTORY=/path/to/iwc pytest test_iwc_sweep.py -k "strict"
```

Add test cases to `test_iwc_sweep.py`:
- `test_iwc_validate_strict_structure` — expect all 120 to either pass or identify specific structural issues
- `test_iwc_validate_strict_encoding` — expect all 120 to pass (IWC workflows should have clean encoding)
- `test_iwc_validate_strict_state` — expect all 120 to pass (tool cache required)
- `test_iwc_validate_strict_all` — equivalent to `--strict`

### Step 8: Add declarative test fixtures

**File:** `test/unit/workflows/test_declarative.py`

Add YAML-driven test cases for:
- `strict_structure_extra_keys` — workflow with extra keys, assert rejection
- `strict_structure_clean` — clean workflow, assert pass  
- `strict_encoding_json_string_tool_state` — tool_state as string, assert rejection
- `strict_encoding_json_string_state` — format2 state as JSON string, assert rejection
- `strict_encoding_tool_state_in_format2` — format2 using tool_state not state, assert rejection
- `strict_state_missing_tool` — step with uncacheable tool, assert failure
- `strict_state_legacy_encoding` — legacy-encoded step, assert failure

---

## Changes by Repository

### gxformat2 (abstraction_applications branch)

| File | Change |
|---|---|
| `options.py` | Add `strict_structure`, `strict_encoding` to `ConversionOptions`; update `StateEncodeToNativeFn` docstring to reflect clean-dict return (Step 0) |
| `normalized/_conversion.py` | Default `to_native()` encoding path: stop `json.dumps` per-key on tool_state values (Step 0) |
| `normalized/_native.py` | Add `strict_structure` param to `normalized_native()`, validate against `NativeStrictModel` |
| `normalized/_format2.py` | Add `strict_structure` param to `normalized_format2()`, validate against `Format2StrictModel` |
| `normalized/_conversion.py` | Thread `strict_structure` from `ConversionOptions` into normalization calls; validate output structure |

### galaxy-tool-util (wf_tool_state branch)

| File | Change |
|---|---|
| `_cli_common.py` | `StrictOptions` model, `add_strict_args()` helper |
| `convert.py` | **Step 0:** Remove `json.dumps` per-key from `encode_state_to_native()`, return clean dict |
| `_walker.py` | **Done (67aa42d):** removed `as_dict()`/`as_list()`, containers must be proper types |
| `clean.py` | **Done (67aa42d):** removed `as_dict`/`as_list` imports, direct isinstance checks |
| `stale_keys.py` | **Done (67aa42d):** removed `as_dict`/`as_list` imports, direct isinstance checks |
| `_encoding.py` (new) | `validate_encoding_native()`, `validate_encoding_format2()` — outer-level checks only |
| `validate.py` | Replace `options.strict` with `options.strict_state`; add strict_structure and strict_encoding checks |
| `lint_stateful.py` | Same decomposition; integrate encoding lint |
| `export_format2.py` | Same decomposition; validate input/output encoding |
| `to_native_stateful.py` | Same decomposition; validate input/output encoding |
| `roundtrip.py` | Multi-stage strict validation: structure + encoding checks at input, format2 output, and reimported native. strict-state promotes precheck skips to failures. `RoundTripValidationResult` gets `structure_errors`, `encoding_errors` fields. |
| All 12 scripts under `scripts/` | Add `--strict-structure`, `--strict-encoding`, `--strict-state` flags |
| `_report_models.py` | Extend result models with `encoding_errors`, `structure_errors` fields if needed |

### Tests

| File | Change |
|---|---|
| `test_declarative.py` | Add YAML-driven strict fixtures |
| `test_iwc_sweep.py` | Add strict-* sweep tests |
| `test_strict_options.py` (new) | Unit tests for option expansion and composition |

---

## Execution Order

1. ~~**Step 0** — Fix `encode_state_to_native()` double-encoding~~ **DONE** (commits `7d35570`, `67aa42d`, etc.)
2. ~~**Step 1** — StrictOptions model + CLI args~~ **DONE** (commit `0fef1bb`). `StrictOptions` pydantic model with `@model_validator(mode="after")` expansion; `add_strict_args()` helper; eight option classes composed via multiple inheritance with `ToolCacheOptions`.
3. ~~**Step 4** — Refactor existing --strict to --strict-state~~ **DONE** (commit `0fef1bb`). Exit-code sites in validate/lint/export/to-native switched to `options.strict_state`. `SingleValidationReport.skipped_reason` added. Tree `process_one` callbacks raise on precheck failure under strict_state.
4. ~~**Step 3** — Implement --strict-encoding~~ **DONE** (commit `0fef1bb`). `_encoding.py` with `validate_encoding_native()` / `validate_encoding_format2()`. Wired into all run_* and tree counterparts.
5. ~~**Step 2** — Implement --strict-structure (gxformat2 changes + Galaxy wiring)~~ **DONE** (commit `da11299`). gxformat2#178 merged (commit `94ba0f6` on abstraction_applications). Galaxy side: `check_strict_structure` in `_encoding.py` pre-checks raw dicts via `ConversionOptions(strict_structure=True)` → `ensure_native`/`ensure_format2`. Wired into `run_validate`, `run_lint_stateful`, `run_export`, `run_to_native` (single + tree). `strict_structure` threaded into `ConversionOptions` for `export_workflow_to_format2`, `convert_to_native_stateful`, `_convert_dict_to_native`. JSON-schema-mode structural `strict` rewired from `options.strict` → `options.strict_structure`. 456 unit tests, 1320 IWC sweep green.
6. ~~**Step 5** — Roundtrip with strict flags (multi-stage validation)~~ **DONE** (commit `da11299`). `roundtrip_validate()` gained `strict_structure`, `strict_encoding`, `strict_state` params. Stage 1: encoding + structure check on input dict, precheck-skip→fail under strict_state. Stages 4/5: `strict_structure` threaded into forward/reverse `ConversionOptions`; encoding validated on format2 output and reimported native dict. `RoundTripValidationResult` gained `structure_errors` and `encoding_errors` fields. CLI exit code 2 for strict failures. `roundtrip_single` library entry extended with all three flags.
7. ~~**Step 6** — Update all CLIs (shared parser, help text, output-schema)~~ **DONE** (completed across earlier commits). All 10 relevant CLI scripts already use `add_strict_args()` with `--strict`, `--strict-structure`, `--strict-encoding`, `--strict-state`. Help text describes each flag. Report models (`SingleValidationReport`, `SingleLintReport`, `SingleRoundTripReport`) include `structure_errors`/`encoding_errors` fields for `--output-schema`. `tool_cache structural-schema --strict` kept as-is (semantically distinct: selects strict JSON Schema export model).
8. ~~**Step 8** — Declarative test fixtures~~ **DONE.** 5 new fixture files in `test/unit/tool_util/workflow_state/fixtures/`: `synthetic-cat1-extra-keys.ga`, `synthetic-cat1-json-string-state.ga`, `synthetic-cat1-format2-tool-state.gxwf.yml`, `synthetic-cat1-format2-json-state.gxwf.yml`, `synthetic-missing-tool.ga`. 3 new operations in `test_declarative.py`: `strict_encoding`, `strict_structure`, `strict_state_validate`. 11 test cases in `expectations/strict.yml` covering all 7 plan scenarios plus 4 positive-pass cases. 44/44 declarative tests green.
9. ~~**Step 7** — IWC corpus sweep~~ **DONE.** 2 new test classes in `test_iwc_sweep.py`: `TestIWCSweepStrictStructure` (116 pass, 4 skipped) and `TestIWCSweepStrictAll` (116 pass, 4 skipped). 4 older IWC workflows skipped due to deprecated position sub-fields (`bottom`, `height`, `right`, `width`, `x`, `y`) intentionally dropped from the strict model. Full sweep: 1552 passed, 8 skipped.

### Follow-up from review (post Steps 2/5)

- ~~**Library entry points still take bare `strict: bool`.**~~ **Resolved** (commit `da11299`). `validate_single`, `lint_single`, `roundtrip_single` extended with `strict_structure`/`strict_encoding`/`strict_state`. `export_workflow_to_format2` and `convert_to_native_stateful` extended with `strict_structure`. `SingleValidationReport` and `SingleLintReport` gained `structure_errors`/`encoding_errors` fields. `export_single` still takes bare `strict: bool` — lower priority since it delegates to `export_workflow_to_format2` which now accepts `strict_structure`.
- **Module organization.** `check_strict_encoding` and `check_strict_structure` now live in `_encoding.py` (moved from `validate.py`). All consumers use top-level imports — deferred imports eliminated. `check_strict_structure` catches `pydantic.ValidationError` specifically (not bare `Exception`).

Step 0 is the foundation — it establishes the clean-encoding invariant that `--strict-encoding` later enforces. Steps 1 and 4 are safe, low-risk, and unblocked everything else. Step 3 is self-contained in Galaxy. Step 2 required gxformat2 changes ([gxformat2#178](https://github.com/galaxyproject/gxformat2/issues/178)). Step 5 was the most complex single piece — roundtrip touches all three flags at multiple pipeline stages. Steps 6-9 are integration/polish.

---

## Unresolved Questions

- ~~Strict-structure on the **output** of conversion — validate NormalizedFormat2/NormalizedNativeWorkflow against strict schema models, or against the strict raw-dict models? The normalized models have `extra="allow"` by design — do we need strict normalized model variants, or is validating the serialized dict sufficient?~~ **Resolved: switch to `extra="ignore"` + validate serialized dict.** The normalized models' factory functions already construct with explicit kwargs (no extras reach them), so `extra="allow"` was dead weight. Changing to `extra="ignore"` guarantees `to_dict()` only emits declared fields. Output-side strict-schema validation becomes a sanity check that documents the contract. No strict model variants needed. See [gxformat2#178](https://github.com/galaxyproject/gxformat2/issues/178).
- ~~Should `--strict-encoding` check inside `tool_state` dict values recursively (e.g., a repeat instance value that's a JSON string) or only top-level `tool_state` / `state`?~~ **Resolved: outer level only.** `as_dict()`/`as_list()` removed from the walker (commit `67aa42d`). Modern encoding (`nested=True`) always produces proper dicts/lists after one decode. Legacy-encoded workflows are rejected by `precheck.py`. The walker now fails hard on JSON-string containers rather than silently decoding them. All 960 IWC sweep tests and 408 unit tests pass without the legacy decode path.
- Format2 workflows that use `tool_state` (unstructured) instead of `state` (structured) — is this a real pattern in the wild, or only in test fixtures? If real, `--strict-encoding` rejection needs good error messaging about migration.
- ~~Should `--strict-state` also reject workflows that `precheck.py` would skip (legacy encoding, replacement parameters)?~~ **Resolved: Yes.** These are already skipped — strict-state just promotes the silent skip to a failure exit code.
- ~~`encode_state_to_native()` produces double-encoded output that `--strict-encoding` would reject~~ **Resolved: Step 0.** Fix `encode_state_to_native()` to return clean dicts. Also fix gxformat2's default `to_native()` encoding path. Establish clean-encoding invariant before building strictness checks on top.
- ~~`--strict-structure` on output: if `to_format2()` produces a `NormalizedFormat2` with extra fields (from `extra="allow"`), strict output validation would fail. May need to ensure conversion output is clean or add an output-cleaning pass.~~ **Resolved: `extra="ignore"` on normalized models.** Output is clean by construction. Strict-schema validation on output is a sanity check, not a filter. See [gxformat2#178](https://github.com/galaxyproject/gxformat2/issues/178).
- ~~Roundtrip with `--strict`: should strict-structure validate at all four stages (input native → format2 output → re-imported native → comparison), or only input and final output?~~ **Resolved: all stages.** Each strict flag validates both sides of each conversion — input dict, format2 output, and reimported native. See Step 5.
