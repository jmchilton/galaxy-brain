```yaml
documents:
  - path: vault/repositories/galaxy/branches/active/workflow_import_embedded_tools/implementation_debrief.md
    why: Parent branch (#24475) debrief; it moved embedded-tool creation into the `ToolModule.resolve_tool_uuid` prepass this fix changes, and records the commit/session side effects.
    load_when: Starting; understanding why creation commits before step building.
  - path: vault/repositories/galaxy/branches/active/workflow_import_embedded_tools/review_pushback_dannon_1.md
    why: Records that non-atomic import is pre-existing and was deliberately deferred to this follow-up.
    load_when: Framing scope and PR description.
  - path: vault/repositories/galaxy/branches/active/workflow_import_embedded_tools/test_challenges_debrief.md
    why: Existing embedded-tool API test coverage and helpers to extend with the red-first rollback tests.
    load_when: Writing the API tests.
  - path: vault/research/Component - Workflow Import.md
    why: Maps build_workflow_from_raw_description phases (subworkflow preloading, step passes, final commit); ToolModule section predates embedded user tools and says nothing about commit points.
    load_when: Locating every commit in create/update/subworkflow build paths.
  - path: vault/research/Component - User-Defined Tools.md
    why: Ownership/permission model for GalaxyUserTool (UserDynamicToolAssociation, USER_TOOL_EXECUTE role) that create_unprivileged_tool enforces.
    load_when: Reasoning about what rolls back with the association row and permission failures.
  - path: vault/research/Component - Workflow API.md
    why: API entry points (POST/PUT /api/workflows, dry_run) that call the build/update managers.
    load_when: Tracing which callers rely on build_workflow_from_raw_description committing.
  - path: vault/research/Component - Workflow Testing.md
    why: API workflow test helpers/populators for import tests.
    load_when: Adding API tests.
  - path: vault/research/Component - Format2 Workflows (gxformat2).md
    why: Where `tool_representation` appears after format2 conversion; useful for the format2 variant of the tests.
    load_when: Writing format2 import test cases.
research_requests:
  - vault/agents/gx_research/todo/workflow_import_embedded_tools.md
  - vault/agents/gx_research/todo/dynamic_tool_manager_toolbox_lifecycle.md
```

## Code observations (not in any note; verified at worktree HEAD 82a993c494a)

Commit points that matter, beyond the two named in the issue:

- `DynamicToolManager.create_tool` (`lib/galaxy/managers/tools.py:145`) calls base `create(...)` with default `flush=True`, which in `managers/base.py:494` does `session.commit()` (flush param is misnamed); then eagerly `toolbox.load_dynamic_tool`.
- `create_unprivileged_tool` (`tools.py:204`) passes `flush=True` (commits), adds the association, commits again. Two commits; second leaves a window where tool row exists without owner row.
- `build_workflow_from_raw_description` commits at `workflows.py:801` even when `is_subworkflow=True` (embedded subworkflows, URL/TRS subworkflows at ~2222/2250/2291). A hidden subworkflow `StoredWorkflow` therefore also persists when the parent later fails; "only outermost commits" fixes this too but changes behavior for callers that build subworkflows standalone.
- `update_workflow_from_raw_description` commits at `workflows.py:867` (skipped under `dry_run`). The embedded-tool prepass (`workflows.py:~964-968`) is NOT gated by `dry_run`, so a dry-run refactor/update creates (today commits) tools. With flush-only creation a dry run would leave uncommitted rows in a session that may later be committed by another step in the same request (check `api/workflows.py:~518` `require_flush` commit runs BEFORE the update, OK) - verify session lifetime/rollback at request end, and consider skipping creation or explicitly rolling back for dry_run.
- Other `build_workflow_from_raw_description` callers that rely on committed result: `api/workflows.py:706` (follows with `_make_item_accessible` + commit, `_import_tools_if_needed`), `services/wes.py:520`, `api/mcp.py:1220`, `workflows.py:702/2443/2473`. `attach_stored_workflow` (`workflows.py:~380`) commits independently.
- `WorkflowsManager.copy_workflow_for_user` (`workflows.py:198`) is a third `create_unprivileged_tool` caller (committing default must stay or it needs its own commit); also `agents/operations.py:987` and `api/dynamic_tools.py:171,253`. Unit tests: `test/unit/app/managers/test_DynamicToolManager.py`, `test/unit/app/tools/test_user_defined_tool_loading.py:49`.

Toolbox risk for the "defer load_dynamic_tool until commit" step:

- `ToolBox._get_tool_by_uuid` (`lib/galaxy/tool_util/toolbox/base.py:408`) lazily falls back to `dynamic_tool_manager.get_tool_by_uuid` and calls `load_dynamic_tool` (registers in `_tools_by_uuid`). `ToolModule.from_dict` resolves the freshly created admin tool by uuid right after creation, i.e. BEFORE the outer commit, so simply deferring the eager load in `create_tool` does not keep rolled-back tools out of the toolbox; lazy load re-registers them (autoflush makes the row visible). Need either an unload on failure (`DynamicToolManager.deactivate` does `del toolbox._tools_by_uuid[uuid]`) or a pending-tools list cleaned in an except/finally in the outermost build.
- GalaxyUserTool is never cached in the toolbox (`load_dynamic_tool` returns early), resolved per request via `get_unprivileged_tool_or_none` -> DB query; flushed rows are visible in-session, so the user-tool path needs no toolbox handling.
- Admin tool path: `public=True` rows via `create_tool` only when `tool_id is None and tool_uuid is None` (`modules.py:2468`) and user is admin.

Session/transaction facts to verify rather than assume: how the API request session is closed on exception (implicit rollback vs explicit), and whether `trans.sa_session` autoflush is on (affects visibility of flushed-not-committed tools to `get_unprivileged_tool_or_none`/`get_tool_by_uuid`).

Tests to build on: `lib/galaxy_test/api/test_workflows.py` ~10770-11100 (`test_import_workflow_with_user_defined_tool_representation*`, `test_import_embedded_user_tools_after_step_metadata`, `test_import_embedded_admin_tool_after_step_metadata`); populators `create_unprivileged_tool`/`get_unprivileged_tools`/`list_dynamic_tools` in `lib/galaxy_test/base/populators.py` (~1012-1090) give the before/after tool-count assertions the issue calls for.
