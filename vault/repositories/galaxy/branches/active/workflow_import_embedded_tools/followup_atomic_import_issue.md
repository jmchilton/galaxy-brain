# Workflow import can leave orphaned embedded tools when a later step fails

Follow-up from #24475 (raised in dannon's review). Target: `dev`.

## Problem

When a workflow import embeds tools (`tool_representation`), `WorkflowContentsManager._workflow_from_raw_description` resolves them up front through `ToolModule.resolve_tool_uuid`. Each resolution goes through `DynamicToolManager.create_unprivileged_tool` (or `create_tool` for admins), which commits the session on its own.

If a later step is rejected (missing tool, invalid state, failed lint on a second embedded tool, a permission error, ...), the request fails, but the tools created before it stay in the database. For user-defined tools they're also associated with the user, so they show up in the user's tool list with no workflow referencing them. Retrying the import creates more copies.

This behavior predates #24475. That PR only moved resolution earlier so the commit can't flush partially built steps.

## Proposal

Make embedded-tool creation part of the import's transaction:

- Give `DynamicToolManager.create_tool` / `create_unprivileged_tool` a way to flush without committing (or wrap the import in a savepoint), and let `build_workflow_from_raw_description` own the single commit.
- Keep toolbox registration (`load_dynamic_tool`) from exposing a tool whose row is later rolled back, e.g. register it only after the commit, or unregister it on failure.
- Consider reusing an existing owned tool with an identical representation, so repeated imports don't pile up copies.

## Testing

- API test: import a workflow with an embedded user tool followed by a step that fails (for example an unknown `tool_id`). Assert the request fails and the user's unprivileged tool count is unchanged.
- The same for the admin `GalaxyTool` path, checking the dynamic tools list.
