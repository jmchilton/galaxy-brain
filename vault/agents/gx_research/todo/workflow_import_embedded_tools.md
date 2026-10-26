# Component - Workflow Import

Update `vault/research/Component - Workflow Import.md` for embedded dynamic tool import on `release_26.1`. Cover how format2 and native workflow descriptions carry `tool_representation`, how `GalaxyUserTool` and admin `GalaxyTool` resolve or create dynamic tools and tool UUIDs, the permission and ownership checks, and when tool creation commits relative to subworkflow preloading, step construction, workflow outputs, PJAs, and final workflow attachment. Include recursive embedded subworkflows and dry-run/refactor behavior. Keep implementation-specific fixes and one-off issue details out of the enduring component note.

## Why

The current ToolModule section describes only admin dynamic tools and omits the embedded `GalaxyUserTool` path. Its import phases do not explain that dynamic tool creation can commit while an incomplete workflow step is in the session, a reusable persistence boundary for future workflow import work.

## Requested by

- vault/repositories/galaxy/branches/active/workflow_import_embedded_tools/index.md: Needed current embedded tool resolution and session ordering for issue #24471.
