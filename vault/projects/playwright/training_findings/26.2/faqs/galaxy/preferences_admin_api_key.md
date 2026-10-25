# faqs/galaxy/preferences_admin_api_key.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `7ecf397f044`, `faq_server.sh main`. Replay: `preferences_admin_api_key.gxui.sh` (passes fresh).

- `masthead-user-menu-2`: step 3's `User -> Preferences`; the menu is the username.
- `api-key-card-label`: card is **Manage Galaxy API Key**. **Create a new key** and the copy button are as described.
- `api-key-include-dev`: step 1 uses `{% if dev %}`; the header uses `include.dev`. dev/bioblend-dev passes `dev=true`, so the localhost URL never shows.
- Coverage: `test_personal_information` already creates a key from this card.
