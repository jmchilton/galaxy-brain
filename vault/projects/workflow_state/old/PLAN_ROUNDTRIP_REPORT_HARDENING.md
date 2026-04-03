# Plan: Harden Roundtrip Reporting for HTML Report

**Date:** 2026-03-26
**Goal:** Get the existing roundtrip validation pipeline producing structured Pydantic-serializable output with all the data the HTML report needs, accessible via `--report-json` / `--report-markdown` on the existing `galaxy-workflow-roundtrip-validate` CLI.

**Prerequisite for:** ROUNDTRIP_HTML_REPORT_REQUIREMENTS.md — this work ensures the data collection layer is solid before building the TS model, Vue viewer, or HTML assembly.

---

## Current State: What's Missing

The roundtrip CLI (`galaxy-workflow-roundtrip-validate`) is the **only CLI without structured report output**. The validate and clean CLIs both have `--report-json` / `--report-markdown` flags backed by Pydantic models and the `emit_reports()` infrastructure. The roundtrip CLI outputs text only.

### Data types are dataclasses, not Pydantic

| Type | Location | Kind | Problem |
|---|---|---|---|
| `StepResult` | roundtrip.py:66 | dataclass | Can't serialize via `model_dump()`, no JSON Schema export |
| `RoundTripResult` | roundtrip.py:76 | dataclass | Same |
| `StepDiff` | roundtrip.py:163 | dataclass | Same |
| `BenignArtifact` | roundtrip.py:118 | frozen dataclass | Same |
| `RoundTripValidationResult` | roundtrip.py:957 | dataclass | Same — this is the top-level result |
| `DiffType` | roundtrip.py:101 | Enum | Fine as-is (JSON-serializable via `.value`) |
| `DiffSeverity` | roundtrip.py:113 | Enum | Fine as-is |
| `FailureClass` | roundtrip.py:52 | Enum | Fine as-is |

### Data that's computed but discarded

| Data | Where it's computed | Where it's lost |
|---|---|---|
| Step ID mapping | `_build_step_id_mapping()` line 635 | Local to `compare_workflow_steps()`, never returned |
| Match method per step | Implicit in 3-pass matching logic | Not tracked at all |
| Original workflow dict | `roundtrip_validate()` line 1054 | Only used as `orig_model`, raw dict not stored |
| Stale keys stripped | `clean_stale_state()` called at line 1051 | Return value ignored |
| Per-step format2 state | Produced inside `to_format2()` | Only full format2 dict retained |
| Per-step decoded native state | Available via `NormalizedNativeStep.tool_state` | Not stored per-step in result |
| Skipped keys (SKIP_KEYS) | `compare_tool_state()` line 283 | Silently skipped, not tracked |
| Pre/post conversion errors | `convert_state_to_format2_using()` | Collapsed into single exception |
| Replacement params | Checked in `convert.py` | Not flagged in results |
| Category / relative path | Available from `discover_workflows()` `WorkflowInfo` | Only passed as `workflow_path` string |

### No JSON/Markdown report output

The roundtrip CLI script (`workflow_roundtrip_validate.py`) doesn't use `emit_reports()` or accept `--report-json` / `--report-markdown`. It calls `format_validation_text()` and prints.

---

## Progress

| Step | Status | Commit |
|---|---|---|
| 1. Dataclass → Pydantic | **Done** | `a3f9d6ad7b` |
| 2. Step ID mapping | **Done** | `a4e6991ffa` |
| 3. Stale key capture | **Done** | `a4e6991ffa` |
| 4. Skipped keys tracking | Deferred | Low priority diagnostic |
| 5. Original dict capture | **Done** | `a4e6991ffa` |
| 6. --report-json/--report-markdown | **Done** | `7d76f2497a` |
| 7. Per-step enrichment | Deferred | Requires convert.py signature change |
| 8. Contract test | Not started | Blocked on Step 7 |

### Debrief

**What shipped:**
- All roundtrip result types are now Pydantic models with full JSON serialization
- `galaxy-workflow-roundtrip-validate --report-json FILE` produces structured JSON with: three-way workflow dicts (original/format2/reimported), step ID mapping with match methods, stale key data, all StepDiffs with severity/benign classification, conversion results per step
- `--report-markdown FILE` produces a summary markdown report
- Fixed: broken test assertion, double bookkeeping strip, enum serialization in `_report_output.py`
- Both single-file and directory modes wire through `emit_reports()`

