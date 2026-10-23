# faqs/galaxy/datasets_not_downloading_at_all.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `6e95ac5a804` (`faq_server.sh main`). A new user's
Preferences cards, a pasted dataset's Permissions tab, and the new-histories switch. No tutorial
embeds it.

## GTN

- "**User > Preferences**" twice: there's no User menu; it's the username menu
  (`masthead-user-menu-2`).
- The rest matches: **Manage Galaxy API Key**, **Set Dataset Permissions for New Histories**,
  **Make All Data Private**, and pencil > **Permissions**. "All data are set to not shared by default"
  is truer on 26.2, where new data is private (`privacy-default-private`).

## Galaxy

- Covered by `test_new_datasets_private_switch` (`e4bca1128c1`) and the batch-4 preferences tests. No
  new tests.
