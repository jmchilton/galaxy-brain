---
type: research
subtype: pr
tags:
  - research/pr
  - galaxy/tools/yaml
  - galaxy/tools/testing
  - galaxy/tools
github_pr: 18641
github_repo: galaxyproject/galaxy
component: Parameter Models
related_prs:
  - 18524
  - 17393
branch: model_parameter_improvements_1
status: draft
created: 2026-02-05
revised: 2026-02-05
revision: 1
ai_generated: true
---

# PR #18641: Parameter Model Improvements - Research Summary

**PR**: galaxyproject/galaxy#18641
**Branch**: `model_parameter_improvements_1` -> `dev`
**Merged**: August 2024
**Diff**: 1974 lines across ~20 files
**Context**: Enhancements from downstream work validating workflows and tool test cases with models from #18524, part of broader structured tool state work #17393.

---

## Overview

This PR extended the parameter model system with three new parameter types (`drill_down`, `data_column`, `conditional_select`), improved `request_requires_value` logic across several parameter models, relocated `ToolTestDescriptionDict` to a canonical location, and added JSON assertion error handling. It also refactored `DrillDownSelectToolParameter` to use the parser abstraction layer instead of raw XML.

---

## 1. New Parameter Model Classes

### DrillDownParameterModel

**PR introduced** (`models.py`):
- `parameter_type: Literal["gx_drill_down"]`
- Fields: `options: Optional[List[DrillDownOptionsDict]]`, `multiple: bool`, `hierarchy: DrillDownHierarchyT`
- `DrillDownHierarchyT = Literal["recurse", "exact"]`
- Helper functions: `drill_down_possible_values()`, `any_drill_down_options_selected()`
- `py_type` builds Literal unions from possible values; falls back to `StrictStr` for dynamic options
- `request_requires_value` checks if any static option is selected (serves as default)

**Current location**: `lib/galaxy/tool_util_models/parameters.py`, lines 1311-1403

