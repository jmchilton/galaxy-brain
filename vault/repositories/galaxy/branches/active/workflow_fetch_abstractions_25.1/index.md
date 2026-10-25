# workflow_fetch_abstractions_25.1

- Open PR (not yet)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/workflow_fetch_abstractions_25.1)

## Status

Status: `implementing` — implemented and reviewed, hardening in progress. See [initial debrief](initial_implementation_debrief.md).

Base: `release_25.1` (`74f52289d82`), head `0f5cdb3b750`. Fork: `jmchilton/workflow_fetch_abstractions_25.1`. Worktree: `~/projects/worktrees/galaxy/branch/workflow_fetch_abstractions_25.1`.

## Scope

Add an owned stored-workflow getter on `WorkflowsManager` alongside `get_stored_accessible_workflow`, and route workflow API/service paths through the getter matching what they do (delete, undelete, refactor, legacy `PUT /api/workflows/{id}`). Per-user bookmark updates (`show_in_tool_panel`/`menu_entry`) and `PUT /api/workflows/menu` use the accessible getter.

## Decisions

- Base `release_25.1` on John's request.
