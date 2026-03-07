---
type: research
subtype: component
component: API Tests - Tools
tags:
  - research/component
  - galaxy/testing
  - galaxy/tools
  - galaxy/api
status: draft
created: 2026-03-04
revised: 2026-03-04
revision: 1
ai_generated: true
galaxy_areas:
  - api
  - tools
  - testing
---

# Component: API Tests - Tools

## Overview

Galaxy's tool-related API tests span two files with distinct purposes:

- **`test_tools.py`** (~3500 lines, unittest-style) - comprehensive coverage of the Tools API surface: index, search, show, test data, dynamic tools, format conversion, collection operations, and tool execution with complex mapping/reduce patterns.
- **`test_tool_execute.py`** (~775 lines, pytest-style) - focused tool execution tests using the modern fluent API (`TargetHistory`, `RequiredTool`, `DescribeToolInputs`).

The split is intentional and aspirational: `test_tool_execute.py`'s docstring states the long-term goal is migrating all execution tests out of `test_tools.py`, leaving it for non-execution tool APIs (index, search, schemas, test data files, etc.).

---

## Architecture

### test_tools.py - Class-Based (Legacy Pattern)

```
TestToolsApi(ApiTestCase, TestsTools)
  ├── setUp(): initializes DatasetPopulator, DatasetCollectionPopulator
  ├── TestsTools mixin: _run(), _run_cat(), _build_pair(), etc.
  └── ~100+ test methods
```

History management: either `self.dataset_populator.test_history()` context manager or `history_id` pytest fixture injection. Both patterns coexist.

Tool execution: `self.dataset_populator.run_tool()` -> `wait_for_tool_run()` -> `get_history_dataset_content()`. Manual input dict construction with `{"src": "hda", "id": ...}` references.

### test_tool_execute.py - Function-Based (Modern Pattern)

```python
@requires_tool_id("cat|cat1")
def test_map_over_collection(
    target_history: TargetHistory,
    required_tool: RequiredTool,
    tool_input_format: DescribeToolInputs,
):
    hdca = target_history.with_pair(["123", "456"])
    inputs = tool_input_format.when.flat(legacy).when.nested(legacy).when.request(request)
    execute = required_tool.execute().with_inputs(inputs)
    execute.assert_has_n_jobs(2).assert_creates_n_implicit_collections(1)
```

Key fixtures: `target_history` (fluent dataset creation), `required_tool` (bound to `@requires_tool_id`), `tool_input_format` (parametrized across legacy/21.01/request formats - each test runs 3x).

---

## What's Tested

### test_tools.py - API Surface Coverage

| Category | Count | Examples |
|----------|-------|---------|
| Tool index/search/show | ~15 | Panel listing, keyword search, `io_details`, conditional/repeat serialization |
| Tool schemas | 1 | `parameter_request_schema`, `parameter_test_case_xml_schema`, `parameter_landing_request_schema` |
| Test data API | ~10 | Path traversal security, admin-only access, composite downloads, YAML tools |
| Data source tools | ~6 | Build request, dbkey filters, `file://` URL blocking |
| Format conversion | 3 | Explicit/implicit history, HDCA conversion |
| Built-in collection ops | ~12 | `__UNZIP__`, `__ZIP__`, `__EXTRACT_DATASET__`, `__FILTER_FAILED__`, `__APPLY_RULES__`, `__CONVERT_SAMPLE_SHEET__` |
| `__APPLY_RULES__` | ~10 | 6 canned examples, paired-or-unpaired, flatten, sample sheets |
| Basic execution | ~5 | `cat1` single run, listified params, version selection |
| Job caching | ~12 | Same-input caching, cross-user caching, collection caching, rename sensitivity |
| Validation | ~5 | Invalid selects, empty datasets, repeats, column values |
| Collection outputs | ~4 | Paired output, list output, dynamic list, format_source |
| Dynamic tools | ~6 | Create, run, show, deactivate, shell_command, UUID reference |
| Map-over / batch | ~15 | Single collection, nested, two-collection linked/unlinked, output filters, discovered outputs |
| Reduce | ~8 | Legacy/modern syntax, repeat, multiple lists, implicit conversion |
| Subcollection mapping | 2 | `map_over_type=paired`, combined mapping+subcollection |
| Identifiers | ~7 | Single/multiple, inside map, conditionals, repeats, actions |
| Permissions | ~5 | Derived permissions, collection/dataset input privacy, cross-user isolation |
| Group tags | 2 | Single/multiple tag selection |
| Deferred datasets | ~9 | Basic execution, metadata validation, URI protocol, mapping, reduction |
| Miscellaneous | ~5 | Model attribute sanitization, hidden datasets, drill-down, data column defaults |

