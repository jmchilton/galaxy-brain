---
type: research
subtype: component
tags:
  - research/component
  - galaxy/workflows
  - galaxy/api
  - galaxy/models
  - galaxy/lib
status: draft
created: 2026-02-19
revised: 2026-02-19
revision: 1
ai_generated: true
component: Workflow Import
galaxy_areas: [api, workflows, lib, models]
---

# Galaxy Workflow Import: Component Architecture

A deep-dive into the full request-to-database stack for importing workflows into Galaxy.

## Architectural Overview

Galaxy follows a layered architecture for workflow imports:

```
HTTP Request
  │
  ▼
┌──────────────────────────────────────────┐
│  API Controller (WSGI)                   │
│  WorkflowsAPIController.create()         │
│  lib/galaxy/webapps/galaxy/api/           │
│  workflows.py                            │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  Manager Layer                           │
│  WorkflowContentsManager                 │
│  lib/galaxy/managers/workflows.py        │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Format Normalization               │  │
│  │ (gxformat2 ↔ Galaxy JSON)         │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │ Workflow Construction              │  │
│  │ (Steps, Modules, Connections)      │  │
│  └────────────────────────────────────┘  │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  Module System                           │
│  WorkflowModuleFactory                   │
│  lib/galaxy/workflow/modules.py          │
│                                          │
│  ToolModule, SubWorkflowModule,          │
│  InputDataModule, PauseModule, ...       │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  ORM Model Layer (SQLAlchemy)            │
│  StoredWorkflow → Workflow → WorkflowStep│
│  lib/galaxy/model/__init__.py            │
└──────────────┬───────────────────────────┘
               │
               ▼
           Database
```

The service layer (`WorkflowsService` in `lib/galaxy/webapps/galaxy/services/workflows.py`) exists but workflow import logic bypasses it — the controller talks directly to the managers. This is a known architectural wrinkle; the service layer is more active for invocation and refactoring operations.

## Layer 1: API Controller

**File:** `lib/galaxy/webapps/galaxy/api/workflows.py`

### Class Hierarchy

```python
class WorkflowsAPIController(
    BaseGalaxyAPIController,
    UsesStoredWorkflowMixin,    # shared workflow CRUD helpers
    UsesAnnotations,            # annotation helpers
    SharableMixin,              # sharing/publishing helpers
    ServesExportStores,         # model store export
    ConsumesModelStores,        # model store import
):
    service: WorkflowsService = depends(WorkflowsService)
```

The controller gets its manager references via the app singleton at `__init__` time:

```python
def __init__(self, app: StructuredApp):
    self.workflow_manager = app.workflow_manager           # WorkflowsManager
    self.workflow_contents_manager = app.workflow_contents_manager  # WorkflowContentsManager
```

These are registered as singletons during app startup in `lib/galaxy/app.py`:

```python
self.workflow_manager = self._register_singleton(WorkflowsManager)
self.workflow_contents_manager = self._register_singleton(WorkflowContentsManager)
```

### The `POST /api/workflows` Endpoint

**Line 196** — `create()` is the single endpoint handling all workflow creation methods. It enforces exactly-one-of six mutually exclusive payload parameters:

| Parameter | Import Method |
|-----------|--------------|
| `archive_source` | URL, TRS URL, or `file://` path |
| `archive_file` | Uploaded file |
| `from_history_id` | Extract workflow from execution history |
| `from_path` | Server filesystem path (admin only) |
| `shared_workflow_id` | Copy another user's shared workflow |
| `workflow` | Direct JSON/dict payload |

Validation (line 228-237):
- Bootstrap admin users are rejected (real user required)
- Exactly one creation method must be present
- `validate_uri_access()` checks URL safety for `archive_source`

### Import Dispatch Logic

The `create()` method routes to internal helpers based on which parameter is present:

**`archive_source` / `archive_file`** → Two sub-paths:

1. **TRS import** (`archive_source == "trs_tool"`): Delegates directly to `WorkflowContentsManager.get_or_create_workflow_from_trs()` which handles TRS resolution and deduplication.

2. **URL import**: Streams the URL content via `stream_url_to_str()`, then calls `__api_import_from_archive()`.

3. **File upload**: Reads the uploaded file content, calls `__api_import_from_archive()`.

