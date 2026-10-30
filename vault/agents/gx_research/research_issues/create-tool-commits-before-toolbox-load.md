# Admin `create_tool` commits the row before the toolbox parses it

- Area: lib/galaxy/managers/tools.py (DynamicToolManager.create_tool)
- Found while: [[Component - Dynamic Tool Manager and Toolbox Lifecycle]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

- `create_tool` (`lib/galaxy/managers/tools.py:143-200`) calls `self.create(...)` without `flush=`, so `ModelManager.create` (`lib/galaxy/managers/base.py:492-500`) defaults to `flush=True`, which runs `session.commit()`.
- Only afterwards does it call `self.app.toolbox.load_dynamic_tool(dynamic_tool)` (`:199`), which is the first time the representation is parsed into a `Tool`.
- Any parse failure therefore leaves an active, public `DynamicTool` row behind while the caller sees an error:
  - A `GalaxyTool` without `version` raises `ValueError` from `parse_tool_version_with_defaults` (`lib/galaxy/tool_util/parser/util.py:74-80`). `test/unit/app/managers/test_DynamicToolManager.py::test_create_tool_no_version` asserts the `ValueError` but not that no row was stored.
  - `CommandLineTool` / `ExpressionTool` are accepted by `create_tool` (`:173-185`), but `dynamic_tool_to_tool` (`lib/galaxy/tools/__init__.py:855-884`) only builds `GalaxyTool` and `GalaxyUserTool` and raises `Exception("Unknown tool representation format ...")` for anything else. Every CWL create commits a row and then fails.
- `POST /api/dynamic_tools` (`lib/galaxy/webapps/galaxy/api/dynamic_tools.py:248-256`) turns the exception into a 400, so the client is told the create failed. The row still shows up in `GET /api/dynamic_tools` (`list_tools` filters only `active` and `public`), and a later uuid lookup through `_get_tool_by_uuid` re-raises the parse error.

## Evidence / repro

Run `test_create_tool_no_version` and then count `DynamicTool` rows. Or post a `GalaxyTool` representation without `version` to `/api/dynamic_tools` as admin, then `GET /api/dynamic_tools`.

## Suggested fix

- Build the `Tool` (or at least parse it) before persisting. Or create with `flush=False`, load, then commit.
- Reject CWL formats up front in `create_tool` until `dynamic_tool_to_tool` supports them.
- Extend the unit test to assert that no row exists after the failure.

## Related

- `vault/repositories/galaxy/branches/active/issue_24530_atomic_embedded_tool_import_26.1/` (flush-only creation for embedded workflow tools)
