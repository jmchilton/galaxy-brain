---
type: research
subtype: component
tags:
  - research/component
  - galaxy/workflows
  - galaxy/api
status: draft
created: 2026-03-16
revised: 2026-04-22
revision: 2
ai_generated: true
component: Workflow API
galaxy_areas: [workflows, api]
summary: "REST API for workflow CRUD, execution, invocation monitoring via FastAPI controllers"
related_notes:
  - "[[Component - Invocation Report to Pages]]"
  - "[[Component - Post Job Actions]]"
  - "[[Component - Workflow Extraction]]"
  - "[[Component - Workflow Import]]"
  - "[[Component - Workflow Refactoring API]]"
---

# Galaxy Workflow API - Comprehensive Reference Documentation

## Executive Summary

The Galaxy Workflow API is a comprehensive REST API exposed via FastAPI for managing workflow definitions, executing workflows (invocations), monitoring invocation progress, and sharing workflows with other users. The API is organized into two main controller classes (`FastAPIWorkflows` and `FastAPIInvocations`) with ~50 endpoints covering CRUD operations, execution, versioning, sharing, validation, and invocation lifecycle management.

---

## Architecture Overview

### API Layer Structure

The API is implemented in FastAPI with three primary layers:

1. **API Controllers** (`lib/galaxy/webapps/galaxy/api/workflows.py`)
   - `FastAPIWorkflows`: Workflow definition management (CRUD, listing, sharing, refactoring, versioning)
   - `FastAPIInvocations`: Workflow execution and invocation lifecycle management
   - Legacy `WorkflowsAPIController` class: Older API methods (deprecated but still active)

2. **Service Layer** (`lib/galaxy/webapps/galaxy/services/workflows.py` and `invocations.py`)
   - `WorkflowsService`: Translates API requests to business logic
   - `InvocationsService`: Invocation-specific operations

3. **Manager Layer** (`lib/galaxy/managers/workflows.py`)
   - `WorkflowsManager`: CRUD and access control for workflows
   - `WorkflowContentsManager`: Workflow serialization, deserialization, format conversion
   - `WorkflowSerializer`: Workflow object serialization for API responses

4. **Schema Layer** (`lib/galaxy/schema/workflows.py`)
   - Pydantic models for request/response validation
   - `InvokeWorkflowPayload`: Workflow invocation parameters
   - `StoredWorkflowDetailed`: Complete workflow representation

### Key Design Patterns

- **Dual ID Support**: Workflows can be referenced by:
  - `StoredWorkflowID`: Persistent workflow definition ID (unique per user, survives versions)
  - `WorkflowID` (instance ID): UUID of specific workflow version
  - By UUID directly

- **Lazy Loading**: Workflow steps and relationships are loaded via SQLAlchemy joinedload strategies for performance

- **Security Checks**: All endpoints verify user ownership or accessibility via manager `check_security()` method

- **Serialization View Parameters**: Different API endpoints can return workflows at varying detail levels (summary, instance, export, editor, run)

---

## Complete Endpoint Reference

### Workflow Management Endpoints

#### GET /api/workflows
**Summary**: List workflows accessible to user
**Auth**: Required (user context)
**Response**: `list[dict[str, Any]]` with `total_matches` header

**Query Parameters**:
- `show_deleted: bool` (default: false) - Include deleted workflows
- `show_hidden: bool` (default: false) - Include hidden workflows
- `show_published: Optional[bool]` - Include published workflows
- `show_shared: Optional[bool]` - Include workflows shared with user
- `missing_tools: bool` (default: false) - Include missing tools list
- `sort_by: Optional[WorkflowSortByEnum]` - Sort by update_time, name, owner, etc.
- `sort_desc: Optional[bool]` - Reverse sort order
- `limit: Optional[int]` - Max results per page
- `offset: Optional[int]` - Pagination offset
- `search: Optional[str]` - Advanced search with filters: `name:`, `tag:`, `user:`, `is:published`, `is:importable`, `is:deleted`, `is:shared_with_me`, `is:bookmarked`
- `skip_step_counts: bool` (default: false) - Omit step count calculation for performance

**Behavior**:
- Returns user's own workflows by default, plus shared/published if specified
- Returns workflows in update_time desc order (most recent first)
- Does NOT include deleted/hidden unless explicitly requested
- Show_shared + show_deleted are mutually exclusive
- Show_shared + show_hidden are mutually exclusive
- Response headers include `total_matches` count

---

#### POST /api/workflows
**Summary**: Create workflow from multiple sources
**Auth**: Required (real user, not bootstrap admin)
**Request**: `payload` dict with one of these sources

