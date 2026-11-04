# Re-scope debrief

The first scope evaluation ([earlier_drafts/1/scope_evaluation.md](earlier_drafts/1/scope_evaluation.md)) recommended a modest expansion. Besides the fix, the exact-version missing-tool 400 should name the versions installed under the requested id. A real version mismatch then stops reading as "not installed", which was the misleading text the issue complained about.

- The original scope is kept as `issue_24722_unversioned_tool_preflight_26_2_alt_original_scope` (`ae1c7f50bc0`); see [alts/original_scope.md](alts/original_scope.md).
- New commit `363783a0bff`. `_describe_tool_references` takes an optional `installed_versions` map. The pre-flight fills it in exact mode only, for missing references with an id and no uuid, using `get_tool(..., get_all_versions=True)` filtered by `allow_user_access`. Example: `compose_text_param (version 0.0.1, installed: 0.1.0)`. Non-exact messages, and ids with no installed versions, are unchanged.
- Updated message assertions: `test_run_workflow_with_missing_tool`, `test_run_workflow_with_unversioned_shed_tool_id_wrong_version` (both in `test_workflow_invocation.py`, under both toolboxes) and `test_tool_source_storage.py::test_exact_workflow_invocation_reports_missing_tool_version` (cached: `installed: 0.1, 0.1+galaxy6, 0.2`).
- The re-scope review ([subagents/rescope_review.md](subagents/rescope_review.md)) found no blockers. Two small fixes were folded in.
- Green: `test_workflow_invocation.py` + `test_tool_source_storage.py` (46), and `lib/galaxy_test/api/test_workflows.py -k "missing or incompatible"` (17).
