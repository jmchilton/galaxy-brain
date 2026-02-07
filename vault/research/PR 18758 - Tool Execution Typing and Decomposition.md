---
type: research
subtype: pr
tags:
  - research/pr
  - galaxy/tools
  - galaxy/tools/yaml
  - galaxy/lib
github_pr: 18758
github_repo: galaxyproject/galaxy
component: Tool Execution
status: draft
created: 2026-02-05
revised: 2026-02-05
revision: 1
ai_generated: true
---
 
# PR #18758: More Typing, Docs, and Decomposition Around Tool Execution

**PR**: https://github.com/galaxyproject/galaxy/pull/18758
**Title**: More typing, docs, and decomposition around tool execution
**Status**: Merged

## Overview

PR #18758 introduced structured type annotations for the tool state lifecycle and decomposed monolithic tool execution methods into focused, well-typed functions. This PR is foundational to the structured tool state work — it creates the vocabulary of type aliases that describe how tool state transforms through the execution pipeline.

## Key Changes

### 1. `lib/galaxy/tools/_types.py` — Tool State Type Aliases (NEW FILE)

Created a new module defining type aliases for each stage of tool state transformation. While all are `Dict[str, Any]` at runtime, the type aliases serve as documentation markers describing what processing has occurred.

**Type Lifecycle Table** (from the module docstring):

| Type | State For | Object References | Validated? |
|------|-----------|-------------------|------------|
| `ToolRequestT` | request | src dicts of encoded ids | no |
| `ToolStateJobInstanceT` | a job | src dicts of encoded ids | no |
| `ToolStateJobInstancePopulatedT` | a job | model objs loaded from db | check_param |
| `ToolStateDumpedToJsonT` | a job | src dicts of encoded ids (normalized) | yes |
| `ToolStateDumpedToJsonInternalT` | a job | src dicts of decoded ids (normalized) | yes |
| `ToolStateDumpedToStringsT` | a job | src dicts dumped to strs (normalized) | yes |
| `ParameterValidationErrorsT` | errors | nested dict of str/Exception | n/a |
| `InputFormatT` | format flag | Literal["legacy", "21.01"] | n/a |

**Current location**: `lib/galaxy/tools/_types.py` (69 lines)

**Key insight**: The lifecycle is `ToolRequestT` → (expand) → `ToolStateJobInstanceT` → (populate/check_param) → `ToolStateJobInstancePopulatedT` → (dump) → `ToolStateDumpedToJson*T` / `ToolStateDumpedToStringsT`

### 2. `lib/galaxy/tools/__init__.py` — expand_incoming() Decomposition

The monolithic `expand_incoming()` method (~40 lines of inline logic) was decomposed into focused methods:

#### Before (single method):
```python
def expand_incoming(self, trans, incoming, request_context, input_format="legacy"):
    # inline: decode rerun_remap_job_id
    # inline: expand meta parameters
    # inline: validate expansion
    # inline: loop over expanded, populate each
    ...
```

#### After (decomposed):

**a) `expand_incoming()`** — orchestrator, typed signature:
```python
def expand_incoming(
    self, request_context: WorkRequestContext, incoming: ToolRequestT, input_format: InputFormatT = "legacy"
) -> Tuple[List[ToolStateJobInstancePopulatedT], List[ParameterValidationErrorsT], Optional[int], Optional[MatchingCollections]]
```
Note: `trans` parameter removed — now uses `request_context` directly.

**b) `_rerun_remap_job_id()`** — module-level function extracted:
```python
def _rerun_remap_job_id(trans, incoming, tool_id: Optional[str]) -> Optional[int]
```

**c) `_ensure_expansion_is_valid()`** — validation guard:
```python
def _ensure_expansion_is_valid(self, expanded_incomings: List[ToolStateJobInstanceT], rerun_remap_job_id: Optional[int]) -> None
```

**d) `_populate()`** — per-job parameter population:
```python
def _populate(self, request_context, expanded_incoming: ToolStateJobInstanceT, input_format: InputFormatT) -> Tuple[ToolStateJobInstancePopulatedT, ParameterValidationErrorsT]
```

**e) `completed_jobs()`** — job caching lookup extracted from `handle_input()`:
```python
def completed_jobs(self, trans, use_cached_job: bool, all_params: List[ToolStateJobInstancePopulatedT]) -> Dict[int, Optional[model.Job]]
```
This was also called from `workflow/modules.py` with duplicated code — the extraction removed that duplication.

### 3. `lib/galaxy/tools/execute.py` — Execution Framework Typing

**a) `MappingParameters` NamedTuple** — typed fields:
```python
class MappingParameters(NamedTuple):
    param_template: ToolRequestT                           # was ToolParameterRequestT
    param_combinations: List[ToolStateJobInstancePopulatedT]  # was ToolParameterRequestInstanceT
```
Renamed from the old `ToolParameterRequestT`/`ToolParameterRequestInstanceT` aliases (which were deleted from execute.py and moved to `_types.py` with new names).

