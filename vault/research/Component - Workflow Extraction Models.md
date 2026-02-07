---
type: research
subtype: component
tags:
  - research/component
  - galaxy/workflows
  - galaxy/models
component: Workflow Extraction Models
status: draft
created: 2026-02-05
revised: 2026-02-05
revision: 1
ai_generated: true
---

# Galaxy Models for Workflow Extraction

## Overview

Workflow extraction reconstructs a workflow from history contents by tracing datasets/collections back to their creating jobs. This document details the Galaxy ORM models involved and how they're traversed during extraction.

## Model Relationship Diagram

```
                            +------------------+
                            |   StoredWorkflow |
                            +------------------+
                                     |
                                     | latest_workflow
                                     | workflows[]
                                     v
                            +------------------+
                            |     Workflow     |
                            +------------------+
                                     |
                                     | steps[]
                                     v
                            +------------------+
                            |   WorkflowStep   |<----------------------+
                            +------------------+                        |
                                     |                                  |
                          +----------+----------+                       |
                          |                     |                       |
                          v                     v                       |
            +-------------------+    +-------------------------+        |
            | WorkflowStepInput |    | WorkflowStepConnection  |--------+
            +-------------------+    +-------------------------+
                     |                    |
                     | connections[]      | output_step
                     +--------------------+


+------------------+
|     History      |
+------------------+
        |
        | visible_contents (HDA + HDCA ordered by hid)
        |
        +-------------------------------+
        |                               |
        v                               v
+-----------------------+    +--------------------------------+
|HistoryDatasetAssociation|  |HistoryDatasetCollectionAssociation|
|       (HDA)           |    |            (HDCA)              |
+-----------------------+    +--------------------------------+
        |                               |
        | creating_job_associations     | creating_job_associations
        | copied_from_history_dataset_  | copied_from_history_dataset_
        |   association                 |   collection_association
        v                               | implicit_output_name
+---------------------------+           | collection
| JobToOutputDatasetAssociation|        v
+---------------------------+    +-------------------+
        |                        | DatasetCollection |
        | job                    +-------------------+
        v                               |
+------------------+                    | elements[]
|       Job        |                    v
+------------------+             +------------------------+
        |                        | DatasetCollectionElement|
        | output_datasets[]      +------------------------+
        | output_dataset_        | hda -> HDA
        |   collection_instances | child_collection -> DC
        | input_datasets[]       +------------------------+
        +-------------------+
                            |
+---------------------------+  +--------------------------------+
| JobToInputDatasetAssociation |JobToInputDatasetCollectionAssociation|
+---------------------------+  +--------------------------------+


+-------------------------------------------+
| ImplicitlyCreatedDatasetCollectionInput   |
+-------------------------------------------+
| - name: input parameter name              |
| - input_dataset_collection: HDCA          |
| - dataset_collection_id: target HDCA      |
+-------------------------------------------+
         |
         | Used by HDCA.find_implicit_input_collection(name)
         | to trace implicit map-over inputs
         v
```

## Core Models

### 1. History

**File**: `lib/galaxy/model/__init__.py` (line 3434)

**Purpose**: Container for user's datasets and collections; source of extraction.

**Key Fields for Extraction**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | int | Primary key |
| `hid_counter` | int | Next HID to assign |

**Key Relationships**:
| Relationship | Target | Description |
|--------------|--------|-------------|
| `datasets` | HDA[] | All HDAs in history |
| `dataset_collections` | HDCA[] | All HDCAs in history |
| `visible_datasets` | HDA[] | Non-deleted, visible HDAs |
| `visible_dataset_collections` | HDCA[] | Non-deleted, visible HDCAs |
| `jobs` | Job[] | Jobs run in this history |

**Key Methods**:
- `visible_contents` - Property that returns merged iterator of visible HDAs and HDCAs, sorted by `hid`. **Primary entry point for extraction summarization.**

### 2. HistoryDatasetAssociation (HDA)

**File**: `lib/galaxy/model/__init__.py` (line 5774)

**Purpose**: Links a Dataset to a History; represents a single dataset in history.

**Key Fields for Extraction**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | int | Primary key |
| `hid` | int | History ID number (display order) |
| `name` | str | Dataset name |
| `state` | str | Current state (ok, running, etc.) |
| `history_content_type` | str | Always "dataset" |

**Key Relationships**:
| Relationship | Target | Description |
|--------------|--------|-------------|
| `creating_job_associations` | JobToOutputDatasetAssociation[] | Jobs that created this HDA |
| `copied_from_history_dataset_association` | HDA | Source HDA if copied |
| `dependent_jobs` | JobToInputDatasetAssociation[] | Jobs that used this as input |
| `history` | History | Parent history |

**Extraction Usage**:
- `creating_job_associations` traversed to find producing job
- `copied_from_history_dataset_association` followed recursively to find original HDA
- `state` checked to filter out running/queued datasets

### 3. HistoryDatasetCollectionAssociation (HDCA)

**File**: `lib/galaxy/model/__init__.py` (line 7554)

**Purpose**: Links a DatasetCollection to a History; represents a collection in history.

