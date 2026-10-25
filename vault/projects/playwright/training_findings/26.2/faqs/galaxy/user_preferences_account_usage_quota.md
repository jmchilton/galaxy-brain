# faqs/galaxy/user_preferences_account_usage_quota.md — 26.2, UI run (main)

GTN `45d4932d33`, `galaxy_ui_driver` `6b42e205276`. Replay: `user_preferences_account_usage_quota.gxui.sh`.

- **Step 1 is wrong** (`usage-quota-logout-refresh`): login never recalculates usage
  (`PUT /api/users/current/recalculate_disk_usage` has no login caller). The fix is the masthead
  usage meter > Storage Dashboard > **Refresh** ("Recalculate disk usage").
- The exact figure ("You are using N bytes of ...") is at the **top** of Preferences, not the bottom.
- Masthead wording already covered by `masthead-user-menu`.
- Galaxy: new `test_recalculate_disk_usage_from_storage_dashboard` (red: endpoint raising), helper
  `storage_dashboard_recalculate_disk_usage`; gxui `disk-usage [--refresh]`.
