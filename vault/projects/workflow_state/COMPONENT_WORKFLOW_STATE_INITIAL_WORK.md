# Structured Workflow Tool State: Initial Work Summary

Branch: `structured_tool_state`
Commits: `ed4d1eeb4a` (gxformat2 abstraction layer), `1a69df9462` (workflow conversion and validation), `c33843b28b` (WIP populate_state test)

Reference docs:
- `galaxy-brain/vault/research/Component - Workflow Format Differences.md`
- `galaxy-brain/vault/research/Component - Tool State Specification.md`

## Problem Statement

Galaxy's two workflow formats handle tool state very differently:

- **Native (.ga)**: `tool_state` is a double-encoded JSON string with `ConnectedValue` markers, `__current_case__`, `__page__`, etc. Ugly but lossless.
- **Format2 (.gxwf.yml)**: `state` is clean structured YAML, connections in `in`, no internal bookkeeping. Human-friendly but the conversion is schema-free.

The gxformat2 library converts between formats **without consulting tool definitions**. It can't validate parameter names/types, can't infer missing `__current_case__` values, and can't produce clean `state` on export (it just copies `tool_state` with per-value JSON strings intact). The research docs identify this as a key gap: the export path produces `tool_state` (machine-format) not `state` (human-format).

Galaxy already has a sophisticated tool state validation infrastructure (12 state representations with Pydantic models), including `workflow_step` and `workflow_step_linked` representations that validate workflow-context tool state. This work starts connecting that infrastructure to workflow format conversion.

## What Was Built

### 1. gxformat2 Abstraction Layer (`ed4d1eeb4a`)

**`lib/galaxy/workflow/format2.py`** — Extracts gxformat2 conversion calls from `managers/workflows.py` into a reusable module:
- `convert_to_format2(as_dict, json_wrapper)` — wraps `from_galaxy_native()`
- `convert_from_format2(as_dict, workflow_directory)` — wraps `python_to_workflow()` with `ImportOptions` and error handling
- `Format2ConverterGalaxyInterface` — stub `ImporterGalaxyInterface` (raises on nested workflow import)

`managers/workflows.py` was simplified to use these helpers, removing ~30 lines of duplicated conversion boilerplate.

**`test/unit/workflows/test_convert.py`** — Roundtrip test: format2 -> native -> format2.

### 2. Workflow State Validation and Conversion Package (`1a69df9462`)

**New package: `lib/galaxy/tool_util/workflow_state/`**

This is the core of the work. It's in `tool_util` (runtime-independent), not `galaxy.workflow` (runtime-dependent).

#### Types (`_types.py`)
- `GetToolInfo` — Protocol with `get_tool_info(tool_id, tool_version) -> ParsedTool`
- Type aliases: `NativeStepDict`, `Format2StepDict`, `NativeWorkflowDict`, `Format2WorkflowDict`, etc.

#### Validation — Format2 (`validation_format2.py`)
For each tool step in a format2 workflow:
1. Resolves the tool via `GetToolInfo`
2. Validates `state` dict against `WorkflowStepToolState` pydantic model (parameters without connections)
3. Merges connections from `in`/`connect` into state as `ConnectedValue` markers
4. Validates merged state against `WorkflowStepLinkedToolState` model (parameters with connections allowed)

Key function: `merge_inputs()` — walks tool parameter tree (conditionals, repeats, sections) and injects `ConnectedValue` into state dict for each connected input. This is the schema-aware analog of what gxformat2's `setup_connected_values()` does schema-free.

Handles:
- Conditionals: resolves which `when` branch based on test parameter value, validates branch params
- Repeats: maps `repeat_inputs_to_array()` connections to repeat instances
- Leaf params: marks as `ConnectedValue` if in connect dict

