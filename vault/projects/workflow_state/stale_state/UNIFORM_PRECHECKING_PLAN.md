# Uniform Workflow Prechecking Plan

**Branch:** `wf_tool_state_reporting`
**Date:** 2026-03-27
**Context:** Builds on `legacy_encoding.py` (commit `bd63bfeb09`) and `legacy_parameters.py` (commit `5abdbd03`). See sibling docs for stale-state background.

## Problem

Three workflow operations — **validate**, **clean**, **roundtrip** — each iterate steps independently with ad-hoc skip logic. Legacy encoding detection (`legacy_encoding.py`) and legacy replacement parameter detection (`legacy_parameters.py`) need to gate these operations, but there's no shared place to do it. Each operation re-discovers the same problems per step.

Export (`export_format2.py`) is excluded from this plan — will be reworked separately.

**Current skip/gate landscape:**

| Operation | File | Skip logic | Legacy params check | Legacy encoding check |
|-----------|------|-----------|--------------------|-----------------------|
| validate | `validate.py:_validate_native` | Per-step: no tool_id, no tool_state, no tool def | Inside `validate_native_step_against` (per-step, silent return) | None |
| clean | `clean.py:clean_stale_state` | Per-step: no tool_id, no tool_state, no tool def | None | None |
| roundtrip | `roundtrip.py:roundtrip_validate` | Delegates to `roundtrip_native_step` → `convert_state_to_format2` | Inside `convert_state_to_format2_using` (per-step, raises `ConversionValidationFailure`) | None |

**Goal:** Skip entire workflow processing when any step has legacy encoding. Do this uniformly across validate, clean, and roundtrip.

## Design

### New module: `precheck.py`

Single workflow-level precheck that runs before any operation.

```python
# lib/galaxy/tool_util/workflow_state/precheck.py

class SkipWorkflowReason(str, Enum):
    LEGACY_ENCODING = "legacy_encoding"
    # Future: LEGACY_PARAMETERS if we lift that to workflow-level.
    # Currently legacy_parameters stays per-step because it gates
    # conversion/validation of individual steps, not the whole workflow.

class WorkflowPrecheck(BaseModel):
    can_process: bool
    skip_reasons: List[SkipWorkflowReason] = []
    legacy_encoding_hits: List[LegacyEncodingHit] = []  # diagnostic detail
    detail: str = ""

def precheck_native_workflow(
    workflow_dict: NativeWorkflowDict,
    get_tool_info: GetToolInfo,
) -> WorkflowPrecheck:
    """Check if a native workflow can be processed by state operations.

    Scans all tool steps (including subworkflows) for legacy encoding.
    If ANY step classifies as YES, the workflow is skipped.
    """
```

**Logic:**
1. Iterate steps (including recursive subworkflow descent)
2. For each tool step with tool_state and resolvable tool def:
   - Run `legacy_encoding.scan_tool_state(parsed_tool.inputs, tool_state)`
   - If classification is `YES` → `can_process=False`, reason=`LEGACY_ENCODING`
   - Carry the `LegacyEncodingHit` objects in `legacy_encoding_hits` for diagnostics
3. Steps with missing tool defs are not blockers (handled downstream by each operation)
4. Return result

**Key properties:**
- Workflow-level decision, not per-step
- Any single YES step skips the whole workflow
- MAYBE_ASSUMED_NO treated same as NO (not a skip)
- Fast — one pass over root-level params per step, no deep walking
- `legacy_encoding_hits` lets callers report *which* step/param triggered the skip

### Status model changes in `_report_models.py`

#### Step-level: rename `"skip"` → `"skip_tool_not_found"`

```python
# Before
StepStatus = Literal["ok", "fail", "skip"]

# After
StepStatus = Literal["ok", "fail", "skip_tool_not_found"]
```

All current `status="skip"` usages are tool-not-found or no-tool-state cases — the rename is accurate.

**Note:** `ConnectionStatus = Literal["ok", "invalid", "skip"]` is unrelated (connection validation skip, not tool-not-found). Do NOT rename `ConnectionStatus.skip`.

**Complete list of places to update for the rename:**

