---
type: research
subtype: component
tags:
  - research/component
  - galaxy/tools
  - galaxy/tools/yaml
  - galaxy/workflows
  - galaxy/models
  - galaxy/api
component: "Dynamic Tool Manager and Toolbox Lifecycle"
galaxy_areas: [tools, workflows, models, api]
status: draft
created: 2026-10-30
revised: 2026-10-30
revision: 2
ai_generated: true
summary: "How DynamicToolManager creates, commits and deactivates dynamic tool rows, and when the toolbox caches them or loads them lazily by uuid"
sources:
  - "vault/agents/gx_research/archive/dynamic_tool_manager_toolbox_lifecycle.md"
related_notes:
  - "[[Component - User-Defined Tools]]"
  - "[[Component - Workflow Import]]"
  - "[[Component - Tool Data Tables]]"
---

# Dynamic Tool Manager and Toolbox Lifecycle

A `DynamicTool` row is a tool stored in the database rather than in a tool config file. There are two kinds:

- **Admin dynamic tools.** `public=True`, `GalaxyTool` YAML (CWL formats are accepted at create time; see [Gotchas](#gotchas)). The toolbox may cache them.
- **User-defined tools (UDTs).** `public=False`, `GalaxyUserTool`, owned through a `UserDynamicToolAssociation` row. The toolbox never caches them.

This note follows a row from creation to deactivation. It covers who commits it, and when the in-memory toolbox learns about it, or stops knowing about it. The security and authoring model is in [[Component - User-Defined Tools]], which also links the tool-state and runtime notes. The origin of UDTs is [[PR 19434 - User Defined Tools]], and the agent operations that call this manager are in [[PR 21942 - Shared Agent Operations and MCP Server]].

Verified against Galaxy `origin/dev` @ `65e6daff2334c8cfd4971682eecfb87f38a224be`. All `file:line` references are at that SHA. On `release_26.1` the same lifecycle applies: the manager and toolbox diff there is typing only, plus `materialize_tool` and the `CachedToolBox`, which exist only on dev. `resolve_tool_uuid` and `copy_workflow_for_user` are on both branches since [#24475](https://github.com/galaxyproject/galaxy/pull/24475) merged into `release_26.1` and forward to dev.

Out of scope: tool-state and runtime models, UDT linting and validation, and execution internals.

## Overview

| | Admin (`create_tool`) | UDT (`create_unprivileged_tool`) |
|---|---|---|
| Entry check | `enable_beta_tool_formats` | the same, plus a `USER_TOOL_EXECUTE` role, lint and template validation |
| `public` | `True` | `False` |
| Ownership row | none | `UserDynamicToolAssociation(user_id, dynamic_tool_id)` |
| Commits | 1 (inside `self.create`) | 2 (`create(flush=True)`, then the association) |
| Toolbox | eager `load_dynamic_tool` after the commit: `_tools_by_uuid` and `register_tool` | none. Resolved per request from the DB |
| Deactivate | `deactivate`: drop the `_tools_by_uuid` entry, then `DynamicTool.active=False` | `deactivate_unprivileged_tool`: `association.active=False` only |

## `DynamicToolManager` (`lib/galaxy/managers/tools.py`)

`DynamicToolManager(ModelManager[DynamicTool])` is at `:92`. `app.dynamic_tool_manager` is built at `lib/galaxy/app/__init__.py:427`, before the toolbox, and registered as a singleton at `:806`.

### `create(flush=...)` commits

`ModelManager.create(self, flush: bool = True, *args, **kwargs)` (`lib/galaxy/managers/base.py:492-500`) adds the item and, when `flush` is true, calls **`session.commit()`**, not `session.flush()`. `update` (`:508-521`) and `_session_setattr` (`:224-231`) follow the same convention. In the `ModelManager` API, "flush" means "commit". To get a flush without a commit, pass `flush=False` and then call `session.flush()` yourself. `flush` is the first positional parameter, so pass model fields by keyword, as both create paths do.

### `create_tool` (admin, public)

`:143-200`:

1. `ensure_beta_tool_formats_enabled()`. Then `uuid = model.get_uuid()`. The payload never sets the uuid.
2. Read the representation:
   - `src == "from_path"`: read through `artifact_class(None, ...)` (`lib/galaxy/managers/executables.py:14-46`). Passing `trans=None` skips the admin check, so callers must already be admin.
   - Inline `representation`: requires `class`.
3. Choose `tool_id` by format:
   - `GalaxyUserTool` is rejected and pointed at `/api/unprivileged_tools`.
   - `GalaxyTool` uses `representation["id"]`, or `str(uuid)` when there is no id.
   - CWL (`CommandLineTool`, `ExpressionTool`) takes `tool_proxy(...).galaxy_id()`.
4. `self.create(..., public=True)` with no `flush=` argument, so it **commits**.
5. `self.app.toolbox.load_dynamic_tool(dynamic_tool)` (`:199`) is the first time the representation is parsed into a `Tool`.

### `create_unprivileged_tool` (private UDT)

`:202-223`:

1. `ensure_beta_tool_formats_enabled()` and `ensure_can_use_unprivileged_tool(user)`, which requires a non-deleted `USER_TOOL_EXECUTE` role.
2. `lint_user_tool_source(...)` and `_validate_tool_templates(...)` (`:55-63`).
3. `self.create(..., public=False, flush=True)` gives **commit 1**, which assigns `dynamic_tool.id`.
4. `session.add(UserDynamicToolAssociation(user_id=user.id, dynamic_tool_id=dynamic_tool.id))` then `session.commit()` gives **commit 2**.

The method never touches the toolbox. The two commits are not atomic: a failure between them leaves an ownerless private row that no lookup can reach.

### Reads

- `get_tool_by_uuid`, `get_tool_by_tool_id` and `get_tool_by_id` (`:113-141`) all filter on `public == true()`.
- `get_unprivileged_tool_by_uuid` and `get_unprivileged_tool_by_tool_id` build on `owned_unprivileged_statement(user)` (`:240-249`). That joins the association on `user_id`, starts with `ensure_can_use_unprivileged_tool`, so it raises `InsufficientPermissionsException` for users without the role, and orders by newest association. It does not filter on either `active` flag.
- `list_tools` (`:225-229`) returns active public tools only. It backs the public `GET /api/dynamic_tools`.
- `list_unprivileged_tools` (`:231-238`) requires `DynamicTool.active == active` and `association.active == active`.

### Deactivate

- `deactivate(dynamic_tool)` (`:264-267`):
  1. `del self.app.toolbox._tools_by_uuid[uuid]`. This removes the entry in this process only, and the method reaches into the toolbox's private map to do it.
  2. `self.update(dynamic_tool, {"active": False})`, which commits.

  It assumes the uuid is cached in this process; see [Gotchas](#gotchas).
- `deactivate_unprivileged_tool(user, dynamic_tool)` (`:251-262`) runs a bulk `UPDATE` of the association to `active=False`, then commits. `DynamicTool.active` is left unchanged on purpose, so other holders of the row are unaffected (comment at `lib/galaxy/agents/operations.py:1064-1067`). There is nothing to evict, because UDTs are never cached.

No hard delete exists. Rows are only ever deactivated.

## Toolbox registration (`lib/galaxy/tool_util/toolbox/base.py`)

### Registries

`AbstractToolBox.__init__` creates `_tools_by_id`, `_tools_by_uuid: dict[UUID, Tool]` and `_tool_versions_by_id` (`:335-340`). `_tools_by_uuid` is written in three places:

- `load_dynamic_tool` (`:599`).
- `CachedToolBox._register_cached_entry` (`lib/galaxy/tools/cached_toolbox.py:1737`), for file-based index entries that carry a uuid, not DB rows.
- `DynamicToolManager.deactivate`, which deletes from it.

Dynamic tools are **not** loaded when the toolbox is built. A toolbox reload (`lib/galaxy/queue_worker/__init__.py:272-281`) swaps in a fresh toolbox, so every cached dynamic tool is dropped and is reloaded lazily by uuid.

### `load_dynamic_tool`

`:589-600`:

1. Return `None` unless the row is `active` **and** `public`.
2. `tool = self.create_dynamic_tool(dynamic_tool)`, which calls `dynamic_tool_to_tool` (`lib/galaxy/tools/__init__.py:912-920`, `:855-884`).
3. If `tool_format == "GalaxyUserTool"`, return the tool uncached. The comment reads "UDTs are resolved per-request via DynamicToolManager; never cache." This branch is effectively unreachable, because step 1 already filtered out `public=False`.
4. Otherwise `register_tool(tool)` (`:1464-1489`) adds the tool to `_tools_by_id` and `_tool_versions_by_id` and invalidates the tool caches. It does not add it to any panel. Then `_tools_by_uuid[uuid] = tool`.

The function runs without `app._toolbox_lock`.

`dynamic_tool_to_tool` builds a fresh `Tool` from `DynamicTool.value` through `YamlToolSource`, for `GalaxyTool` and `GalaxyUserTool` only. Any other format raises. It snapshots `dynamic_tool_id`, `dynamic_tool_uuid`, `is_unprivileged_tool` and `dynamic_tool_active` onto the tool while the ORM row is still attached (`:875-883`). The cached `Tool` therefore holds the row's id and uuid even if that row is later rolled back.

### Lazy DB fallback: `_get_tool_by_uuid`

`:556-563` checks `_tools_by_uuid` first. On a miss it calls `app.dynamic_tool_manager.get_tool_by_uuid(uuid)`, which returns public rows only, then `load_dynamic_tool`, which caches the result. A cache hit never re-checks the DB.

`get_tool(..., tool_uuid=..., user=...)` (`:895-915`) resolves a uuid in this order:

1. If a `user` is given, try `get_unprivileged_tool_or_none(user, uuid)` first.
2. Otherwise, or on a miss, call `_get_tool_by_uuid`.
3. If that returns `None`, raise `ObjectNotFound` rather than returning `None`.

### Why `GalaxyUserTool` is never cached

`ToolBox.get_unprivileged_tool` (`lib/galaxy/tools/__init__.py:845-847`) runs `get_unprivileged_tool_by_uuid(user, uuid)` and then `dynamic_tool_to_tool`. It builds a new `Tool` on every call, scoped to the owner. `get_unprivileged_tool_or_none` (`:849-853`) turns `InsufficientPermissionsException` (no role) into `None`. The abstract versions in `base.py:1006-1010` return `None`.

A process-wide `_tools_by_uuid` keyed by uuid alone would ignore ownership, which is why UDTs stay out of it. `Tool.allow_user_access` (`:1455-1469`) re-checks ownership by uuid for UDT `Tool` objects. `tool_for_job` (`:886-910`) also bypasses the caches: it builds from `job.dynamic_tool`, and for private tools it goes through `get_unprivileged_tool`.

## Callers

| Caller | Method | Commit behavior |
|---|---|---|
| `POST /api/dynamic_tools` (`lib/galaxy/webapps/galaxy/api/dynamic_tools.py:248-256`, `require_admin`) | `create_tool` | Commits. Non-`MessageException` errors become 400 |
| `DELETE /api/dynamic_tools/{id}` (`:258-270`, admin) | `deactivate` | Commits |
| `POST /api/unprivileged_tools` (`:154-176`) | `create_unprivileged_tool` | 2 commits |
| `DELETE /api/unprivileged_tools/{uuid}` (`:216-230`) | `deactivate_unprivileged_tool` | Commits |
| `ToolModule.resolve_tool_uuid` (`lib/galaxy/workflow/modules.py:2708-2729`, a classmethod) | `create_unprivileged_tool` for a `GalaxyUserTool` representation the user does not already own. `create_tool` (admin only) when the step has a representation and neither `tool_id` nor `tool_uuid` | Commits mid-import |
| `WorkflowContentsManager._workflow_from_raw_description` (`lib/galaxy/managers/workflows.py:1131-1135`) | calls `resolve_tool_uuid` for every embedded tool step **before** any step is built. The comment says creation commits the session | Final commit at `build_workflow_from_raw_description` `:958`. Update and subworkflow builds share the path |
| `ToolModule.from_dict` (`modules.py:2731-2737`) | calls `resolve_tool_uuid` again. After the pre-pass this is a no-op, because the uuid now resolves. Other `from_dict` callers have no pre-pass, e.g. `POST /api/workflows/build_module` (`lib/galaxy/webapps/galaxy/api/workflows.py:542-557`) | Commits if a representation is posted |
| `WorkflowsManager.copy_workflow_for_user` (`managers/workflows.py:217-238`), from `_import_shared_workflow` (`lib/galaxy/webapps/base/controller.py:647`) | `create_unprivileged_tool` for each private tool the importer does not own (deduplicated by row id), **before** `workflow.copy` | Each copy commits. The workflow commits later (`controller.py:655`) |
| `AgentOperationsManager.create_user_tool` / `delete_user_tool` (`lib/galaxy/agents/operations.py:1035-1054`) | create and deactivate UDTs | Commits |

Read-only callers:

- `list_user_tools` and `run_user_tool` (`operations.py:1024`, `:1056`). `run_user_tool` checks both `active` flags explicitly.
- `Tool.allow_user_access`, and `ToolModule.__init__` (`modules.py:2664-2700`). The latter tries `get_unprivileged_tool_or_none` and then `get_tool(..., tool_uuid=...)` without a user, which goes through the lazy fallback.

## Rows and the toolbox when a transaction rolls back

Today every creation commits, so nothing rolls back. A later failure in workflow import (#24530) instead leaves committed rows behind, which is the motivation for flush-only creation. If creation becomes flush-only and the transaction then rolls back, the effect depends on the tool kind:

- **UDTs.** No toolbox state was touched, so the toolbox stays consistent. Only the rows and the association disappear.
- **Admin tools, eager path.** `create_tool` → `load_dynamic_tool` has already put a `Tool` into `_tools_by_uuid`, `_tools_by_id` and `_tool_versions_by_id`. A rollback does not undo that. The process keeps resolving a uuid (and `tool_id`) whose row no longer exists, and the tool's snapshotted `dynamic_tool_id` points at nothing. Other processes are unaffected.
- **Admin tools, lazy path.** Deferring the eager load is not enough on its own. `_get_tool_by_uuid` queries the same scoped session (`app.model.context`), so within the creating transaction a flushed but uncommitted row is visible and gets cached. `ToolModule.__init__` does exactly that when the import builds the step.

A flush-only design therefore has two choices. It can register admin tools only after the commit and prevent caching inside the transaction. Or it can evict on rollback, which needs a toolbox API, since `deactivate` shows the only current eviction is a raw `del`.

## Gotchas

- `flush=True` means commit everywhere in `ModelManager`.
- `create_tool` commits before the tool is parsed. A missing `version`, or any CWL format, fails in `load_dynamic_tool` after the row is stored, so the API returns 400 while leaving an active public row behind. Recorded as `create-tool-commits-before-toolbox-load`.
- `deactivate` assumes this process cached the uuid. It raises `KeyError` after a restart or reload, or in a worker that never resolved the tool. Recorded as `dynamic-tool-deactivate-assumes-cached-uuid`.
- UDT deactivation flips only the association, and `list_unprivileged_tools(active=False)` needs both flags to be false, so deactivated UDTs never appear in the inactive listing. Recorded as `unprivileged-tools-inactive-listing-empty`.
- Admin dynamic tools resolve by `tool_id` only in processes that have already loaded them, through creation or a uuid lookup. Workflow steps and jobs carry the uuid or `job.dynamic_tool`, so they do not depend on this.
- `copy_workflow_for_user` commits new UDT rows before the workflow copy. If the copy fails, those private copies remain.
- `POST /api/workflows/build_module` reaches `resolve_tool_uuid`, so posting a `tool_representation` to the editor's "build module" endpoint creates and commits a tool. The client does not send one.

## Tests

- `test/unit/app/managers/test_DynamicToolManager.py`: admin create; missing version raises `ValueError`, without checking for an orphan row; beta-format gating.
- `test/unit/app/tools/test_user_defined_tool_loading.py`: UDT creation and loading, `tool_for_job`, stored-row lift.
- API:
  - `lib/galaxy_test/api/test_tools.py`: `test_show_dynamic_tools` and `test_tool_deactivate`, the latter on a single process with the tool always cached.
  - `test_unprivileged_tools.py`: `test_deactivate` checks only the active listing.
  - `test_workflows.py` around `:11740-12225`: embedded-tool import.
