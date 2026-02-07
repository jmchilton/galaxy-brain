---
type: research
subtype: pr
tags:
  - research/pr
  - galaxy/api
  - galaxy/tools
  - galaxy/tools/yaml
github_pr: 20935
github_repo: galaxyproject/galaxy
component: Tool Request API
status: draft
created: 2026-02-05
revised: 2026-02-05
revision: 1
ai_generated: true
---

# Tool Request API

**Galaxy PR #20935 - Asynchronous Tool Execution API**

## Executive Summary

The Tool Request API introduces a new asynchronous job submission mechanism for Galaxy via `POST /api/jobs`. This replaces the problematic synchronous `POST /api/tools` endpoint that blocks web threads during tool execution, which can take minutes for large collection-based workflows. The new architecture offloads job expansion and creation to Celery workers while providing strongly-typed, Pydantic-validated state transformations at each step.

## Problem Statement

The legacy tool submission process (`POST /api/tools`) has several critical issues:

1. **Blocking Web Threads** - Tool execution happens entirely in the web thread, even when processing could take dozens of minutes (e.g., mapping large collections over tools can create hundreds of thousands of jobs)

2. **Semantic Endpoint Confusion** - `POST /api/tools` creates jobs, not tools, violating REST semantics

3. **Untyped State Dictionaries** - Tool parameters are passed as opaque, mostly unvalidated dictionaries making debugging and documentation difficult

4. **Poor Validation Timing** - Parameter validation happens deep in execution rather than at request time

## Architecture Overview

### API Flow

```
┌─────────────┐     ┌───────────┐     ┌─────────────┐     ┌──────────┐     ┌────────────┐
│ API Request │────▶│ Jobs API  │────▶│ Job Service │────▶│ Database │     │ Task Queue │
└─────────────┘     └───────────┘     └─────────────┘     └──────────┘     └────────────┘
      │                   │                  │                   │                │
      │  HTTP JSON        │    create()      │                   │                │
      │                   │                  │                   │                │
      │                   │     ┌────────────┴───────────┐       │                │
      │                   │     │ If not strict:         │       │                │
      │                   │     │  - Build RelaxedRequest│       │                │
      │                   │     │  - strictify() to      │       │                │
      │                   │     │    RequestToolState    │       │                │
      │                   │     │ If strict:             │       │                │
      │                   │     │  - Build & validate    │       │                │
      │                   │     │    RequestToolState    │       │                │
      │                   │     │ decode() to            │       │                │
      │                   │     │   RequestInternalState │       │                │
      │                   │     └────────────┬───────────┘       │                │
      │                   │                  │                   │                │
      │                   │                  │──────────────────▶│ Serialize      │
      │                   │                  │                   │ ToolRequest    │
      │                   │                  │                   │                │
      │                   │                  │───────────────────┼───────────────▶│
      │                   │                  │                   │  Queue QueueJobs
      │                   │                  │                   │                │
      │◀──────────────────│◀─────────────────│ JobCreateResponse │                │
      │   JSON Response   │                  │                   │                │
```

### Backend Processing (Celery Worker)

```
┌─────────────┐     ┌───────────────┐     ┌────────────────┐     ┌──────────────┐
│ Task Queue  │────▶│ JobSubmitter  │────▶│ Tool.execute() │────▶│ Job Manager  │
└─────────────┘     └───────────────┘     └────────────────┘     └──────────────┘
      │                    │                      │                      │
      │  QueueJobs         │                      │                      │
      │                    │                      │                      │
      │           ┌────────┴────────┐             │                      │
      │           │ Load ToolRequest│             │                      │
      │           │ from Database   │             │                      │
      │           │                 │             │                      │
      │           │ dereference()   │             │                      │
      │           │ URI inputs to   │             │                      │
      │           │ HDAs            │             │                      │
      │           │                 │             │                      │
      │           │ materialize()   │             │                      │
      │           │ deferred data   │             │                      │
      │           └────────┬────────┘             │                      │
      │                    │                      │                      │
      │                    │─────────────────────▶│                      │
      │                    │ handle_input_async() │                      │
      │                    │                      │                      │
      │                    │                      │─────────────────────▶│
      │                    │                      │   Create & queue     │
      │                    │                      │   individual jobs    │
```

## New API Endpoints

### Primary Endpoint

#### `POST /api/jobs`

Creates a tool request and queues job creation asynchronously.

