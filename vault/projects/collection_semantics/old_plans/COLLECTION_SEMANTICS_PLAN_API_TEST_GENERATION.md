# Plan: Generate API Test Cases from Collection Semantics Spec

## Overview

Generate parametrized pytest API tests from the YAML spec's example entries, covering collection mapping, reduction, sub-collection mapping, and type validation at runtime.

## Inventory: Current Test Coverage

31 examples in `collection_semantics.yml`:
- **9** have `api_test` references (existing tests in `test_tool_execute.py` and `test_tools.py`)
- **4** have `tool` references (framework test tools like `collection_paired_test`)
- **18** have NO `tool_runtime` test at all

**Typo found:** `LIST_REDUCTION` (line 303) has doubled path: `test_tools.py::TestToolsApi::test_tools.py::test_reduce_collections`

## Approach: Hybrid Parametrize

### Prong 1: YAML-to-Test-Case Parser

New module `test_cases.py` that parses the spec into structured dataclasses:

```python
@dataclass
class CollectionSemanticTestCase:
    label: str
    tool_shape: ToolShape           # in/out type signature
    collections: dict[str, CollectionDef]
    input_bindings: dict[str, InputBinding]
    expected_results: dict[str, OutputExpectation]
    is_valid: bool
```

Extends existing Pydantic models in `semantics.py` to extract structured test information from assumptions + `then` expressions.

### Prong 2: Parametrized Test File

New `test_collection_semantics.py` using `pytest.mark.parametrize`:

```python
@pytest.mark.parametrize("test_case", load_valid_test_cases(), ids=lambda tc: tc.label)
def test_valid_collection_operation(test_case: CollectionSemanticTestCase, target_history):
    """Verify valid collection operations produce expected output structure."""
    collection = build_collection_from_spec(target_history, test_case)
    result = execute_tool(target_history, test_case, collection)
    verify_output_structure(result, test_case.expected_results)

@pytest.mark.parametrize("test_case", load_invalid_test_cases(), ids=lambda tc: tc.label)
def test_invalid_collection_operation(test_case: CollectionSemanticTestCase, target_history):
    """Verify invalid collection operations are rejected."""
    collection = build_collection_from_spec(target_history, test_case)
    with pytest.raises(Exception):  # 400 or appropriate error
        execute_tool(target_history, test_case, collection)
```

## Implementation Steps

### Step 1: Fix spec typo
Line 303: `test_tools.py::TestToolsApi::test_tools.py::test_reduce_collections` -> `test_tools.py::TestToolsApi::test_reduce_collections`

### Step 2: Build YAML-to-test-case parser
- Parse `assumptions` to extract tool shape, collection defs, dataset declarations
- Parse `then` expressions to extract input bindings and expected output structure
- Output structured `CollectionSemanticTestCase` dataclasses

### Step 3: Create parametrized test file
- `lib/galaxy_test/api/test_collection_semantics.py` (new)
- Two test functions: valid operations, invalid operations
- Test IDs from spec labels for clear pytest output

### Step 4: Collection setup infrastructure
Map spec notation to existing `TargetHistory` methods:
- `[paired, {forward: d_f, reverse: d_r}]` -> `target_history.create_pair()`
- `[list, {i1: d_1, ..., in: d_n}]` -> `target_history.create_list()`
- `["list:paired", {el1: {forward: d_f, reverse: d_r}}]` -> `target_history.create_list_of_pairs()`
- Nested structures -> recursive builder

### Step 5: Input binding infrastructure
Map spec's `then` expressions to Galaxy API input formats:
- `mapOver(C)` -> `{"i": {"src": "hdca", "id": collection_id}}`
- `tool(i=C)` -> direct collection input
- `tool(i=[d_1,...,d_n])` -> multi-dataset input
- `mapOver(C, 'paired')` -> subcollection mapping

### Step 6: Tool selection logic
Map abstract tool shapes to concrete tool IDs:
- `{i: dataset} -> {o: dataset}` -> `cat1` or framework test tool
- `{i: "collection<paired>"} -> {o: dataset}` -> `collection_paired_test`
- `{i: "dataset<multiple=true>"} -> {o: dataset}` -> appropriate multi-input tool

### Step 7: Create missing framework tool
`collection_list_test.xml` -- for examples referencing list collection inputs without an existing test tool.

### Step 8: Update spec with `tool_runtime` references
Add `tool_runtime` entries for all newly covered examples.

## Testing Strategy (Red-to-Green)

1. Write parametrized test with first valid case (BASIC_MAPPING_PAIRED) -> fails (no infrastructure)
2. Implement collection builder -> test still fails (no tool execution)
3. Implement tool execution + output verification -> test passes
4. Add next case, repeat
5. Add invalid cases last

## Critical Files

| File | Role |
|------|------|
| `lib/galaxy/model/dataset_collections/types/collection_semantics.yml` | Fix typo, extend with `tool_runtime` refs |
| `lib/galaxy/model/dataset_collections/types/semantics.py` | Extend with test case extraction (or sibling module) |
| `lib/galaxy_test/api/test_tool_execute.py` | Pattern to follow for fixture-based tests |
| `lib/galaxy_test/base/populators.py` | Extend with collection-from-spec builder |
| `lib/galaxy_test/api/conftest.py` | May need new fixtures |
| `lib/galaxy_test/api/test_collection_semantics.py` | New parametrized test file |
| `test/functional/tools/` | New `collection_list_test.xml` framework tool |

## Unresolved Questions

1. Do invalid cases verify 400 status, or are some only workflow-editor constraints the API doesn't enforce?
2. Should generated tests use deterministic content for output assertions, or just verify structural properties?
3. Should parametrized tests also run against tool request API format?
4. Is `cat1` the right tool for generated mapping tests (real tool, not test tool)?
5. Should examples with no `then` clause get `then` clauses added to make them API-testable?
6. Should `test_cases.py` live in production code (`lib/galaxy/model/...`) or test code (`lib/galaxy_test/`)?
