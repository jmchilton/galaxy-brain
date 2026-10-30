# Component - Dynamic Tool Manager and Toolbox Lifecycle

Write `vault/research/Component - Dynamic Tool Manager and Toolbox Lifecycle.md` for `release_26.1`/`dev`. Cover `DynamicToolManager` (`lib/galaxy/managers/tools.py`): `create_tool` (admin, public) vs `create_unprivileged_tool` (private, `UserDynamicToolAssociation`), the base manager `create(flush=...)` semantics (note `flush=True` actually commits), deactivate/delete paths, and every caller (API endpoints, workflow import, `copy_workflow_for_user`, agent operations). Cover toolbox registration: `load_dynamic_tool`, `_tools_by_uuid`, the lazy DB fallback in `_get_tool_by_uuid`, why GalaxyUserTool is never cached, `get_unprivileged_tool_or_none`, and what happens to the toolbox when a creating transaction rolls back. Leave out tool-state/runtime models (see existing UDT notes).

## Why

Making embedded-tool creation transactional needs to know when toolbox state can diverge from rows (lazy load on uuid lookup, eager load in `create_tool`) and who else commits through the manager. `Component - User-Defined Tools` covers the security/authoring model, not this lifecycle.

## Requested by

- vault/repositories/galaxy/branches/active/issue_24530_atomic_embedded_tool_import_26.1/index.md: Needed commit/toolbox-registration ordering for flush-only creation (#24530).

## Debrief

- Created `vault/research/Component - Dynamic Tool Manager and Toolbox Lifecycle.md`, verified against Galaxy `origin/dev` @ `65e6daff`. The lifecycle is identical on `release_26.1`: the manager and toolbox diff there is typing only, `CachedToolBox` and `materialize_tool` exist only on dev, and #24475 is merged on both.
- Covered:
  - create paths, including that `create(flush=True)` commits and the two non-atomic commits in `create_unprivileged_tool`.
  - deactivate paths.
  - every caller: both APIs, the workflow import pre-pass and `from_dict`, `build_module`, `copy_workflow_for_user`, and the agent operations.
  - `load_dynamic_tool`, `_tools_by_uuid`, the lazy `_get_tool_by_uuid` fallback, why UDTs are not cached, and `get_unprivileged_tool_or_none`.
  - a rollback analysis for flush-only creation. Eager admin registration survives a rollback, and the lazy path caches flushed rows within the same session. UDTs are safe.
- Updated backlinks in `Component - User-Defined Tools` and `Component - Workflow Import`. The latter's ToolModule resolution step was stale.
- Out of scope, as requested: tool-state and runtime models, UDT linting and validation. The #24530 branch's own implementation is not described; the note analyzes the baseline only.
- Recorded research issues:
  - `create-tool-commits-before-toolbox-load`
  - `dynamic-tool-deactivate-assumes-cached-uuid`
  - `unprivileged-tools-inactive-listing-empty`