**b) `ExecutionSlice`** — typed `param_combination`:
```python
param_combination: ToolStateJobInstancePopulatedT  # was ToolParameterRequestInstanceT
```

**c) `ExecutionTracker`** — class-level attribute type annotations added:
```python
execution_errors: List[ExecutionErrorsT]
successful_jobs: List[model.Job]
output_datasets: List[Tuple[str, model.HistoryDatasetAssociation]]
output_collections: List[Tuple[str, model.HistoryDatasetCollectionAssociation]]
implicit_collections: Dict[str, model.HistoryDatasetCollectionAssociation]
```

**d) `ExecutionErrorsT`** — new type alias:
```python
ExecutionErrorsT = Union[str, Exception]
```

**e) Null safety for `collection_info`** — throughout `ExecutionTracker`, `self.collection_info` accesses were guarded with `assert collection_info` or `if collection_info is not None` checks, replacing direct attribute access on potentially-None objects.

### 4. `lib/galaxy/tools/actions/` — Typed Action execute() Methods

All `ToolAction` subclass `execute()` methods had their `incoming` parameter retyped:
- **Before**: `incoming: Optional[ToolParameterRequestInstanceT]`
- **After**: `incoming: Optional[ToolStateJobInstancePopulatedT]`

Affected files:
- `actions/__init__.py` — `ToolAction` (abstract), `DefaultToolAction`
- `actions/data_manager.py` — `DataManagerToolAction`
- `actions/history_imp_exp.py` — `ImportHistoryToolAction`, `ExportHistoryToolAction`
- `actions/metadata.py` — `SetMetadataToolAction`
- `actions/model_operations.py` — `ModelOperationToolAction`
- `actions/upload.py` — `UploadToolAction`

Also added `get_output_name()` as an `@abstractmethod` on `ToolAction`.

### 5. `lib/galaxy/tools/parameters/__init__.py` — New Functions and Typed Signatures

**a) `ToolInputsT`** — new type alias:
```python
ToolInputsT = Dict[str, Union[Group, ToolParameter]]
```

**b) `params_to_json_internal()`** — new convenience function:
```python
def params_to_json_internal(params: ToolInputsT, param_values: ToolStateJobInstancePopulatedT, app) -> ToolStateDumpedToJsonInternalT
```
Wraps `params_to_strings()` with `nested=True, use_security=False` → decoded IDs.

**c) `params_to_json()`** — new convenience function:
```python
def params_to_json(params: ToolInputsT, param_values: ToolStateJobInstancePopulatedT, app) -> ToolStateDumpedToJsonT
```
Wraps `params_to_strings()` with `nested=True, use_security=True` → encoded IDs.

**d) `params_to_strings()`** — enhanced signature and docs:
```python
def params_to_strings(
    params: ToolInputsT, param_values: ToolStateJobInstancePopulatedT, app, nested=False, use_security=False
) -> Union[ToolStateDumpedToJsonT, ToolStateDumpedToJsonInternalT, ToolStateDumpedToStringsT]
```

**e) `populate_state()`** — typed parameters:
```python
def populate_state(
    request_context, inputs: ToolInputsT, incoming: ToolStateJobInstanceT,
    state: ToolStateJobInstancePopulatedT, errors: Optional[ParameterValidationErrorsT] = None,
    ..., input_format: InputFormatT = "legacy"
)
```

### 6. `lib/galaxy/tools/parameters/grouping.py` — Constructor Refactoring

All `Group` subclasses changed to require `name` in constructor:

**Before**:
```python
group = Repeat()
group.name = "r"
```

**After**:
```python
group = Repeat("r")
```

Affected classes: `Group`, `Repeat`, `Section`, `UploadDataset`, `Conditional`

Also added class-level type annotations:
- `Group.name: str`
- `Repeat.inputs: ToolInputsT`, `Repeat.min: int`, `Repeat.max: float`
- `Section.inputs: ToolInputsT`
- `UploadDataset.inputs: ToolInputsT`
- `Conditional.cases: List[ConditionalWhen]`, `Conditional.value_ref: Optional[str]`

`Repeat.min` defaults to `0` and `Repeat.max` defaults to `inf` (from `math.inf`), replacing `None`.

### 7. Other Typed Improvements

**a) `lib/galaxy/tools/parameters/meta.py`**:
- `ExpandedT = Tuple[List[ToolStateJobInstanceT], Optional[matching.MatchingCollections]]`
- `expand_meta_parameters(trans, tool, incoming: ToolRequestT) -> ExpandedT`

**b) `lib/galaxy/managers/jobs.py`**:
- `by_tool_input()` method typed with `ToolStateJobInstancePopulatedT` and `ToolStateDumpedToJsonInternalT`
- New type aliases: `JobStateT = str`, `JobStatesT = Union[JobStateT, List[JobStateT]]`

