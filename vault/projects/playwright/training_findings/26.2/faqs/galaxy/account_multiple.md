# faqs/galaxy/account_multiple.md — 26.2, text review

GTN `45d4932d33`, checked against `galaxy_ui_driver` `6c1b6093964` client source.

- **"User -> Preferences in the top menu bar"** (used twice). In 26.2 the masthead item is labelled
  with the user's *username* (tooltip "User Preferences"), and its menu has **Preferences** and
  **Sign Out**. There is no "User" label to look for. Suggest: "click your username in the masthead,
  then **Preferences**". Then: email change is under **Manage Information**; deletion is the
  **Delete Account** card (only when the server sets `enable_account_interface`).

Verified fine: Storage Dashboard link on the preferences page, `/storage` route, password reset
link on the login page.