4. **`file://` scheme**: Rewrites as a `from_path` payload and delegates to `__api_import_new_workflow()`.

**`from_history_id`** → Calls `extract_workflow()` from `lib/galaxy/workflow/extract.py` (a separate code path that builds a workflow by analyzing job execution history).

**`from_path`** → Rewrites payload to `{"src": "from_path", "path": ...}` and calls `__api_import_new_workflow()`.

**`shared_workflow_id`** → Calls `__api_import_shared_workflow()` which copies an existing workflow via the `UsesStoredWorkflowMixin._import_shared_workflow()` method.

**`workflow`** → Direct JSON payload, calls `__api_import_new_workflow()`.

### Controller Helper Methods

**`__api_import_from_archive()`** (line 586):
Parses archive data (tries JSON first, falls back to YAML if `GalaxyWorkflow` marker present), normalizes format, and calls `_workflow_from_dict()`.

**`__api_import_new_workflow()`** (line 623):
Takes the `workflow` dict from the payload, normalizes, creates, returns encoded workflow dict with annotations, URL, owner, step count.

**`_workflow_from_dict()`** (line 680):
The convergence point for most import paths. Orchestrates:
1. Validates publish/importable compatibility
2. Calls `WorkflowContentsManager.build_workflow_from_raw_description()`
3. Makes workflow accessible if importable
4. Optionally triggers tool installation via `_import_tools_if_needed()`

**`_import_tools_if_needed()`** (line 705):
Admin-only. Extracts `tool_shed_repository` metadata from step dicts and uses `InstallRepositoryManager` to install missing tools from the Tool Shed.

### Response Format

**`__api_import_response()`** (line 604) returns:
```json
{
  "message": "Workflow 'name' imported successfully.",
  "status": "success",
  "id": "<encoded_stored_workflow_id>"
}
```

Status degrades to `"error"` if the workflow `has_errors`, has zero steps, or `has_cycles`.

### Legacy/Deprecated Endpoints

- `POST /api/workflows/upload` (line 374) — deprecated, maps to `__api_import_new_workflow()`
- `POST /api/workflows/import` (line 647) — deprecated, imports shared workflows

There is also a WSGI UI controller at `lib/galaxy/webapps/galaxy/controllers/workflow.py` with an `imp()` method for the web UI import flow.

## Layer 2: Manager — WorkflowContentsManager

**File:** `lib/galaxy/managers/workflows.py`, line 593

This is the core business logic layer for workflow content manipulation. It is distinct from `WorkflowsManager` (line 151) which handles CRUD/sharing/access control on `StoredWorkflow` objects.

```python
class WorkflowContentsManager(UsesAnnotations):
    def __init__(self, app: MinimalManagerApp, trs_proxy: TrsProxy):
        self.app = app
        self.trs_proxy = trs_proxy
```

### Format Normalization

**`normalize_workflow_format()`** (line 620):

All incoming workflow descriptions pass through this method. Its job is to convert any supported format into Galaxy's internal JSON representation.

```
Input formats:
  ├── Galaxy native JSON (.ga) → passed through unchanged
  ├── Format2 YAML (class: GalaxyWorkflow) → converted via gxformat2
  ├── CWL $graph documents → resolved via artifact_class()
  └── File path references (src: from_path) → loaded from disk (admin only)

Output: RawWorkflowDescription(as_dict, workflow_path)
```

**Format detection** is handled by `artifact_class()` in `lib/galaxy/managers/executables.py`. It checks:
1. `src == "from_path"` — loads YAML from filesystem (admin-gated)
2. `class` field — e.g. `"GalaxyWorkflow"` indicates Format2
3. `$graph` field — CWL packed workflow format, resolves by `object_id`

**Format2 conversion** uses the `gxformat2` library:
```python
from gxformat2 import python_to_workflow, ImporterGalaxyInterface, ImportOptions

galaxy_interface = Format2ConverterGalaxyInterface()
import_options = ImportOptions()
import_options.deduplicate_subworkflows = True
as_dict = python_to_workflow(as_dict, galaxy_interface,
                             workflow_directory=workflow_directory,
                             import_options=import_options)
```

`Format2ConverterGalaxyInterface` (line 2273) is a minimal implementation of gxformat2's `ImporterGalaxyInterface` — its `import_workflow()` raises `NotImplementedError`, meaning nested Format2 subworkflow imports must go through the standard Galaxy path.