**Request Schema (`JobRequest`):**

```python
class JobRequest:
    tool_id: Optional[str]          # Tool identifier
    tool_uuid: Optional[str]        # Tool UUID (alternative identifier)
    tool_version: Optional[str]     # Specific tool version
    history_id: Optional[str]       # Target history (encoded ID)
    inputs: Optional[dict]          # Tool parameters
    strict: bool = True             # Enable strict validation
    use_cached_jobs: Optional[bool] # Reuse existing job results
    rerun_remap_job_id: Optional[str]
    send_email_notification: bool = False
```

**Response Schema (`JobCreateResponse`):**

```python
class JobCreateResponse:
    tool_request_id: str            # Encoded ID of the ToolRequest
    task_result: AsyncTaskResultSummary  # Celery task tracking info
```

### Supporting Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tool_requests/{id}` | GET | Get tool request details |
| `/api/tool_requests/{id}/state` | GET | Get tool request state |
| `/api/histories/{history_id}/tool_requests` | GET | List tool requests for a history |
| `/api/tools/{tool_id}/inputs` | GET | Get tool input schema |
| `/api/tools/{tool_id}/parameter_request_schema` | GET | JSON Schema for tool request API |
| `/api/tools/{tool_id}/parameter_landing_request_schema` | GET | JSON Schema for landing request API |
| `/api/tools/{tool_id}/parameter_test_case_xml_schema` | GET | JSON Schema for test case construction |

## State Classes and Transformations

The API introduces a hierarchy of strongly-typed state classes with explicit, validated transformations between them.

### State Class Hierarchy

```
                    ToolState (abstract)
                         │
         ┌───────────────┼───────────────────────────────┐
         │               │                               │
         ▼               ▼                               ▼
RelaxedRequestToolState  RequestToolState        WorkflowStepToolState
         │               │                               │
         │  strictify()  │                               ▼
         └──────────────▶│                    WorkflowStepLinkedToolState
                         │  decode()
                         ▼
              RequestInternalToolState
                         │
                         │  dereference()
                         ▼
         RequestInternalDereferencedToolState
                         │
                         │  expand()
                         ▼
                JobInternalToolState
```

### State Representations

| State Class | Representation | Object References | Features |
|-------------|----------------|-------------------|----------|
| `RelaxedRequestToolState` | `relaxed_request` | `{src: "hda", id: <encoded>}` | Allows legacy syntax quirks |
| `RequestToolState` | `request` | `{src: "hda", id: <encoded>}` | Strict validation, map/reduce |
| `RequestInternalToolState` | `request_internal` | `{src: "hda", id: <decoded>}` | Database-ready, allows URI sources |
| `RequestInternalDereferencedToolState` | `request_internal_dereferenced` | `{src: "hda", id: <decoded>}` | All URIs converted to HDAs |
| `JobInternalToolState` | `job_internal` | `{src: "hda", id: <decoded>}` | Mapping expanded, per-job state |
| `TestCaseToolState` | `test_case_xml` | File names and URIs | For test case construction |
| `WorkflowStepToolState` | `workflow_step` | Mixed | Nearly everything optional |
| `WorkflowStepLinkedToolState` | `workflow_step_linked` | With link references | Includes workflow connections |

### Transformation Functions

```python
# API layer (web thread)
strictify(relaxed: RelaxedRequestToolState) -> RequestToolState
decode(request: RequestToolState, decode_id) -> RequestInternalToolState

# Celery worker
dereference(internal: RequestInternalToolState) -> RequestInternalDereferencedToolState
expand(dereferenced: RequestInternalDereferencedToolState) -> list[JobInternalToolState]
```

## Database Models

### ToolRequest

```python
class ToolRequest:
    id: int                        # Primary key
    tool_source_id: int           # FK to ToolSource
    history_id: Optional[int]     # FK to History
    request: dict                 # Serialized RequestInternalToolState
    state: str                    # "new" | "submitted" | "failed"
    state_message: Optional[str]  # Error details if failed

    # Relationships
    tool_source: ToolSource
    history: Optional[History]
    jobs: list[Job]               # Created jobs
    implicit_collections: list[ToolRequestImplicitCollectionAssociation]
```

### ToolRequestState Enum

```python
class ToolRequestState(str, Enum):
    NEW = "new"           # Request created, pending processing
    SUBMITTED = "submitted"  # Jobs created successfully
    FAILED = "failed"     # Processing failed
```