**What was deferred and why:**
- **Step 4 (skipped keys):** Small diagnostic. Can be added anytime without affecting other code.
- **Step 7 (per-step format2 state, replacement params, pre/post errors):** Requires changing `convert_state_to_format2_using()` from exception-driven to result-object return. This ripples through the convert pipeline and deserves a focused PR. The per-step format2 state can be extracted from the full format2 workflow dict in the HTML report layer as a stopgap.
- **Step 8 (contract test):** Should be done after Step 7 lands so the test covers the full data model.

**Implementation note:** `RoundTripTreeReport` and `SingleRoundTripReport` were kept simple (not extending `TreeReportBase` / `WorkflowResultBase`) to avoid coupling with the validate/clean report hierarchy. The roundtrip result structure is different enough (three-way dicts, step ID mapping, stale data) that sharing a base class would require awkward compromises. They can be refactored to share a base later if needed.

**Enum serialization fix:** `_report_output.py` was using `model_dump(by_alias=True)` which doesn't convert enums to their string values. Changed to `model_dump(by_alias=True, mode="json")` which handles enums correctly. This was a latent issue that only surfaced because the validate/clean models use `Literal` strings, not `Enum` types.

---

## Plan

### Step 1: Convert roundtrip dataclasses to Pydantic models

Convert `StepResult`, `RoundTripResult`, `StepDiff`, `BenignArtifact`, `RoundTripValidationResult` from dataclasses to Pydantic `BaseModel`. Keep field names and semantics identical. This is mechanical — change `@dataclass` to `class Foo(BaseModel)`, `field(default_factory=list)` to `Field(default_factory=list)`, etc.

**Specific decisions:**
- `BenignArtifact` is frozen — use `model_config = ConfigDict(frozen=True)`.
- `KnownBenignArtifacts` class-level constants (lines 124-161) use `BenignArtifact` with explicit `proven_by` lists — these work fine as frozen Pydantic instances.
- Properties that should **serialize** to JSON: `RoundTripValidationResult.status`, `.error_diffs`, `.benign_diffs` → convert to `@computed_field`.
- Properties that should **NOT serialize** (Python-only helpers): `RoundTripValidationResult.ok`, `.summary_line`, `RoundTripResult.success`, `.failure_summary` → keep as `@property`.
- `StepDiff.format_line()` method stays as a regular method (Pydantic models support methods).
- The enums (`DiffType`, `DiffSeverity`, `FailureClass`) stay as `Enum` — they serialize fine via Pydantic.

**Where to put models:** New roundtrip Pydantic models go in `_report_models.py` alongside the existing validate/clean models. `roundtrip.py` imports them. This follows the established pattern. `RoundTripValidationResult` should extend `WorkflowResultBase` (which provides `path`, `relative_path`, `category`, `error`) to get directory grouping for free.

**Test risks:**
- Pydantic is stricter about types than dataclasses. Any test passing wrong types will now raise `ValidationError`. Run tests after conversion to find these.
- `test_roundtrip.py` line 400: `assert "param" in diffs[0]` — investigate this before relying on it. Likely needs to be `"param" in diffs[0].key_path`.
- Direct attribute mutation (e.g. line 163: `result.direction = "..."`) works on default Pydantic models (mutable by default). Safe.
- `RoundTripResult.success` stays as `@property`, not `@computed_field` — tests that use `.success` as a bool check are unaffected.

### Step 2: Surface the step ID mapping

Modify `_build_step_id_mapping()` to return both the mapping and the match method per step:

```python
@dataclass  # or NamedTuple
class StepIdMapping:
    mapping: dict[str, Optional[str]]       # orig_id -> after_id
    match_methods: dict[str, str]           # orig_id -> "label+type"|"same-id"|"tool_id"|"unmatched"
```

Instrument the three-pass logic to record which pass matched each step.

Modify `compare_workflow_steps()` to return a `ComparisonResult` (diffs + step_id_mapping). Store the mapping on `RoundTripValidationResult`:
```python
step_id_mapping: Optional[dict[str, Optional[str]]] = None
step_id_match_methods: Optional[dict[str, str]] = None
```

Populate in `roundtrip_validate()` after `compare_workflow_steps()` returns.

### Step 3: Capture stale key data before conversion

`roundtrip_validate()` calls `clean_stale_state()` at line 1051 but ignores the return value.

