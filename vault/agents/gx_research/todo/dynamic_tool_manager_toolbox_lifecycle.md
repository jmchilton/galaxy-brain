# Component - Dynamic Tool Manager and Toolbox Lifecycle

Write `vault/research/Component - Dynamic Tool Manager and Toolbox Lifecycle.md` for `release_26.1`/`dev`. Cover `DynamicToolManager` (`lib/galaxy/managers/tools.py`): `create_tool` (admin, public) vs `create_unprivileged_tool` (private, `UserDynamicToolAssociation`), the base manager `create(flush=...)` semantics (note `flush=True` actually commits), deactivate/delete paths, and every caller (API endpoints, workflow import, `copy_workflow_for_user`, agent operations). Cover toolbox registration: `load_dynamic_tool`, `_tools_by_uuid`, the lazy DB fallback in `_get_tool_by_uuid`, why GalaxyUserTool is never cached, `get_unprivileged_tool_or_none`, and what happens to the toolbox when a creating transaction rolls back. Leave out tool-state/runtime models (see existing UDT notes).

## Why

Making embedded-tool creation transactional needs to know when toolbox state can diverge from rows (lazy load on uuid lookup, eager load in `create_tool`) and who else commits through the manager. `Component - User-Defined Tools` covers the security/authoring model, not this lifecycle.

## Requested by

- vault/repositories/galaxy/branches/active/issue_24530_atomic_embedded_tool_import_26.1/index.md: Needed commit/toolbox-registration ordering for flush-only creation (#24530).