**c) `lib/galaxy/webapps/galaxy/api/jobs.py`**:
- `search()` endpoint updated to use `proxy_work_context_for_history()` instead of constructing `WorkRequestContext` directly
- `expand_incoming()` call site updated for new signature (no `trans` param)

**d) `lib/galaxy/work/context.py`**:
- `proxy_work_context_for_history()` now has explicit `-> WorkRequestContext` return type

**e) `lib/galaxy/workflow/modules.py`**:
- Duplicated `completed_jobs` loop replaced with `tool.completed_jobs(trans, use_cached_job, param_combinations)`

**f) `lib/galaxy/tools/parameters/basic.py`**:
- `ToolParameter.name: str` class-level annotation added

**g) `test/unit/app/tools/test_evaluation.py`**:
- Test code updated for new Group constructor signatures

## Current Codebase State (Post-PR Evolution)

Cross-referencing PR #18758 with the current `structured_tool_state` branch:

### All PR Changes Intact
Every change from PR #18758 is present in the current codebase at the expected locations.

### Significant Evolution Since PR

**1. Async Variants Added**:
- `expand_incoming_async()` — async version of `expand_incoming()` in Tool class
- `_populate_async()` — async version of `_populate()` in Tool class
- `populate_state_async()` — async version in parameters module
- These support the tool request/tasks API for async tool execution

**2. MappingParameters Enhanced**:
```python
class MappingParameters(NamedTuple):
    param_template: ToolRequestT
    param_combinations: List[ToolStateJobInstancePopulatedT]
    validated_param_template: Optional[RequestInternalDereferencedToolState] = None
    validated_param_combinations: Optional[List[JobInternalToolState]] = None

    def ensure_validated(self): ...
```
Added optional schema-validated state fields for the structured tool state execution path.

**3. ExecutionSlice Enhanced**:
- Added `validated_param_combination: Optional[JobInternalToolState]` field
- Supports both legacy and schema-validated execution modes

**4. _ensure_expansion_is_valid() Updated**:
```python
def _ensure_expansion_is_valid(
    self,
    expanded_incomings: Union[List[JobInternalToolState], List[ToolStateJobInstanceT]],
    rerun_remap_job_id: Optional[int],
) -> None
```
Union type now includes `JobInternalToolState` for schema-validated paths.

## Relationship to Structured Tool State

PR #18758 is the **bridge PR** between the old untyped tool execution and the structured tool state system:

1. **Type aliases as documentation** — Even though all types are `Dict[str, Any]` at runtime, the aliases document what has happened to the state at each point in the pipeline
2. **Decomposition enables insertion points** — Breaking `expand_incoming()` into parts created clean insertion points for the async/schema-validated variants added later
3. **MappingParameters as dual carrier** — The later addition of `validated_param_template`/`validated_param_combinations` shows MappingParameters became the bridge carrying both legacy and schema-validated state through execution
4. **Foundation for `_types.py`** — This module is imported across the tools package and serves as the central type vocabulary for tool state

## File Index

| File | Lines (PR) | Current Lines | Status |
|------|-----------|---------------|--------|
| `lib/galaxy/tools/_types.py` | 65 (new) | 69 | Intact |
| `lib/galaxy/tools/__init__.py` | major changes | ~5000+ | Intact + async variants |
| `lib/galaxy/tools/execute.py` | major changes | ~700+ | Intact + validated state fields |
| `lib/galaxy/tools/actions/__init__.py` | typed execute() | ~1000+ | Intact |
| `lib/galaxy/tools/actions/data_manager.py` | typed execute() | ~80+ | Intact |
| `lib/galaxy/tools/actions/history_imp_exp.py` | typed execute() | ~200+ | Intact |
| `lib/galaxy/tools/actions/metadata.py` | typed execute() | ~200+ | Intact |
| `lib/galaxy/tools/actions/model_operations.py` | typed execute() | ~200+ | Intact |
| `lib/galaxy/tools/actions/upload.py` | typed execute() | ~200+ | Intact |
| `lib/galaxy/tools/parameters/__init__.py` | typed + new fns | ~700+ | Intact + async populate |
| `lib/galaxy/tools/parameters/grouping.py` | constructor refactor | ~800+ | Intact |
| `lib/galaxy/tools/parameters/meta.py` | typed expand | ~250+ | Intact |
| `lib/galaxy/tools/parameters/basic.py` | name annotation | ~2500+ | Intact |
| `lib/galaxy/managers/jobs.py` | typed by_tool_input | ~500+ | Intact |
| `lib/galaxy/webapps/galaxy/api/jobs.py` | updated call site | ~500+ | Intact |
| `lib/galaxy/workflow/modules.py` | deduplicated completed_jobs | ~2500+ | Intact |
| `lib/galaxy/work/context.py` | return type | ~200+ | Intact |
