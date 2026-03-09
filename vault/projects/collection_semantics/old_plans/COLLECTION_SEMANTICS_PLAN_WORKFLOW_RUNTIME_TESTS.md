# Plan: Add `workflow_runtime` Test Category

## Overview

Add a third test reference type to the collection semantics spec for end-to-end workflow execution tests. Currently the spec supports `tool_runtime` and `workflow_editor`; this adds `workflow_runtime`.

**Prerequisites completed:**
- `check()` is fully implemented with 3 validators ([validation plan](COLLECTION_SEMANTICS_PLAN_VALIDATION.md))
- `ExampleTests` has `ConfigDict(extra="forbid")` -- Pydantic model changes MUST precede any YAML additions
- `wf_editor` typo already fixed ([review plan](COLLECTION_SEMANTICS_PLAN_REVIEW.md), category 2.3)

## Design: Pydantic Model

Mirrors the existing `tool_runtime` pattern with a Union of two models:

### `WorkflowRuntimeApi`
For pytest node IDs referencing procedural API tests in `test_workflows.py`:
```python
class WorkflowRuntimeApi(BaseModel):
    api_test: str  # e.g., "test_workflows.py::TestWorkflowApi::test_map_over_paired"
```

### `WorkflowRuntimeFramework`
For parametrized test IDs referencing YAML-based framework workflow tests:
```python
class WorkflowRuntimeFramework(BaseModel):
    framework_test: str  # e.g., "flatten_collection_0"
```

### Union
```python
WorkflowRuntimeTest = Union[WorkflowRuntimeApi, WorkflowRuntimeFramework]

class ExampleTests(BaseModel):
    tool_runtime: Optional[ToolRuntimeTest] = None
    workflow_editor: Optional[str] = None
    workflow_runtime: Optional[WorkflowRuntimeTest] = None  # new
```

## YAML Usage

```yaml
- example:
    label: BASIC_MAPPING_PAIRED
    tests:
        tool_runtime:
            tool: collection_paired_test
        workflow_editor: "accepts paired data -> data connection"
        workflow_runtime:
            api_test: "test_workflows.py::TestWorkflowApi::test_map_over_paired"
```

Or with framework tests:
```yaml
        workflow_runtime:
            framework_test: "flatten_collection_0"
```

## Implementation Steps

### Step 1: Add Pydantic models
Add `WorkflowRuntimeApi`, `WorkflowRuntimeFramework`, and `WorkflowRuntimeTest` union to `semantics.py`. Add `workflow_runtime` field to `ExampleTests`.

**Note:** Because `ExampleTests` has `extra="forbid"`, this step MUST be completed before adding any `workflow_runtime` entries to the YAML -- otherwise parsing will reject the unknown field.

### Step 2: Add `validate_workflow_runtime_refs()` validator
Follow the established pattern from `validate_api_test_refs()`, `validate_tool_refs()`, and `validate_workflow_editor_refs()`:
- For `WorkflowRuntimeApi`: reuse the same `ast.parse()` resolution logic as `validate_api_test_refs()` (file::func or file::class::method)
- For `WorkflowRuntimeFramework`: verify parametrized test ID exists in framework workflow test data
- Wire into `check()` alongside existing validators

### Step 3: Add unit tests for new validator
Follow the pattern in `test_collection_semantics.py`:
- Clean pass test against current YAML
- Bad file / bad function / bad method mutation tests for api_test
- Bad framework_test mutation test

### Step 4: Add initial `workflow_runtime` references to YAML
Populate `workflow_runtime` entries for spec examples where matching workflow tests exist.

Key test sources:
- `lib/galaxy_test/api/test_workflows.py` - procedural API workflow tests
- `lib/galaxy_test/workflow/test_framework_workflows.py` - framework test runner with parametrized YAML-based tests

### Step 5: (Optional) Render test references in generated markdown
Extend `generate_docs()` to emit workflow_runtime test references alongside existing test info.

### Step 6: Regenerate docs
Run `PYTHONPATH=lib python lib/galaxy/model/dataset_collections/types/semantics.py`

## Critical Files

| File | Role |
|------|------|
| `lib/galaxy/model/dataset_collections/types/semantics.py` | Add Pydantic models + validator |
| `lib/galaxy/model/dataset_collections/types/collection_semantics.yml` | Add `workflow_runtime` references |
| `test/unit/data/model/test_collection_semantics.py` | Unit tests for new validator |
| `lib/galaxy_test/api/test_workflows.py` | Procedural API workflow tests to reference |
| `lib/galaxy_test/workflow/test_framework_workflows.py` | Framework workflow test runner |
| `doc/source/dev/collection_semantics.md` | Regenerate |

## Unresolved Questions

1. Field naming: `framework_test` vs `workflow` vs `yaml_test` for framework workflow references?
2. Support bare string form (`workflow_runtime: "test_id"`) as shorthand?
3. Scope of initial YAML additions - comprehensive survey of all matching tests, or just obvious ones?
4. Doc rendering of test references - do this now or defer?
