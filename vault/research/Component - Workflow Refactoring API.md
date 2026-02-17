---
type: research
subtype: component
component: workflow-refactoring-api
tags:
  - research/component
  - galaxy/api
  - galaxy/workflows
status: draft
created: 2026-02-17
revised: 2026-02-17
revision: 1
ai_generated: true
galaxy_areas:
  - api
  - workflows
---

# Galaxy Workflow Refactoring API

## API Endpoint

**Route:** `PUT /api/workflows/{workflow_id}/refactor`

**Location:** `lib/galaxy/webapps/galaxy/api/workflows.py:993-1004`

```python
@router.put(
    "/api/workflows/{workflow_id}/refactor",
    summary="Updates the workflow stored with the given ID.",
)
def refactor(
    self,
    workflow_id: StoredWorkflowIDPathParam,
    payload: RefactorWorkflowBody,
    instance: InstanceQueryParam = False,
    trans: ProvidesUserContext = DependsOnTrans,
) -> RefactorResponse:
    return self.service.refactor(trans, workflow_id, payload, instance or False)
```

**Request Schema:** `RefactorWorkflowBody` = `RefactorRequest`
**Response Schema:** `RefactorResponse`

## Backend Implementation Stack

Request flow:

1. **FastAPI Controller:** `FastAPIWorkflows.refactor()` — `lib/galaxy/webapps/galaxy/api/workflows.py:997`
2. **Service Layer:** `WorkflowsService.refactor()` — `lib/galaxy/webapps/galaxy/services/workflows.py:229`
3. **Manager Layer:** `WorkflowContentsManager.refactor()` — `lib/galaxy/managers/workflows.py:2057`
4. **Core Logic:** `WorkflowContentsManager.do_refactor()` — `lib/galaxy/managers/workflows.py:2027`
5. **Executor:** `WorkflowRefactorExecutor.refactor()` — `lib/galaxy/workflow/refactor/execute.py:65`

### `do_refactor` (managers/workflows.py:2027-2055)

```python
def do_refactor(self, trans, stored_workflow, refactor_request):
    """Apply supplied actions to stored_workflow.latest_workflow to build a new version."""
    workflow = stored_workflow.latest_workflow
    as_dict = self._workflow_to_dict_export(trans, stored_workflow, workflow=workflow, internal=True, allow_upgrade=True)
    raw_workflow_description = self.normalize_workflow_format(trans, as_dict)
    workflow_update_options = WorkflowUpdateOptions(
        fill_defaults=False,
        allow_missing_tools=True,
        dry_run=refactor_request.dry_run,
    )
    module_injector = WorkflowModuleInjector(trans, allow_tool_state_corrections=True)
    refactor_executor = WorkflowRefactorExecutor(raw_workflow_description, workflow, module_injector)
    action_executions = refactor_executor.refactor(refactor_request)
    refactored_workflow, errors = self.update_workflow_from_raw_description(
        trans, stored_workflow, raw_workflow_description, workflow_update_options,
    )
    return refactored_workflow, action_executions
```

Key design: exports current workflow to GA JSON dict, mutates that dict via the executor, then re-imports it as a new workflow version.

## Request/Response Schemas

**Location:** `lib/galaxy/workflow/refactor/schema.py`

### RefactorRequest

```python
class RefactorActions(BaseModel):
    actions: list[Annotated[union_action_classes, Field(discriminator="action_type")]]
    dry_run: bool = False

class RefactorRequest(RefactorActions):
    style: str = "export"  # export format for response workflow
```

### RefactorResponse

```python
class RefactorResponse(BaseModel):
    action_executions: list[RefactorActionExecution]
    workflow: dict
    dry_run: bool
```

### RefactorActionExecution

```python
class RefactorActionExecution(BaseModel):
    action: union_action_classes
    messages: list[RefactorActionExecutionMessage]
```

### RefactorActionExecutionMessage