`_report_models.py`:
- `StepStatus` Literal type (line 23)
- `WorkflowValidationResult.summary` computed field — key `"skip"` → `"skip_tool_not_found"` (line 73)
- `SingleValidationReport.summary` computed field — same (line 201)
- `TreeValidationReport.summary` computed field — same (line 165)

`validate.py` — status assignments:
- `_validate_native`: `status="skip"` at lines 115, 129, 141
- `_validate_format2`: `status="skip"` at line 231

`validate.py` — status checks in formatters:
- `format_text`: `r.status == "skip"` at lines 308, 322, 328
- `format_tree_text`: `sr.status == "skip"` at line 349
- `format_tree_markdown`: `sr.status == "skip"` at line 389
- `_emit_single_results`: `r.status == "skip"` at line 579; `has_skips` at line 583
- `_emit_tree_results`: `s["skip"]` at line 601

#### Workflow-level: add `skipped_reason` field

**Decision:** Add a dedicated `skipped_reason` field rather than overloading `error`. This keeps `error` for unexpected failures and `skipped_reason` for expected structural skips.

```python
class WorkflowResultBase(BaseModel):
    path: str = Field(exclude=True)
    relative_path: str = Field(serialization_alias="path")
    category: str
    error: Optional[str] = None
    skipped_reason: Optional[SkipWorkflowReason] = None  # NEW
```

`RoundTripValidationResult` does NOT inherit from `WorkflowResultBase` — it's a standalone model with different fields (`workflow_path` instead of `path`/`relative_path`, no `category`). Add `skipped_reason` there too:

```python
class RoundTripValidationResult(BaseModel):
    workflow_path: str
    # ... existing fields ...
    skipped_reason: Optional[SkipWorkflowReason] = None  # NEW
```

Update `RoundTripValidationResult.status` property to return `"skipped"` when `skipped_reason` is set (before checking `error`).

### Integration into operations

**Principle:** Precheck is called at the **workflow level** by the caller, NOT inside recursive functions like `_validate_native` or `clean_stale_state`. The precheck itself recurses into subworkflows, so one call at the top is sufficient.

#### validate (`validate.py`)

**Single-file path** — in `validate_workflow_cli()`:

```python
def validate_workflow_cli(workflow_dict, get_tool_info, policy=None):
    fmt = _format(workflow_dict)
    if fmt == "native":
        precheck = precheck_native_workflow(workflow_dict, get_tool_info)
        if not precheck.can_process:
            return [], precheck  # caller wraps into appropriate result
        return _validate_native(workflow_dict, get_tool_info, policy=policy), None
    else:
        return _validate_format2(workflow_dict, get_tool_info), None
```

**Tree path** — in `validate_tree()`:

```python
for info in workflows:
    wf_dict = load_workflow_safe(info)
    if wf_dict is None:
        report.results.append(WorkflowValidationResult(..., error="Failed to load"))
        continue
    step_results, precheck = validate_workflow_cli(wf_dict, get_tool_info, policy=policy)
    if precheck and not precheck.can_process:
        report.results.append(WorkflowValidationResult(..., skipped_reason=precheck.skip_reasons[0]))
        continue
    report.results.append(WorkflowValidationResult(..., step_results=step_results))
```

`_validate_native` itself is unchanged — it doesn't know about precheck.

**Single-file entry point** — `run_validate()` / `_emit_single_results()`: need to handle the precheck result from `validate_workflow_cli` and report it appropriately (show "skipped: legacy encoding" instead of step results).

#### clean (`clean.py`)

**Single-file path** — in `_run_single()` before calling `clean_stale_state()`:

```python
precheck = precheck_native_workflow(workflow, tool_info)
if not precheck.can_process:
    # report skip, no cleaning
    ...
```

**Tree path** — in `clean_tree()`:

```python
for info in workflows:
    wf_dict = load_workflow_safe(info)
    if wf_dict is None: ...
    precheck = precheck_native_workflow(wf_dict, get_tool_info)
    if not precheck.can_process:
        report.results.append(WorkflowCleanResult(..., skipped_reason=precheck.skip_reasons[0]))
        continue
    result = clean_stale_state(work_copy, get_tool_info, policy=policy)
    ...
```