### test_tool_execute.py - Execution-Focused Coverage

| Category | Count | Examples |
|----------|-------|---------|
| Expression tools | 3 | `expression_forty_two`, `expression_parse_int`, `expression_log_line_count` |
| Multi-select | 2 | List values, optional null |
| Identifiers | 7 | Single, multiple reduce, conditional, repeat, collection, actions |
| Map-over | ~12 | Collections, paired_or_unpaired, list:paired_or_unpaired, sample sheets, list:list, empty collection |
| Multi-run | 4 | Repeat with batch, mismatch (no batch wrapper), multiple inputs linked/unlinked |
| Output format actions | 2 | Map-over with format change, nested paired format change |
| Multi-data param | 1 | Two multi-data inputs |
| Select defaults | ~8 | Required/optional, single/multiple, null handling, dynamic empty, validation |
| Text param defaults | ~4 | Required/optional text, null handling, empty validation |
| Collection adapters | 3 | Dataset->paired_or_unpaired, dataset->list, two datasets->paired |
| Data param | 1 | Map over list:list with `gx_data` |
| Repeat with mins | 1 | Optional repeats with minimum filled |
| Deferred datasets | 3 | Basic, metadata options filter, multi-input |

---

## Input Format Testing

A distinguishing feature of `test_tool_execute.py` is systematic input format parametrization via `tool_input_format: DescribeToolInputs`. Tests that use this fixture automatically run 3x:

1. **flat** (legacy) - pipe-delimited keys: `"outer_cond|input1": value`
2. **nested** (21.01) - nested dicts: `{"outer_cond": {"input1": value}}`
3. **request** (tool request API) - clean nested with `{"__class__": "Batch"}` markers instead of `{"batch": True}`

This ensures tool execution works identically across all three API input styles. `test_tools.py` tests generally use only the legacy flat format, with a few manually testing multiple formats.

---

## Gap Analysis

### Coverage Gaps in test_tool_execute.py

Tests that exist in `test_tools.py` but lack modern fluent equivalents in `test_tool_execute.py`:

- **Job caching** - no `use_cached_job` tests
- **Dynamic tools** - creation/deactivation API
- **Validation/error paths** - invalid selects, empty datasets, column validation
- **Permissions** - derived permissions, cross-user isolation
- **Reduce operations** - collection-to-dataset reduction (legacy and modern syntax)
- **Group tag selection** - tag-based collection filtering
- **Subcollection mapping** - `map_over_type=paired` over `list:paired` (partially covered via `test_map_over_paired_or_unpaired_with_list_paired`)
- **Collection operations** - `__UNZIP__`, `__ZIP__`, `__FILTER_FAILED__`, `__APPLY_RULES__`
- **Format conversion** - converter tools
- **Data source tools** - URL fetching, `file://` blocking
- **Dynamic list outputs** - `split_on_column` and discovered outputs

### Coverage Gaps in test_tools.py

Tests that exist in `test_tool_execute.py` but not `test_tools.py`:

- **Expression tools** - `expression_forty_two`, `expression_parse_int`, `expression_log_line_count`
- **Select default behavior** - systematic testing of required/optional/multiple/dynamic-empty selects with null/empty inputs
- **Text param null handling** - required/optional text with null/empty
- **Collection adapters** - `CollectionAdapter` / `PromoteDatasetToCollection` / `PromoteDatasetsToCollection`
- **paired_or_unpaired mapping** - `test_map_over_data_with_paired_or_unpaired_*`
- **list:paired_or_unpaired** - `test_map_over_data_with_list_paired_or_unpaired`
- **Sample sheet mapping** - `test_map_over_paired_or_unpaired_with_sample_sheet`
- **Repeat with mins** - `gx_repeat_boolean_min`

