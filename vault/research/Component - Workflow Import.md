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
revised: 2026-10-30
revision: 6
ai_generated: true
component: Workflow Import
galaxy_areas: [api, workflows, lib, models]
summary: "HTTP to database stack for workflow import, including embedded tool creation, session ordering and commit points"
sources:
  - "vault/agents/gx_research/archive/workflow_import_embedded_tools.md"
related_prs:
  - 24475
related_notes:
  - "[[Component - User-Defined Tools]]"
  - "[[Component - Workflow Refactoring API]]"
  - "[[Component - CWL Workflow State]]"
  - "[[Component - Format2 Workflows (gxformat2)]]"
  - "[[Component - Workflow API]]"
  - "[[Component - Workflow Format (.ga)]]"
  - "[[Component - gxformat2 Parsing and Syntax]]"
  - "[[PR 21335 - GA4GH WES API]]"
  - "[[Component - Dynamic Tool Manager and Toolbox Lifecycle]]"
  - "[[Component - YAML Tool Parser and Authoring Model Boundary]]"
---

# Galaxy Workflow Import: Component Architecture

A deep-dive into the full request-to-database stack for importing workflows into Galaxy.

Revision 5 adds [Embedded Tools](#embedded-tools-tool_representation) and [Session Ordering and Commit Points](#session-ordering-and-commit-points), and rewrites the construction phases and ToolModule resolution. These parts are verified against Galaxy `origin/dev` @ `65e6daff2334c8cfd4971682eecfb87f38a224be`, and all `file:line` references in them are at that SHA. `release_26.1` behaves the same, because [#24475](https://github.com/galaxyproject/galaxy/pull/24475) merged there and forward to dev. Line numbers in the other sections come from an earlier revision and may have drifted.

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

**`build_workflow_from_raw_description()`** (`lib/galaxy/managers/workflows.py:895-960`):

This is the primary public entry point. It:
1. Sets `trans.workflow_building_mode = ENABLED`
2. Appends `(imported from <source>)` to the workflow name
3. Calls `_workflow_from_raw_description()` to build the transient model
4. Creates and wires up `StoredWorkflow` ↔ `Workflow`
5. Applies annotations and tags. `set_tags_from_list` uses its default `flush=True`, so tagging commits (`:946`)
6. Persists to database via `trans.sa_session.add()` + `commit()` (`:958`)
7. Returns `CreatedWorkflow(stored_workflow, workflow, missing_tools)`

**`_workflow_from_raw_description()`** (`:1042-1187`):

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

**Phase 3 — Subworkflow preloading (`:1108-1116`):**
If the workflow dict contains a top-level `"subworkflows"` map, these are recursively built first and stored in `subworkflow_id_map` for later reference by steps. Each build is a full `build_workflow_from_raw_description(..., hidden=True, is_subworkflow=True)` and commits. The preload does not check `dry_run`.

**Phase 4 — Step iteration (two passes):**

*First pass (`:1122-1135`)* resolves everything that commits, before any step object exists:
```python
for step_dict in self.__walk_step_dicts(data):
    if not dry_run:
        self.__load_subworkflows(trans, step_dict, subworkflow_id_map, ...)
    if step_dict.get("type") == "tool" and step_dict.get("tool_representation"):
        # Creating embedded tools commits the session. Resolve them before
        # outputs or post-job actions add partially built steps to it.
        step_dict["tool_uuid"] = ToolModule.resolve_tool_uuid(trans, step_dict)
```

*Second pass (`:1137-1146`)* creates modules and steps:
```python
for step_dict in self.__walk_step_dicts(data):
    module, step = self.__module_from_dict(trans, steps, steps_by_external_id, step_dict, **module_kwds)
    if isinstance(module, ToolModule) and module.tool is None:
        missing_tool_tups.append(...)
```

See [Session Ordering and Commit Points](#session-ordering-and-commit-points) for why the first pass must finish before the second starts.

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

**`__walk_step_dicts()`** (`:2148-2207`):
Iterates through `data["steps"]` in order. Handles both dict-keyed and list-keyed step formats. Assigns discovery output UUIDs.

**`__module_from_dict()`** (`:2230-2325`):
Creates a `WorkflowStep` model and its corresponding `WorkflowModule`:
```python
step = model.WorkflowStep()
step.position = step_dict.get("position")
step.uuid = step_dict.get("uuid")
step.label = step_dict.get("label")

module = module_factory.from_dict(trans, step_dict, **kwds)
module.save_to_step(step)
```
Also processes: annotations, when-expressions, workflow outputs, and stores `temp_input_connections` on the step for the connection pass. Outside a dry run, each `WorkflowOutput` is added to the session (`:2299-2300`), and `ToolModule.save_to_step` adds each PJA (`lib/galaxy/workflow/modules.py:2839-2842`). Either one cascades the still-unattached step into the session. In a dry run the step and its children are expunged instead (`:2318-2323`).

**`__connect_workflow_steps()`** (`:2498-2533`):
Second pass — creates `WorkflowStepConnection` objects linking steps:
```python
for input_name, conn_list in step.temp_input_connections.items():
    for conn_dict in conn_list:
        output_step = steps_by_external_id[conn_dict["id"]]
        step.add_connection(input_name, conn_dict["output_name"], output_step, ...)
```

**`__load_subworkflow_from_step_dict()`** (`:2327-2381`):
Resolves the subworkflow for a step from one of these sources:
1. Embedded `"subworkflow"` dict in the step → recursively built (commits)
2. `content_source: url` / `trs_url` / `trs_id`, or a bare URL `content_id` → fetched and recursively built (commits)
3. `"content_id"` starting `#` or `$` and referencing `subworkflow_id_map` → locally resolved
4. `"content_id"` as a stored workflow ID → `get_owned_workflow`, no commit

Sources 1-3 `assert not dry_run`. The caller skips this whole method in dry runs, so the asserts never fire.

**`__build_embedded_subworkflow()`** (`:2472-2496`):
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

When `ToolModule.from_dict()` (`lib/galaxy/workflow/modules.py:2731-2775`) processes a step dict:
1. Extracts `content_id` / `tool_id` and `tool_version`. `tool_version: latest` drops the version and switches to non-exact lookup.
2. Gets the uuid from `ToolModule.resolve_tool_uuid` (`:2708-2730`), which may create an embedded tool. During import the first pass has already called it and written the uuid back into `step_dict`, so this second call only resolves. See [Embedded Tools](#embedded-tools-tool_representation).
3. Builds the module. `ToolModule.__init__` (`:2664-2700`) looks up `get_unprivileged_tool_or_none(user, tool_uuid)` first, then `toolbox.get_tool(tool_id, tool_version, exact, tool_uuid)`.
4. If tool not found → `module.tool = None`, tracked as missing
5. A step without `tool_representation` that names a user-defined tool by `tool_uuid` must not carry a different `tool_id` (`:2747-2761`). With a representation, any `tool_id` is accepted, because exports carry the original id.
6. If version mismatch → records version_changes message

`ToolModule.save_to_step` (`:2821-2843`) sets the `step.dynamic_tool` relationship whenever the resolved tool is a dynamic tool. For a user-defined tool it clears `step.tool_id`, because `WorkflowStep.effective_tool_id` (`lib/galaxy/model/__init__.py:9468-9474`) takes the id from the tool definition.

### SubWorkflowModule Resolution

`SubWorkflowModule.from_dict()` resolves from:
- `"subworkflow"` key in dict → already-built model object (set by `__load_subworkflows`)
- `"content_id"` → fetches owned workflow from database

## Embedded Tools (`tool_representation`)

A workflow description can carry a tool definition in a tool step, not just a reference. On import Galaxy resolves that definition to a `DynamicTool` row, or creates one, and the step stores it as `step.dynamic_tool`. The row lifecycle, toolbox caching and rollback behavior are in [[Component - Dynamic Tool Manager and Toolbox Lifecycle]]. The user-defined tool (UDT) model and its security rationale are in [[Component - User-Defined Tools]].

### How descriptions carry a tool

- **Native (`.ga`).** A `type: tool` step has `tool_representation` (the tool's YAML source as a dict), optionally alongside `content_id` / `tool_id` and `tool_uuid`. Galaxy's own export writes it from `step.dynamic_tool.value` (`_workflow_to_dict_export`, `lib/galaxy/managers/workflows.py:1923-1935`):
  - If `content_id` is a uuid, the step uses an admin tool created without an `id` (`create_tool` falls back to `str(uuid)`). The export then nulls `content_id`, `tool_id` and `tool_uuid`, so a reimport creates a fresh tool.
  - For a UDT step, non-internal exports null `tool_uuid`, which only resolves for the owner on this server. `tool_id` stays. Internal exports, as used by refactoring, keep the uuid.
  - An admin tool with an `id` keeps both `tool_id` and `tool_uuid`.
- **Format2.** A step whose `run:` is a dict with `class: GalaxyUserTool` is a tool step. Any other `run:` dict is a subworkflow (`_resolve_step_type` in gxformat2). gxformat2 0.28.0, Galaxy's pinned version, copies that dict into the native `tool_representation` in `_build_tool_step`, without a `tool_uuid`. Embedding an admin `GalaxyTool` is therefore native-only. Galaxy's format2 export writes UDT steps back as `run: {class: GalaxyUserTool, ...}`. Conversion runs in `normalize_workflow_format` (`:862`) before any of the logic below. See [[Component - Format2 Workflows (gxformat2)]].

### Resolution: `ToolModule.resolve_tool_uuid`

`lib/galaxy/workflow/modules.py:2708-2730`. The input is the step dict, and the output is the uuid the step will use.

| Representation `class` | Step also has | Action | Checks |
|---|---|---|---|
| `GalaxyUserTool` | a `tool_uuid` the importing user owns | Reuse that tool. The embedded definition is ignored | Anonymous user → `InsufficientPermissionsException` |
| `GalaxyUserTool` | no uuid, or one the user does not own | `DynamicToolManager.create_unprivileged_tool` → a new private copy owned by the importer, with a new uuid | `USER_TOOL_EXECUTE` role (`ensure_can_use_unprivileged_tool`, `lib/galaxy/managers/tools.py:97-99`), `enable_beta_tool_formats`, lint, and template validation (`:202-223`) |
| anything else (`GalaxyTool`, CWL) | neither `tool_id`/`content_id` nor `tool_uuid` | `DynamicToolManager.create_tool` → a new public tool with a new uuid, loaded into the toolbox | `trans.user_is_admin`, otherwise `AdminRequiredException`. `enable_beta_tool_formats`. `create_tool` rejects `GalaxyUserTool` (`:143-200`) |
| anything else | a `tool_id` or `tool_uuid` | Nothing is created. The uuid passes through and the toolbox resolves the tool | normal tool access |

Ownership:

- `get_unprivileged_tool_or_none` (`lib/galaxy/tools/__init__.py:849-853`) goes through `owned_unprivileged_statement`, which joins the user's `UserDynamicToolAssociation` (`lib/galaxy/managers/tools.py:240-249`). A uuid copied from another user's workflow never resolves to their tool, so it is always copied. A user without the role gets `None` here, and then a 403 from `create_unprivileged_tool`.
- Creation does no deduplication by representation. Each import of a definition the user does not already own by uuid adds a new UDT row, and each admin import without an id adds a new public tool.
- Importing a *shared* workflow (`_import_shared_workflow` → `WorkflowsManager.copy_workflow_for_user`, `lib/galaxy/managers/workflows.py:217-238`) applies the same reuse-or-copy rule. It works on model objects, not descriptions, and recurses into subworkflow steps through `_tool_steps` (`:178-185`).
- `POST /api/workflows/build_module` (`lib/galaxy/webapps/galaxy/api/workflows.py:542-557`) also calls `ToolModule.from_dict`. If a `tool_representation` is posted there, the tool is created as well. The client never sends one.

Tests: `test_import_workflow_with_user_defined_tool_representation*`, `test_import_embedded_user_tools_after_step_metadata` (parametrized over outputs, PJAs, annotations, a stock first step, and nesting), and the `test_user_defined_tool_workflow_*` export and shared-import tests in `lib/galaxy_test/api/test_workflows.py:11907-12190`. Also `TestAdminWorkflowsApi.test_import_embedded_admin_tool_after_step_metadata` (`:12562`).

## Session Ordering and Commit Points

Construction happens in the request's scoped session (`trans.sa_session`). Several helpers commit that session mid-build, so their order relative to step construction matters.

### Commit points in one create

In order, for `POST /api/workflows` reaching `_workflow_from_dict` (`lib/galaxy/webapps/galaxy/api/workflows.py:693-716`):

| # | Where | What commits | Skipped when `dry_run`? |
|---|---|---|---|
| 1 | `subworkflows` preload (`managers/workflows.py:1108-1116`) | each nested `build_workflow_from_raw_description`: tag commit (`:946`) and final commit (`:958`), recursively including everything that nested build commits | **no** |
| 2 | first pass, `__load_subworkflows` (`:1123-1130`) | embedded, URL, and TRS subworkflow steps, built the same way | yes |
| 3 | first pass, `resolve_tool_uuid` (`:1132-1135`) | `create_unprivileged_tool`: the row via `ModelManager.create(flush=True)`, then the association (`tools.py:210-222`). `create_tool`: the row, then `toolbox.load_dynamic_tool` | **no** |
| 4 | second pass, `__module_from_dict` | nothing. Annotations, workflow outputs and PJAs are only added | n/a |
| 5 | `build_workflow_from_raw_description` after the build | `set_tags_from_list` (`:946`), then `add(stored)` + commit (`:958`) | n/a (create only) |
| 6 | controller | `_make_item_accessible` + commit if importable (`:711-713`), then `_import_tools_if_needed` | n/a |

`update_workflow_from_raw_description` (`managers/workflows.py:962-1040`) shares rows 1-4. Its own tag and annotation calls do not commit (`flush=False`), and it commits once at `:1031`, only when not a dry run. Embedded subworkflows built during an update get `WorkflowCreateOptions` derived from the update options (`__build_embedded_subworkflow`, `:2472-2496`).

### The invariant: nothing commits once steps exist

At every nesting level, the first pass finishes every committing operation (subworkflow builds and embedded-tool creation) before the second pass creates the first `WorkflowStep`. Workflow outputs and PJAs pull a step into the session before it is attached to its `Workflow`. A commit at that point would flush a `workflow_step` row with no `workflow_id`, which violates its NOT NULL constraint. Steps are only attached at `workflow.steps = steps` and `ensure_object_added_to_session` (`:1152-1157`), after the second pass.

Recursion keeps the invariant. A nested subworkflow is built and committed during its parent's first pass, before the parent creates any steps. Its own embedded tools are resolved in its own first pass. Embedded subworkflows are separate hidden `StoredWorkflow`s, committed independently of the parent.

Any new import-time work that commits, or that calls a manager whose `create`/`update` defaults to `flush=True`, has to run in the first pass or after the workflow is attached.

### Consequences

- **Import is not atomic.** Tools and subworkflows committed in rows 1-3 persist if a later step fails, for example on lint, state validation, or a permission error. See the rollback section of [[Component - Dynamic Tool Manager and Toolbox Lifecycle]] for what changes if creation becomes flush-only.
- **Dry runs are not side-effect free.** `dry_run` (set by refactoring and accepted by `PUT /api/workflows/{id}` through `WorkflowUpdateOptions(**payload)`) builds a detached model. It skips row 2 and expunges steps, but rows 1 and 3 still run and commit.
- **Refactoring rebuilds embedded tools.** `do_refactor` (`managers/workflows.py:2547-2600`) exports the version internally with `allow_upgrade=True` and builds it detached twice (`_build_detached`, `:2602-2621`). A real refactor builds it a third time through the update. An owned UDT keeps its uuid and is reused. An id-less admin tool's export carries no uuid, so every build reaches the create branch. Recorded in `vault/agents/gx_research/research_issues/workflow-dry-run-build-persists-embedded-tools.md`. See [[Component - Workflow Refactoring API]].

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
   │  │     │     ├── Preload subworkflows (recursive, COMMITS)
   │  │     │     ├── Pass 1: per step, load subworkflows (recursive, COMMITS)
   │  │     │     │     and resolve embedded tools (resolve_tool_uuid, may COMMIT)
   │  │     │     ├── Pass 2: Create modules and steps (no commits)
   │  │     │     │     └── module_factory.from_dict() → type-specific Module
   │  │     │     │         └── Module.save_to_step(step)
   │  │     │     ├── Pass 3: Connect steps (WorkflowStepConnection)
   │  │     │     ├── Process comments
   │  │     │     └── attach_ordered_steps()
   │  │     │
   │  │     ├── Create StoredWorkflow(), wire to Workflow
   │  │     ├── Set annotations and tags (tags COMMIT)
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
| ToolModule (`resolve_tool_uuid`, `from_dict`, `save_to_step`) | `lib/galaxy/workflow/modules.py` | 2661-2843 |
| Embedded tool creation | `lib/galaxy/managers/tools.py` | 143-223 |
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

8. **Embedded tools are created, not just resolved.** A `tool_representation` in a step can create a `DynamicTool` row: a private UDT copy for users with the `USER_TOOL_EXECUTE` role, or a public tool for admins. That creation commits. The two-pass construction exists so that this, and every recursive subworkflow build, finishes before any step joins the session. See [Session Ordering and Commit Points](#session-ordering-and-commit-points).