Fields: `message_type`, `message`, `step_label`, `order_index`, `input_name`, `output_name`, `from_step_label`, `from_order_index`

Message types: `tool_version_change`, `tool_state_adjustment`, `connection_drop_forced`, `workflow_output_drop_forced`

### Step References — No Database IDs by Design

Steps are referenced by either:
- `StepReferenceByOrderIndex` — `{order_index: int}`
- `StepReferenceByLabel` — `{label: str}`

Database step IDs are **never** used in the refactoring schema. This is deliberate — the entire refactoring system operates as a stateless document transformation rather than a CRUD operation on database entities.

**How it works internally:** `do_refactor` (managers/workflows.py:2030) exports the workflow to GA JSON dict before any refactoring. In that export format, the `"id"` field IS `order_index` (managers/workflows.py:1552: `"id": step.order_index`), and the steps dict is keyed by integer order_index (line 1512: `steps: dict[int, dict[str, Any]] = {}`). The executor even has a comment acknowledging the naming confusion (execute.py:169):
```python
output_order_index = output_step_dict["id"]  # wish this was order_index...
```

**Why this matters:**

- **Stateless/self-contained** — `order_index` and `label` are intrinsic to the workflow structure. A client with a downloaded `.ga` file can construct refactoring actions without any database access or extra round-trips.
- **Portable** — Same action payload works across Galaxy servers, for unsaved workflows, or locally-parsed `.ga` files. Database step IDs are server-specific.
- **Version-independent** — Database step IDs change every version (new `WorkflowStep` rows created). `order_index` is stable within a version's structure.
- **Composable within a batch** — `add_step` appends to the dict with a predictable next `order_index` (execute.py:120: `order_index = len(steps)`). Later actions in the same batch can reference newly-added steps by that predictable index without needing a (not-yet-created) database ID.

**Client evidence:** The workflow editor constructs all refactoring actions from local state only:
- `FormDefault.vue:128` — `{ action_type: "upgrade_subworkflow", step: { order_index: stepId.value } }`
- `linting.ts:189` — `{ order_index: disconnectedInput.stepId, input_name: disconnectedInput.inputName }`
- `Index.vue:1065` — `[{ action_type: "upgrade_all_steps" }]`

No client code fetches database step IDs to build refactoring requests.

**Edge case:** No current action reorders steps — `add_step` always appends — so `order_index` references remain stable across a multi-action batch. Labels are more robust to hypothetical reordering, which is likely why both reference types are supported.

## Supported Refactoring Actions

All actions inherit from `BaseAction` and are discriminated by `action_type`. Defined in `lib/galaxy/workflow/refactor/schema.py:95-250`.

### Step Metadata
| Action | Description |
|--------|-------------|
| `update_step_label` | Rename a workflow step |
| `update_step_position` | Move step by (left, top) offsets |
| `update_output_label` | Rename a workflow output |

### Workflow Metadata
| Action | Description |
|--------|-------------|
| `update_name` | Change workflow name |
| `update_annotation` | Change workflow annotation |
| `update_license` | Set license (e.g. "AFL-3.0") |
| `update_creator` | Set creator metadata |
| `update_report` | Set workflow report (markdown) |

### Step Management
| Action | Description |
|--------|-------------|
| `add_step` | Add new step (tool, subworkflow, etc.) |
| `add_input` | Add workflow input parameter (data, collection, text, int, float, select, genomebuild) |
| `fill_step_defaults` | Fill missing default tool state for single step |
| `fill_defaults` | Fill missing tool state for all steps |

### Connections
| Action | Description |
|--------|-------------|
| `connect` | Connect output to input |
| `disconnect` | Disconnect output from input |

### Parameter Extraction
| Action | Description |
|--------|-------------|
| `extract_input` | Extract hardcoded step input as workflow input |
| `extract_untyped_parameter` | Extract parameter from tool state/PJA |