### Structural Observations

1. **Duplication** - Several tests exist in both files with slight variations (identifier tests, map-over tests). The modern versions in `test_tool_execute.py` typically test across all 3 input formats, making them more thorough.

2. **Helper sprawl in test_tools.py** - The `TestsTools` mixin and `TestToolsApi` contain ~20 internal helper methods (`_check_cat1_multirun`, `_check_simple_reduce_job`, etc.). These are single-use wrappers that could be replaced by the fluent assertion API.

3. **History management inconsistency** - `test_tools.py` mixes `self.dataset_populator.test_history()` context managers with pytest `history_id` fixture injection. `test_tool_execute.py` consistently uses `target_history` fixture.

4. **Non-execution tests in test_tools.py** - ~40 tests are purely about tool API endpoints (index, search, show, schemas, test data, dynamic tools) and don't execute tools. These are correctly in `test_tools.py` per the intended split.

---

## Key Patterns

### Fluent Execution Assertions (test_tool_execute.py)

```python
execution = required_tool.execute().with_inputs(inputs)
execution.assert_has_n_jobs(2).assert_creates_n_implicit_collections(1)
execution.assert_has_job(0).with_single_output.with_contents_stripped("123")
execution.assert_creates_implicit_collection(0).assert_has_dataset_element("forward")
```

Chain: `RequiredTool.execute()` -> `DescribeToolExecution.with_inputs()` -> job/output/collection assertions.

### Batch/Map-Over Input Patterns

```python
# Legacy/nested: batch flag in input dict
{"input1": {"batch": True, "values": [hdca.src_dict]}}

# Request API: __class__ marker
{"input1": {"__class__": "Batch", "values": [hdca.src_dict]}}

# Subcollection mapping: map_over_type
{"input1": {"batch": True, "values": [{"map_over_type": "paired", **hdca.src_dict}]}}

# Unlinked (cross-product): linked flag
{"input1": {"batch": True, "linked": False, "values": [...]}}
```

### Multi-Tool Tests

```python
@requires_tool_id("gx_select")
@requires_tool_id("gx_select_no_options_validation")
def test_select_first_by_default(required_tools: list[RequiredTool], ...):
    for required_tool in required_tools:
        required_tool.execute()...
```

Stacking `@requires_tool_id` populates `required_tools` (plural) fixture.

---

## Migration Path

The intended end state per `test_tool_execute.py`'s docstring:

| File | Should Contain |
|------|---------------|
| `test_tools.py` | Tool API endpoints: index, search, show, schemas, test data, dynamic tools, icon, requirements |
| `test_tool_execute.py` | All tool execution: basic runs, map-over, reduce, batch, caching, permissions, validation, collection ops |

Estimated remaining migration: ~80 execution tests in `test_tools.py` that could move to `test_tool_execute.py` using the fluent API. The migration would:
- Eliminate helper method sprawl in `TestToolsApi`
- Add input format parametrization (3x coverage) to tests that currently only test legacy format
- Standardize history management on `target_history` fixture
- Reduce `test_tools.py` from ~3500 lines to ~800-1000 lines

---

## File Reference

| File | Lines | Style | Purpose |
|------|-------|-------|---------|
| `lib/galaxy_test/api/test_tools.py` | ~3537 | unittest class | Tool API + execution (legacy) |
| `lib/galaxy_test/api/test_tool_execute.py` | ~775 | pytest functions | Tool execution (modern fluent) |
| `lib/galaxy_test/api/conftest.py` | - | fixtures | `target_history`, `required_tool`, `tool_input_format` |
| `lib/galaxy_test/base/populators.py` | - | helpers | `DatasetPopulator`, `RequiredTool`, `TargetHistory`, `DescribeToolInputs` |
| `lib/galaxy_test/base/decorators.py` | - | decorators | `@requires_tool_id`, `@skip_without_tool` |