**Changes since PR**:
- Added `type: Literal["drill_down"]` field (PR only had `parameter_type`)
- `drill_down_possible_values()` now accepts `hierarchy` parameter (3-arg vs PR's 2-arg). The function at line 1287 now checks `hierarchy == "recurse"` to decide whether non-leaf nodes are selectable, instead of the PR's simpler `not multiple and not is_leaf` check
- Added `py_type_test_case_xml` property (line 1335) returning `str` type for XML test cases
- Added `pydantic_template` with `state_representation` routing for `test_case_xml`, `test_case_json`, `job_internal`, `job_runtime`
- Added `default_option` and `default_options` properties (lines 1362-1377) that extract selected options
- Added `selected_drill_down_options()` helper function (line 1392) - complementing `any_drill_down_options_selected()`

### DataColumnParameterModel

**PR introduced** (`models.py`):
- `parameter_type: Literal["gx_data_column"]`
- Simple model: `py_type` was `StrictInt`, `request_requires_value` returned `False`

**Current location**: `lib/galaxy/tool_util_models/parameters.py`, lines 1405-1475

**Changes since PR**:
- Added `type: Literal["data_column"]` field
- Added `multiple: bool` field and `value: Optional[Union[int, List[int]]]`
- `py_type` now handles `multiple` (list of StrictInt) and `optional` cases
- Added `split_str` static method for comma-separated string parsing in test cases
- `pydantic_template` now routes by `state_representation` (`test_case_xml` with string splitting, `test_case_json`, default)
- `request_requires_value` now considers `optional` state (returns `not self.optional and not self.value`)
- Significantly more sophisticated than the PR's bare-bones version

### SelectParameterModel enhancements (not new, but extended)

**PR added to SelectParameterModel**:
- `default_value` property (returns first selected option, or first option if not optional)
- `request_requires_value` changed from `not self.optional and not self.has_selected_static_option` to `self.multiple and not self.optional` (only requires value for required multiple selects)

**Current location**: `lib/galaxy/tool_util_models/parameters.py`, lines 1151-1280

**Changes since PR**:
- `default_value` property still present (line 1227)
- `default_values` property added for multiple selects (line 1240)
- `request_requires_value` at line 1247 now: `self.multiple and not self.optional`
- Added `py_type_if_required`, `py_type_workflow_step` properties
- Added extensive `pydantic_template` routing for different state representations
- Added `split_str` for test case string handling
- Added `validators: List[SelectCompatiableValidators]` field (line 1156)

---

## 2. Factory Changes

**PR file**: `lib/galaxy/tool_util/parameters/factory.py`
**Current file**: `lib/galaxy/tool_util/parameters/factory.py`

### PR changes:
1. Fixed select `is_static` detection: removed buggy `dynamic_options`/`dynamic_options_elem` logic, simplified to `is_static = dynamic_options_config is None` (line 213 current)
2. Added `drill_down` handler (lines 236-249 current)
3. Added `data_column` handler - PR was minimal (`name` only)
4. Cast conditional test parameter to `Union[BooleanParameterModel, SelectParameterModel]`
5. Added select default value handling for conditionals

### Changes since PR:
- `data_column` handler (lines 250-272 current) now parses `multiple`, `optional`, `value`, `accept_default`
- Factory function signature changed: `_from_input_source_galaxy(input_source, profile)` - `profile` param was added after the PR
- `from_input_source` gained `profile` parameter
- Conditional default value logic extracted to `cond_test_parameter_default_value()` function (imported from models)
- Added handling for `group_tag`, `baseurl`, `genomebuild`, `directory_uri` parameter types (not in PR)
- Added `ParameterDefinitionError` and `UnknownParameterTypeError` exception classes
- All model constructors now pass a `type=` argument (e.g., `type="drill_down"`)

---

## 3. Parser Changes

### interface.py

**PR file**: `lib/galaxy/tool_util/parser/interface.py`
**Current file**: `lib/galaxy/tool_util/parser/interface.py`

**PR introduced**:
- `DrillDownOptionsDict` TypedDict (name, value, options, selected)
- `DrillDownDynamicFilters` type alias
- `DrillDownDynamicOptions` abstract class with `from_code_block()` and `from_filters()` abstract methods
- `parse_drill_down_dynamic_options()` and `parse_drill_down_static_options()` on `InputSource`

**Current state**:
- `DrillDownOptionsDict` has been **moved** to `lib/galaxy/tool_util_models/tool_source.py` (line 158) and is re-imported via `interface.py` line 32
- `DrillDownDynamicFilters` type alias has been **removed entirely** from the codebase
- `DrillDownDynamicOptions` still at line 500 of interface.py but **simplified**: only has `from_code_block()`, the `from_filters()` method was removed
- `parse_drill_down_dynamic_options()` at line 588, `parse_drill_down_static_options()` at line 599

### xml.py

**PR file**: `lib/galaxy/tool_util/parser/xml.py`
**Current file**: `lib/galaxy/tool_util/parser/xml.py`

**PR introduced**:
- `XmlDrillDownDynamicOptions` class with `code_block` and `filters` properties
- `_recurse_drill_down_elems()` function
- `parse_drill_down_dynamic_options()` with complex filter parsing logic
- `parse_drill_down_static_options()` with `from_file` support

**Current state**:
- `XmlDrillDownDynamicOptions` at line 1640 - **simplified**: only takes `code_block`, no `filters` parameter
- `_recurse_drill_down_elems()` at line 1656 - unchanged from PR
- `parse_drill_down_dynamic_options()` at line 1475 - **significantly simplified**: only checks `dynamic_options` attribute, no filter parsing
- `parse_drill_down_static_options()` at line 1486 - largely same as PR

The filter-based drill down dynamic option parsing was **removed**. The `basic.py` `DrillDownSelectToolParameter` no longer sets `self.filtered` from the parser abstraction; the filtering logic must have been moved elsewhere or handled differently.

---

## 4. DrillDownSelectToolParameter Refactoring (basic.py)

**PR file**: `lib/galaxy/tools/parameters/basic.py`
**Current file**: `lib/galaxy/tools/parameters/basic.py`

**PR replaced**:
- Direct XML manipulation (`elem.get()`, `elem.findall()`, `from_file` reading, `recurse_option_elems()`) with parser abstraction methods
- `input_source.parse_drill_down_dynamic_options(tool_data_path)` and `input_source.parse_drill_down_static_options(tool_data_path)`
- Removed ~30 lines of inline XML parsing, added ~15 lines using parser abstraction
- Changed `__init__` to use `input_source.get_bool()`, `input_source.get()` instead of `elem.get()`

**Current state** (line 1663):
- Init uses `input_source.parse_drill_down_dynamic_options(tool_data_path)` and `input_source.parse_drill_down_static_options(tool_data_path)`
- Sets `self.dynamic_options = drill_down_dynamic_options.from_code_block()` (no `filters` reference)
- No longer sets `self.filtered` from dynamic options
- Added `self.tool.app.config.tool_data_path if self.tool else None` guard (handles `tool=None` case)

**Key difference from PR**: The PR set `self.filtered = drill_down_dynamic_options.filters` but the current code does not set `self.filtered` at all in the dynamic path; the `filtered` attribute is entirely gone from the init.

---

## 5. RepeatParameterModel Improvements

**PR changes** (`models.py`):
- Changed `request_requires_value` from `return True` to checking `min` and child parameter requirements
- Changed repeat `pydantic_template` to use `initialize_repeat` based on `request_requires_value` instead of always `...`

**Current state** (line 1623-1668):
- `request_requires_value` logic is identical to PR: checks `min is None or min == 0`, then checks child parameters
- `pydantic_template` has been extended with `state_representation` routing (`job_internal`, `job_runtime`, landing requests)
- Core logic from PR is preserved

---

## 6. Verify Module Changes

### _types.py

**PR moved** `ToolTestDescriptionDict` from `interactor.py` to `_types.py`
**Current file**: `lib/galaxy/tool_util/verify/_types.py`

**Changes since PR**:
- `ToolTestDescriptionDict` at line 40 now has additional fields:
  - `request: NotRequired[Optional[Dict[str, Any]]]` (line 46)
  - `request_schema: NotRequired[Optional[Dict[str, Any]]]` (line 47)
  - `request_unavailable_reason: NotRequired[Optional[str]]` (line 63)
  - `value_state_representation: NotRequired[ValueStateRepresentationT]` (line 65)
- Added `ValueStateRepresentationT = Literal["test_case_xml", "test_case_json"]` (line 37)
- Added `RawTestToolRequest = Dict[str, Any]` (line 30)

### __init__.py

**PR added** `__all__` list and re-export of `ToolTestDescriptionDict` and `ExpandedToolInputsJsonified`
**Current file**: `lib/galaxy/tool_util/verify/__init__.py` - still re-exports from `_types` (line 51-54), `__all__` at line 675

### interactor.py

**PR removed** `ToolTestDescriptionDict` class from `interactor.py`, imported from `_types`
**Current file**: `lib/galaxy/tool_util/verify/interactor.py` - imports from `_types` at line 75

### script.py

**PR changed** import from `interactor` to `verify.__init__`
**Current file**: `lib/galaxy/tool_util/verify/script.py` - imports from `verify` at line 26

### api/tools.py

**PR changed** import from `verify.interactor` to `verify`
**Current file**: `lib/galaxy/webapps/galaxy/api/tools.py` - imports from `verify` at line 64

### asserts/json.py

**PR added** `assert_json_and_load()` helper wrapping `json.loads` with `AssertionError`
**Current file**: `lib/galaxy/tool_util/verify/asserts/json.py` - renamed to `_assert_json_and_load()` (line 78, private function)

---

## 7. Test Infrastructure Changes

### unittest_utils/parameters.py

**PR refactored**:
- Removed `tool_parameter()`, `parameter_source()` single-parameter functions
- Changed `parameter_bundle_for_file()` to return `ToolParameterBundleModel` (whole tool, not single param)
- Added type annotations

**Current file**: `lib/galaxy/tool_util/unittest_utils/parameters.py`

**Changes since PR**:
- Added `parameter_bundle_for_framework_tool()` function (line 27) for tools outside the `parameters/` directory
- Added import of `functional_test_tool_path` from unittest_utils module
- `parameter_bundle` and `ParameterBundle` still exist for backward compatibility

### test_parameter_specification.py

**PR refactored**:
- Changed from single-parameter validation to full bundle validation
- Replaced `if/elif` chain with `assertion_functions` dict dispatch
- Changed all assertion helpers to take `ToolParameterBundleModel` instead of `ToolParameterT`

**Current file**: `test/unit/tool_util/test_parameter_specification.py`

**Changes since PR**:
- Added many more state representations: `relaxed_request_valid/invalid`, `workflow_step_valid/invalid`, `workflow_step_linked_valid/invalid`, `landing_request_valid/invalid`, `test_case_xml_valid/invalid`, `test_case_json_valid/invalid`, `job_internal_valid/invalid`, `job_runtime_valid/invalid`
- `model_assertion_function_factory()` introduced for DRY assertion function creation
- `_test_file()` gains optional `parameter_bundle` parameter

### parameter_specification.yml

**PR added test specs for**:
- `gx_conditional_select` (request_valid/invalid)
- `gx_drill_down_exact` (request_valid/invalid)
- `gx_drill_down_exact_with_selection` (request_valid/invalid)
- `gx_data_column` (request_valid/invalid, request_internal_valid/invalid)
- `gx_select` test_case_valid/invalid, request_internal_valid/invalid
- `gx_repeat_boolean_min` - added `{}` as valid (empty repeat when min has no required children)
- `gx_repeat_data` - added `{}` as valid (empty repeat)
- `gx_repeat_data_min` - added `{}` as invalid (data required inside repeat)

**Current file**: `test/unit/tool_util/parameter_specification.yml`

**Changes since PR**: Many more specs added for new representations and parameter types:
- `gx_data_column_optional`, `gx_data_column_multiple`, `gx_data_column_multiple_accept_default`, etc.
- `gx_drill_down_recurse`, `gx_drill_down_recurse_multiple`
- `gx_conditional_select_dynamic`
- Various workflow_step, landing_request, test_case_xml, test_case_json, job_internal, job_runtime specs

---

## 8. New Test Tools Added

All in `test/functional/tools/parameters/`:

### From this PR:
- `gx_conditional_select.xml` - conditional with select test parameter (not boolean)
- `gx_data_column.xml` - basic data_column parameter
- `gx_drill_down_exact.xml` - drill_down with hierarchy="exact"
- `gx_drill_down_exact_multiple.xml` - drill_down exact + multiple="true"
- `gx_drill_down_exact_with_selection.xml` - drill_down with `selected="true"` on an option
- `gx_drill_down_recurse.xml` - drill_down with hierarchy="recurse"
- `gx_drill_down_recurse_multiple.xml` - drill_down recurse + multiple="true"
- `macros.xml` - added `simple_text_output` and `drill_down_static_options` macros

### Added since PR:
- `gx_conditional_select_dynamic.xml`
- `gx_data_column_accept_default.xml`, `gx_data_column_multiple*.xml`, `gx_data_column_optional*.xml`, `gx_data_column_with_default*.xml`
- `gx_drill_down_code.xml` + `gx_drill_down_code.py`

### Modified by PR:
- `gx_repeat_boolean_min.xml` - fixed tool id, added test case, added length echo
- `gx_select.xml` - added implicit default test case

---

## 9. API Test Changes

**PR file**: `lib/galaxy_test/api/test_tools.py`

**PR added**:
- `test_select_first_by_default` - verifies select parameters pick first option when no selection made
- `test_drill_down_first_by_default` - verifies drill_down parameters without selection are rejected (400) but with selection succeed
- `test_optional_repeats_with_mins_filled_id` - verifies repeats with min can be submitted empty if children are optional

**Current state**: These tests still exist (e.g., `test_drill_down_first_by_default` at line 1074 of `test_tools.py`).

---

## 10. Other Changes

### basic.py doctest fixes
The PR added `>>> from galaxy.util import XML` to many doctests in `basic.py` because `XML` was removed from the top-level imports (replaced by parser abstraction). This pattern persists in the current codebase.

### Tool test file typo fixes
- `multiple_versions_changes_v01.xml`, `v02.xml`, `v01galaxy6.xml`: fixed `intest` -> `inttest` param name in test cases

### Tool Shed schema.ts
Added `DataColumnParameterModel` and `DrillDownParameterModel` to the TypeScript schema. This file is auto-generated.

---

## 11. File Path Migration Summary

| PR Path | Current Path | Notes |
|---------|-------------|-------|
| `lib/galaxy/tool_util/parameters/models.py` | `lib/galaxy/tool_util_models/parameters.py` | Moved to separate package |
| `lib/galaxy/tool_util/verify/_types.py` | Same path | Not moved |
| `lib/galaxy/tool_util_models/_types.py` | Exists (different from verify/_types.py) | Type utilities for pydantic building |
| `lib/galaxy/tool_util/parser/interface.py::DrillDownOptionsDict` | `lib/galaxy/tool_util_models/tool_source.py` | Moved, re-imported by interface.py |
| `lib/galaxy/tool_util/parser/interface.py::DrillDownDynamicFilters` | **Removed** | Filter abstraction removed |
| `lib/galaxy/tool_util/parser/interface.py::DrillDownDynamicOptions` | Same path (simplified) | `from_filters()` removed |
| `lib/galaxy/tool_util/parameters/__init__.py` | Same path | Re-exports from tool_util_models |
| `lib/galaxy/tool_util/parameters/factory.py` | Same path | Extended significantly |

---

## 12. Conditional Select Default Value Handling

The PR introduced a pattern for finding default values of select-based conditional test parameters. In the PR this was inline in `factory.py`:

```python
elif isinstance(test_parameter, SelectParameterModel):
    select_default_value = select_parameter.default_value
    if select_default_value is not None:
        default_value = select_default_value
```

In the current codebase, this was extracted to a standalone function `cond_test_parameter_default_value()` in `parameters.py` (line 1498) and imported by `factory.py`.

---

## Unresolved Questions

- The PR introduced `DrillDownDynamicFilters` and filter-based drill down parsing in `xml.py` (30+ lines of filter logic). This was subsequently **completely removed**. Was the filter approach abandoned, or was it moved to runtime handling in `basic.py`'s `get_options()` method?
- The PR's `DrillDownDynamicOptions.from_filters()` abstract method was removed. How does the current `DrillDownSelectToolParameter` handle filter-based dynamic options? The `get_options()` method at line 1693 of `basic.py` still references `self.is_dynamic` but where does filter metadata come from?
- The PR's `DataColumnParameterModel` was bare-bones (`StrictInt`, always not required). The current version is significantly more complex. Was there an intermediate PR that did this expansion, or was it incremental work on the branch?
- Several test specs in `parameter_specification.yml` that the PR added as commented-out (e.g., conditional_select cases where test_parameter is missing) - are any of these now enabled?
- The PR's `gx_drill_down_exact_with_selection` had `- {}` commented out in `request_valid` (a case where empty request uses selected default). Is this now valid or still commented out?
