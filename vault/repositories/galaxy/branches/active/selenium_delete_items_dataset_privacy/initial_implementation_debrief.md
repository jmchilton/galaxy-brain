# Initial implementation debrief

Pulled `d0d92741f74` and `ea0bc576e38` out of `galaxy_ui_driver` onto `release_26.2` and hardened their tests. Head `5003927cb27`.

## Choices

- **Dropped `53ab472b46d`** (`edit_dataset_auto_detect_datatype`). gxui is its only motivation, and it rewrites the `test_history_dataset_auto_detect_datatype` lines that #24347 also rewrites (`_click_and_assert_success_alert`), so it would conflict. It stays in `galaxy_ui_driver`.
- **26.2 spelling.** 26.2 still has `history_panel_muli_operation_select_hid` (the rename `9bd925d19a1` is unmerged), so the delete test calls it.
- **Insertion points moved** so `git merge-tree` is clean against every queued 26.2 sibling: delete helpers after `history_panel_multi_operation_action_click`, delete test before `test_history_panel_annotations_change`.
- `test_rerun_deleted_dataset` now uses `history_panel_item_delete`, so the new helper has a caller outside the new test.

## Hardening

Delete test:
- After Include deleted: hid 2 shows Undelete, hid 3 (purged) is listed but has no Undelete.
- After Undelete: turning Include deleted off shows hid 1 with its delete button and hides 2 and 3.

Privacy test:
- The switch starts on for a fresh user (26.2's `new_user_dataset_access_role_default_private: true`).
- Each set is re-read from a fresh Preferences load (persisted).
- UI `manage` must be `[email]` in both states, so the empty `access` check can't pass on a broken selector.
- API `access == manage` (was `len(access) == 1`).
- `user_preferences_set_new_datasets_private` waits for the switch to land, not just any toast. A new `user_preferences_new_datasets_private()` getter backs it.

## Finding: undelete under Include deleted hides the item

`HistoryPanel.vue` `onUndelete` calls `setInvisible(item)` up front. That is right under a `deleted:true` filter, where the item leaves the list. Under Include deleted (`deleted:any`), hid 1 vanished from the panel and stayed gone past the wait timeout, though the API showed it undeleted. Toggling the filter resets `invisibleHistoryItems` and brings it back. dev has the same code. The test asserts after the toggle rather than pinning the bug. Fix candidate: only hide on undelete when the current filter excludes non-deleted items, mirroring the intent of `onDelete`.

## Tests

Each run alone, framework-managed server, client built in place:
- `test_delete_undelete_and_purge_items`: Playwright and Selenium green.
- `test_new_datasets_private_switch`: Playwright and Selenium green.
- `test_rerun_deleted_dataset`: Selenium green.
