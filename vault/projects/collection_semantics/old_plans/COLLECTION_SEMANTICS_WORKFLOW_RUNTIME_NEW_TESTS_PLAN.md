# Implementation Plan: `test_workflow_collection_semantics.py`

## Context

We're building a dedicated API test file for collection semantics workflow runtime tests. The existing tests in `test_workflows.py` test collection behavior incidentally; these new tests are minimal, purpose-built, and explicitly annotated with which `collection_semantics.yml` label they verify. Full design in [WORKFLOW_RUNTIME_NEW_TESTS.md](WORKFLOW_RUNTIME_NEW_TESTS.md).

## Step 1: Create test file with scaffold

**File:** `lib/galaxy_test/api/test_workflow_collection_semantics.py`

- `collection_semantic(label)` decorator — sets `.collection_semantic_label` attr + `pytest.mark.collection_semantic`
- `TestWorkflowCollectionSemantics(BaseWorkflowsApiTestCase)` class
- Helper method `_assert_collection_output(summary, history_id, expected_type, expected_count)` to reduce per-test boilerplate

Base class import from same file: `from galaxy_test.api.test_workflows import BaseWorkflowsApiTestCase`

Key imports:
```python
import pytest
from galaxy_test.api.test_workflows import BaseWorkflowsApiTestCase
from galaxy_test.base.populators import skip_without_tool
```

## Step 2: Phase 1 tests — basic mapping (6 tests)

All use `cat` tool (always available, no `@skip_without_tool` needed).

| # | Test | Input | Pattern | Assert |
|---|------|-------|---------|--------|
| 1 | `test_basic_mapping_paired` | `paired` | A (inline YAML) | `paired`, 2 elements |
| 2 | `test_basic_mapping_paired_or_unpaired_paired` | `paired_or_unpaired` (paired data) | B (`create_paired_or_unpaired_pair_in_history`) | `paired_or_unpaired`, 2 elements |
| 3 | `test_basic_mapping_paired_or_unpaired_unpaired` | `paired_or_unpaired` (unpaired data) | B (`create_unpaired_in_history`) | `paired_or_unpaired`, 1 element |
| 4 | `test_basic_mapping_list_paired_or_unpaired` | `list:paired_or_unpaired` | B (`create_list_of_paired_and_unpaired_in_history`) | `list:paired_or_unpaired` |
| 5 | `test_basic_mapping_including_single_dataset` | list + single dataset | A (inline YAML) | `list`, 2 elements |
| 6 | `test_basic_mapping_two_inputs_identical_structure` | two lists, same identifiers | A (inline YAML) | `list`, 2 elements |

Tests 1, 5, 6 use `_run_workflow()` with inline `test_data`.
Tests 2, 3, 4 create collections via populator, upload workflow, invoke with explicit inputs.

## Step 3: Phase 2 tests — reduction (4 tests)

| # | Test | Tool | Input | Pattern | Assert |
|---|------|------|-------|---------|--------|
| 7 | `test_collection_input_list` | `cat_collection` | `list` | A | single dataset output |
| 8 | `test_collection_input_paired_or_unpaired` | `collection_paired_or_unpaired` | `paired_or_unpaired` | B | single dataset output |
| 9 | `test_collection_input_list_paired_or_unpaired` | `collection_list_paired_or_unpaired` | `list:paired_or_unpaired` | B | single dataset output |
| 10 | `test_list_reduction` | `multi_data_optional` | `list` | A | single dataset output |

All need `@skip_without_tool`.

## Step 4: Phase 3 tests — subtyping (4 tests)

| # | Test | Input type → Tool accepts | Pattern | Assert |
|---|------|--------------------------|---------|--------|
| 11 | `test_paired_or_unpaired_consumes_paired` | `paired` → `paired_or_unpaired` | B (create_pair) | single dataset |
| 12 | `test_mapping_list_paired_over_paired_or_unpaired` | `list:paired` → `paired_or_unpaired` | B (create_list_of_pairs) | `list` |
| 13 | `test_mapping_list_list_paired_over_paired_or_unpaired` | `list:list:paired` → `paired_or_unpaired` | B (create_nested) | `list:list` |
| 14 | `test_mapping_list_over_paired_or_unpaired` | `list:paired_or_unpaired` → `paired_or_unpaired` | B (create_list_of_paired_and_unpaired) | `list` |

All need `@skip_without_tool("collection_paired_or_unpaired")`.

## Step 5: Wire into spec YAML

Add `workflow_runtime: api_test:` entries to `collection_semantics.yml` for each test. This is a YAML-only change.

## Pattern B detail

For tests that can't use inline test_data YAML (paired_or_unpaired types):

```python
with self.dataset_populator.test_history() as history_id:
    # 1. Create collection
    hdca = self.dataset_collection_populator.create_paired_or_unpaired_pair_in_history(
        history_id, wait=True
    ).json()["outputs"][0]
    # 2. Upload workflow
    workflow_id = self.workflow_populator.upload_yaml_workflow(WORKFLOW_YAML)
    # 3. Invoke with inputs dict
    invocation = self.workflow_populator.invoke_workflow_and_wait(
        workflow_id, history_id=history_id,
        inputs={"0": {"src": "hdca", "id": hdca["id"]}},
    )
    # 4. Assert
```

Input key `"0"` = step index 0 (the workflow input). Alternative: use `inputs_by="name"` with input label.

## Critical files

| File | Action |
|------|--------|
| `lib/galaxy_test/api/test_workflow_collection_semantics.py` | **Create** |
| `lib/galaxy/model/dataset_collections/types/collection_semantics.yml` | Edit (add workflow_runtime refs) |
| `lib/galaxy_test/api/test_workflows.py:178` | Read-only (BaseWorkflowsApiTestCase) |
| `lib/galaxy_test/base/populators.py:3473-3502` | Read-only (paired_or_unpaired populator methods) |

## Verification

Use the `galaxy-backend-tests` skill (`/galaxy-backend-tests`) to run API tests — it handles server startup, environment, and teardown automatically.

```
# Run just the new tests
/galaxy-backend-tests api test_workflow_collection_semantics

# Run a single test
/galaxy-backend-tests api test_workflow_collection_semantics -k test_basic_mapping_paired
```

Unit tests (no server needed) can still be run directly:
```bash
PYTHONPATH=lib python -m pytest test/unit/data/model/test_collection_semantics.py -v
```

## Reference

See [COMPONENT_API_TESTS.md](COMPONENT_API_TESTS.md) for general Galaxy API test patterns including assertion helpers (`api_asserts.py`), the `*_raw` populator pattern, and modern pytest-style alternatives.
