# Scope evaluation (second)

**Recommendation: keep scope as implemented (after the first expansion).** Import, update (incl. dry run) and shared-workflow copy all roll back embedded/copied tools atomically. The remaining candidates are separate issues (dedup by representation) or have no reachable failure path (dry-run unload API test). Per process, any further change would need John's decision, and none is warranted.

## Possible Decompositions

About 220 lines (~85 tests).
1. Toolbox `unload_dynamic_tool` + unit test (standalone).
2. `DynamicToolManager` rollback scope, import/update wrappers, subworkflow/tag flush, API tests (needs 1).
3. `copy_workflow_for_user` wrap (needs 2; no red test).

## As implemented

Scope in `DynamicToolManager` defers tool commits; import/update/copy use it; admin tools unloaded on rollback or dry run.

| Pros | Cons |
|---|---|
| - Covers every path that creates multiple tools per request<br>- Abstraction has three real consumers | - Copy-path wrap has no red test (stored tools already passed lint) |

## Add dry-run unload API test

| Pros | Cons |
|---|---|
| - Covers `discard=True` | - No API path reaches it: only refactor sets `dry_run`, and refactor exports carry `tool_uuid` |

## Deduplicate embedded tools by representation

| Pros | Cons |
|---|---|
| - Stops repeated imports multiplying private tools | - Different bug and behavior change; own issue |

## Wrap other `create_unprivileged_tool` callers

| Pros | Cons |
|---|---|
| - Uniform | - `api/dynamic_tools.py`, `agents/operations.py` create one tool per request; no partial-failure orphan |
