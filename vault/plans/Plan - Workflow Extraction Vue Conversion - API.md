---
type: plan-section
tags:
  - plan/section
  - galaxy/workflows
  - galaxy/api
  - galaxy/client
parent_plan: "[[Plan - Workflow Extraction Vue Conversion]]"
section: "API Design"
related_issues:
  - "[[Issue 17506]]"
status: draft
created: 2026-02-12
revised: 2026-02-12
revision: 1
ai_generated: true
---

# Workflow Extraction API Design

## Executive Summary

This document specifies the API surface for replacing Galaxy's last non-data-display Mako template (`build_from_current_history.mako`) with a Vue.js frontend backed by a typed FastAPI endpoint. The scope covers:

1. A new **read endpoint** (`GET /api/histories/{id}/extraction_summary`) returning structured data about jobs and datasets available for extraction
2. A new **typed Pydantic request model** for the existing `POST /api/workflows` extraction path (`from_history_id`)
3. All Pydantic response/request models with field-level documentation
4. Edge case handling for the three job types: real `Job`, `FakeJob`, `DatasetCollectionCreationJob`

The existing Mako flow is a two-phase controller method: phase 1 renders the form (equivalent to the new GET), phase 2 submits the extraction (equivalent to the existing POST). This design preserves that separation while adding type safety and enabling a Vue SPA frontend.

---

## Table of Contents