**Creation Methods** (mutually exclusive):
1. **From History** (`from_history_id`)
   - `from_history_id: str` - History to extract workflow from
   - `workflow_name: str` - Name for extracted workflow
   - `job_ids: list[str]` (optional) - Specific jobs to include
   - `dataset_ids: list[str]` (optional) - Input dataset HIDs
   - `dataset_collection_ids: list[str]` (optional) - Input collection HIDs

2. **From JSON Workflow** (`workflow`)
   - `workflow: dict` - Workflow dict in GA or GXformat2 form

3. **From URL** (`archive_source`)
   - `archive_source: str` - URL to fetch workflow from
   - Special case: `archive_source: "trs_tool"` with `trs_url`, `trs_tool_id`, `trs_version_id`, `trs_server`

4. **From File** (`archive_file`)
   - `archive_file: UploadFile` - Multipart file upload

5. **From File Path** (`from_path`)
   - `from_path: str` - Filesystem path (admin only)

6. **From Shared Workflow** (`shared_workflow_id`)
   - `shared_workflow_id: str` - ID of workflow to import from another user

**Optional Parameters** (for `workflow` source):
- `name: str` - Override workflow name
- `annotation: str` - Workflow annotation (markdown)
- `tags: list[str]` - Tags to assign
- `publish: bool` - Make public/published
- `importable: bool` - Allow others to import (required if publish=true)
- `exact_tools_only: bool` - Reject workflow if tools missing
- `import_tools: bool` - Auto-import tools from ToolShed (admin only)

**Response**:
```json
{
  "id": "encoded_id",
  "name": "workflow name",
  "owner": "username",
  "number_of_steps": 5,
  "message": "Workflow 'name' imported successfully.",
  "status": "success|error",
  "url": "/api/workflows/encoded_id"
}
```

**Error Cases**:
- Empty file -> "attempted to upload empty file"
- Missing required source -> RequestParameterMissingException
- Multiple sources -> RequestParameterInvalidException
- Publish=true but importable=false -> RequestParameterInvalidException
- Published/importable by non-admin -> raises exception
- Missing tools with exact_tools_only -> workflow created but marked with errors

---

#### GET /api/workflows/{workflow_id}
**Summary**: Show workflow details including steps and inputs
**Auth**: Required
**Path Params**:
- `workflow_id: StoredWorkflowIDPathParam` (encoded DB ID or UUID)

**Query Params**:
- `instance: Optional[bool]` - true = fetch by Workflow instance ID, false = by StoredWorkflow ID
- `legacy: Optional[bool]` - Use legacy workflow format
- `version: Optional[int]` - Get specific workflow version

**Response**: `StoredWorkflowDetailed` with:
- All workflow metadata (name, owner, annotation, tags, etc.)
- `steps: dict[int, WorkflowStep]` - Steps keyed by order_index with discriminator union:
  - `InputDataStep`
  - `InputDataCollectionStep`
  - `InputParameterStep`
  - `PauseStep`
  - `ToolStep`
  - `SubworkflowStep`
- `inputs: dict[int, WorkflowInput]` - Workflow formal inputs
- `version: int` - Version number (increments on each save)
- `importable: bool` - Can be imported by others
- `published: bool` - Public/visible to all
- `deleted: bool` - Soft-deleted status

---

#### PUT /api/workflows/{workflow_id}
**Summary**: Update workflow definition and metadata
**Auth**: Required (ownership)
**Path Params**: `workflow_id`

**Request Body** (all optional):
- `workflow: dict` - New workflow definition (creates new version)
- `name: str` - Update name without changing steps
- `annotation: str` - Update markdown annotation
- `tags: list[str]` - Replace all tags (via tag handler)
- `hidden: bool` - Hide from listings
- `published: bool` - Publish status
- `importable: bool` - Importable status
- `menu_entry: bool` / `show_in_tool_panel: bool` - Add to user's tool panel
- `from_tool_form: bool` - Tool form encoding (legacy)
- `comments: dict` - Step comments

**Behavior**:
- If only metadata (name, annotation, etc.) -> updates without creating new version
- If `workflow` or `comments` provided -> creates new version via `workflow_contents_manager.update_workflow_from_raw_description()`
- Tool state validation and upgrade occurs during update
- Missing tools prevent save unless removed
- Cycles in workflow are detected and reported

**Response**: Updated workflow in "instance" style serialization

---

#### DELETE /api/workflows/{workflow_id}
**Summary**: Soft-delete a workflow
**Auth**: Required (ownership)
**Status Code**: 204 No Content
**Behavior**: Sets `deleted=True` flag in database, doesn't remove data

