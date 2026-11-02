# Scope evaluation

**Recommendation: modest expansion.** Keep the implementation as it is, and also wrap `WorkflowsManager.copy_workflow_for_user` (`workflows.py:185`) in `rollback_tools_on_error`. That path has the same orphan bug: it creates one `create_unprivileged_tool` copy per tool in a loop, so if a later copy fails (for example a permission or lint error), the earlier copies are left behind. The debrief deferred this as "out of scope". With the scope-detecting managers from d2da4cc9d8d, the fix is a one-line `with` block plus one API test. Also add the missing dry-run unload API test. Do not take on dedup-by-representation.

## Possible Decompositions

The branch diff is about 187 lines (about 72 of them tests).
1. Toolbox `unload_dynamic_tool` and its unit test: standalone infra, lands first.
2. The `DynamicToolManager` rollback scope, the workflow import/update wrappers and the API tests: depends on 1.
3. (If expanded) The copy-path wrap and its test: depends on 2.

## As implemented

Import and update (including dry run) of embedded user and admin tools roll back on error. Admin tools are unloaded from the toolbox. Outside a scope, callers keep committing.

| Pros | Cons |
|---|---|
| - Covers every case in the issue: flat, nested, admin, update and dry run<br>- Reusable scope that callers detect themselves, with no flag threading | - Copy path still orphans tools<br>- Dry-run unload has no API test |

## Modest expansion (recommended)

As implemented, plus the copy path (`copy_workflow_for_user`) runs inside the rollback scope, plus an API test for the dry-run unload.

| Pros | Cons |
|---|---|
| - Fixes the same bug in touched code (same manager, same `create_unprivileged_tool`)<br>- Gives the new abstraction a second real consumer<br>- Small diff | - Needs a test that makes the second copy fail (e.g. revoke USER_TOOL_EXECUTE)<br>- The copy callers' commit point needs checking to confirm a single commit |

<details><summary>Details</summary>

`copy_workflow_for_user` creates the copies before `workflow.copy`. Each `create_unprivileged_tool` call commits outside a scope. Once wrapped, the copies flush, and they persist with the caller's commit of the copied workflow. Check that its callers (import-shared and copy endpoints) commit after this call, or the wrap would need an explicit commit. The other committing callers (`api/dynamic_tools.py`, `agents/operations.py`) create one tool per request, so they have no partial-failure orphan.
</details>

## Larger: deduplicate by representation

Reuse an owned tool whose representation matches instead of creating a copy. Raised as an alternative in the proposal.

| Pros | Cons |
|---|---|
| - Stops copies piling up on repeat successful imports | - A different bug (duplicates, not orphans)<br>- Has semantic questions (hash identity, versioning, sharing)<br>- Better as its own issue |

## Contraction: user tools only

Drop the admin toolbox unload and the dry-run discard.

| Pros | Cons |
|---|---|
| - Smaller; no toolbox change | - Leaves rolled-back admin rows loaded in the toolbox, which is worse than the orphan<br>- The issue explicitly asks for it |