#### Validation — Native (`validation_native.py`)
For each tool step in a native workflow:
1. Parses `tool_state` JSON string
2. Merges `input_connections` into state as `ConnectedValue` markers (some older workflows don't have them inline)
3. Walks parameter tree validating:
   - Integers: `int(value)` check
   - Data/collection: must be `ConnectedValue`/`RuntimeValue` dict or null+connected (unless optional)
   - Selects: value must be in options list
   - Conditionals: resolves `when` branch, cross-checks `__current_case__` index
   - Extra keys (not in tool def): raises error
4. Allowed extra keys: `__page__`, `__rerun_remap_job_id__` at root level; `__current_case__` + test param name in conditional branches

#### Conversion (`convert.py`)
`convert_state_to_format2(native_step_dict, get_tool_info) -> Format2State`

Defensive conversion with validation guards:
1. Resolve tool via `GetToolInfo`
2. Validate native step state (fail -> `ConversionValidationFailure`)
3. Convert to format2 state (currently handles `gx_integer` and `gx_data` only)
4. Validate resulting format2 state (fail -> `ConversionValidationFailure`)
5. Return `Format2State` (pydantic model with `state` and `in` fields)

The caller catches `ConversionValidationFailure` and falls back to the raw native `tool_state` — "better ugly than corrupted."

**Status**: Only `gx_integer` and `gx_data` parameter types implemented. Other types hit a pass/`NotImplementedError`. Has debug `print()` statements.

#### Dispatch (`validation.py`)
`validate_workflow(workflow_dict, get_tool_info)` — detects format via `a_galaxy_workflow == "true"` and dispatches to format2 or native validator.

### 3. Galaxy-Side Validator (`lib/galaxy/workflow/gx_validator.py`)

`GalaxyGetToolInfo` — concrete `GetToolInfo` implementation using Galaxy stock tools:
- Loads all stock tool sources at init, parses each into `ParsedTool`
- Indexes by `(tool_id, version)` with latest-version tracking
- `GET_TOOL_INFO` global singleton

`validate_workflow(as_dict)` — convenience function using the global instance.

### 4. Supporting Changes

- **`version_util.py`** — `AnyVersionT = Union[LegacyVersion, Version]` type alias extracted for reuse
- **`parameters/__init__.py`** — exports `is_optional` function
- **`parameters.py`** — new `is_optional(tool_parameter)` function checking if a ToolParameter is optional
- **`tools/__init__.py`** — uses `AnyVersionT` from new module
- **`packages/tool_util/setup.cfg`** — adds `packaging` dependency

### 5. Tests

**`test/unit/workflows/test_workflow_validation.py`** — Main test file:
- `test_validate_simple_functional_test_case_workflow()` — validates several framework test workflows (multiple_versions, zip_collection, empty_collection_sort, flatten_collection, flatten_collection_over_execution)
- `test_validate_native_workflows()` — validates `test_workflow_two_random_lines.ga`. Several others commented out with notes: disconnected input, double-nested JSON, subworkflows, unhandled `gx_text`
- `test_validate_unit_test_workflows()` — validates simple_int and simple_data fixtures
- `test_invalidate_with_extra_attribute()` — expects failure, asserts "parameter2" in error
- `test_invalidate_with_wrong_link_name()` — expects failure, asserts "parameterx" in error
- `test_invalidate_with_missing_link()` — expects failure, asserts "parameter" + "type=missing" in error

**`test/unit/workflows/test_workflow_state_conversion.py`** — converts `test_workflow_1.ga` cat step to format2.

**`test/unit/workflows/test_workflow_validation_helpers.py`** — tests `GalaxyGetToolInfo` (resolves cat1 by version and latest).

**Test fixtures** in `test/unit/workflows/valid/` and `invalid/` — minimal gxwf.yml workflows using `gx_int` and `gx_data` parameter spec test tools.

### 6. WIP Populate State Test (`c33843b28b`)

Adds `TestMetadata` class to `test_populate_state.py` — tests `populate_state()` with `gx_data_column.xml` tool. Marked WIP, may not be kept.

## Current Gaps / What's Left

- **Parameter type coverage**: Only `gx_integer`, `gx_data`, `gx_data_collection`, `gx_select`, `gx_conditional`, and `gx_repeat` handled in native validation. Format2 conversion only handles `gx_integer` and `gx_data`. Missing: `gx_text`, `gx_float`, `gx_boolean`, `gx_color`, `gx_hidden`, `gx_genomebuild`, `gx_directory_uri`, `gx_drill_down`, `gx_data_column`, sections, and more.
- **Several native workflows fail validation** (commented out in tests): disconnected inputs, double-nested JSON, subworkflows, `gx_text`.
- **Debug print statements** left in `convert.py`.
- **Connection resolution in conversion**: format2 `in` connections just set `"placeholder"` value rather than resolving actual step/output references.
- **No integration with actual format2 export path** yet — the conversion produces a `Format2State` but it isn't wired into `from_galaxy_native()`.
- **No section parameter support** in state walking/merging.
- **`native_connections_for()`** in `validation_native.py` has a bug: calls `step.get("input_connections", {})` but discards result, then returns `step.get(state_path)` which looks at step root not input_connections.
- **Error messages** are raw exceptions, not structured validation errors.