---

#### POST /api/workflows/{workflow_id}/undelete
**Summary**: Restore a soft-deleted workflow
**Auth**: Required (ownership)
**Status Code**: 204 No Content
**Behavior**: Sets `deleted=False`

---

#### GET /api/workflows/{workflow_id}/download
**Summary**: Download workflow in various export formats
**Auth**: Public access if importable/published, otherwise owner-only
**Query Params**:
- `style: str` (default: "export") - "export" (for reimport), "instance", "editor", "run", "format2", or specify "ga" / "gxformat2" directly
- `format: str` - "json-download" triggers file download with Content-Disposition header
- `instance: bool` - Fetch by Workflow ID (instance) vs StoredWorkflow ID
- `version: int` - Specific version to download
- `history_id: str` - For style conversions that need history context
- `preserve_external_subworkflow_links: bool` - Keep subworkflow URLs instead of inlining

**Response Formats**:
- JSON (default) - `a_galaxy_workflow: "true"` marker, plus workflow structure
- YAML (if style=format2) - GXformat2/CWL-like format
- File download (if format=json-download) - `Galaxy-Workflow-{name}.ga` or `.gxwf.json`

**Behavior**:
- Styles are meant for different purposes:
  - "export": Meant for reimporting elsewhere (most stable)
  - "instance", "editor", "run": GUI-specific, not stable APIs
- Format2 exports are YAML and represent canonical format
- Subworkflow links are preserved by reference if they're external URLs
- Modified subworkflows cannot be preserved as links (inlined instead)

---

#### PUT /api/workflows/{workflow_id}/refactor
**Summary**: Apply refactoring actions to workflow
**Auth**: Required (ownership)
**Request Body**: `RefactorRequest` with:
- `actions: list[RefactorAction]` - Sequence of refactoring operations
- `style: str` (default: "export") - Output serialization style
- `version: Optional[int]` - Target version (default: latest)

**Refactor Action Types**:
- Update tool versions
- Modify tool state with validations
- Upgrade legacy tool state format
- Strip stale tool state keys (deprecated parameters)
- Reorder or restructure workflow steps

**Response**: `RefactorResponse` with updated workflow + any errors encountered

**Note**: This is the modern way to update workflow definitions with tool state normalization

---

### Workflow Versioning Endpoints

#### GET /api/workflows/{workflow_id}/versions
**Summary**: List all versions of a workflow
**Auth**: Required (ownership)
**Query Params**: `instance: Optional[bool]`
**Response**: List of workflow version objects with version numbers

**Behavior**:
- Each save of workflow steps/comments creates new version
- Metadata-only updates (name, annotation, tags) don't create versions
- Latest version is returned by default in other endpoints
- Can download/invoke specific version via `version` query param

---

#### GET /api/workflows/{workflow_id}/counts
**Summary**: Get invocation state counts
**Auth**: Required (accessibility)
**Query Params**: `instance: Optional[bool]`
**Response**: `InvocationsStateCounts` with state counts (scheduled, ok, error, etc.)

**Behavior**:
- Aggregates invocation states across all runs of this workflow
- Useful for dashboard/UI to show workflow health

---

### Sharing & Access Control Endpoints

#### GET /api/workflows/{workflow_id}/sharing
**Summary**: Get current sharing status
**Auth**: Required (ownership)
**Response**: `SharingStatus` object with:
- `importable: bool`
- `published: bool`
- `users_shared_with: list[dict]` - Users workflow is shared with
- `url: str` - Public URL if published

---

#### PUT /api/workflows/{workflow_id}/publish
**Summary**: Make workflow public (published + importable)
**Auth**: Required (ownership)
**Response**: Updated `SharingStatus`
**Side Effects**: Sets both `published=True` and `importable=True`

---

#### PUT /api/workflows/{workflow_id}/unpublish
**Summary**: Remove from published list
**Auth**: Required (ownership)
**Response**: Updated `SharingStatus`
**Side Effects**: Sets `published=False` (importable may remain true)

---

#### PUT /api/workflows/{workflow_id}/enable_link_access
**Summary**: Make importable via shareable link
**Auth**: Required (ownership)
**Response**: `SharingStatus`
**Side Effects**: Sets `importable=True`

---

#### PUT /api/workflows/{workflow_id}/disable_link_access
**Summary**: Disable import via shareable link
**Auth**: Required (ownership)
**Response**: `SharingStatus`
**Side Effects**: Sets `importable=False`

---

