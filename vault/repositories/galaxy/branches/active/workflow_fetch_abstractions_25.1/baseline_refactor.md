# Baseline refactor

Two baseline-test commits first, then two base refactors (owned getter for delete/undelete; `set_workflow_menu` dedupe collapse), then three behavior commits. Final tree equals the old head `543e93f84dd`. No code changes.

Old head: `543e93f84dd`. Local backup branch: `backup/workflow_fetch_abstractions_25.1_pre_baseline_refactor`.

## New history (base `release_25.1` `74f52289d82`)

| # | Commit | Kind |
|---|--------|------|
| 1 | `6236c1343e9` Baseline tests for workflow show_in_tool_panel updates | baseline |
| 2 | `c52b2aa8f49` Baseline tests for PUT /api/workflows/menu duplicate ids | baseline |
| 3 | `abec4a845aa` Add WorkflowsManager.get_stored_owned_workflow | refactor |
| 4 | `928cf0ac0c6` Collapse set_workflow_menu id handling into one resolve step | refactor |
| 5 | `d8503b89566` Take show_in_tool_panel bookmark id from the fetched stored workflow | fix |
| 6 | `c0315f70363` Fetch workflow update and refactor through owned/accessible getters | behavior |
| 7 | `a8b3dfd81e4` Fetch PUT /api/workflows/menu entries through get_stored_accessible_workflow | behavior |

## How the work was split

- **Baselines (1-2).** All test and helper changes that pass on the base implementation: `_shows_in_tool_panel`, `WorkflowPopulator.update_workflow_fields` / `set_workflow_menu`, the owner, share-recipient (`show_in_tool_panel` and `menu_entry`) and published-workflow bookmark tests, and the menu duplicate-id test. They are written in their final form, so the old helper commit `46b0774be8e` is gone. Its edits to tests that don't pass on base were moved into the behavior commits that add those tests.
- **Refactor 3.** Adds `get_stored_owned_workflow` and the return annotation on `get_stored_accessible_workflow`. Service `delete`/`undelete` switch from get + ownership check to the getter. The checks are the same: the old call used `check_ownership=True, check_accessible=True` defaults, and so does the new one.
- **Refactor 4.** The `dict.fromkeys` dedupe from old `543e93f84dd`, applied on base while keeping the base lookup (`trans.sa_session.get`). Ids now resolve before the existing entries are cleared, and the resulting entries are the same. The duplicate-id baseline test covers it. This turns behavior commit 7 into a one-line getter swap.
- **Fix 5.** The update bookmark block takes its id from `stored_workflow.id` instead of re-decoding the raw id. This was split out of old `0f5cdb3b750` together with `test_update_show_in_tool_panel_by_uuid`. That test was confirmed red on refactor 4 (400, unable to decode the UUID) and green at commit 5.
- **Behavior 6.** Legacy `PUT /api/workflows/{id}` and the refactor service choose the owned or accessible getter (`USER_MENU_UPDATE_KEYS`, renamed `__get_stored_owned_workflow`). Adds the tests for other-user and share-recipient updates and refactors.
- **Behavior 7.** `PUT /api/workflows/menu` resolves ids through `get_stored_accessible_workflow`. Adds `test_set_workflow_menu`.

## Validation

- Every commit: `ruff`, `black --check`, `isort --check-only` and `mypy` are clean on the 5 touched files (25.1-pinned `.venv` tools).
- At commit 2 (base implementation): `-k "show_in_tool_panel or drops_duplicate"` gave 4 passed.
- At commit 4 (with the UUID test present but uncommitted): baseline tests, `test_other_cannot_delete/undelete`, `test_delete*` and `test_undelete*` gave 9 passed. The UUID test failed, as expected.
- At commit 5: `-k "by_uuid or show_in_tool_panel"` gave 7 passed.
- At commit 7: the full branch set (`show_in_tool_panel`, `test_other_cannot`, `test_shared_user`, `test_set_workflow_menu`, `test_update`, `test_refactor`, `TestWorkflowSharingApi`, `TestAdminWorkflowsApi`) gave 32 passed. The first run had one flaky failure, `TestAdminWorkflowsApi::test_import_export_dynamic_tools`. It passed alone and in a full rerun.
- `HEAD^{tree}` equals `543e93f84dd^{tree}` (`675ebe8d911`).
