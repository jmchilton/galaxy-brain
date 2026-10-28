# Thermo-nuclear review (82a993c494a...HEAD)

Acted on: replaced the `commit: bool` flag in `create_tool`/`create_unprivileged_tool` with scope detection (`_save` commits, or flushes + tracks when inside `rollback_tools_on_error`). Commit d2da4cc9d8d, pushed.

Not acted on:
- Splitting `build/update_workflow_from_raw_description` into wrapper + `_impl`: acceptable; a decorator would hide the dry_run arg.
- `session.info` registry as a side channel: kept; SQLAlchemy commit/rollback event hooks would be more magic.
- `unload_dynamic_tool` restore uses `max(version_object)` vs `register_tool`'s `_newer_tool`; equivalent in practice, minor.
- `remove_tool_by_id` also expires `tool_cache` for the shared id on unload; harmless.
- No file crosses 1k lines due to this diff.

<details>

## Findings

1. **Real bug, fixed: `commit=False` leaked outside import scope.** `ToolModule.resolve_tool_uuid` hard-coded `commit=False`, but `from_dict` also serves `/api/workflows/build_module` with no rollback scope. Embedded tools there were flushed but never committed, and admin tools were loaded into the toolbox untracked. The boolean flag also threaded through three layers. Fix: managers look up the active scope themselves, so the flag disappears and callers outside a scope keep committing.
2. `create_tool` had split `flush=commit` + `if not commit: flush()`; it's now one `_save` path shared with unprivileged tools.
3. Subworkflow `flush` vs `commit` branch in `_build_workflow_from_raw_description` is justified by the nesting; comment is clear.

Tests: test_toolbox.py (51 passed), API `-k "rolls_back_embedded or embedded_user_tools_after_step_metadata or user_defined"` (30 passed). black/ruff/isort/mypy clean.

</details>
