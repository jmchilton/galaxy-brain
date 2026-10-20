# faqs/galaxy/account_update_preference.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `e273c4f3502` (`faq_server.sh main`, stock config).

## GTN

- **Step 2 "User -> Preferences".** In 26.2 the masthead item is the username; its menu has
  **Preferences**. Same fix as `account_multiple`.
- **The card list has drifted** (`client/src/components/User/UserPreferences.vue`):
  - Renamed: "Manage API Key" → **Manage Galaxy API Key**; "Sign out of Galaxy" → **Sign Out of All
    Sessions**.
  - Gone: **Manage Cloud Authorization** (only a stale `es` locale string is left) and **Manage
    Activity Bar** (the bar is customized from its own **More** entry now — see
    `activity_bar_how_to_enable`).
  - New: **Manage Your Tools Credentials**.
  - Shown only when the server enables them, so mark them "depending on the server": Manage
    Toolbox Filters, Manage Third-Party Identities (OIDC), Pick a Color Theme, Delete Account, and
    the unlisted Manage Beacon and Galaxy Storage cards.
- Typo: "notifcations".

## Galaxy

- Coverage exists: `navigate_to_user_preferences` (masthead → Preferences) drives 8 E2E tests, and
  most cards have their own test. **Make All Data Private** and **Set Dataset Permissions for New
  Histories** have none; no change made, as the FAQ only lists them.
- `navigation.yml` `preferences` has no entries for the permissions, credentials, notifications or
  make-data-private cards; the replay checks those by screenshot.