#### PUT /api/workflows/{workflow_id}/share_with_users
**Summary**: Share with specific users
**Auth**: Required (ownership)
**Request Body**: `ShareWithPayload` with:
- `user_ids: list[str]` - Encoded user IDs to share with

**Response**: `ShareWithStatus` with results for each user

---

#### PUT /api/workflows/{workflow_id}/slug
**Summary**: Set custom slug for public URL
**Auth**: Required (ownership)
**Status Code**: 204 No Content
**Request Body**: `SetSlugPayload` with:
- `new_slug: str` - New URL slug (must be globally unique)

**Behavior**:
- Workflow becomes accessible via `/api/workflows/<slug>` if shared/published
- Slug must be unique across all users
- Used for shareable links

---

### Tool Panel & Menu Endpoints

#### GET /api/workflows/menu
**Summary**: Get workflows shown in tool panel menu
**Auth**: Required
**Query Params**: Same filters as `GET /api/workflows` (deleted, hidden, published, shared, etc.)

**Response**: Filtered list of workflows in user's tool panel
**Behavior**: Returns only workflows added to user's workflow menu

---

#### PUT /api/workflows/menu
**Summary**: Set workflows in tool panel
**Auth**: Required
**Request Body**:
```json
{
  "workflow_ids": ["encoded_id_1", "encoded_id_2"]
}
```

**Behavior**:
- Replaces entire menu with provided list
- Deduplicates workflow IDs automatically
- Deletes old menu entries and creates new ones

---

### Workflow Invocation Endpoints (Execution)

#### POST /api/workflows/{workflow_id}/invocations
**Alias**: `POST /api/workflows/{workflow_id}/usage` (deprecated)
**Summary**: Schedule workflow for execution
**Auth**: Required (user context + history context)
**Path Params**: `workflow_id: MultiTypeWorkflowIDPathParam` (can be UUID, UUID1, or encoded ID)
**Request Body**: `InvokeWorkflowPayload`

**Key Parameters**:
```python
# History targeting (one required)
history: Optional[str]  # encoded ID or "hist_id=..."
history_id: Optional[str]  # direct encoded ID
new_history_name: Optional[str]  # create new history with name

# Workflow selection
version: Optional[int]  # specific version (default: latest)
instance: Optional[bool]  # fetch by Workflow ID vs StoredWorkflow ID

# Input mapping (choose one pattern)
inputs: Optional[dict[str, Any]]  # formal inputs by name/index
ds_map: Optional[dict]  # legacy dataset mapping (deprecated)
parameters: Optional[dict]  # legacy step parameters
inputs_by: Optional[str]  # "step_id" | "step_index" | "step_uuid" | "name" (piped)

# Tool state
require_exact_tool_versions: Optional[bool] = True
allow_tool_state_corrections: Optional[bool] = False

# Scheduling & execution
scheduler: Optional[str]  # scheduler choice
batch: Optional[bool] = False  # batch invocation
use_cached_job: Optional[bool] = False  # reuse prior job if inputs match
parameters_normalized: Optional[bool] = False  # legacy format flag

# Output handling
no_add_to_history: Optional[bool] = False
effective_outputs: Optional[Any]  # filter outputs
replacement_params: Optional[dict]  # string replacement in PJAs

# Resource control
preferred_object_store_id: Optional[str]
preferred_intermediate_object_store_id: Optional[str]
preferred_outputs_object_store_id: Optional[str]
resource_params: Optional[dict]  # workflow_resource_params_file parameters

# Completion actions
on_complete: Optional[list[dict]]  # [{"send_notification": {}}, {"export_to_file_source": {...}}]

# Landing pages
landing_uuid: Optional[UUID4]  # workflow landing request UUID
```

**Input Specification** (via `inputs`):
```python
# By workflow input name:
{
  "input_1": {
    "src": "hda",  # or "hdca", "url", "raw_text"
    "id": "encoded_dataset_id"
  }
}

# By step index (if inputs_by contains "step_index"):
{
  "0": {"src": "hda", "id": "..."}
}

# By step UUID (if inputs_by contains "step_uuid"):
{
  "uuid_string": {"src": "hda", "id": "..."}
}
```

**Response**: `WorkflowInvocationResponse` or list of responses (if batch=true)
```json
{
  "id": "invocation_id",
  "workflow_id": "workflow_id",
  "history_id": "history_id",
  "state": "new|ready|scheduled|running|completed|failed|cancelled|paused",
  "update_time": "ISO timestamp",
  "create_time": "ISO timestamp",
  "steps": [],
  "inputs": {},
  "messages": []
}
```