1. Capture the return value from `clean_stale_state()`. Use `Optional[list[CleanStepResult]]` (the existing Pydantic model from `_report_models.py`) to store per-step stale key results.
2. Store on `RoundTripValidationResult` as `stale_clean_results: Optional[list[CleanStepResult]]`.
3. Fix the double-strip: `strip_bookkeeping_from_workflow()` is called at both lines 1047 and 1050 when both `strip_bookkeeping` and `clean_stale` are true. It's idempotent so not a bug, but wasteful. Guard with `if not strip_bookkeeping:` in the `clean_stale` block.

### Step 4: Track skipped keys in comparison

Modify `compare_tool_state()` to optionally track which keys from `SKIP_KEYS` were present in the original step but excluded from comparison.

Use the **lightweight approach**: Add `skipped_keys: Optional[dict[str, list[str]]]` on `RoundTripValidationResult` (step_id -> [keys]). Not diffs — diagnostic metadata.

Pass an accumulator dict through the comparison chain. If `None` (default), don't track — preserves existing behavior for callers that don't care.

### Step 5: Capture original workflow dict + per-step decoded state

`roundtrip_validate()` currently takes `workflow_dict` and mutates it (strips bookkeeping, cleans stale keys) before conversion. The original is lost.

1. `copy.deepcopy(workflow_dict)` at the top of `roundtrip_validate()`, store the pre-mutation original on `RoundTripValidationResult` as `original_dict: Optional[dict]`.
2. **Per-step decoded state extraction:** After `compare_workflow_steps()`, extract per-step decoded `tool_state` dicts from both `orig_model` and the reimported model via `NormalizedNativeStep.tool_state`. Store on `StepResult` as:
   ```python
   original_state: Optional[dict] = None     # decoded native tool_state
   roundtripped_state: Optional[dict] = None  # decoded roundtripped tool_state
   ```
3. Similarly extract `input_connections` per step:
   ```python
   original_connections: Optional[dict] = None
   roundtripped_connections: Optional[dict] = None
   ```

