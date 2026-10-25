# Baseline refactor

The branch now runs in this order: two baseline-test commits, then two refactors of the base (the owned getter for delete/undelete, and the `set_workflow_menu` resolve collapse), then four behavior commits. The final tree equals the old head `2610c4e6ed1` (`e3674b352d5`). No code changes.

Old head: `2610c4e6ed1`, still at `jmchilton/workflow_fetch_abstractions_25.1`. The new head `fac396515e4` is not pushed. The temporary backup branch was deleted.

## New history (base `release_25.1` `74f52289d82`)

| # | Commit | Kind |
|---|--------|------|
| 1 | `e7b5a77b407` Baseline tests for workflow show_in_tool_panel updates and PUT /api/workflows/menu | baseline |
| 2 | `b4a83ce27cc` Baseline tests for workflow show and admin update | baseline |
| 3 | `b81c3a799b9` Add WorkflowsManager.get_stored_owned_workflow | refactor |
| 4 | `680bc5dc1a7` Collapse set_workflow_menu id handling into one resolve step | refactor |
| 5 | `77b06ed3503` Take show_in_tool_panel bookmark id from the fetched stored workflow | behavior |
| 6 | `24eac9c1fb1` Fetch workflow update and refactor through owned/accessible getters | behavior |
| 7 | `c519a9986e1` Fetch PUT /api/workflows/menu entries through get_stored_accessible_workflow | behavior |
| 8 | `fac396515e4` Fetch workflow show through get_stored_accessible_workflow | behavior |

## How the work was split

- **Baseline 1.**
  - `populators.py` lands here in its final form: `update_workflow_fields` with the `admin` kwarg, `set_workflow_menu`, and `update_workflow` delegating to `update_workflow_fields`. It does not change again.
  - Adds the stricter `_shows_in_tool_panel` helper, which asserts the workflow appears exactly once in the index.
  - Tests the owner, share-recipient and published-workflow bookmark updates, and the duplicate-id handling of `PUT /api/workflows/menu`.
  - This absorbs the old `6236c1343e9`, `c52b2aa8f49` and the helper half of `2610c4e6ed1`.
- **Baseline 2.**
  - Adds the shared-user, anonymous-importable and admin show tests, plus the admin update test.
  - Switches `test_workflow_publishing` to `update_workflow_fields`.
  - This moves the old `db75b1d027d` up front.
- **Refactor 3.**
  - Adds `get_stored_owned_workflow` and the return annotation on `get_stored_accessible_workflow`.
  - Fixes the docstrings of `get_stored_accessible_workflow` and `get_owned_workflow`. The `get_owned_workflow` fix comes from the old `5531402899b`, the other from `deca37cd456`.
  - Service `delete`/`undelete` switch from get + ownership check to the new getter. The checks are the same.
  - The error-message change on the accessible getter is left out. It changes what every caller returns, so it moved to commit 8.
- **Refactor 4.** Applies the `dict.fromkeys` dedupe on base, still resolving ids with `trans.sa_session.get`, so behavior is unchanged. The duplicate-id baseline test covers it.
- **Behavior 5.**
  - The bookmark block uses `stored_workflow.id`, so UUID and `instance=true` ids now work.
  - The `decoded_id` local from the old `2ee06f67158` is gone, folded into this commit.
  - Adds `test_update_show_in_tool_panel_by_uuid`.
- **Behavior 6.**
  - Adds `USER_MENU_UPDATE_KEYS` and chooses the owned or accessible getter in legacy `PUT /api/workflows/{id}` and the refactor service.
  - Renames the helper to `__get_stored_owned_workflow`.
  - The bookmark condition uses `USER_MENU_UPDATE_KEYS & workflow_dict.keys()`. That came from the old `5531402899b` and lives here because this commit adds the constant.
  - Adds four update/refactor tests. `test_shared_user_cannot_refactor_or_update` lands in its final form, with the `hidden` field from the old `3d468a3a509` folded in.
- **Behavior 7.** `PUT /api/workflows/menu` resolves through `get_stored_accessible_workflow`. Adds `test_set_workflow_menu`.
- **Behavior 8.**
  - `show_workflow` goes through `get_stored_accessible_workflow`, and the getter takes over show's error message.
  - Base show checked `importable is False`, while the getter checks `not importable`. A workflow with an unset `importable` therefore changes behavior, so the swap is not behavior-preserving and it stays in the behavior commits.
  - Adds `test_cannot_show_workflow_with_unset_importable`.
  - The getter's new message is the text that `test_workflow_sharing.py` (Selenium) and the client's `WorkflowInvocationOverview` test already expect.

## Validation

- **Lint:** every commit is clean under `ruff check`, `black --check`, `isort --check-only` and `mypy` on its touched files, using the worktree `.venv` tools.
- **Red check:** at commit 4 (the refactor tip), the final test files were checked out over the tree and the full branch set was run. Result: 39 passed, 7 failed. The failures were exactly the behavior tests:
  - `by_uuid` (400, unable to decode)
  - `test_other_cannot_update`, `test_shared_user_cannot_update_name_with_show_in_tool_panel`, `test_other_cannot_refactor`, `test_shared_user_cannot_refactor_or_update`, `test_set_workflow_menu` (200 where 403 is expected)
  - `test_cannot_show_workflow_with_unset_importable` (200 where 403 is expected)
  
  Every other test passed, which confirms the two refactors preserve behavior.
- **Commit 3:** `-k "delete or undelete"` (owner and other-user delete/undelete, plus workflow runs that delete intermediates) gave 11 passed.
- **Commit 2, baseline set:** 9 passed.
- **Commit 5:** `show_in_tool_panel or drops_duplicate` gave 5 passed.
- **Commit 6:** `show_in_tool_panel or test_other_cannot or test_shared_user or test_admin_can_update or test_refactor or test_update` gave 23 passed.
- **Commit 7:** `test_set_workflow_menu` gave 2 passed.
- **Final head, full branch set:** `show_in_tool_panel`, `test_other_cannot`, `test_shared_user`, `test_set_workflow_menu`, `test_update`, `test_refactor`, `test_show`, `test_cannot_show`, `test_anon`, `test_admin`, `test_workflow_publishing`, `TestWorkflowSharingApi` and `TestAdminWorkflowsApi` gave 46 passed.
- **Tree:** `HEAD^{tree}` equals `2610c4e6ed1^{tree}` (`e3674b352d5`).
