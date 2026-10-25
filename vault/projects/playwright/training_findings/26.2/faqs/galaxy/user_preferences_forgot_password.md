# faqs/galaxy/user_preferences_forgot_password.md — 26.2, UI run (accounts)

GTN `45d4932d33`, `galaxy_ui_driver` `8d743c0a96d`. Replay: `user_preferences_forgot_password.gxui.sh` (reads the reset link from `$FAQ_MAIL`).

- Reset email arrives and the link's "Change your password" form saves. **Galaxy bug**: saving logs you
  in server-side but the page stayed logged out, and **Login** then failed with "Wrong session token found".
  Fixed on the branch (full reload, like LoginForm); queued `password_reset_stale_session_after_save`.
- `forgot-password-steps`: **Login** button (not "Login or Register"); the unlisted
  **Send password reset email** click; the form also asks to confirm the password; duplicate "5.".
- Galaxy: `request_password_reset` (now used by `test_reset_password_link`) and
  `reset_password_from_link` helpers; gxui `password-reset EMAIL [--link URL --password NEW]`.
  New `test/integration_selenium/test_password_reset.py` covers the emailed link via mock emails.
