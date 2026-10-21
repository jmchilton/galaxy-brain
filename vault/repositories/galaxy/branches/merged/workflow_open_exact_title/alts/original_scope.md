# original_scope

Branch `workflow_open_exact_title_alt_original_scope` (head `de0dae90db7`, base `65132d40dac`) is the branch as hardened before the scope expansion:

- the `_workflow_card_action` refactor;
- the title-matched card lookup for `workflow_index_open_with_name` / `workflow_run_with_name`;
- `test_open_and_run_workflow_by_exact_title`.

The parent also routes `workflow_delete_by_name` / `workflow_bookmark_by_name` through the title-matched lookup, with test coverage, and drops a dead assignment in `test_workflow_editor_undo_redo.py`.