**Errors**:
- Invalid inputs mapping -> RequestParameterInvalidException
- Missing required inputs -> RequestParameterMissingException
- Tool not available -> MissingToolsException
- Invalid tool state -> validation errors in response
- Tool version mismatch (require_exact_tool_versions=true) -> error

**Behavior**:
- Validation occurs immediately (syntax/tool availability)
- Scheduling may defer job creation (lazy scheduling)
- Batch invocation creates multiple invocations (one per input set)
- If `use_cached_job=true`, looks for prior job with identical inputs
- `allow_tool_state_corrections` permits fixing incompatible tool state
- `on_complete` actions trigger when all jobs reach terminal states

---

#### GET /api/invocations
**Summary**: List user's workflow invocations
**Auth**: Required
**Query Params**:
- `workflow_id: Optional[str]` - Filter by workflow
- `history_id: Optional[str]` - Filter by history
- `job_id: Optional[str]` - Filter by job
- `user_id: Optional[str]` - Filter by user (admin only for other users)
- `sort_by: Optional[InvocationSortByEnum]` - Sort by attribute
- `sort_desc: Optional[bool]` - Reverse order
- `include_terminal: Optional[bool]` = True - Include finished invocations
- `limit: Optional[int]` (1-100, default: 20) - Page size
- `offset: Optional[int]` - Pagination offset
- `instance: Optional[bool]` - Fetch by Workflow ID vs StoredWorkflow ID
- `view: Optional[str]` - Serialization view (summary, detailed)
- `step_details: bool` = False - Include step details
- `include_nested_invocations: bool` = True - Include subworkflow invocations

**Response**: List of `WorkflowInvocationResponse` with `total_matches` header
**Behavior**: Returns only user's own invocations (or admin can see others)

---

#### GET /api/workflows/{workflow_id}/invocations
**Alias**: `GET /api/workflows/{workflow_id}/usage` (deprecated)
**Summary**: List invocations of specific workflow
**Auth**: Required (workflow accessibility)
**Query Params**: Same as `GET /api/invocations` plus `workflow_id` is fixed
**Response**: List of invocations for that workflow

---

#### GET /api/invocations/{invocation_id}
**Summary**: Get invocation details
**Auth**: Required (accessibility)
**Query Params**:
- `step_details: bool` = False - Include step-by-step details
- `legacy_job_state: bool` = False - Replace step state with job state (legacy behavior)

**Response**: `WorkflowInvocationResponse` with full details
**Behavior**:
- Legacy_job_state=true produces one step per job (old behavior with collections)
- Step_details=true adds nested `steps` array with full details

---

#### GET /api/workflows/{workflow_id}/invocations/{invocation_id}
**Alias**: `GET /api/workflows/{workflow_id}/usage/{invocation_id}` (deprecated)
**Summary**: Get specific workflow invocation
**Auth**: Required (accessibility)
**Query Params**: Same as single invocation endpoint
**Behavior**: Wrapper that delegates to `GET /api/invocations/{invocation_id}` (workflow_id ignored)

---

#### DELETE /api/invocations/{invocation_id}
**Summary**: Cancel workflow invocation
**Auth**: Required (ownership)
**Status Code**: 200 with `WorkflowInvocationResponse`
**Query Params**: `step_details`, `legacy_job_state`

**Behavior**:
- Sets invocation state to "cancelled"
- Stops running jobs
- Adds cancellation message to invocation

---

#### DELETE /api/workflows/{workflow_id}/invocations/{invocation_id}
**Alias**: `DELETE /api/workflows/{workflow_id}/usage/{invocation_id}` (deprecated)
**Summary**: Cancel workflow invocation (wrapper)
**Behavior**: Delegates to single invocation cancel endpoint

---

### Invocation Step Management

#### GET /api/invocations/steps/{step_id}
**Summary**: Get details of specific invocation step
**Auth**: Required (accessibility)
**Response**: `InvocationStep` with:
- Step state (running, ok, failed, paused, skipped, etc.)
- Job ID(s)
- Tool parameters
- Output dataset IDs
- Action (for paused steps)

---

#### GET /api/invocations/{invocation_id}/steps/{step_id}
**Alias**: Wrapper for single step endpoint (invocation_id ignored)

---

#### GET /api/workflows/{workflow_id}/invocations/{invocation_id}/steps/{step_id}
**Alias**: Wrapper for single step endpoint

---

#### PUT /api/invocations/{invocation_id}/steps/{step_id}
**Summary**: Update invocation step state (e.g., resume from pause)
**Auth**: Required (ownership)
**Request Body**: `InvocationUpdatePayload` with:
- `action: str` - Action to perform (e.g., "resume")

