# Initial implementation debrief

```
created .../differential-review/snapshots/20261028T050836Z-implementation-5d27bcc22e1d.json
  implementation @ 5d27bcc22e1d vs workflow_import_embedded_tools (merge-base 82a993c494ad)
  first snapshot: 2 commits, 6 files, 16 hunks
```

## Base
Stacked on #24475 (`workflow_import_embedded_tools`, `release_26.1`). That PR moves embedded-tool creation into `ToolModule.resolve_tool_uuid`, which is the code this fix changes. The issue draft said `dev`, but that predates the decision to stack.

## Changes
- `DynamicToolManager.create_tool` / `create_unprivileged_tool` take `commit=True`. With `False` they only flush, and the session doesn't autoflush, so both explicit flushes are needed.
- New `DynamicToolManager.rollback_tools_on_error(discard=False)` context manager. The outermost scope holds a list in `session.info`. On error it rolls back the session and unloads the admin tools that `create_tool(commit=False)` loaded. `discard` also unloads them after a successful dry run.
- New `AbstractToolBox.unload_dynamic_tool(uuid)`, the counterpart of `load_dynamic_tool`. It restores the previous default version.
- `WorkflowContentsManager.build_workflow_from_raw_description` and `update_workflow_from_raw_description` wrap their bodies in the scope. Subworkflow builds (`is_subworkflow=True`) flush instead of committing.
- `ToolModule.resolve_tool_uuid` passes `commit=False`.

## Tests (red→green)
- `test_failed_import_rolls_back_embedded_user_tools[flat|nested]`: the second embedded tool fails lint with a 400, and the user's tool list is unchanged.
- `test_failed_import_rolls_back_embedded_admin_tools`: the admin lacks USER_TOOL_EXECUTE, so the second (user) tool returns 403. The dynamic tool list is unchanged and `GET /api/tools/{id}` returns 404.
- A unit test for `unload_dynamic_tool` restoring the previous default.
- Checks run: the embedded/refactor/dry_run/user_defined/subworkflow API subsets, the unprivileged and dynamic tool API tests, and the toolbox unit tests all pass. Lint is clean. mypy shows the same error set as the base.

## Not covered
- No API test for the dry-run unload. It needs an admin PUT with `dry_run` and a new `tool_representation`.
- The workflow copy path (`WorkflowsManager` tool copies, `workflows.py:198`) still commits per tool. It is out of scope.
