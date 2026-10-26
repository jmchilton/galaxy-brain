# Polish E2E tests debrief

Moved `_assert_selection_cleared` raw CSS selectors into `navigation.yml` (`history_panel.multi_operations.selectors.selected_content_menu`, `item_selector`).

- No sleeps added by branch.
- Screenshots: existing tests already capture builder screenshots; no new component coverage.
- DOM already has `data-description="selected content menu"`; `.selector` checkbox class reused (same as `history_panel_muli_operation_select_hid`). No decoration/client refactor needed (25.1 target).
- Helper used twice, kept private to `test_collection_builders.py`.
- Verified: `test_build_list_simple_hidden`, `test_build_paired_list_auto_matched` pass.