### Workflow Construction

**`build_workflow_from_raw_description()`** (line 653):

This is the primary public entry point. It:
1. Sets `trans.workflow_building_mode = ENABLED`
2. Appends `(imported from <source>)` to the workflow name
3. Calls `_workflow_from_raw_description()` to build the transient model
4. Creates and wires up `StoredWorkflow` ↔ `Workflow`
5. Applies annotations and tags
6. Persists to database via `trans.sa_session.add()` + `commit()`
7. Returns `CreatedWorkflow(stored_workflow, workflow, missing_tools)`

**`_workflow_from_raw_description()`** (line 784):

The core construction method. This is ~130 lines of orchestration:

**Phase 1 — Workflow model creation:**
```python
workflow = model.Workflow()
workflow.name = name
workflow.reports_config = data.get("report")
workflow.license = data.get("license")
workflow.creator_metadata = data.get("creator")
workflow.logo_url = data.get("logo_url")
workflow.doi = data.get("doi")  # validated
workflow.help = data.get("help")
workflow.readme = data.get("readme")
```

**Phase 2 — Source metadata tracking:**
If imported from TRS or URL, records provenance:
```python
workflow.source_metadata = {
    "trs_tool_id": ...,
    "trs_version_id": ...,
    "trs_server": ...,
    "trs_url": ...
}
# or for URL imports:
workflow.source_metadata = {"url": archive_source}
```

**Phase 3 — Subworkflow preloading:**
If the workflow dict contains a top-level `"subworkflows"` map, these are recursively built first and stored in `subworkflow_id_map` for later reference by steps.

**Phase 4 — Step iteration (two passes):**

*First pass* — subworkflow resolution:
```python
for step_dict in self.__walk_step_dicts(data):
    self.__load_subworkflows(trans, step_dict, subworkflow_id_map, ...)
```

*Second pass* — module and step creation:
```python
for step_dict in self.__walk_step_dicts(data):
    module, step = self.__module_from_dict(trans, steps, steps_by_external_id, step_dict, **module_kwds)
    if isinstance(module, ToolModule) and module.tool is None:
        missing_tool_tups.append(...)
```

**Phase 5 — Connection wiring:**
```python
self.__connect_workflow_steps(steps, steps_by_external_id, dry_run)
```

**Phase 6 — Comment processing:**
WorkflowComment objects are created and parent-child relationships established between comments and steps.

**Phase 7 — Step ordering:**
```python
if not is_subworkflow:
    attach_ordered_steps(workflow)
```

### Key Helper Methods

**`__walk_step_dicts()`** (line 1781):
Iterates through `data["steps"]` in order. Handles both dict-keyed and list-keyed step formats. Assigns discovery output UUIDs.

**`__module_from_dict()`** (line 1852):
Creates a `WorkflowStep` model and its corresponding `WorkflowModule`:
```python
step = model.WorkflowStep()
step.position = step_dict.get("position")
step.uuid = step_dict.get("uuid")
step.label = step_dict.get("label")

module = module_factory.from_dict(trans, step_dict, **kwds)
module.save_to_step(step)
```
Also processes: annotations, when-expressions, workflow outputs, and stores `temp_input_connections` on the step for the connection pass.

**`__connect_workflow_steps()`** (line 1978):
Second pass — creates `WorkflowStepConnection` objects linking steps:
```python
for input_name, conn_list in step.temp_input_connections.items():
    for conn_dict in conn_list:
        output_step = steps_by_external_id[conn_dict["id"]]
        step.add_connection(input_name, conn_dict["output_name"], output_step, ...)
```

**`__load_subworkflow_from_step_dict()`** (line 1938):
Resolves subworkflow for a step from one of three sources:
1. Embedded `"subworkflow"` dict in the step → recursively built
2. `"content_id"` referencing `subworkflow_id_map` → locally resolved
3. `"content_id"` as a stored workflow ID → loaded from database

**`__build_embedded_subworkflow()`** (line 1967):
Recursive call back to `build_workflow_from_raw_description()` with `hidden=True, is_subworkflow=True`.

### TRS Integration

