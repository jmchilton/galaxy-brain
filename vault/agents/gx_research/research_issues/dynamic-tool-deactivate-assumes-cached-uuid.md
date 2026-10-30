# Admin dynamic-tool deactivate raises `KeyError` unless this process cached the tool

- Area: lib/galaxy/managers/tools.py (DynamicToolManager.deactivate)
- Found while: [[Component - Dynamic Tool Manager and Toolbox Lifecycle]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

- `deactivate` (`lib/galaxy/managers/tools.py:264-267`) runs `del self.app.toolbox._tools_by_uuid[dynamic_tool.uuid]` before updating the row.
- Public dynamic tools are not loaded at toolbox construction. `_tools_by_uuid` gets an entry only from `create_tool` in the creating process, or from the lazy `_get_tool_by_uuid` fallback (`lib/galaxy/tool_util/toolbox/base.py:556-563`).
- After a restart, after a toolbox reload (`lib/galaxy/queue_worker/__init__.py:272-281` builds a fresh toolbox), or in a web worker that never resolved the tool, the `del` raises `KeyError`. `DELETE /api/dynamic_tools/{id}` (`lib/galaxy/webapps/galaxy/api/dynamic_tools.py:258-270`) then fails with a 500 and the row stays active.
- The call also reaches into the toolbox's private `_tools_by_uuid` from the manager, and mutates it before the DB update has succeeded.
- `test_tool_deactivate` (`lib/galaxy_test/api/test_tools.py`) creates the tool and deactivates it on the same single-process server, so the tool is always cached and the path is never exercised.

## Evidence / repro

Create a dynamic tool as admin, restart Galaxy (or trigger a toolbox reload), then `DELETE /api/dynamic_tools/<uuid>`.

## Suggested fix

- Add a toolbox method such as `unload_dynamic_tool(uuid)` that uses `pop(uuid, None)` and also clears the registries `register_tool` filled.
- Call it after the update commits.
- Add an API test that deactivates a tool not loaded in the current process, e.g. after a reload.