**Response**: Updated `InvocationStep`
**Behavior**: Resumes paused steps, allowing workflow to continue

---

#### PUT /api/workflows/{workflow_id}/invocations/{invocation_id}/steps/{step_id}
**Alias**: Wrapper for single step update

---

### Invocation Reporting & Summaries

#### GET /api/invocations/{invocation_id}/report
**Summary**: Get invocation summary report
**Auth**: Required (accessibility)
**Response**: `InvocationReport` with markdown/JSON summary of execution

**Behavior**: Generates human-readable report of invocation with job states, outputs, etc.

---

#### GET /api/invocations/{invocation_id}/report.pdf
**Summary**: Get invocation report as PDF
**Auth**: Required (accessibility)
**Response**: Binary PDF file with Content-Disposition attachment header

---

#### GET /api/invocations/{invocation_id}/step_jobs_summary
**Summary**: Get job state summary aggregated per step
**Auth**: Public read (job state not protected)
**Response**: List of step/job summary models with state counts

**Behavior**: Aggregates job states for each workflow step

---

#### GET /api/invocations/{invocation_id}/jobs_summary
**Summary**: Get aggregate job state summary across all steps
**Auth**: Public read
**Response**: `InvocationJobsResponse` with total counts per state

---

#### GET /api/invocations/{invocation_id}/metrics
**Summary**: Get workflow job metrics
**Auth**: Required (user context)
**Response**: List of `WorkflowJobMetric` with timing, memory, etc.

---

#### GET /api/invocations/{invocation_id}/completion
**Summary**: Get invocation completion details
**Auth**: Required (accessibility)
**Response**: `WorkflowInvocationCompletionResponse` or null

```json
{
  "completion_time": "ISO timestamp",
  "job_state_summary": {"ok": 5, "error": 0},
  "hooks_executed": []
}
```

**Behavior**: Returns null if invocation not yet completed

---

#### GET /api/invocations/{invocation_id}/request
**Summary**: Get API request that invoked this workflow
**Auth**: Required (accessibility)
**Response**: `WorkflowInvocationRequestModel` - reconstructed request payload

**Behavior**: Recreates the invoke request (may be more specific than original)

---

#### POST /api/invocations/{invocation_id}/error
**Summary**: Report error/bug for invocation
**Auth**: Required (ownership)
**Status Code**: 204 No Content
**Request Body**: `ReportInvocationErrorPayload` with:
- `message: str` - Error description
- Additional error metadata

**Behavior**: Creates bug report associated with invocation (integration with bug tracking)

---

### Invocation Import/Export

#### POST /api/invocations/from_store
**Summary**: Create invocation(s) from model store
**Auth**: Required (user context)
**Request Body**: `CreateInvocationsFromStorePayload` with:
- Store archive (ZIP containing workflow invocation)
- Serialization parameters

**Response**: List of `WorkflowInvocationResponse`

**Behavior**: Restores invocation from exported state (reverse of `prepare_store_download`)

---

#### POST /api/invocations/{invocation_id}/prepare_store_download
**Summary**: Prepare invocation for download/export
**Auth**: Required (accessibility)
**Request Body**: `PrepareStoreDownloadPayload`
**Response**: `AsyncFile` with download URL

**Behavior**: Creates archive of invocation state (datasets, metadata, etc.)

---

