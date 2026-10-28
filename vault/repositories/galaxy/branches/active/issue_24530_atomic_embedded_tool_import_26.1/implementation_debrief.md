# Implementation debrief

STATUS: **READY**, stacked on #24475. Retarget it, or merge it after #24475 lands.

```
exists .../differential-review/snapshots/20261028T053619Z-hardening-dadc555490f8.json
  hardening @ dadc555490f8 vs workflow_import_embedded_tools (merge-base 82a993c494ad)
```

## Final implementation
- `DynamicToolManager.rollback_tools_on_error(discard=False)`: inside this scope, `create_tool` and `create_unprivileged_tool` (through `_save`) only flush and record the tool. On error the outermost scope rolls the session back and unloads the recorded admin tools; with `discard` it also unloads them after a successful dry run. Outside a scope they commit as before, so the dynamic-tool APIs, `build_module` and agents are unchanged.
- `AbstractToolBox.unload_dynamic_tool(uuid)`, the counterpart of `load_dynamic_tool`.
- Scopes wrap `build_workflow_from_raw_description`, `update_workflow_from_raw_description` (discard on dry run) and `WorkflowsManager.copy_workflow_for_user`.
- Subworkflow builds flush instead of commit, and workflow tags are set with `flush=False`, so nothing commits before the outermost import does.

## Decisions
- Stacked on #24475 (`release_26.1`), because it moves tool creation into `resolve_tool_uuid`, the code this fix changes.
- The scope key lives in `session.info`, so only the outermost scope rolls back.
- Re-scope: the shared-workflow copy is included. The original scope is kept as an alt.

## Tests
- API, red→green: user tools rolled back on import (`flat`, `nested`, `first_nested`) and on update. The admin `GalaxyTool` is rolled back and the toolbox returns 404 for it.
- Unit: `unload_dynamic_tool` restores the previous default version.
- The import/update/subworkflow/tag/UDT/shared API subsets, the unprivileged-tools API tests and `test_toolbox.py` pass. Lint is clean, and mypy shows the same error set as the base.

## Known gaps
- No test for the dry-run unload or for a partially failing shared copy; no API path reaches either.
- An embedded admin tool whose id and version match an installed tool still displaces it when loaded, and after a rollback it isn't restored. This is a pre-existing load behavior.

## Reviews
[subagents/](subagents/), [codex_review.md](codex_review.md), [thermo_nuclear_review.md](thermo_nuclear_review.md), [test_challenges_debrief.md](test_challenges_debrief.md), [baseline_refactor.md](baseline_refactor.md), [scope_evaluation.md](scope_evaluation.md), [implementation_rescope_debrief.md](implementation_rescope_debrief.md). Earlier hardening is in `earlier_drafts/1/`.
