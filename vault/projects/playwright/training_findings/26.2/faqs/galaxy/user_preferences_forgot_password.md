# faqs/galaxy/user_preferences_forgot_password.md — 26.2, UI run (accounts)

GTN `45d4932d33`, `galaxy_ui_driver` `6b42e205276`. Replay: `user_preferences_forgot_password.gxui.sh` (reads the reset link from `$FAQ_MAIL`).

- Works end to end: reset email arrives, link opens a "Change your password" form, new password logs in.
- `forgot-password-steps`: **Login** button (not "Login or Register"); the unlisted
  **Send password reset email** click; the form also asks to confirm the password; duplicate "5.".
- Galaxy: `request_password_reset` (now used by `test_reset_password_link`) and
  `reset_password_from_link` helpers; gxui `password-reset EMAIL [--link URL --password NEW]`.
  The emailed-link half has no E2E test (test servers have no mail capture).
