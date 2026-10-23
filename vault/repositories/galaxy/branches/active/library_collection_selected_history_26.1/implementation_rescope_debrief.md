# Re-scope debrief

The scope evaluation recommended a modest expansion. "Auto Build List" and "Advanced Build List" (`ListWizard`) record which history the selection came from, but still built in the current history. That is the same root cause as the library bug. Without fixing it, "Build Dataset List" and the wizard entries in the same Selection menu would disagree on an owned non-current history's view page. I confirmed this in `ListWizard.vue` before expanding.

- **Original scope:** kept as alt `library_collection_selected_history_26.1_alt_original_scope` (`c57876ad7b5`); see [alts/original_scope.md](alts/original_scope.md).
- **New commit `469a571f614`:**
  - `ListWizard` feeds the store's `historyId` to `useCollectionCreation` and to both creators' `history-id`.
  - The success alert no longer says "your history".
  - Test helpers can now target a history that isn't current:
    - `history_panel_item_selector` and `history_panel_muli_operation_select_hid` take a `history_id`.
    - `use_bootstrap_dropdown` and `history_panel_build_list_auto`/`_advanced` take a `scope`.
  - New E2E, `test_build_list_in_viewed_history`.
- **Red/green:** without the fix, the E2E times out waiting for the list in the viewed history (Selenium). With it, the E2E passes under both Selenium and Playwright. `test_collection_builders.py` passes 9/9 under Selenium, and Collections vitest passes 30/30.
- **Normal review:** ship it; two nits applied ([subagents/rescope_normal_review.md](subagents/rescope_normal_review.md)).
- **Correction to earlier notes:** the side effect is on the History view page of an owned non-current history, not in multiview. The Selection menu is hidden in multiview.
- **Observed, not investigated:** the view page's selection counter shows "1 of 0 selected".
