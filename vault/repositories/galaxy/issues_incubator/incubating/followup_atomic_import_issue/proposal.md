# Workflow import can leave orphaned embedded tools when a later step fails

A workflow import that embeds tools commits each embedded tool as it's created, so if a later step fails the request errors out but the tools stay in the database and the user's tool list.

```
POST /api/workflows  (step 0: valid embedded GalaxyUserTool, step 1: embedded GalaxyUserTool failing lint)
→ 400 "Tool failed lint checks: ...", no workflow created
GET /api/unprivileged_tools
→ one new tool, referenced by no workflow   (retry → another copy)
```

Embedded tools (`tool_representation`) are created while steps are built, in `ToolModule.from_dict` (`lib/galaxy/workflow/modules.py`):

- `GalaxyUserTool` → `DynamicToolManager.create_unprivileged_tool`, which commits after adding the `UserDynamicToolAssociation`.
- Admin `GalaxyTool` / CWL → `DynamicToolManager.create_tool`, whose `self.create(...)` commits (base manager `create(flush=True)`) and then registers the tool in the toolbox via `load_dynamic_tool`.

Any later failure (a second embedded tool failing lint, invalid step state, a permission error) aborts the import, but the earlier commits already landed. User tools are owned by the importer and show up in their tool list; each retry adds another copy. Admin tools also stay loaded in the toolbox.

## Context

A follow-up to 🔀 #24475, raised in review. That PR resolves embedded tools before steps are built so the tool commit can't flush partially built steps; it doesn't change the orphaning, which already happens on `dev`.

## Proposed Approach

Make embedded-tool creation part of the import's transaction: let the `DynamicToolManager` create methods flush without committing, and let `build_workflow_from_raw_description` own the single commit. Register admin tools in the toolbox only after that commit.

<details><summary>Details</summary>

- Add a `commit`/`flush`-only option to `create_tool` and `create_unprivileged_tool` (keep the current committing default for the API endpoints and `agents/operations.py`).
- Pass the no-commit option from `ToolModule.from_dict`; the import's existing commit persists the tools with the workflow, and a failure rolls them back.
- Embedded subworkflows are built through `build_workflow_from_raw_description(..., is_subworkflow=True)`, which commits too; only the outermost call should commit.
- Cover `update_workflow_from_raw_description` as well: it builds steps the same way, so a failed update (or a `dry_run`) also leaves created tools.
- Defer `toolbox.load_dynamic_tool` for import-created admin tools until after commit, or unload on failure, so the toolbox never holds a tool whose row was rolled back.

Testing (red first):

- API test: import a workflow with a valid embedded `GalaxyUserTool` followed by one that fails lint; assert a 400 and that `GET /api/unprivileged_tools` is unchanged.
- Same for the admin `GalaxyTool` path, checking `GET /api/dynamic_tools`.

</details>

## Alternative Approaches

A savepoint around the import, or cleanup that deactivates already created tools on failure, would also work, but the first nests awkwardly with the managers' own commits and the second leaves inactive rows behind; a single commit is simpler. Separately, reusing an owned tool with an identical representation would stop retries from piling up copies, but it doesn't fix the orphan on a single failed import.

<details><summary>Alternatives In Detail</summary>

### Alternative: Savepoint (`begin_nested`) around the import

<details><summary>Description</summary>

#### Details

Wrap step building in a SAVEPOINT and roll back to it on failure.

#### Why the proposed approach is preferred

The managers call `session.commit()`, which commits the outer transaction and defeats the savepoint; the commits have to be removed either way.

</details>

### Alternative: Compensating cleanup on failure

<details><summary>Description</summary>

#### Details

Track tools created during the import and deactivate them in an `except` block.

#### Why the proposed approach is preferred

Leaves inactive rows, misses crashes between create and cleanup, and duplicates what a rollback does for free.

</details>

### Alternative: Deduplicate by representation

<details><summary>Description</summary>

#### Details

Reuse an existing owned tool whose representation matches instead of creating a new one.

#### Why the proposed approach is preferred

Worth doing on its own to stop copies on repeat imports, but the first failed import still leaves an orphan.

</details>

</details>