**`get_or_create_workflow_from_trs()`** (line 2086):
Deduplication-aware import. Checks if a workflow with the same `trs_id` and `trs_version` already exists for this user before fetching.

**`create_workflow_from_trs_url()`** (line 2109):
Fetches from TRS, parses YAML, normalizes format, builds workflow with TRS source metadata.

**TrsProxy** (`lib/galaxy/workflow/trs_proxy.py`):
Handles GA4GH TRS v2 protocol:
- Parses TRS URLs via regex: `https://<server>/ga4gh/trs/v2/tools/<tool_id>/versions/<version_id>`
- Fetches `GALAXY` type descriptors
- Default server: Dockstore (`dockstore.org`)

## Layer 3: Module System

**File:** `lib/galaxy/workflow/modules.py`

### WorkflowModuleFactory

The factory pattern dispatches step creation by type:

```python
module_types = {
    "data_input":            InputDataModule,
    "data_collection_input": InputDataCollectionModule,
    "parameter_input":       InputParameterModule,
    "pause":                 PauseModule,
    "tool":                  ToolModule,
    "subworkflow":           SubWorkflowModule,
}
module_factory = WorkflowModuleFactory(module_types)
```

Each module class implements:
- `from_dict(trans, d, **kwargs)` — creates module from step dict during import
- `from_workflow_step(trans, step, **kwargs)` — creates from ORM object
- `save_to_step(step)` — persists module state into WorkflowStep

### ToolModule Resolution

When `ToolModule.from_dict()` processes a step dict:
1. Extracts `content_id` / `tool_id`, `tool_version`, `tool_uuid`
2. If no tool_id/uuid but a `tool_representation` exists → creates a dynamic tool (admin only)
3. Attempts to resolve the tool from the local toolbox
4. If tool not found → `module.tool = None`, tracked as missing
5. If version mismatch → records version_changes message

### SubWorkflowModule Resolution

`SubWorkflowModule.from_dict()` resolves from:
- `"subworkflow"` key in dict → already-built model object (set by `__load_subworkflows`)
- `"content_id"` → fetches owned workflow from database

## Layer 4: ORM Models

**File:** `lib/galaxy/model/__init__.py`

### Entity Relationship

```
StoredWorkflow (line 8324)
  │  User-owned wrapper. Tags, annotations, sharing, published/importable flags.
  │  Table: stored_workflow
  │
  ├─── workflows: [Workflow]          (all revisions)
  └─── latest_workflow: Workflow       (current revision)
         │
         │  Workflow (line 8507)
         │  A specific revision. Name, UUID, license, DOI, source_metadata,
         │  reports_config, creator_metadata, readme, help, logo_url.
         │  Table: workflow
         │
         ├─── steps: [WorkflowStep]    (eager loaded, cascade delete)
         │      │
         │      │  WorkflowStep (line 8730)
         │      │  type, tool_id, tool_version, tool_inputs (JSON), position (JSON),
         │      │  order_index, label, uuid, when_expression, config (JSON)
         │      │  Table: workflow_step
         │      │
         │      ├─── inputs: [WorkflowStepInput]
         │      │      │  name, merge_type, scatter_type, default_value,
         │      │      │  value_from, runtime_value
         │      │      │  Table: workflow_step_input
         │      │      │
         │      │      └─── connections: [WorkflowStepConnection]
         │      │             output_step_id, output_name,
         │      │             input_subworkflow_step_id
         │      │             Table: workflow_step_connection
         │      │
         │      ├─── workflow_outputs: [WorkflowOutput]
         │      │      output_name, label, uuid
         │      │      Table: workflow_output
         │      │
         │      ├─── post_job_actions: [PostJobAction]
         │      ├─── subworkflow: Workflow (optional, for subworkflow steps)
         │      ├─── dynamic_tool: DynamicTool (optional)
         │      ├─── tags, annotations
         │      └─── parent_comment: WorkflowComment (optional)
         │
         └─── comments: [WorkflowComment]
```

### Key Model Details

**StoredWorkflow** — the user-facing entity. Owns `name`, `slug`, `published`, `importable`, `deleted`, `hidden`, `from_path` (set when imported from a filesystem path). Has sharing associations (`StoredWorkflowUserShareAssociation`) and menu entries.