### ToolRequestImplicitCollectionAssociation

Links implicit output collections to their source tool request:

```python
class ToolRequestImplicitCollectionAssociation:
    id: int
    tool_request_id: int
    dataset_collection_id: int
    output_name: str
```

## Celery Task

### `queue_jobs` Task

```python
@galaxy_task(action="queuing up submitted jobs")
def queue_jobs(request: QueueJobs, app: MinimalManagerApp, job_submitter: JobSubmitter):
    tool = cached_create_tool_from_representation(
        app=app,
        raw_tool_source=request.tool_source.raw_tool_source,
        tool_dir=request.tool_source.tool_dir,
        tool_source_class=request.tool_source.tool_source_class,
    )
    job_submitter.queue_jobs(tool, request)
```

### QueueJobs Task Request

```python
class QueueJobs:
    tool_source: ToolSource        # Serialized tool definition
    tool_request_id: int          # Reference to persisted request
    user: RequestUser             # User context for job creation
    use_cached_jobs: bool         # Enable job caching
    rerun_remap_job_id: Optional[int]  # For reruns
```

## JobSubmitter Processing

The `JobSubmitter` class handles the asynchronous job creation:

```python
class JobSubmitter:
    def queue_jobs(self, tool: Tool, request: QueueJobs) -> None:
        tool_request = self._tool_request(request.tool_request_id)
        request_context = self._context(tool_request, request)

        # 1. Dereference URI inputs to HDAs
        tool_state, new_hdas = self.dereference(request_context, tool, request, tool_request)

        # 2. Materialize deferred datasets
        for hda_pair in [p for p in new_hdas if not p.request.deferred]:
            self.hda_manager.materialize(...)

        # 3. Execute tool (creates jobs)
        tool.handle_input_async(
            request_context,
            tool_request,
            tool_state,
            history=target_history,
            use_cached_job=use_cached_jobs,
            rerun_remap_job_id=rerun_remap_job_id,
        )

        # 4. Update request state
        tool_request.state = ToolRequest.states.SUBMITTED
```

## Strict vs Relaxed Mode

The API supports two validation modes:

### Strict Mode (default, `strict=True`)

- Full Pydantic validation of inputs
- No legacy behavior accommodations
- Cleaner, more predictable validation errors

### Relaxed Mode (`strict=False`)

- Preserves some legacy behavior for backwards compatibility
- Examples:
  - Empty string defaults for non-optional text inputs
  - Conversion of explicit `None` to empty string for non-optional text
  - More lenient conditional/repeat initialization

```python
# Relaxed mode processing
if not strict:
    relaxed_request_state = RelaxedRequestToolState(inputs)
    relaxed_request_state.validate(tool)
    request_state = strictify(relaxed_request_state, tool)
else:
    request_state = RequestToolState(inputs)
```

## Benefits

1. **Non-Blocking Web Requests** - Tool execution no longer blocks web threads; immediate response with tracking ID

2. **Correct REST Semantics** - `POST /api/jobs` creates jobs, `POST /api/tools` reserved for tool management

3. **Strong Typing Throughout** - Pydantic models validate state at each transformation step

4. **Self-Documenting** - JSON Schema endpoints describe valid inputs for any tool

5. **Better Error Messages** - Validation errors pinpoint exact parameter issues early

6. **Scalable** - Job creation distributed across Celery workers

7. **Traceable** - ToolRequest provides audit trail linking requests to created jobs

## Testing

The PR includes comprehensive testing:

- `test/functional/test_toolbox_pytest.py` - Framework tool tests
- `lib/galaxy_test/api/test_tool_execute.py` - Existing tests adapted
- `lib/galaxy_test/api/test_tool_execution.py` - New async API tests

Test matrix includes both legacy and new API paths via `GALAXY_TEST_USE_LEGACY_TOOL_API` environment variable (`if_needed` | `always`).

## Migration Path

The legacy `POST /api/tools` endpoint remains functional. Applications can migrate to `POST /api/jobs` incrementally:

1. Update client to handle async response pattern
2. Poll `/api/tool_requests/{id}/state` for completion
3. Retrieve job IDs from `/api/tool_requests/{id}`

## Future Work

As noted in the PR, this forms the backend foundation for:

- Workflow transformation using these state models
- Tool form adaptation to use the new API
- Enhanced linting using the Pydantic models