Gate full-dict embedding behind `--embed-dicts` flag (default on) to allow lightweight reports when not needed. Per-step decoded state is always populated (it's small).

The format2 and reimported dicts are already stored (`format2_dict`, `reimported_dict`). Adding `original_dict` completes the three-way set at the workflow level. Adding per-step decoded state completes it at the step level.

### Step 6: Add `--report-json` / `--report-markdown` to roundtrip CLI

Now that the result types are Pydantic:

1. Add `report_json` and `report_markdown` fields to `RoundTripValidateOptions`. Add `HasReportDests` protocol compliance.
2. Add `--report-json` and `--report-markdown` args to the CLI parser in `workflow_roundtrip_validate.py`.
3. Create **tree-level report model** extending `TreeReportBase`:
   ```python
   class RoundTripTreeReport(TreeReportBase):
       results: list[RoundTripValidationResult] = Field(default=[], serialization_alias="workflows")
       options: dict = {}  # CLI options used for this run (includes --strict)
   ```
   With `@computed_field` for summary (pass/fail/benign counts, diff category breakdown, step failure distribution).
4. Create **single-file report model**:
   ```python
   class SingleRoundTripReport(BaseModel):
       workflow: str
       result: RoundTripValidationResult
   ```
5. Create `format_roundtrip_markdown()` formatter following `format_tree_markdown()` pattern. Content: per-category tables with conversion status, diff summary (clean/benign/errors), stale key counts. Details section with per-step diffs.
6. Wire both `_run_tree_validation()` and `_run_single_validation()` into `emit_reports()`.
7. Populate `category` and `relative_path` on `RoundTripValidationResult` from `WorkflowInfo` in `_run_tree_validation()`.

Follow `serialization_alias` conventions established by validate/clean models.

### Step 7: Enrich per-step conversion tracking

Currently `roundtrip_native_step()` returns `StepResult(success=True)` on success with no detail. On failure, it captures `failure_class` and `error`. Enrich:

1. **On success:** capture the `Format2State` returned by `convert_state_to_format2()`. Store `state` and `in` dicts on `StepResult`:
   ```python
   format2_state: Optional[dict] = None        # the converted state dict
   format2_connections: Optional[dict] = None   # the in/connect block
   ```
2. NO LONG VALID.
3. **Pre/post conversion errors:** Modify `convert_state_to_format2_using()` to return a result object instead of raising on validation failure:
   ```python
   class ConversionResult(BaseModel):
       format2_state: Optional[Format2State] = None
       pre_conversion_errors: list[str] = []
       post_conversion_errors: list[str] = []
       success: bool = True
   ```
   This avoids exception-driven control flow and gives `StepResult` both error lists. **Note:** this changes the signature of `convert_state_to_format2_using` — callers in `roundtrip_native_step` must be updated.

### Step 8: Validate the JSON report schema is complete

Write a test that:
1. Runs `roundtrip_validate()` on a workflow with known diffs (e.g. one of the IWC workflows with benign diffs)
2. Serializes to JSON via `model_dump(by_alias=True)`
3. Asserts key fields are present: `step_id_mapping`, `step_id_match_methods`, `original_dict`, `format2_dict`, `reimported_dict`, `diffs` with `severity`/`benign_artifact`, `stale_clean_results`, per-step `original_state`/`roundtripped_state`/`format2_state`/`format2_connections`
4. Roundtrips through `model_validate()` to confirm Pydantic can reconstruct from JSON
5. Exports JSON Schema via `model_json_schema(mode='serialization')` and asserts it's valid

This test becomes the **contract test** that the Zod schema pipeline will also validate against. The exported JSON Schema is the input to the `json-schema-to-zod` build step.

Also: write a CLI integration test that runs `galaxy-workflow-roundtrip-validate --report-json /tmp/report.json` on a test workflow and validates the output file parses correctly.

---

## Step Order and Dependencies

```
Step 1 (dataclass → Pydantic, move to _report_models.py)
  ├── Step 2 (step ID mapping)
  ├── Step 3 (stale key capture)
  ├── Step 4 (skipped keys tracking)
  ├── Step 5 (original dict + per-step decoded state)
  └── Step 7 (enrich per-step conversion)
        │
        ▼
Step 6 (--report-json / --report-markdown CLI, tree + single report models)
        │
        ▼
Step 8 (contract test + JSON Schema export)
```

Steps 2-5 and 7 are independent of each other, all depend on Step 1. Step 6 depends on all of them (it serializes the enriched models). Step 8 validates the whole thing.

---

## What This Enables

After this plan, running:
```
galaxy-workflow-roundtrip-validate /path/to/iwc --report-json report.json
```

Produces a JSON file containing:
- Per-workflow: original dict, format2 dict, reimported dict (three-way at workflow level)
- Per-workflow: step ID mapping with match methods
- Per-workflow: stale keys found and stripped (via `CleanStepResult` list)
- Per-workflow: category and relative path for grouping
- Per-step: conversion success/failure with failure class
- Per-step: decoded original, format2, and roundtripped tool_state dicts (three-way at step level)
- Per-step: original and roundtripped input_connections
- Per-step: format2 state and connections (on success)
- Per-step: replacement param flag
- Per-step: pre- and post-conversion validation errors
- Per-step: all StepDiffs with severity, benign artifact classification, original/roundtrip values
- Per-step: skipped keys from SKIP_KEYS
- Summary: pass/fail/benign counts, diff category breakdown, step failure distribution

This JSON is **~85% of what the HTML report's `RoundtripHtmlReport` model needs**. The remaining ~15%:
- **`ParameterNode` tree** (section 3.5) — the largest new component, requires a three-way parameter walker. This is a separate plan item.
- **`CorpusSummary` aggregations** (section 3.2) — straightforward computed fields over the tree report, added by the HTML report orchestration layer.
- **Graphical metadata per-step** (position, label, annotation as three-way fields) — currently only captured as `StepDiff` entries when they differ, not as always-present fields. The HTML report layer extracts these from the workflow dicts.

---

## Unresolved Questions

1. Should `original_dict` embedding be optional (flag-gated) to keep JSON reports small when full dicts aren't needed? Three dicts per workflow add ~300KB each. **Recommendation:** `--embed-dicts` flag, default on. Reports without dicts are still useful for CI.
2. The double-strip of bookkeeping (Step 3 note) — confirmed idempotent, not a bug. Fix is low-risk optimization.
3. For Step 7 (per-step format2 state capture) — store just the `state` and `in` dicts, not the full `Format2State` object. The `Format2State` type may not serialize cleanly.
4. Should the `RoundTripTreeReport` include the `--strict` flag value in its `options` dict? **Recommendation:** yes, so the JSON consumer knows what mode was used.
5. `test_roundtrip.py` line 400 (`"param" in diffs[0]`) — needs investigation before Step 1. If this test is broken, fix it first.