**Workflow** — a specific revision of a StoredWorkflow. A StoredWorkflow can have many Workflow revisions; `latest_workflow` points to the current one. Carries the bulk of the metadata: `source_metadata` (JSON, tracks TRS/URL provenance), `reports_config`, `creator_metadata`, `license`, `doi`, `readme`, `help`, `logo_url`.

**WorkflowStep** — a node in the DAG. The `type` field determines behavior:
- `"tool"` — references `tool_id`, `tool_version`; `tool_inputs` holds serialized state as JSON
- `"subworkflow"` — references another `Workflow` via `subworkflow_id`
- `"data_input"`, `"data_collection_input"`, `"parameter_input"` — workflow inputs
- `"pause"` — human-intervention pause point

**WorkflowStepConnection** — an edge in the DAG. Links a source step's named output to a target step's named input. Special constant `NON_DATA_CONNECTION = "__NO_INPUT_OUTPUT_NAME__"` for non-data dependencies. The `input_subworkflow_step_id` field routes connections into subworkflow internals.

## Configuration & Options

### WorkflowStateResolutionOptions (line 2197)

Base pydantic model controlling how tool state is resolved during import:

| Field | Default | Purpose |
|-------|---------|---------|
| `fill_defaults` | `False` | Fill missing tool state with tool defaults |
| `from_tool_form` | `False` | Expect form-generated state vs simpler JSON |
| `exact_tools` | `True` | Require exact tool version match |

### WorkflowCreateOptions (line 2217)

Extends `WorkflowStateResolutionOptions`:

| Field | Default | Purpose |
|-------|---------|---------|
| `import_tools` | `False` | Auto-install tools from Tool Shed |
| `publish` | `False` | Make workflow published |
| `importable` | `None` | Make workflow importable (defaults to `publish`) |
| `archive_source` | `None` | Source identifier for provenance |
| `trs_tool_id` | `None` | TRS tool ID |
| `trs_version_id` | `None` | TRS version ID |
| `trs_server` | `None` | TRS server identifier |
| `trs_url` | `None` | Full TRS URL |
| `install_*` | `False` | Tool Shed install options |
| `tool_panel_section_*` | `""` | Where to place installed tools in the panel |

## Supported Workflow Formats

### Galaxy Native JSON (.ga)

The canonical format. A JSON document with top-level keys:
- `name`, `annotation`, `tags`, `uuid`
- `steps` — dict keyed by string step IDs, each containing `type`, `tool_id`, `tool_version`, `tool_state`, `position`, `input_connections`, `workflow_outputs`, `post_job_actions`
- `subworkflows` — optional map of locally-defined subworkflow dicts
- Metadata: `report`, `license`, `creator`, `logo_url`, `doi`, `help`, `readme`

### Format2 (gxformat2 YAML)

A YAML-based format designed for human readability. Detected by `class: GalaxyWorkflow` marker or `yaml_content` key. Converted to native JSON via `gxformat2.python_to_workflow()` before processing.

### CWL $graph

Packed CWL documents with a `$graph` key. The `artifact_class()` function resolves the target object by `object_id` (defaults to `"main"`).

## Complete Import Flow (Happy Path)

```
1. POST /api/workflows  { "workflow": { ... } }
   │
2. WorkflowsAPIController.create()
   │  Validates exactly one creation method
   │
3. __api_import_new_workflow()
   │
4. __normalize_workflow() → WorkflowContentsManager.normalize_workflow_format()
   │  ├── artifact_class() detects format
   │  ├── Format2? → gxformat2.python_to_workflow()
   │  └── Returns RawWorkflowDescription
   │
5. _workflow_from_dict()
   │  ├── Validates publish/importable
   │  │
   │  ├── WorkflowContentsManager.build_workflow_from_raw_description()
   │  │     │
   │  │     ├── _workflow_from_raw_description()
   │  │     │     ├── Create Workflow() model, set metadata
   │  │     │     ├── Record source_metadata (TRS/URL provenance)
   │  │     │     ├── Preload subworkflows (recursive)
   │  │     │     ├── Pass 1: Load subworkflows for each step
   │  │     │     ├── Pass 2: Create modules and steps
   │  │     │     │     └── module_factory.from_dict() → type-specific Module
   │  │     │     │         └── Module.save_to_step(step)
   │  │     │     ├── Pass 3: Connect steps (WorkflowStepConnection)
   │  │     │     ├── Process comments
   │  │     │     └── attach_ordered_steps()
   │  │     │
   │  │     ├── Create StoredWorkflow(), wire to Workflow
   │  │     ├── Set annotations and tags
   │  │     ├── sa_session.add() + commit()
   │  │     └── Return CreatedWorkflow
   │  │
   │  ├── Make importable if requested
   │  └── Install tools if requested (admin only)
   │
6. Return encoded workflow dict to client
```

