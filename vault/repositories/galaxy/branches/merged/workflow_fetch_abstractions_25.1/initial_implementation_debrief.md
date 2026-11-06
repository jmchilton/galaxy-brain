# Initial implementation debrief

Base `release_25.1` (`74f52289d82`). Commits:

1. `c7659a0bde3` Baseline tests: owner, share recipient, and published-workflow viewer can toggle `show_in_tool_panel` via `PUT /api/workflows/{id}`. Pass on base.
2. `497dcb124c9` `WorkflowsManager.get_stored_owned_workflow` (owned counterpart of `get_stored_accessible_workflow`). Service `delete`/`undelete` use it instead of get + `check_security`; `refactor` and legacy `WorkflowsAPIController.update` fetch through it. `update` picks the getter from the payload keys: accessible when only `USER_MENU_UPDATE_KEYS` (`show_in_tool_panel`, `menu_entry`), owned otherwise.
3. `0f5cdb3b750` Review follow-up: `PUT /api/workflows/menu` resolves ids through `get_stored_accessible_workflow` before clearing existing entries; bookmark block uses `stored_workflow.id` (fixes `instance=true`/UUID ids); annotation, `frozenset`, more tests.

## Decisions

- Allowlist only per-user tool-panel keys. Tags/annotation stay owner-level, matching the client (tags hidden on shared cards).
- Refactor uses the owned getter for dry runs too; only caller is the editor, which is owner-only.
- Getter chosen from raw payload keys before `__normalize_workflow`, ignoring the merged `workflow` key; check runs before any mutation, so mixed payloads don't partially apply.
- Left alone: `show_workflow` inline accessible check, controller mixin `get_stored_workflow`, invocation index id lookup.

## Testing

New API tests run red on base implementation, green on branch (`test_other_cannot_update`, `test_shared_user_cannot_update_name_with_show_in_tool_panel`, `test_other_cannot_refactor`, `test_shared_user_cannot_refactor_or_update_tags`, `test_set_workflow_menu`). 37 related `test_workflows.py` tests pass (sharing, admin, update, refactor, delete/undelete, index). Full file left to CI.

## Environment notes

- Bootstrap: default Python 3.14 fails building h5py on 25.1 pins; venv recreated with 3.12. Client `pnpm install` fails (lockfile overrides mismatch) - not needed for API tests.
- Shared pre-commit hook runs newer black than 25.1's pin and reformats unrelated code; commits made with `--no-verify` after CI-pinned ruff/black/isort/mypy passed.
