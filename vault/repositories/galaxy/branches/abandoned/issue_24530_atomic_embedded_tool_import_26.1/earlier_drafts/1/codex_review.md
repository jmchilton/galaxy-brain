# Codex review debrief

Codex found 3 issues. I made no code changes: all three were refuted, or have no caller that reaches them today.

Not acted on:
- **P1 (same id and version collision on unload): refuted.** Traced for two tools A and B with the same id and version. `register_tool(B)` keeps A as the default, because B is not newer. Unloading A drops A as the default and restores B from the versions map. Unloading B then deletes the map entry and the default. Nothing that was rolled back stays registered. A tool already present with the same id and version would be displaced in the versions map, but loading does that on a successful import as well, so this change doesn't introduce it.
- **P2 (rows flushed by a dry run, then a later commit on the same session): no caller.** Only refactor sets `dry_run`, and nothing commits after it in that request. Before this change, the dry run committed those rows outright. Rolling back on a successful dry run would expire the detached workflow that gets returned, so I left it as is.
- **P2 (`_sync_stored_workflow` failing after commit unloads committed tools): harmless.** `ToolBox._get_tool_by_uuid` (`tool_util/toolbox/base.py` ~408) lazily reloads a dynamic tool from the DB when it isn't cached, so the committed tool comes back on its next lookup.

<details><summary>Raw findings</summary>

1. P1 `toolbox/base.py:450`: rollback can leave a failed embedded tool registered when ids and versions collide.
2. P2 `managers/tools.py:266`: a successful dry run leaves flushed tool rows in the session.
3. P2 `managers/workflows.py:907`: a failed post-commit path sync unloads committed tools.
</details>
