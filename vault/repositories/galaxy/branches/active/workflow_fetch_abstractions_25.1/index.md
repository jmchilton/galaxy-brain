# workflow_fetch_abstractions_25.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_25.1...jmchilton:galaxy:workflow_fetch_abstractions_25.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/workflow_fetch_abstractions_25.1)

## Status

Status: `implemented_needs_ci` — READY: implemented, re-scoped, re-hardened. See [implementation debrief](implementation_debrief.md).

No PR yet; CI not run.

Base: `release_25.1` (`74f52289d82`), head `fac396515e4`. Fork: `jmchilton/workflow_fetch_abstractions_25.1`. Worktree: `~/projects/worktrees/galaxy/branch/workflow_fetch_abstractions_25.1`. Alt: `workflow_fetch_abstractions_25.1_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)).

## Scope

Add an owned stored-workflow getter on `WorkflowsManager` alongside `get_stored_accessible_workflow`, and route workflow API/service paths through the getter matching what they do (show, delete, undelete, refactor, legacy `PUT /api/workflows/{id}`). Per-user bookmark updates (`show_in_tool_panel`/`menu_entry`) and `PUT /api/workflows/menu` use the accessible getter.

## Decisions

- Base `release_25.1` on John's request.
- Kept scope after second scope evaluation; mixin/`pages.py` consolidation and legacy `update` merge cleanup left for a dev follow-up.