`clean_stale_state` itself is unchanged.

#### roundtrip (`roundtrip.py`)

**Single-file path** — in `roundtrip_validate()`:

```python
def roundtrip_validate(workflow_dict, get_tool_info, ...):
    result = RoundTripValidationResult(workflow_path=workflow_path)

    precheck = precheck_native_workflow(workflow_dict, get_tool_info)
    if not precheck.can_process:
        result.skipped_reason = precheck.skip_reasons[0]
        return result

    # ... existing logic ...
```

**Tree path** — in `_run_tree_validation()`:

```python
for info in workflows:
    wf_dict = load_workflow_safe(info)
    if wf_dict is None: ...
    result = roundtrip_validate(wf_dict, tool_info, ...)
    results.append(result)
    # roundtrip_validate already handles the precheck internally
```

**Single-file entry point** — `_run_single_validation()`: `roundtrip_validate` returns the result with `skipped_reason` set, formatters need to handle the new status.

### Tree-walking unification (optional, recommended)

The three tree operations follow the same pattern:

```
discover_workflows(root) → for each: load_workflow_safe() → precheck → process → collect result
```

**Proposed shared infrastructure in `workflow_tree.py`:**

```python
@dataclass
class ProcessedWorkflow:
    """Result of loading + prechecking a single workflow."""
    info: WorkflowInfo
    workflow_dict: Optional[dict]  # None if load failed
    precheck: Optional[WorkflowPrecheck]  # None if load failed or format2
    load_error: Optional[str] = None

def load_and_precheck(
    root: str,
    get_tool_info: GetToolInfo,
    include_format2: bool = True,
) -> List[ProcessedWorkflow]:
    """Discover, load, and precheck all workflows under root."""
    results = []
    for info in discover_workflows(root, include_format2=include_format2):
        wf_dict = load_workflow_safe(info)
        if wf_dict is None:
            results.append(ProcessedWorkflow(info=info, workflow_dict=None, precheck=None, load_error="Failed to load"))
            continue
        if info.format == "native":
            precheck = precheck_native_workflow(wf_dict, get_tool_info)
        else:
            precheck = None  # format2 doesn't need legacy encoding check
        results.append(ProcessedWorkflow(info=info, workflow_dict=wf_dict, precheck=precheck))
    return results
```

Each tree operation then becomes:

```python
def validate_tree(root, get_tool_info, policy=None):
    report = TreeValidationReport(root=root)
    for pw in load_and_precheck(root, get_tool_info):
        if pw.load_error:
            report.results.append(WorkflowValidationResult(..., error=pw.load_error))
            continue
        if pw.precheck and not pw.precheck.can_process:
            report.results.append(WorkflowValidationResult(..., skipped_reason=...))
            continue
        step_results = validate_workflow_cli(pw.workflow_dict, get_tool_info, policy=policy)
        report.results.append(WorkflowValidationResult(..., step_results=step_results))
    return report
```

**Trade-off:** This adds a dependency on `get_tool_info` at discovery time (for precheck). Currently `discover_workflows` is tool-info-independent. The `load_and_precheck` function bridges that gap. Operations that don't need precheck (e.g., cache population) keep using `discover_workflows` + `load_workflow_safe` directly.

**Note on `RoundTripTreeReport`:** Its results are `list[RoundTripValidationResult]`, not `list[WorkflowResultBase]`. It uses `workflow_path` instead of `path`/`relative_path` and has no `category`. The `load_and_precheck` unification would still work — roundtrip's tree loop would consume `ProcessedWorkflow` and construct `RoundTripValidationResult` with `skipped_reason` from the precheck. The structural difference in result models is fine.

### Summary reporting changes

**Tree-level summary fields** need a new `"skipped"` counter:

```python
# TreeValidationReport.summary
{"ok": N, "fail": N, "skip_tool_not_found": N, "error": N, "skipped": N}

# TreeCleanReport.summary
{"total_keys": N, "affected": N, "clean": N, "errors": N, "skipped": N}

# RoundTripTreeReport.summary
{"clean": N, "benign_only": N, "fail": N, "error": N, "skipped": N}
```

