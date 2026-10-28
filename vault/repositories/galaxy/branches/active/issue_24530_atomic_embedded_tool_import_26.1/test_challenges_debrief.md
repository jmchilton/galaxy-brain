# Test challenges debrief (re-harden after re-scope)

Scope: `git diff 82a993c494a...HEAD`. Fresh pass; earlier_drafts/1 for reference only.

## Kept
- `test_unload_dynamic_tool_restores_previous_default` (unit, toolbox): behavior-level (versions/default restore via `get_tool`), no mocks; the restore-prior-version case isn't reachable cheaply via API. Exercises `unload_dynamic_tool` through real `load_dynamic_tool`.
- `test_failed_import_rolls_back_embedded_user_tools[nested=False/True]` (API): covers flat + subworkflow import; uses populators.
- `test_failed_import_rolls_back_embedded_admin_tools` (API): admin tool created then user tool 403s; asserts DB list + toolbox 404.

No mocks/SimpleNamespace to replace; helpers already used (`_embedded_tools_workflow`, populator list methods). No baseline-tests commits on branch. No UI change, so no E2E.

## Added
- `test_failed_update_rolls_back_embedded_user_tools` (commit b194608fde6): PUT update path (`update_workflow_from_raw_description` wrapper) was untested. Uses existing `workflow_populator.update_workflow`. Green with branch; red (FAILED) with wrapper replaced by `if True:`.

## Gaps not acted on
- `discard=dry_run` unload path: no API route dry-runs an update with embedded `tool_representation` cheaply (refactor dry_run doesn't create tools). Left untested.
- `copy_workflow_for_user` rollback (b47fbef2c2c): needs the 2nd tool copy to fail after the 1st succeeds; tools are prelinted and permission fails on the first copy, so no realistic API trigger.