**Key Fields for Extraction**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | int | Primary key |
| `hid` | int | History ID number |
| `name` | str | Collection name |
| `implicit_output_name` | str | Output name if created via implicit mapping |
| `history_content_type` | str | Always "dataset_collection" |

**Key Relationships**:
| Relationship | Target | Description |
|--------------|--------|-------------|
| `creating_job_associations` | JobToOutputDatasetCollectionAssociation[] | Jobs that created this |
| `copied_from_history_dataset_collection_association` | HDCA | Source if copied |
| `collection` | DatasetCollection | The actual collection |
| `implicit_input_collections` | ImplicitlyCreatedDatasetCollectionInput[] | Input collections for implicit map |
| `implicit_collection_jobs` | ImplicitCollectionJobs | Group of jobs for map-over |
| `job` | Job | Creating job (for single-job collections) |

**Key Methods**:
- `find_implicit_input_collection(name)` - Returns input HDCA used for given input parameter name

**Extraction Usage**:
- `creating_job_associations` for job lookup
- `implicit_output_name` indicates collection created via map-over
- `find_implicit_input_collection()` used to trace input collections for implicit jobs
- `copied_from_history_dataset_collection_association` followed to find original

### 4. Job

**File**: `lib/galaxy/model/__init__.py` (line 1580)

**Purpose**: Represents a tool execution request with inputs and outputs.

**Key Fields for Extraction**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | int | Primary key |
| `tool_id` | str | Tool identifier |
| `tool_version` | str | Tool version used |
| `state` | str | Job state |

**Key Relationships**:
| Relationship | Target | Description |
|--------------|--------|-------------|
| `input_datasets` | JobToInputDatasetAssociation[] | Input HDAs |
| `input_dataset_collections` | JobToInputDatasetCollectionAssociation[] | Input HDCAs |
| `output_datasets` | JobToOutputDatasetAssociation[] | Output HDAs |
| `output_dataset_collection_instances` | JobToOutputDatasetCollectionAssociation[] | Output HDCAs |
| `parameters` | JobParameter[] | Tool parameter values |

**Extraction Usage**:
- `tool_id` and `tool_version` copied to WorkflowStep
- Output associations iterated to map HIDs to step outputs
- Input associations used to find data dependencies (via `step_inputs()`)

### 5. DatasetCollection

**File**: `lib/galaxy/model/__init__.py` (line 6982)

**Purpose**: The actual collection structure containing elements.

**Key Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | int | Primary key |
| `collection_type` | str | Type (list, paired, list:paired, etc.) |
| `element_count` | int | Number of elements |

**Key Relationships**:
| Relationship | Target | Description |
|--------------|--------|-------------|
| `elements` | DatasetCollectionElement[] | Collection elements |

**Key Methods**:
- `first_dataset_element` - Returns first leaf DCE (traverses nested collections)

**Extraction Usage**:
- `collection_type` stored in WorkflowSummary.collection_types
- `first_dataset_element` used as fallback to find creating job for implicit collections

### 6. DatasetCollectionElement

**File**: `lib/galaxy/model/__init__.py` (line 8006)

**Purpose**: Single element in a collection; can be HDA or nested collection.

**Key Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | int | Primary key |
| `element_index` | int | Position in collection |
| `element_identifier` | str | Element name/identifier |

**Key Relationships**:
| Relationship | Target | Description |
|--------------|--------|-------------|
| `hda` | HDA | HDA element (if leaf) |
| `child_collection` | DatasetCollection | Nested collection (if nested) |
| `collection` | DatasetCollection | Parent collection |

**Key Properties**:
- `element_type` - "hda", "ldda", or "dataset_collection"
- `is_collection` - True if nested collection
- `element_object` - Returns hda/ldda/child_collection

## Job Association Models

### JobToInputDatasetAssociation
**File**: line 2621

| Field | Description |
|-------|-------------|
| `name` | Input parameter name |
| `dataset` | HDA that was input |
| `job` | Job that received input |

### JobToOutputDatasetAssociation
**File**: line 2641

| Field | Description |
|-------|-------------|
| `name` | Output name |
| `dataset` | HDA that was created |
| `job` | Job that created it |

### JobToInputDatasetCollectionAssociation
**File**: line 2663

| Field | Description |
|-------|-------------|
| `name` | Input parameter name |
| `dataset_collection` | HDCA that was input |
| `job` | Job that received input |

### JobToOutputDatasetCollectionAssociation
**File**: line 2703

| Field | Description |
|-------|-------------|
| `name` | Output name |
| `dataset_collection_instance` | HDCA that was created |
| `job` | Job that created it |

### ImplicitlyCreatedDatasetCollectionInput
**File**: line 2831

Links an output HDCA to its input HDCA for implicit map-over operations.

| Field | Description |
|-------|-------------|
| `name` | Input parameter name |
| `input_dataset_collection` | The input HDCA |
| `dataset_collection_id` | The output HDCA id |

## Workflow Models (Created by Extraction)

### StoredWorkflow
**File**: line 8312

Container for workflow metadata and revisions.