1. [Current System Analysis](#1-current-system-analysis)
2. [API Design: Extraction Summary Endpoint](#2-api-design-extraction-summary-endpoint)
3. [API Design: Workflow Creation from History](#3-api-design-workflow-creation-from-history)
4. [Pydantic Models: Complete Specification](#4-pydantic-models-complete-specification)
5. [Data Flow](#5-data-flow)
6. [Edge Cases and Special Types](#6-edge-cases-and-special-types)
7. [ID Encoding Strategy](#7-id-encoding-strategy)
8. [Service Layer Design](#8-service-layer-design)
9. [Integration with Existing Infrastructure](#9-integration-with-existing-infrastructure)
10. [Performance Considerations](#10-performance-considerations)
11. [Backwards Compatibility](#11-backwards-compatibility)
12. [Unresolved Questions](#12-unresolved-questions)

---

## 1. Current System Analysis

### 1.1 The Mako Controller (`WorkflowController.build_from_current_history`)

The legacy controller in `lib/galaxy/webapps/galaxy/controllers/workflow.py` serves dual duty:

**Phase 1 (GET - render form):**
```python
jobs_dict, warnings = summarize(trans, history)
# Template receives: jobs (dict[Job, list[(output_name, HDA/HDCA)]]), warnings (set[str]), history
```

**Phase 2 (POST - create workflow):**
```python
stored_workflow = extract_workflow(trans, user, history, job_ids, dataset_ids, ...)
```

### 1.2 The `summarize()` Function

`galaxy.workflow.extract.summarize()` returns:
```
(jobs, warnings) where:
  jobs: dict[Union[Job, FakeJob, DatasetCollectionCreationJob], list[tuple[Optional[str], Union[HDA, HDCA]]]]
  warnings: set[str]
```

The dict keys are heterogeneous - three distinct types with different attributes:

| Type | `id` | `is_fake` | `name` | `tool_id` | `disabled_why` |
|------|-------|-----------|--------|-----------|----------------|
| `Job` (model) | `int` (DB ID) | N/A | N/A | `str` | N/A |
| `FakeJob` | `"fake_{dataset.id}"` | `True` | `"Import from History"` / `"Import from Library"` / `None` | N/A | N/A |
| `DatasetCollectionCreationJob` | `"fake_{hdca.id}"` | `True` | `"Dataset Collection Creation"` | N/A | `"Dataset collection created in a way not compatible with workflows"` |

The dict values are lists of `(output_name, content)` tuples where `output_name` is `None` for fake jobs and a string like `"out_file1"` for real jobs.

### 1.3 The Mako Template's Rendering Logic

For each `(job, datasets)` pair, the template:

1. Looks up the tool via `app.toolbox.get_tool(job.tool_id, job.tool_version)` (real jobs only)
2. Checks `tool.is_workflow_compatible` to determine if job can be included
3. Checks `tool.version != job.tool_version` for version warnings
4. Renders each dataset with state coloring, hid, name
5. For incompatible/fake jobs, renders "treat as input" checkboxes with editable name fields
6. For compatible jobs, renders "include in workflow" checkbox (pre-checked if any output is non-deleted)

### 1.4 What `is_workflow_compatible` Means

A tool is NOT workflow compatible when:
- `tool.has_multiple_pages == True`
- `tool.tool_type.startswith("data_source")` (external data source tools)
- Tool XML has `workflow_compatible="False"`

### 1.5 The Submission Payload (Current)

The Mako form submits to `POST /api/workflows` (via the controller, eventually routed to the API). Current parameter types:

| Parameter | Source | Type in Mako | Type at API |
|-----------|--------|-------------|-------------|
| `from_history_id` | URL param | encoded str | decoded to int |
| `workflow_name` | text input | str | str |
| `job_ids` | checkbox values | encoded str[] | decoded to int[] |
| `dataset_ids` | checkbox values | **int[] (HIDs)** | int[] (HIDs) |
| `dataset_collection_ids` | checkbox values | **int[] (HIDs)** | int[] (HIDs) |
| `dataset_names` | text inputs | str[] | str[] |
| `dataset_collection_names` | text inputs | str[] | str[] |

**Critical distinction**: `job_ids` are encoded database IDs, but `dataset_ids`/`dataset_collection_ids` are raw HIDs (history item numbers). This is because `extract_steps()` works with HIDs to build the step graph via `hid_to_output_pair`.

---

## 2. API Design: Extraction Summary Endpoint

### 2.1 Endpoint Specification

```
GET /api/histories/{history_id}/extraction_summary
```

**Rationale for placement on histories router**: The data is fundamentally about a history's contents analyzed for extraction eligibility. The history ID is the primary key. This follows the existing pattern of history sub-resources (e.g., `/api/histories/{id}/contents`).

**Alternative considered**: `/api/workflows/extraction_summary?history_id=X` - rejected because the resource is history-centric data, not workflow-centric.

### 2.2 Request

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| `history_id` | path | `DecodedDatabaseIdField` | yes | Encoded history ID |

No query parameters for initial implementation. See [Performance Considerations](#10-performance-considerations) for future pagination.

### 2.3 Response

HTTP 200 with `WorkflowExtractionSummary` body. See [Section 4.1](#41-response-models) for full model.

### 2.4 Error Responses

| Status | Condition | Body |
|--------|-----------|------|
| 403 | User cannot access history | `{"err_msg": "Cannot access history {id}", "err_code": 403006}` |
| 404 | History does not exist | `{"err_msg": "History {id} not found", "err_code": 404001}` |

### 2.5 Why Not Reuse Existing Endpoints?

The extraction summary requires a very specific view of history data that no existing endpoint provides:

- `GET /api/histories/{id}/contents` returns datasets but not their creating jobs
- `GET /api/jobs` returns jobs but not grouped with their outputs
- Neither provides tool compatibility analysis, version warnings, or the fake-job abstraction

The `summarize()` function in `galaxy.workflow.extract` already does exactly this aggregation. The new endpoint wraps it in a typed API response.

---

## 3. API Design: Workflow Creation from History

### 3.1 Current State

`POST /api/workflows` currently accepts an untyped dict payload. When `from_history_id` is present, it branches into extraction mode. The parameters are parsed from raw dict access:

```python
if "from_history_id" in payload:
    from_history_id = payload.get("from_history_id")
    job_ids = [self.decode_id(_) for _ in payload.get("job_ids", [])]
    dataset_ids = payload.get("dataset_ids", [])
    ...
```

### 3.2 Proposed: Typed Request Model

Add a Pydantic model `WorkflowExtractionPayload` to formalize the extraction submission. See [Section 4.2](#42-request-models) for full model.

This model should be used **alongside** the existing dict-based dispatch in the `create` method. The endpoint already handles multiple creation modes (from archive, from shared workflow, from path, etc.) - extraction is one branch.

**Recommended approach**: Create the typed model as documentation and validation, but integrate it into the existing `create` method's branching logic rather than creating a separate endpoint. This avoids breaking existing clients.

### 3.3 Response

The existing response format from `POST /api/workflows` when using `from_history_id`:

```json
{
    "id": "abc123def456",
    "name": "Workflow constructed from history 'My History'",
    "create_time": "2026-02-12T10:00:00",
    "update_time": "2026-02-12T10:00:00",
    "published": false,
    "importable": false,
    "deleted": false,
    "hidden": false,
    "latest_workflow_uuid": "550e8400-e29b-41d4-a716-446655440000",
    "url": "/api/workflows/abc123def456"
}
```

This matches `StoredWorkflow.to_dict()` with `dict_collection_visible_keys` plus `url` and `latest_workflow_uuid`. No changes needed to this response.

---

## 4. Pydantic Models: Complete Specification

### 4.1 Response Models

**File**: `lib/galaxy/schema/workflow_extraction.py` (new)

```python
from enum import Enum
from typing import (
    List,
    Optional,
)

from pydantic import (
    BaseModel,
    Field,
)

from galaxy.schema.fields import EncodedDatabaseIdField


class HistoryContentType(str, Enum):
    """Type discriminator for history items."""
    DATASET = "dataset"
    DATASET_COLLECTION = "dataset_collection"


class ExtractionDatasetState(str, Enum):
    """Subset of DatasetState relevant to extraction display."""
    NEW = "new"
    UPLOAD = "upload"
    QUEUED = "queued"
    RUNNING = "running"
    OK = "ok"
    EMPTY = "empty"
    ERROR = "error"
    PAUSED = "paused"
    SETTING_METADATA = "setting_metadata"
    FAILED_METADATA = "failed_metadata"
    DEFERRED = "deferred"
    DISCARDED = "discarded"


class ExtractionJobType(str, Enum):
    """Discriminator for the three job archetypes in extraction."""
    TOOL = "tool"
    INPUT_DATASET = "input_dataset"
    COLLECTION_CREATION = "collection_creation"
```

#### 4.1.1 ExtractionOutputDataset

Represents a single dataset or dataset collection produced by a job.

```python
class ExtractionOutputDataset(BaseModel):
    """A history item (dataset or collection) that is an output of a job.

    In the extraction UI, these are displayed in the right column opposite
    their creating job/tool. For fake jobs, these can be marked as workflow
    inputs by the user.
    """
    id: EncodedDatabaseIdField = Field(
        ...,
        title="ID",
        description="Encoded database ID of the HDA or HDCA.",
    )
    hid: int = Field(
        ...,
        title="History Item ID",
        description=(
            "Sequential display number within the history. "
            "Used as the key for dataset_ids/dataset_collection_ids "
            "in the extraction submission payload."
        ),
    )
    name: str = Field(
        ...,
        title="Display Name",
        description="Human-readable name. For HDAs, from datatype.display_name(). For HDCAs, from get_display_name().",
    )
    state: str = Field(
        ...,
        title="State",
        description=(
            "Current processing state. One of: new, upload, queued, running, ok, "
            "empty, error, paused, setting_metadata, failed_metadata, deferred, discarded. "
            "Used for state-based coloring in the UI."
        ),
    )
    deleted: bool = Field(
        ...,
        title="Deleted",
        description="Whether this item has been deleted from the history.",
    )
    history_content_type: HistoryContentType = Field(
        ...,
        title="Content Type",
        description=(
            "Discriminator: 'dataset' for HDA, 'dataset_collection' for HDCA. "
            "Determines which submission field (dataset_ids vs dataset_collection_ids) "
            "this item's HID should be added to when marked as a workflow input."
        ),
    )
    collection_type: Optional[str] = Field(
        None,
        title="Collection Type",
        description=(
            "For dataset_collection items only. The collection structure type "
            "e.g., 'list', 'paired', 'list:paired'. Required by extract_steps() "
            "to create properly typed data_collection_input workflow steps. "
            "None for regular datasets."
        ),
    )
```

**Design note on `collection_type`**: This field is absent from the original plan but is required. When a user marks a collection as a workflow input, `extract_steps()` needs the `collection_type` to create a properly typed `data_collection_input` step. The `WorkflowSummary` tracks this in `self.collection_types[hid]`. Without it, the client would need a separate API call to determine collection type. Including it here avoids that round trip.

#### 4.1.2 ExtractionToolInfo

Extracted tool metadata for a job. Separated from the job model for clarity - this represents the tool as resolved by the toolbox at request time, not the tool as it was when the job ran.

```python
class ExtractionToolInfo(BaseModel):
    """Tool metadata resolved from the toolbox for a job's tool_id/tool_version.

    This represents the *current* state of the tool in the toolbox, which may
    differ from the version that originally ran the job. When the versions differ,
    version_warning is populated.
    """
    tool_id: str = Field(
        ...,
        title="Tool ID",
        description="Tool identifier as stored on the job (e.g., 'cat1', 'toolshed.g2.bx.psu.edu/repos/...').",
    )
    tool_version: Optional[str] = Field(
        None,
        title="Job Tool Version",
        description="Tool version string from the job record.",
    )
    tool_name: str = Field(
        ...,
        title="Tool Name",
        description="Human-readable tool name from the toolbox (e.g., 'Concatenate datasets').",
    )
    is_workflow_compatible: bool = Field(
        ...,
        title="Workflow Compatible",
        description=(
            "Whether this tool can be included in workflows. False for: "
            "multi-page tools, data_source tools, tools with workflow_compatible=False XML attribute."
        ),
    )
    version_warning: Optional[str] = Field(
        None,
        title="Version Warning",
        description=(
            "Present when the current toolbox version differs from the version used "
            "to run the job. Format: 'Dataset was created with tool version \"X\", "
            "but workflow extraction will use version \"Y\".'"
        ),
    )
```

#### 4.1.3 ExtractionJob

The central model representing one row in the extraction table.

```python
class ExtractionJob(BaseModel):
    """A job available for workflow extraction, with its outputs.

    This is the core unit of the extraction UI. Each ExtractionJob corresponds
    to one row in the extraction table: the left column shows the tool/job info,
    the right column shows the output datasets.

    There are three archetypes:
    - TOOL: A real Galaxy Job with a tool_id. Can be included in the workflow
      if the tool is workflow-compatible.
    - INPUT_DATASET: A FakeJob representing a dataset with no creating job
      (uploaded, imported from history/library). Can be marked as a workflow input.
    - COLLECTION_CREATION: A DatasetCollectionCreationJob for collections created
      outside normal tool execution. Can be marked as a workflow input.
    """
    id: str = Field(
        ...,
        title="Job ID",
        description=(
            "For real jobs: encoded database ID. "
            "For fake jobs: string like 'fake_12345' (not an encoded ID). "
            "Used as the value for job_ids[] in the extraction submission. "
            "The heterogeneous format is preserved for compatibility with extract_workflow()."
        ),
    )
    job_type: ExtractionJobType = Field(
        ...,
        title="Job Type",
        description=(
            "Discriminator for the three job archetypes. "
            "'tool' = real Job, 'input_dataset' = FakeJob, "
            "'collection_creation' = DatasetCollectionCreationJob."
        ),
    )
    tool_info: Optional[ExtractionToolInfo] = Field(
        None,
        title="Tool Info",
        description=(
            "Present only for job_type='tool'. Contains resolved tool metadata "
            "from the toolbox. None for fake jobs."
        ),
    )
    display_name: str = Field(
        ...,
        title="Display Name",
        description=(
            "Human-readable label for the job row. "
            "For tools: tool name from toolbox (e.g., 'Concatenate datasets'). "
            "For input datasets: source description ('Import from History', "
            "'Import from Library', or 'Input Dataset'). "
            "For collection creation: 'Dataset Collection Creation'."
        ),
    )
    is_selectable: bool = Field(
        ...,
        title="Selectable",
        description=(
            "Whether the user can check this job for inclusion in the workflow. "
            "True only for real jobs with workflow-compatible tools. "
            "False for fake jobs and incompatible tools."
        ),
    )
    disabled_reason: Optional[str] = Field(
        None,
        title="Disabled Reason",
        description=(
            "Human-readable explanation when is_selectable=False. "
            "Examples: 'This tool cannot be used in workflows', "
            "'Dataset collection created in a way not compatible with workflows', "
            "'Tool not found in toolbox'."
        ),
    )
    can_be_input: bool = Field(
        ...,
        title="Can Be Input",
        description=(
            "Whether outputs of this job can be marked as workflow inputs. "
            "True for fake jobs (input_dataset, collection_creation). "
            "False for real tool jobs."
        ),
    )
    outputs: List[ExtractionOutputDataset] = Field(
        default_factory=list,
        title="Outputs",
        description="Datasets/collections created by this job, ordered by HID.",
    )
    has_non_deleted_outputs: bool = Field(
        ...,
        title="Has Non-Deleted Outputs",
        description=(
            "True if at least one output is not deleted. "
            "Used to determine default checkbox state: "
            "jobs with all-deleted outputs are unchecked by default."
        ),
    )
```

**Design decisions**:

1. **`job_type` discriminator** instead of `is_fake` boolean: The original plan used `is_fake: bool` which loses information about which kind of fake job it is. `ExtractionJobType` with three values gives the client precise knowledge for rendering different UI treatments.

2. **`tool_info` as optional sub-object** instead of flat fields: The original plan mixed tool fields (`tool_id`, `tool_version`, `is_workflow_compatible`) at the job level, creating confusion about which fields are meaningful for fake jobs. Nesting tool info makes the optionality explicit.

3. **`is_selectable` + `can_be_input`** instead of just `is_workflow_compatible`: These are the two UI behaviors the client needs. A job is either selectable (checkbox to include the tool step) or its outputs can be marked as inputs (checkbox per output). These are mutually exclusive: `is_selectable` = real compatible tool job, `can_be_input` = fake job.

4. **`id` as plain `str`** instead of `EncodedDatabaseIdField`: Fake job IDs are strings like `"fake_123"` which don't conform to Galaxy's ID encoding scheme. Using `str` accommodates both encoded real job IDs and fake job ID strings.

#### 4.1.4 WorkflowExtractionSummary

Top-level response model.

```python
class WorkflowExtractionSummary(BaseModel):
    """Complete extraction summary for a history.

    Contains all data needed to render the workflow extraction UI:
    the list of jobs with their outputs, global warnings, and
    a suggested default workflow name.
    """
    history_id: EncodedDatabaseIdField = Field(
        ...,
        title="History ID",
        description="Encoded database ID of the analyzed history.",
    )
    history_name: str = Field(
        ...,
        title="History Name",
        description="Display name of the history.",
    )
    jobs: List[ExtractionJob] = Field(
        default_factory=list,
        title="Jobs",
        description=(
            "Jobs available for extraction, ordered by the HID of their "
            "first output dataset. This matches the display order in the history panel."
        ),
    )
    warnings: List[str] = Field(
        default_factory=list,
        title="Warnings",
        description=(
            "Global warnings about the extraction. Currently the only warning is "
            "'Some datasets still queued or running were ignored' when the history "
            "contains non-terminal datasets."
        ),
    )
    default_workflow_name: str = Field(
        ...,
        title="Default Workflow Name",
        description="Suggested workflow name. Format: \"Workflow constructed from history '{history_name}'\".",
    )
```

### 4.2 Request Models

#### 4.2.1 WorkflowExtractionPayload

Typed model for the extraction submission. This formalizes what is currently parsed from a raw dict.

```python
class WorkflowExtractionPayload(BaseModel):
    """Payload for creating a workflow by extracting from a history.

    Submitted to POST /api/workflows. The from_history_id field triggers
    extraction mode (vs. import, copy, etc.).

    IMPORTANT: dataset_ids and dataset_collection_ids are HIDs (history item
    display numbers), NOT encoded database IDs. This is because the extraction
    engine (extract_steps) uses HIDs to build the workflow step graph via
    hid_to_output_pair mappings.
    """
    from_history_id: EncodedDatabaseIdField = Field(
        ...,
        title="History ID",
        description="Encoded database ID of the history to extract from.",
    )
    workflow_name: str = Field(
        ...,
        title="Workflow Name",
        description="Name for the created workflow.",
        min_length=1,
    )
    job_ids: List[EncodedDatabaseIdField] = Field(
        default_factory=list,
        title="Job IDs",
        description=(
            "Encoded database IDs of real jobs to include as tool steps. "
            "These are the IDs from ExtractionJob.id where job_type='tool'. "
            "Decoded to integers before passing to extract_workflow()."
        ),
    )
    dataset_ids: List[int] = Field(
        default_factory=list,
        title="Dataset HIDs",
        description=(
            "History item display numbers (HIDs) of datasets to include as "
            "workflow inputs. These are ExtractionOutputDataset.hid values "
            "where history_content_type='dataset'. NOT encoded database IDs."
        ),
    )
    dataset_collection_ids: List[int] = Field(
        default_factory=list,
        title="Dataset Collection HIDs",
        description=(
            "History item display numbers (HIDs) of collections to include as "
            "workflow inputs. These are ExtractionOutputDataset.hid values "
            "where history_content_type='dataset_collection'. NOT encoded database IDs."
        ),
    )
    dataset_names: Optional[List[str]] = Field(
        None,
        title="Dataset Input Names",
        description=(
            "Custom names for dataset inputs, parallel to dataset_ids. "
            "If provided, must be same length as dataset_ids. "
            "Used as labels for data_input workflow steps."
        ),
    )
    dataset_collection_names: Optional[List[str]] = Field(
        None,
        title="Dataset Collection Input Names",
        description=(
            "Custom names for collection inputs, parallel to dataset_collection_ids. "
            "If provided, must be same length as dataset_collection_ids. "
            "Used as labels for data_collection_input workflow steps."
        ),
    )
```

**Why `dataset_ids` are HIDs, not encoded IDs**: This is the most surprising aspect of the extraction API. The reason is that `extract_steps()` builds a `hid_to_output_pair` dict that maps HIDs to workflow steps. Input datasets are identified by their HID in the history, and tool steps reference their inputs by the HID of the input dataset. This is a fundamental design choice in the extraction engine that predates the API layer. Changing it would require rewriting `extract_steps()`.

---

## 5. Data Flow

### 5.1 Summary Endpoint Flow

```
Client: GET /api/histories/{encoded_id}/extraction_summary
  │
  ▼
FastAPIHistories.extraction_summary(history_id: DecodedDatabaseIdField)
  │  history_id is auto-decoded to int
  ▼
HistoriesService.get_extraction_summary(trans, history_id)
  │
  ├─ history = self.manager.get_accessible(history_id, trans.user, ...)
  │    └─ raises ObjectNotFound or ItemAccessibilityException
  │
  ├─ jobs_dict, warnings = summarize(trans, history)
  │    └─ WorkflowSummary.__init__(trans, history)
  │         ├─ Iterates history.visible_contents
  │         ├─ For HDAs: finds creating_job_associations or creates FakeJob
  │         ├─ For HDCAs: finds creating_job_associations or creates DatasetCollectionCreationJob
  │         ├─ Tracks hid mappings for copied datasets
  │         └─ Filters out non-ready datasets (adds warning)
  │
  ├─ For each (job, datasets) pair:
  │    ├─ Determine job_type (tool / input_dataset / collection_creation)
  │    ├─ If tool: resolve from toolbox, check is_workflow_compatible, check version
  │    ├─ Build ExtractionOutputDataset for each output
  │    │    └─ Include collection_type from WorkflowSummary.collection_types
  │    └─ Build ExtractionJob
  │
  └─ Return WorkflowExtractionSummary
       │
       ▼
Client receives JSON response
```

### 5.2 Extraction Submission Flow

```
Client: POST /api/workflows
  Body: { from_history_id, workflow_name, job_ids, dataset_ids, ... }
  │
  ▼
WorkflowsAPIController.create(trans, payload)
  │  Detects "from_history_id" in payload
  │
  ├─ Decode from_history_id → int
  ├─ Decode each job_id → int
  ├─ dataset_ids remain as int[] (HIDs)
  ├─ dataset_collection_ids remain as int[] (HIDs)
  │
  ├─ history = history_manager.get_accessible(...)
  │
  ├─ stored_workflow = extract_workflow(trans, user, history, ...)
  │    ├─ extract_steps(trans, history, job_ids, dataset_ids, ...)
  │    │    ├─ Creates WorkflowSummary for the history
  │    │    ├─ For each dataset_id (HID): creates data_input WorkflowStep
  │    │    ├─ For each dataset_collection_id (HID): creates data_collection_input WorkflowStep
  │    │    │    └─ Looks up collection_type from WorkflowSummary.collection_types[hid]
  │    │    ├─ For each job_id: creates tool WorkflowStep
  │    │    │    ├─ Calls step_inputs(trans, job) → (tool_inputs, associations)
  │    │    │    │    └─ associations = [(input_hid, param_name), ...]
  │    │    │    └─ Creates WorkflowStepConnections via hid_to_output_pair lookups
  │    │    └─ Returns ordered step list
  │    │
  │    ├─ Creates Workflow model, attaches steps
  │    ├─ attach_ordered_steps() - establishes step ordering
  │    ├─ order_workflow_steps_with_levels() - calculates canvas positions
  │    └─ Creates and persists StoredWorkflow
  │
  └─ Returns { id, name, url, ... }
```

### 5.3 Client-Side Data Mapping

When the Vue component submits the form, it must correctly map the ExtractionJob/ExtractionOutputDataset data to the submission payload:

```
User selections in UI → WorkflowExtractionPayload:

For each selected ExtractionJob where job_type = "tool":
  → job_ids.push(job.id)     // encoded database ID

For each ExtractionOutputDataset marked as input:
  if history_content_type == "dataset":
    → dataset_ids.push(output.hid)        // HID, not encoded ID
    → dataset_names.push(customName)
  if history_content_type == "dataset_collection":
    → dataset_collection_ids.push(output.hid)    // HID, not encoded ID
    → dataset_collection_names.push(customName)
```

---

## 6. Edge Cases and Special Types

### 6.1 FakeJob (Input Datasets)

**Trigger**: An HDA exists in the history with no `creating_job_associations`. Common cases:
- Uploaded datasets
- Datasets imported from another history (`copied_from_history_dataset_association`)
- Datasets imported from a data library (`copied_from_library_dataset_dataset_association`)

**API representation**:
```json
{
    "id": "fake_12345",
    "job_type": "input_dataset",
    "tool_info": null,
    "display_name": "Import from History",
    "is_selectable": false,
    "disabled_reason": null,
    "can_be_input": true,
    "outputs": [
        {
            "id": "abc123def456",
            "hid": 1,
            "name": "input.fastq",
            "state": "ok",
            "deleted": false,
            "history_content_type": "dataset",
            "collection_type": null
        }
    ],
    "has_non_deleted_outputs": true
}
```

**Name resolution**: `FakeJob._guess_name_from_dataset()` returns:
- `"Import from History"` if `dataset.copied_from_history_dataset_association` exists
- `"Import from Library"` if `dataset.copied_from_library_dataset_dataset_association` exists
- `None` otherwise (displayed as `"Input Dataset"` in the API)

### 6.2 DatasetCollectionCreationJob

**Trigger**: An HDCA exists with no `creating_job_associations` and either:
- It's a non-implicit collection (e.g., user-constructed list)
- It's implicit but the creating job can't be traced through its elements

**API representation**:
```json
{
    "id": "fake_67890",
    "job_type": "collection_creation",
    "tool_info": null,
    "display_name": "Dataset Collection Creation",
    "is_selectable": false,
    "disabled_reason": "Dataset collection created in a way not compatible with workflows",
    "can_be_input": true,
    "outputs": [
        {
            "id": "xyz789",
            "hid": 3,
            "name": "My Collection",
            "state": "ok",
            "deleted": false,
            "history_content_type": "dataset_collection",
            "collection_type": "list"
        }
    ],
    "has_non_deleted_outputs": true
}
```

### 6.3 Real Job with Incompatible Tool

**Trigger**: A real `Job` exists but `tool.is_workflow_compatible == False`.

```json
{
    "id": "encoded_real_job_id",
    "job_type": "tool",
    "tool_info": {
        "tool_id": "upload1",
        "tool_version": "1.0.0",
        "tool_name": "Upload File",
        "is_workflow_compatible": false,
        "version_warning": null
    },
    "display_name": "Upload File",
    "is_selectable": false,
    "disabled_reason": "This tool cannot be used in workflows",
    "can_be_input": false,
    "outputs": [...],
    "has_non_deleted_outputs": true
}
```

**Note**: Incompatible real jobs have `can_be_input: false`. The Mako template treats these the same as compatible jobs (no input checkbox). Only fake jobs get the "treat as input" UI. This is correct behavior - if a real tool ran, its outputs depend on a tool execution, not raw input.

### 6.4 Real Job with Missing Tool

**Trigger**: `trans.app.toolbox.get_tool(job.tool_id, tool_version=job.tool_version)` returns `None`. This happens when a tool has been uninstalled from the toolbox.

```json
{
    "id": "encoded_real_job_id",
    "job_type": "tool",
    "tool_info": null,
    "display_name": "Unknown Tool",
    "is_selectable": false,
    "disabled_reason": "Tool not found in toolbox",
    "can_be_input": false,
    "outputs": [...],
    "has_non_deleted_outputs": true
}
```

**Design note**: `tool_info` is `null` when the tool can't be resolved. This is distinct from fake jobs (where `tool_info` is also `null`) - the `job_type` discriminator tells the client why.

### 6.5 Real Job with Version Mismatch

```json
{
    "id": "encoded_real_job_id",
    "job_type": "tool",
    "tool_info": {
        "tool_id": "cat1",
        "tool_version": "1.0.0",
        "tool_name": "Concatenate datasets",
        "is_workflow_compatible": true,
        "version_warning": "Dataset was created with tool version \"1.0.0\", but workflow extraction will use version \"2.0.0\"."
    },
    "display_name": "Concatenate datasets",
    "is_selectable": true,
    "disabled_reason": null,
    "can_be_input": false,
    "outputs": [...],
    "has_non_deleted_outputs": true
}
```

### 6.6 Non-Ready Datasets

Datasets in states `new`, `running`, or `queued` are **excluded** from the summary entirely. They don't appear in any job's outputs. Instead, a global warning is added:

```json
{
    "warnings": ["Some datasets still queued or running were ignored"],
    "jobs": [...]
}
```

This filtering happens inside `WorkflowSummary.__check_state()` before any jobs are built.

### 6.7 Copied Datasets

When a dataset is copied from another history (or a library), the `WorkflowSummary` traces back through the copy chain to find the original:
- `hda.copied_from_history_dataset_association` chain for HDAs
- `hdca.copied_from_history_dataset_collection_association` chain for HDCAs

The original's creating job is used. The HID in the **current** history (not the source) is tracked in `hda_hid_in_history` / `hdca_hid_in_history`.

### 6.8 Implicit Collection Mapping

When a tool produces implicit output collections (e.g., running a tool over a list), multiple jobs may produce the same logical output. The `WorkflowSummary` designates one "representative" job and maps all related job IDs to it via `job_id2representative_job`. The API only returns the representative job, avoiding duplicates.

### 6.9 Empty History

```json
{
    "history_id": "abc123",
    "history_name": "Unnamed history",
    "jobs": [],
    "warnings": [],
    "default_workflow_name": "Workflow constructed from history 'Unnamed history'"
}
```

Valid response. The client should show a message like "No tools have been run in this history."

---

## 7. ID Encoding Strategy

This is the most critical aspect of the API design because the extraction system uses **three different ID spaces**:

### 7.1 ID Types in the API

| Field | ID Space | Format | Example | Why |
|-------|----------|--------|---------|-----|
| `history_id` (path/response) | Encoded DB ID | hex string | `"f2db41e1fa331b3e"` | Standard Galaxy pattern |
| `ExtractionJob.id` (tool) | Encoded DB ID | hex string | `"f2db41e1fa331b3e"` | Real job, standard encoding |
| `ExtractionJob.id` (fake) | Synthetic string | `fake_\d+` | `"fake_12345"` | No DB record to encode |
| `ExtractionOutputDataset.id` | Encoded DB ID | hex string | `"a1b2c3d4e5f6"` | HDA/HDCA DB ID |
| `ExtractionOutputDataset.hid` | History item number | plain int | `3` | Display order in history |
| `job_ids` (submission) | Encoded DB IDs | hex strings | `["f2db41e1fa331b3e"]` | Decoded to int by API |
| `dataset_ids` (submission) | HIDs | plain ints | `[1, 3]` | Used directly by extract_steps |
| `dataset_collection_ids` (submission) | HIDs | plain ints | `[2]` | Used directly by extract_steps |

### 7.2 Why `ExtractionJob.id` Cannot Be `EncodedDatabaseIdField`

The `EncodedDatabaseIdField` type has validators that enforce the hex-encoded format. Fake job IDs like `"fake_12345"` would fail validation. Options considered:

1. **Use `str` for all job IDs** (chosen): Simple, accommodates both formats. Client treats job IDs as opaque strings for the `job_ids` submission field.

2. **Encode fake job IDs differently**: Could encode the underlying dataset ID and prefix with a type marker. Adds complexity with no benefit since fake job IDs are never submitted in `job_ids` (only real job IDs are).

3. **Use a union type**: `Union[EncodedDatabaseIdField, str]` with validation. Over-engineered.

### 7.3 Client Guidance

The client should:
- Display `hid` to the user (it's the number they see in the history panel)
- Use `id` (encoded DB ID) for any operations that need to reference the specific dataset (e.g., preview links)
- Use `hid` for the `dataset_ids`/`dataset_collection_ids` submission fields
- Use `ExtractionJob.id` directly for the `job_ids` submission field (it's already encoded for real jobs)

---

## 8. Service Layer Design

### 8.1 Method Signature

```python
# In HistoriesService:

def get_extraction_summary(
    self,
    trans: ProvidesHistoryContext,
    history_id: DecodedDatabaseIdField,
) -> WorkflowExtractionSummary:
```

### 8.2 Implementation Structure

```python
def get_extraction_summary(self, trans, history_id):
    # 1. Access check (reuse existing pattern)
    history = self.manager.get_accessible(history_id, trans.user, current_history=trans.history)

    # 2. Call existing summarize()
    jobs_dict, warnings = summarize(trans, history)

    # 3. Transform each (job, datasets) pair
    extraction_jobs = []
    for job, datasets in jobs_dict.items():
        extraction_job = self._build_extraction_job(trans, job, datasets)
        extraction_jobs.append(extraction_job)

    # 4. Sort by first output HID (matches Mako display order)
    extraction_jobs.sort(key=lambda j: j.outputs[0].hid if j.outputs else 0)

    # 5. Build response
    return WorkflowExtractionSummary(
        history_id=trans.security.encode_id(history.id),
        history_name=history.name,
        jobs=extraction_jobs,
        warnings=list(warnings),
        default_workflow_name=f"Workflow constructed from history '{history.name}'",
    )
```

### 8.3 Job Transformation Helper

```python
def _build_extraction_job(self, trans, job, datasets):
    """Transform a summarize() job entry into an ExtractionJob."""

    is_fake = isinstance(job, (FakeJob, DatasetCollectionCreationJob))

    # Determine job type
    if isinstance(job, FakeJob):
        job_type = ExtractionJobType.INPUT_DATASET
    elif isinstance(job, DatasetCollectionCreationJob):
        job_type = ExtractionJobType.COLLECTION_CREATION
    else:
        job_type = ExtractionJobType.TOOL

    # Resolve tool info (real jobs only)
    tool_info = None
    display_name = "Unknown"
    is_selectable = False
    disabled_reason = None
    can_be_input = is_fake

    if job_type == ExtractionJobType.INPUT_DATASET:
        display_name = job.name or "Input Dataset"

    elif job_type == ExtractionJobType.COLLECTION_CREATION:
        display_name = job.name  # "Dataset Collection Creation"
        disabled_reason = job.disabled_why

    elif job_type == ExtractionJobType.TOOL:
        tool = trans.app.toolbox.get_tool(job.tool_id, tool_version=job.tool_version)
        if tool is None:
            display_name = "Unknown Tool"
            disabled_reason = "Tool not found in toolbox"
        else:
            display_name = tool.name
            is_selectable = tool.is_workflow_compatible
            if not tool.is_workflow_compatible:
                disabled_reason = "This tool cannot be used in workflows"

            version_warning = None
            if tool.version != job.tool_version:
                version_warning = (
                    f'Dataset was created with tool version "{job.tool_version}", '
                    f'but workflow extraction will use version "{tool.version}".'
                )

            tool_info = ExtractionToolInfo(
                tool_id=job.tool_id,
                tool_version=job.tool_version,
                tool_name=tool.name,
                is_workflow_compatible=tool.is_workflow_compatible,
                version_warning=version_warning,
            )

    # Build output list
    outputs = self._build_extraction_outputs(trans, datasets)
    has_non_deleted = any(not o.deleted for o in outputs)

    # Encode job ID
    if is_fake:
        job_id = str(job.id)  # "fake_12345"
    else:
        job_id = trans.security.encode_id(job.id)

    return ExtractionJob(
        id=job_id,
        job_type=job_type,
        tool_info=tool_info,
        display_name=display_name,
        is_selectable=is_selectable,
        disabled_reason=disabled_reason,
        can_be_input=can_be_input,
        outputs=outputs,
        has_non_deleted_outputs=has_non_deleted,
    )
```

### 8.4 Output Transformation Helper

```python
def _build_extraction_outputs(self, trans, datasets):
    """Transform summarize() dataset tuples into ExtractionOutputDataset list."""
    outputs = []
    for _output_name, data in datasets:
        # Determine collection_type if applicable
        collection_type = None
        if hasattr(data, 'collection') and data.collection:
            collection_type = data.collection.collection_type

        outputs.append(ExtractionOutputDataset(
            id=trans.security.encode_id(data.id),
            hid=data.hid,
            name=data.display_name() if hasattr(data, 'display_name') else data.name,
            state=data.state or "queued",
            deleted=data.deleted,
            history_content_type=data.history_content_type,
            collection_type=collection_type,
        ))
    return outputs
```

---

## 9. Integration with Existing Infrastructure

### 9.1 Endpoint Registration

The endpoint is added as a method on the existing `FastAPIHistories` CBV class:

```python
@router.get(
    "/api/histories/{history_id}/extraction_summary",
    summary="Get workflow extraction summary for a history.",
    responses={
        403: {"description": "Not authorized to access this history"},
        404: {"description": "History not found"},
    },
)
def extraction_summary(
    self,
    history_id: HistoryIDPathParam,
    trans: ProvidesHistoryContext = DependsOnTrans,
) -> WorkflowExtractionSummary:
    return self.service.get_extraction_summary(trans, history_id)
```

No manual router registration needed - Galaxy auto-discovers routers.

### 9.2 Schema Integration

The new file `lib/galaxy/schema/workflow_extraction.py` follows existing patterns:
- Uses `EncodedDatabaseIdField` from `galaxy.schema.fields`
- Uses `BaseModel` (not `Model`) since these aren't tied to ORM classes
- Uses `Field(...)` with title and description for OpenAPI docs

### 9.3 Import Path for `FakeJob` / `DatasetCollectionCreationJob`

```python
from galaxy.workflow.extract import (
    DatasetCollectionCreationJob,
    FakeJob,
    summarize,
)
```

Both classes are defined at module level in `galaxy.workflow.extract` and can be imported directly for `isinstance()` checks.

### 9.4 OpenAPI Schema Generation

The response model generates OpenAPI 3.0 schema automatically. Example generated schema fragment:

```yaml
WorkflowExtractionSummary:
  type: object
  required: [history_id, history_name, default_workflow_name]
  properties:
    history_id:
      type: string
      example: "0123456789ABCDEF"
    history_name:
      type: string
    jobs:
      type: array
      items:
        $ref: '#/components/schemas/ExtractionJob'
    warnings:
      type: array
      items:
        type: string
    default_workflow_name:
      type: string
```

---

## 10. Performance Considerations

### 10.1 Current Performance Profile

The `summarize()` function iterates `history.visible_contents`, which lazy-loads from the DB. For each content item, it:
1. Checks `creating_job_associations` (N+1 query risk)
2. Follows copy chains (`copied_from_*`) to trace originals
3. For real jobs, the service additionally calls `toolbox.get_tool()` per job

**Expected bottlenecks**:
- Histories with 100+ items: many DB queries for job associations
- Histories with many copied datasets: chain-following is sequential
- Large toolboxes: `get_tool()` does a dict lookup, should be O(1)

### 10.2 No Pagination Initially

The Mako template loads everything at once. The Vue component should match this behavior initially. Adding pagination would require changes to `summarize()` which currently returns a complete dict.

### 10.3 Future Optimization Path

If performance becomes an issue:

1. **Eager-load job associations**: Modify the `visible_contents` query to join-load `creating_job_associations` (eliminates N+1)
2. **Cache toolbox lookups**: The toolbox is already cached in memory; no concern here
3. **Paginate**: Add `limit`/`offset` query params and modify `summarize()` to accept bounds. Would require tracking total count separately.

### 10.4 Response Size Estimate

For a history with 50 jobs averaging 2 outputs each:
- ~50 ExtractionJob objects × ~200 bytes each = ~10KB
- ~100 ExtractionOutputDataset objects × ~150 bytes each = ~15KB
- Total: ~25KB JSON response

For 500 jobs: ~250KB. Acceptable without pagination.

---

## 11. Backwards Compatibility

### 11.1 No Breaking Changes

The new GET endpoint is additive. The existing POST /api/workflows extraction path is unchanged. No existing clients are affected.

### 11.2 URL Redirect

The legacy URL `/workflow/build_from_current_history?history_id=X` should redirect to `/workflows/extract?history_id=X`. This can be done in the legacy controller before removing it, or via a route-level redirect.

### 11.3 Typed Payload Migration

The `WorkflowExtractionPayload` model can be introduced without breaking existing clients:

1. Add the model to the schema
2. In the `create` method, validate the payload against the model when `from_history_id` is present
3. Existing dict-based clients will still work because Pydantic parses dicts

### 11.4 Client TypeScript Types

The TypeScript interfaces should be generated from the OpenAPI schema rather than manually maintained. Galaxy uses `openapi-typescript` for this. After the backend is implemented, run the schema generator to produce typed client code.

---

## 12. Unresolved Questions

1. **Should incompatible real tool jobs allow "treat as input"?** The Mako template does NOT allow this - only fake jobs get the input checkbox. But a case could be made that outputs of incompatible tools (e.g., data_source tools) could serve as workflow inputs. The current plan preserves Mako behavior.

2. **Should the extraction summary include the `output_name` from `summarize()`?** Currently discarded (stored as `_output_name` in the output builder). This is the output port name on the tool (e.g., `"out_file1"`). Not needed for the UI but could be useful for debugging or advanced features.

3. **Should `WorkflowExtractionPayload` be a formal discriminated union branch of the workflow creation payload?** Currently the POST /api/workflows endpoint uses a raw dict with branching logic. A cleaner design would be a discriminated union, but that's a larger refactor.

4. **How to handle DatasetCollectionCreationJob with `from_jobs`?** When a collection creation job tracks its source jobs via `set_jobs()`, should the API expose that relationship? Currently not exposed.

5. **Should the API include tool parameter details for real jobs?** The Mako template doesn't show tool parameters, but exposing them could enable a "preview extraction" feature. Would require calling `step_inputs()` for each job, which is expensive.

6. **Accessibility in the new API**: The API itself is accessible by design (structured data). But the Vue component needs to use proper ARIA labels for checkboxes. The API should include enough context (display_name, disabled_reason) for the client to generate good ARIA labels.

7. **Large history performance**: Should `summarize()` be modified to accept bounds? Or should the API response be cached? The Mako template worked fine for histories with hundreds of items, so this may not be a real problem.
