# faqs/galaxy/user_preferences_manage_information.md — 26.2, UI run (accounts)

GTN `45d4932d33`, `galaxy_ui_driver` `6b42e205276`. Replay: `user_preferences_manage_information.gxui.sh`.

- Email/public name change and **Save** work. With activation on, the new email leaves the account
  inactive (banner) until its activation link is opened; then login with the new email works.
- `manage-information-change-password`: Change Password is its own Preferences card, not on this
  form; typo "Your may also". Masthead wording covered by `masthead-user-menu`.
- Galaxy: `navigate_to_manage_information` moved into NavigatesGalaxy, `manage_information_save`
  replaces duplicated steps in `test_change_email`/`test_public_name`; gxui `user-info`.
