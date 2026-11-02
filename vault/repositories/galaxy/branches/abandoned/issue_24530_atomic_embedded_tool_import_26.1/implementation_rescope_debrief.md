# Re-scope debrief

The scope evaluation recommended a modest expansion. `WorkflowsManager.copy_workflow_for_user`, used by shared-workflow import, creates private tool copies in a loop with the same commit-per-tool orphaning. Commit `b47fbef2c2c` wraps the loop in `rollback_tools_on_error`. The copies are now only flushed, and `_import_shared_workflow` (its only caller) commits them with the workflow.

Not taken from the evaluation:
- Dry-run unload API test: the test challenge found no API path that reaches it. Only refactor sets `dry_run`, and refactor exports carry a `tool_uuid`.
- Deduplicate by representation: that's a separate issue.

No red test for the copy path: stored user tools have already passed lint, so there's no API way to make a later copy fail after an earlier one succeeds. The shared/UDT API tests still pass (24).

The original scope is kept as an alt; see [alts/original_scope.md](alts/original_scope.md).