### Cleanup
| Action | Description |
|--------|-------------|
| `remove_unlabeled_workflow_outputs` | Remove outputs without labels |

### Upgrades
| Action | Description |
|--------|-------------|
| `upgrade_tool` | Upgrade tool to newer version |
| `upgrade_subworkflow` | Upgrade subworkflow to newer version |
| `upgrade_all_steps` | Upgrade all tools/subworkflows to latest |

## Action Execution Engine

**Location:** `lib/galaxy/workflow/refactor/execute.py`
**Class:** `WorkflowRefactorExecutor` (line 52)

Core method `refactor()` (line 65-83):
- Iterates through actions sequentially
- Dispatches to `_apply_{action_type}` handler methods
- Captures execution messages and errors
- Returns `list[RefactorActionExecution]`

Key handlers:
- `_apply_update_step_label()` — line 85
- `_apply_add_step()` — line 118
- `_apply_connect()` — line 188
- `_apply_disconnect()` — line 167
- `_apply_extract_input()` — line 212
- `_apply_extract_untyped_parameter()` — line 255
- `_apply_upgrade_tool()` — line 387
- `_apply_upgrade_subworkflow()` — line 370

## Dry Run Support

- Set `dry_run: true` in request
- Changes computed but NOT persisted to database
- Response returns what workflow WOULD look like
- Implementation: `WorkflowUpdateOptions.dry_run` flag (managers/workflows.py:2037)

## Test Coverage

### Unit Tests

**File:** `test/unit/workflows/test_refactor_models.py` (~120 lines)
- Schema parsing & validation
- RefactorActions deserialization with discriminated union
- Step references (order_index vs label)
- Action execution message types

### Integration Tests

**File:** `test/integration/test_workflow_refactoring.py` (600+ lines)
**Class:** `TestWorkflowRefactoringIntegration`

| Category | Tests | Lines |
|----------|-------|-------|
| Basic refactoring (name, annotation, license, label, position, add_step, connect, etc.) | ~10 | 57-193 |
| Dry run mode | ~3 | 194-253 |
| Legacy parameter extraction (PJA, relabeling) | ~4 | 254-365 |
| Cleanup (remove_unlabeled_workflow_outputs) | 1 | 366-376 |
| State management (fill_defaults, incomplete state, missing tools) | ~5 | 378-498 |
| Subworkflow support | 1 | 398-404 |
| Tool/subworkflow upgrades | ~3 | (later in file) |

### API Tests

**File:** `lib/galaxy_test/api/test_workflows.py`
Contains at least one refactoring test (likely testing the HTTP endpoint directly).

## Architecture

### Design Pattern

Pipeline/Visitor pattern:
- Decouples action definitions (schema) from execution logic (execute)
- Each action type has a dedicated `_apply_*` handler method
- Executor walks raw workflow dict + model objects in parallel
- Side-effects captured as messages during execution

### Workflow Representation Layers

1. **Database Models** — SQLAlchemy ORM (StoredWorkflow, Workflow, WorkflowStep, WorkflowStepConnection)
2. **Dict Representation** — Export format (GA JSON) with integer keys for step IDs
3. **Module Objects** — Tool/subworkflow modules with state management
4. **Refactor Description** — Raw action list + style parameter

### Key Responsibilities

- **WorkflowContentsManager** — Orchestrates refactoring, persists changes
- **WorkflowRefactorExecutor** — Applies actions to raw dict, captures messages
- **WorkflowModuleInjector** — Validates & corrects tool state during upgrades

## Validation & Error Handling

Validation points:
- Step reference resolution (order_index vs label)
- Input/output existence on target steps
- Tool/subworkflow availability
- Connection type compatibility
- Cycle detection (post-refactoring)

Allowed degradation:
- Missing tools allowed (`allow_missing_tools=True`)
- Incomplete tool state preserved if not explicitly filled
- State validation issues recorded as messages but don't block save