Text and markdown formatters updated to show skipped workflows with their reason.

**JSON schema note:** Renaming `"skip"` → `"skip_tool_not_found"` in summary keys changes the JSON report schema. These reports are currently internal/CLI-only with no external consumers, so this is acceptable. If external consumers exist in the future, the JSON schema should be versioned.

## Implementation Steps

### Step 1: Create `precheck.py` with `precheck_native_workflow` — DONE (d383442dc9)
- `SkipWorkflowReason` enum
- `WorkflowPrecheck` model (with `legacy_encoding_hits` for diagnostics)
- `precheck_native_workflow()` — iterate steps (with subworkflow recursion), check `legacy_encoding.scan_tool_state`
- 26 unit tests in `test_precheck.py` using real .ga workflows

### Step 2: Rename `StepStatus` skip value — DONE (d383442dc9)
- `"skip"` → `"skip_tool_not_found"` in `_report_models.py` `StepStatus` Literal
- Updated all summary computed fields, status assignments, formatter checks, exit-code logic
- `ConnectionStatus.skip` left untouched (unrelated)

### Step 3: Add `skipped_reason` to workflow-level result models — DONE (d383442dc9)
- `skipped_reason: Optional[SkipWorkflowReason]` added to `WorkflowResultBase` and `RoundTripValidationResult`
- `RoundTripValidationResult.status` returns `"skipped"` when set
- `_is_passing` returns `True` for skipped (not a failure)
- All tree report summaries count `"skipped"` separately
- Text/markdown formatters show skipped workflows with reason

### Step 4: Wire precheck into `validate.py` — DONE (d383442dc9)
- `validate_workflow_cli` returns `(results, precheck)` tuple
- `validate_tree` and `run_validate` handle precheck skip
- 3 test call sites updated for new return type

### Step 5: Wire precheck into `clean.py` — DONE (d383442dc9)
- Precheck in `_run_single` and `clean_tree`
- `clean_stale_state` unchanged
- `import sys` moved to module level (cleanup)

### Step 6: Wire precheck into `roundtrip.py` — DONE (d383442dc9)
- Precheck at top of `roundtrip_validate` — sets `skipped_reason`, returns early
- Tree path gets it for free
- Imports moved to module level (cleanup)

### Step 7 (optional): Unify tree walking with `load_and_precheck`
- Add `ProcessedWorkflow` and `load_and_precheck` to `workflow_tree.py`
- Refactor `validate_tree`, `clean_tree`, `_run_tree_validation` to use it
- NOT STARTED — defer unless needed

### Step 8: Integration tests via CLI entry points
- These need actual CLI integration to be meaningful — unit-level integration tests were attempted but don't exercise the CLI paths
- NOT STARTED — defer to when CLI-level testing infrastructure is in place

## Bugs Found During Review (all fixed in d383442dc9)
- `_is_passing` in roundtrip.py didn't handle `skipped_reason` → skipped workflows counted as failures
- `format_validation_text` in roundtrip.py miscounted skipped as failures
- `import sys` was inline in `clean.py:_run_single` and `clean.py:run_clean`
- `precheck_native_workflow` import was deferred inside `roundtrip_validate` (unnecessary)
- Mixed step/workflow counts in `TreeValidationReport.summary` text output — separated with "N workflow(s) skipped" suffix

## Remaining Questions

1. **Step-level skip representation inconsistency.** `CleanStepResult` uses `skipped: bool` + `skip_reason: str` while `ValidationStepResult` uses `status: StepStatus`. Not worth unifying now.

2. **Legacy parameters: workflow-level or per-step?** Defer — per-step works today.

3. **Export future-proofing.** Export excluded from this plan. When reworked, should use `precheck_native_workflow`. Module is generic enough.

4. **`validate_workflow_cli` return type change.** Signature now returns `Tuple[List, Optional[WorkflowPrecheck]]`. The public `validate_workflow` in `__init__.py` calls `validation.py:validate_workflow` (a different function) which is unaffected. 3 test callers were updated.