#### POST /api/invocations/{invocation_id}/write_store
**Summary**: Export invocation to file source
**Auth**: Required (accessibility)
**Request Body**: `WriteInvocationStoreToPayload` with:
- `target_uri: str` - Destination (gxfiles://, etc.)

**Response**: `AsyncTaskResultSummary` (long-running task)

**Behavior**: Asynchronous export of invocation to remote storage

---

### Landing Page Endpoints

#### POST /api/workflow_landings
**Summary**: Create workflow landing request
**Auth**: Public (CORS enabled)
**Request Body**: `CreateWorkflowLandingRequestPayload` with:
- `url: str` - URL to landing page
- Additional metadata

**Response**: `WorkflowLandingRequest` with UUID

**Behavior**: Creates shared landing page for workflow invocation setup

---

#### GET /api/workflow_landings/{uuid}
**Summary**: Get landing page details
**Auth**: Required (user context)
**Response**: `WorkflowLandingRequest`

---

#### POST /api/workflow_landings/{uuid}/claim
**Summary**: Claim landing page to user
**Auth**: Required (user context)
**Request Body**: Optional `ClaimLandingPayload`
**Response**: Updated `WorkflowLandingRequest`

**Behavior**: Associates landing page with authenticated user

---

### Legacy Endpoints (Deprecated)

#### POST /api/workflows/upload
**Summary**: Import workflow (deprecated in favor of POST /api/workflows)
**Behavior**: Delegates to `__api_import_new_workflow()`

---

#### POST /api/workflows/import
**Summary**: Import shared workflow (deprecated)
**Behavior**: Delegates to `__api_import_shared_workflow()`

---

#### POST /api/workflows/build_module
**Summary**: Build module for workflow editor
**Auth**: Required
**Request Body**: Tool/module specification
**Response**: Module JSON with state, config form, inputs, outputs

**Behavior**: Used by workflow editor to build step modules

---

#### POST /api/workflows/get_tool_predictions
**Summary**: Get predicted tools
**Auth**: Required (user context)
**Request Body**:
- `tool_sequence: str` - Comma-separated tool IDs
- `remote_model_url: str` (optional) - ML model URL

**Response**: Prediction results with scoring

---

## Schema Definitions

### StoredWorkflowDetailed
Complete workflow representation with all metadata and steps

```json
{
  "id": "encoded_id",
  "name": "workflow_name",
  "description": "description",
  "annotation": "markdown",
  "owner": "username",
  "license": "SPDX identifier or null",
  "tags": ["tag1", "tag2"],
  "version": 3,
  "published": false,
  "importable": false,
  "deleted": false,
  "hidden": false,
  "create_time": "ISO timestamp",
  "update_time": "ISO timestamp",
  "steps": {
    "0": {
      "type": "data_input|data_collection_input|parameter_input|tool|subworkflow|pause",
      "name": "step_name",
      "tool_id": "tool_id or null",
      "tool_version": "version",
      "state": {},
      "inputs": {},
      "outputs": {}
    }
  },
  "inputs": {
    "input_name": {
      "name": "input_name",
      "description": "description",
      "type": "data|data_collection|integer|string|float|boolean|color",
      "optional": false,
      "default": null
    }
  },
  "creator": [
    {
      "name": "creator_name",
      "url": "creator_url or null",
      "email": "email or null"
    }
  ],
  "creator_deleted": false,
  "doi": ["doi1", "doi2"],
  "slug": "slug_string or null",
  "readme": "markdown or null",
  "help": "help_text or null",
  "source_metadata": {}
}
```

### WorkflowInvocationResponse
Invocation execution status and results

```json
{
  "id": "invocation_id",
  "workflow_id": "workflow_id",
  "history_id": "history_id",
  "state": "new|ready|scheduled|running|completed|failed|cancelled|paused",
  "create_time": "ISO timestamp",
  "update_time": "ISO timestamp",
  "steps": {
    "0": {
      "id": "step_id",
      "state": "scheduled|queued|running|ok|error|skipped|paused|stopped",
      "job_id": "job_id or null",
      "create_time": "ISO timestamp",
      "update_time": "ISO timestamp",
      "outputs": {
        "output_name": {
          "src": "hda|hdca",
          "id": "dataset_id"
        }
      },
      "inputs": {},
      "action": {}
    }
  },
  "inputs": {
    "0": {
      "src": "hda|hdca|url|raw_text",
      "id": "dataset_id"
    }
  },
  "outputs": {
    "output_name": {
      "src": "hda|hdca",
      "id": "dataset_id"
    }
  },
  "messages": [
    {
      "reason": "error_code",
      "message": "human readable message"
    }
  ]
}
```

---

## Test Coverage Map

### Test Classes & Coverage

**TestWorkflowsApi** (Primary test class)
- Covers ~80% of API endpoints
- Tests CRUD operations
- Tests workflow execution
- Tests sharing and access control
- Tests refactoring and versioning
- Tests complex workflows (nested, conditional, mapped)

**TestWorkflowSharingApi**
- Inherits from SharingApiTests
- Tests publish/unpublish
- Tests share with users
- Tests link access control
- Tests slug management

**TestAdminWorkflowsApi**
- Admin-specific operations
- Tool import/installation
- Bulk operations

**TestCachedWorkflowsApi**
- Tests job caching
- Tests use_cached_job parameter
- Hash validation

### Endpoint Test Coverage

| Endpoint | Test Classes | Count |
|----------|--------------|-------|
| GET /api/workflows | TestWorkflowsApi | test_index* (20+) |
| POST /api/workflows | TestWorkflowsApi | test_upload, test_import*, test_*_import (30+) |
| GET /api/workflows/{id} | TestWorkflowsApi | test_show_* (5) |
| PUT /api/workflows/{id} | TestWorkflowsApi | test_update* (5) |
| DELETE /api/workflows/{id} | TestWorkflowsApi | test_delete, test_other_cannot_delete (2) |
| POST .../invocations | TestWorkflowsApi | test_run_workflow* (50+) |
| GET .../invocations | TestWorkflowsApi | test_workflow_*invocation* (10+) |
| PUT .../refactor | TestWorkflowsApi | test_refactor* (5) |
| Sharing endpoints | TestWorkflowSharingApi | share_test_* (10+) |

---

## Key Patterns & Behaviors

### Workflow Versioning
- Each save of workflow steps/comments increments version counter
- Metadata-only updates (name, annotation, tags) do NOT create new version
- Previous versions remain accessible via `version` query param
- Latest version is default for invocations

### Input Mapping for Invocations
Multiple ways to specify inputs depending on `inputs_by` parameter:
- `"step_id"`: Keyed by workflow step ID
- `"step_index"`: Keyed by step order_index
- `"step_uuid"`: Keyed by step UUID
- `"name"`: Keyed by workflow input name
- Piped: `"step_id|name"` tries step_id first, falls back to name

### Serialization Styles
Different views for different purposes:
- **"export"**: Stable format for import/export (recommended)
- **"instance"**: Current state with step IDs
- **"editor"**: For UI editor consumption
- **"run"**: For workflow execution preview
- **"format2"**: YAML/GXformat2 canonical format

### Tool State Handling
- Tool state stored as JSON blobs in workflow steps
- State normalized/validated on workflow creation/update
- Can be upgraded during refactor operations
- Stale tool state keys are stripped on refactor with --strip flag
- Tool state corrections allowed if `allow_tool_state_corrections=True` on invoke

### Access Control
- `check_security()` method verifies ownership or shared access
- Published workflows accessible by anyone (no auth needed)
- Importable flag controls whether others can import
- Shared workflows visible to specific users
- Admin can see/modify any workflow

### Lazy Scheduling
- Workflow invocation validates immediately
- Job scheduling may defer (lazy evaluation)
- Steps scheduled on-demand or batch
- Supports both eager and lazy scheduling modes

---

## Notable Edge Cases & Validation

1. **Circular Dependencies**: Detected and reported on import/update
2. **Missing Tools**: Workflow marked with errors, can't save unless tools removed
3. **Incompatible Tool State**: Can be corrected if `allow_tool_state_corrections=True`
4. **Exact Version Matching**: `require_exact_tool_versions=True` rejects workflows with version mismatches
5. **Batch Invocations**: Creates multiple invocations when `batch=True`
6. **Deferred Inputs**: URLs can specify inputs without downloading (deferred=true)
7. **Cached Jobs**: `use_cached_job=True` reuses prior jobs with identical inputs
8. **Subworkflow Versioning**: Subworkflows can be external URLs or embedded
9. **Collection Handling**: Complex mapping over collections supported (list, paired, nested)
10. **Resource Parameters**: Workflow can specify preferred object stores and resource requirements

---

## Delegation Architecture

### Request Flow
- **API Controller** receives request -> validates auth/input
- **Service Layer** translates to business logic, handles transaction scope
- **Manager Layer** implements CRUD and access control
- **Contents Manager** handles serialization/deserialization complexity

### Invocation Lifecycle
1. **new**: Just created, input validation pending
2. **ready**: Inputs validated, ready to schedule
3. **scheduled**: Jobs queued
4. **running**: Jobs executing
5. **completed**: All jobs finished (ok or error)
6. **failed**: Unrecoverable error
7. **cancelled**: User cancelled
8. **paused**: Awaiting user action at pause step

### Error Types
- **RequestParameterMissingException**: Missing required parameter
- **RequestParameterInvalidException**: Invalid parameter value/combination
- **ItemAccessibilityException**: User lacks access
- **ItemOwnershipException**: User doesn't own item
- **ObjectNotFound**: Resource doesn't exist
- **MissingToolsException**: Required tools not available
- **AdminRequiredException**: Admin privileges required

## Key Files

| Component | File |
|-----------|------|
| API Controllers | `lib/galaxy/webapps/galaxy/api/workflows.py` |
| API Tests | `lib/galaxy_test/api/test_workflows.py` |
| Schema Models | `lib/galaxy/schema/workflows.py` |
| Workflow Manager | `lib/galaxy/managers/workflows.py` |
| Workflow Service | `lib/galaxy/webapps/galaxy/services/workflows.py` |
| Invocation Service | `lib/galaxy/webapps/galaxy/services/invocations.py` |
| Workflow Modules | `lib/galaxy/workflow/modules.py` |
| ORM Models | `lib/galaxy/model/__init__.py` |
