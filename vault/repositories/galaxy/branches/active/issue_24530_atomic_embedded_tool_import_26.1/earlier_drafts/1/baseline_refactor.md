No refactoring of the base branch was performed.

Reviewed `82a993c494a..HEAD` (4 commits, 6 files). Every non-test change is part of the fix itself; nothing is behavior-preserving on its own. History left as is (no rewrite, no push).

## Candidates considered

- `DynamicToolManager._save` (commit vs flush+track). Only a commit-only `_save` could land first; it would just wrap `session.commit()`, and `create_unprivileged_tool` would need `flush=False` + `session.flush()` to fetch the id. That merges two commits into one (an atomicity change), so it isn't a pure refactor, and saves ~6 diff lines. Not worth a commit.
- `build_workflow_from_raw_description` / `update_workflow_from_raw_description` split into wrapper + `_impl`. Without the rollback scope the wrapper is pointless indirection; it exists only to hold the context manager (update passes `discard=dry_run`).
- `AbstractToolBox.unload_dynamic_tool`. New capability (counterpart of `load_dynamic_tool`), not a restructure of existing code.
- Subworkflow `flush` vs `commit` in `_build_workflow_from_raw_description`. Behavior change required by the fix.
- Test helper `_embedded_tools_workflow`. Existing embedded-tool tests build workflow dicts differently (`_build_user_defined_tool_run_workflow_dict` etc.), so nothing to fold into it, and the red->green rollback tests are not baseline tests (they fail on the base).
- Docstring/comment edits in `resolve_tool_uuid` and the step-resolution comment: only valid once commits are deferred.