## File Index

| Component | File | Key Lines |
|-----------|------|-----------|
| API Controller | `lib/galaxy/webapps/galaxy/api/workflows.py` | 140-742 |
| WSGI UI Controller | `lib/galaxy/webapps/galaxy/controllers/workflow.py` | 30-180 |
| Service Layer | `lib/galaxy/webapps/galaxy/services/workflows.py` | 50-294 |
| WorkflowsManager | `lib/galaxy/managers/workflows.py` | 151-580 |
| WorkflowContentsManager | `lib/galaxy/managers/workflows.py` | 593-2180 |
| Options Models | `lib/galaxy/managers/workflows.py` | 2197-2259 |
| Format Detection | `lib/galaxy/managers/executables.py` | 14-46 |
| Module Factory | `lib/galaxy/workflow/modules.py` | 2635-2666 |
| ToolModule | `lib/galaxy/workflow/modules.py` | ~1917-1985 |
| SubWorkflowModule | `lib/galaxy/workflow/modules.py` | ~670-700 |
| TRS Proxy | `lib/galaxy/workflow/trs_proxy.py` | 61-100 |
| Workflow Extraction | `lib/galaxy/workflow/extract.py` | 34+ |
| StoredWorkflow Model | `lib/galaxy/model/__init__.py` | 8324-8503 |
| Workflow Model | `lib/galaxy/model/__init__.py` | 8507-8725 |
| WorkflowStep Model | `lib/galaxy/model/__init__.py` | 8730-8969 |
| WorkflowStepInput | `lib/galaxy/model/__init__.py` | 9059-9107 |
| WorkflowStepConnection | `lib/galaxy/model/__init__.py` | 9109-9158 |
| WorkflowOutput | `lib/galaxy/model/__init__.py` | 9165-9198 |
| Pydantic Schemas | `lib/galaxy/schema/schema.py` | 2410-2568 |
| Workflow Schemas | `lib/galaxy/schema/workflows.py` | 109-298 |
| App Wiring | `lib/galaxy/app.py` | 637-638 |
| Controller Mixin | `lib/galaxy/webapps/base/controller.py` | 582+ |

## Architectural Notes

1. **No FastAPI for imports yet.** The `create()` endpoint uses the WSGI `@expose_api` decorator, not FastAPI routes. The controller inherits from `BaseGalaxyAPIController` (WSGI-based). FastAPI migration for this endpoint has not happened.

2. **Service layer bypass.** Import logic lives in the controller and manager, skipping the service layer. The `WorkflowsService` class handles invocation and refactoring but not import.

3. **Two managers, one concern.** `WorkflowsManager` handles StoredWorkflow CRUD (access control, sharing, listing). `WorkflowContentsManager` handles the content — building, updating, exporting workflow internals. Both are registered as app singletons.

4. **Module system as strategy pattern.** The `WorkflowModuleFactory` + per-type `WorkflowModule` subclasses isolate step-type-specific logic from the general construction flow. Adding a new step type means adding a module class and registering it in `module_types`.

5. **Recursive subworkflows.** Subworkflow import is recursive — `__build_embedded_subworkflow()` calls back to `build_workflow_from_raw_description()` with `is_subworkflow=True, hidden=True`. This creates separate `StoredWorkflow` + `Workflow` records for each embedded subworkflow.

6. **Format normalization as gateway.** All format diversity is collapsed to Galaxy native JSON before the construction pipeline. The `gxformat2` library handles Format2→native conversion. CWL `$graph` documents are resolved to their target object. After normalization, the rest of the stack works with a single format.

7. **Missing tools are warnings, not errors.** Workflows can be imported even when referenced tools aren't installed locally. Missing tools are tracked as tuples `(tool_id, name, version, step_id)` and optionally trigger Tool Shed installation if `import_tools=True` (admin-only).
