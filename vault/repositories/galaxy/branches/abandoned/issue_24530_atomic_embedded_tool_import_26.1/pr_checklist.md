Run via Claude Opus 5.5 at medium effort.

## General

- [x] What does the user see when it fails? The same error as before (400 "Tool failed lint checks", 403 without `USER_TOOL_EXECUTE`), but no orphaned tools are left in their tool list or the toolbox.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. API tests assert `/api/unprivileged_tools`, `/api/dynamic_tools` and `tools/{id}` are unchanged after failure; the toolbox unit test round-trips `load_dynamic_tool`/`unload_dynamic_tool` and checks `get_tool` results.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A. The new tests fail on the base (red→green); no baseline tests (`baseline_refactor.md`).
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A. The rewritten `resolve_tool_uuid` comment and docstring drop the old "commits the session" note rather than describe it.

## Workflow-related

- [x] Which existing workflows change behavior (if any)? None on success. A failed import, update or shared copy no longer persists embedded tools or hidden subworkflow `StoredWorkflow`s; subworkflows now flush and commit with the outermost import.
- [x] Who hits this in practice and what is the evidence? Users importing or updating workflows with embedded user-defined tools (beta tool formats) when a later step fails; each retry adds another copy.
<details><summary>Evidence</summary>

Raised in review of #24475 (`workflow_import_embedded_tools/review_pushback_dannon_1.md`) and filed as #24530 with a reproduction. No field reports; the API tests reproduce it on the base for flat, nested and first-nested layouts and for update.
</details>

- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Yes. The issue's commit/flush flag threaded through `create_*` and `ToolModule` was implemented first, then replaced with a `rollback_tools_on_error` scope so callers need no flag.
<details><summary>Details</summary>

- Commit flag (issue proposal, commit `9615784f3aa`): replaced in `d2da4cc9d8d` because `commit=False` in `ToolModule` also left `build_module` and other non-import callers flush-only, with admin tools loaded but untracked; the scope keeps the dynamic-tool APIs, `build_module` and agents committing as before with no signature changes.
- Registering admin tools only after the commit (issue proposal): not used; tools are loaded at creation, as step building needs them, and unloaded on rollback via the new `AbstractToolBox.unload_dynamic_tool`.
- Import/update only, without the shared-copy wrap: kept as `alts/original_scope.md`.
- Wrapping other `create_unprivileged_tool` callers and deduplicating by representation: rejected in `scope_evaluation.md` (single-tool requests; separate bug).
</details>