| Field | Description |
|-------|-------------|
| `name` | Workflow name |
| `user` | Owner |
| `latest_workflow` | Current Workflow revision |

### Workflow
**File**: line 8495

A specific revision of a workflow.

| Field | Description |
|-------|-------------|
| `name` | Workflow name |
| `steps` | WorkflowStep[] |
| `stored_workflow` | Parent StoredWorkflow |

### WorkflowStep
**File**: line 8718

Single step in a workflow (tool, input, subworkflow).

| Field | Description |
|-------|-------------|
| `type` | "tool", "data_input", "data_collection_input", etc. |
| `tool_id` | Tool ID (if type=tool) |
| `tool_version` | Tool version |
| `tool_inputs` | Parameter values (JSON) |
| `label` | Step label |
| `position` | Canvas position |
| `order_index` | Step order |
| `inputs` | WorkflowStepInput[] |
| `output_connections` | WorkflowStepConnection[] |

### WorkflowStepInput
**File**: line 9047

An input port on a workflow step.

| Field | Description |
|-------|-------------|
| `name` | Input parameter name |
| `workflow_step` | Parent step |
| `connections` | WorkflowStepConnection[] |

### WorkflowStepConnection
**File**: line 9097

Connection between step output and step input.

| Field | Description |
|-------|-------------|
| `output_step` | Source step |
| `output_name` | Source output name |
| `input_step_input` | Target WorkflowStepInput |

## Extraction Flow

### Phase 1: History Summarization (`WorkflowSummary`)

```python
class WorkflowSummary:
    jobs = {}                      # Job -> [(output_name, HDA/HDCA), ...]
    job_id2representative_job = {} # job_id -> representative Job
    implicit_map_jobs = []         # Jobs that created implicit collections
    collection_types = {}          # hid -> collection_type
    hda_hid_in_history = {}        # hda_id -> hid in current history
    hdca_hid_in_history = {}       # hdca_id -> hid in current history
```

**Algorithm**:
1. Iterate `history.visible_contents` (HDAs and HDCAs sorted by HID)
2. For each HDA:
   - Follow `copied_from_history_dataset_association` chain to find original
   - Map original HDA id to current history HID
   - Get `creating_job_associations` to find producing job
   - If no creating job, create `FakeJob` (treat as input dataset)
   - Add job -> (output_name, HDA) mapping
3. For each HDCA:
   - Follow `copied_from_history_dataset_collection_association` chain
   - Get `creating_job_associations` from HDCA
   - If `implicit_output_name` set, mark job as implicit map job
   - Fallback: use `collection.first_dataset_element.hda.creating_job_associations`

### Phase 2: Step Extraction (`extract_steps`)

1. Create `data_input` steps for selected dataset HIDs
2. Create `data_collection_input` steps for selected collection HIDs
3. For each selected job_id:
   - Get representative job from summary
   - Call `step_inputs(trans, job)` to get tool inputs and data associations
   - Create `tool` step with tool_id, tool_version, tool_inputs
   - For each input association (hid, input_name):
     - If implicit map job, find input collection via `find_implicit_input_collection()`
     - Create `WorkflowStepConnection` to earlier step's output
   - Map job outputs to step outputs using HIDs

### Phase 3: Workflow Assembly (`extract_workflow`)

1. Create `Workflow` with steps
2. Order steps via `attach_ordered_steps()`
3. Compute canvas positions via `order_workflow_steps_with_levels()`
4. Create `StoredWorkflow` container
5. Persist to database

## Key Traversals

### Finding Original Dataset
```python
def __original_hda(hda):
    while hda.copied_from_history_dataset_association:
        hda = hda.copied_from_history_dataset_association
    return hda
```

### Finding Creating Job
```python
# For HDA
original_hda = __original_hda(hda)
for assoc in original_hda.creating_job_associations:
    job = assoc.job

# For HDCA
for assoc in hdca.creating_job_associations:
    job = assoc.job
```

### Getting Tool Inputs from Job
```python
def step_inputs(trans, job):
    tool = trans.app.toolbox.get_tool(job.tool_id, tool_version=job.tool_version)
    param_values = tool.get_param_values(job, ignore_errors=True)
    associations = __cleanup_param_values(tool.inputs, param_values)
    tool_inputs = tool.params_to_strings(param_values, trans.app)
    return tool_inputs, associations
```

### Tracing Implicit Collection Inputs
```python
if job in summary.implicit_map_jobs:
    an_implicit_output_collection = jobs[job][0][1]  # Get any output HDCA
    input_collection = an_implicit_output_collection.find_implicit_input_collection(input_name)
    if input_collection:
        other_hid = input_collection.hid
```

## HID Resolution

HIDs must be resolved carefully because datasets may be copied between histories:

```python
def hid(self, object):
    if object.history_content_type == "dataset_collection":
        if object.id in self.hdca_hid_in_history:
            return self.hdca_hid_in_history[object.id]  # Use mapped HID
        elif object.history == self.history:
            return object.hid  # Same history, use directly
        else:
            return object.hid  # Fallback with warning
```

This ensures connections use HIDs from the current history, not the original.
