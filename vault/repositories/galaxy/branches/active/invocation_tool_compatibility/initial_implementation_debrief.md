# Standalone early workflow tool compatibility validation

Branch: invocation_tool_compatibility
Working directory: /Users/jxc755/projects/worktrees/galaxy/branch/invocation_tool_compatibility
Base: origin/release_26.2 at0c70fdd5182c7425efecf7c8e76d6bd313de88b9
Uncommitted, pending parent review; no push.

Tool steps such as data-source tools cannot execute inside workflows, but submission currently accepts them and creates an invocation/history before the runtime backstop rejects scheduling. The service now checks tool availability and workflow compatibility before building run configs. It resolves each tool reference once through toolbox.get_tool, preserving tool_id, tool_version, tool_uuid, exact and user options from the existing availability check. Missing tools keep their original message/ordering and take precedence over incompatible tools. Incompatibility returns RequestParameterInvalidException400. The runtime backstop remains unchanged.

ToolLike protocol now declares is_workflow_compatible, already provided by Tool and CachedTool metadata. The service reads the metadata directly and does not force materialization of lazily loaded cached tools. No changes to toolbox lookup/fallback semantics.

Scope excludes all landing-request, scheduler, completion-action, object-store, scalar/input validation and broad run-config refactor work.

API regressions:
- test_run_with_workflow_incompatible_tool: genuine installed test_data_source fixture, both new and existing history target; asserts400, incompatibility message, no invocation, no jobs in existing history and no new history.
- test_run_with_missing_and_incompatible_tools: genuine nonexistent_tool0.1 plus incompatible test_data_source, exact true/false. Downloaded native workflow confirms missing reference/version retained. Asserts400 and unchanged versioned/plain missing-tool message (missing precedence), no invocation/history.

Red:4failures. Incompatible cases returned200/queued; missing cases returned expected400/messages but left orphan histories. /private/tmp/invocation-tool-compatibility-red.log
Green:5passed, four new cases plus existing test_run_workflow_by_name (compatible actual execution). /private/tmp/invocation-tool-compatibility-green.log

Avoided manufacturing a builtin version-mismatch fixture: builtin importer/get_tool intentionally normalize/fallback versions, and exact applies to IDs. The implementation preserves original lookup kwargs and focused exact/plain missing messages instead. No network-installed tools or mocks.

Full hooks passed after Black test formatting; git diff --check passed. /private/tmp/invocation-tool-compatibility-hooks.log
Existing shared Python3.13 env through ignored .venv symlink, no shared env changes.

Diff:3files,86additions23removals (includes moving existing missing-message handling into helper). No commit.

Ready for parent review/commit,5focusedAPIgreen.
