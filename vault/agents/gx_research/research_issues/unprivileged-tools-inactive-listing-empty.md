# `GET /api/unprivileged_tools?active=false` never lists user-deactivated tools

- Area: lib/galaxy/managers/tools.py (list_unprivileged_tools / deactivate_unprivileged_tool)
- Found while: [[Component - Dynamic Tool Manager and Toolbox Lifecycle]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

- `deactivate_unprivileged_tool` (`lib/galaxy/managers/tools.py:251-262`) sets only `UserDynamicToolAssociation.active = False`. `DynamicTool.active` stays `True` on purpose; see the comment at `lib/galaxy/agents/operations.py:1064-1067`.
- `list_unprivileged_tools(user, active)` (`:231-238`) requires `DynamicTool.active == active` **and** `UserDynamicToolAssociation.active == active`.
- So with `active=False`, a tool deactivated through the user API never matches, because its `DynamicTool.active` is still `True`. The inactive listing used by `UnprivilegedToolsApi.index` and agent `list_user_tools` is therefore always empty for these tools.
- With `active=True` the tool disappears as intended, which is all `test_deactivate` (`lib/galaxy_test/api/test_unprivileged_tools.py:368-378`) checks.

## Evidence / repro

Create a user tool, `DELETE /api/unprivileged_tools/<uuid>`, then `GET /api/unprivileged_tools?active=false`. The response is `[]`.

## Suggested fix

- Filter the inactive listing on the association flag alone, or on `or_(DynamicTool.active == False, UserDynamicToolAssociation.active == False)`.
- Extend `test_deactivate` to assert that the tool appears in the inactive listing.
