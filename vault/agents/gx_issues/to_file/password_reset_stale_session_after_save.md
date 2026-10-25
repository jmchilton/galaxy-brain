# After a password reset (or expired-password change), clicking Login fails: "Wrong session token found, denying request."

Found in the 26.2 GTN FAQ loop (`faqs/galaxy/user_preferences_forgot_password.md`), on `release_26.2` +
`galaxy_ui_driver`. Fix + tests on `jmchilton/galaxy_ui_driver`: commit "Reload after a password change so the
client picks up the login" (76c58d2fb7f at time of writing).

## Repro
1. Logged out, Login > enter email > "Forgot password? Click here to reset your password." > **Send password reset email**.
2. Open the emailed `/login/start?token=...` link, enter + confirm a new password, **Save new password**.
3. You land on `/`; the masthead still shows **Login / Register**.
4. Click **Login**, enter the email and new password: red alert "Wrong session token found, denying request."
   A manual page reload shows you were actually logged in all along.

## Cause
- `UserController.change_password` (`lib/galaxy/webapps/galaxy/controllers/user.py`) calls
  `trans.handle_user_login(user)` after a token (or expired-user `id`) password change - new logged-in session.
- `client/src/components/Login/ChangePassword.vue` then only does `router.push("/")`: no reload, so the client
  keeps the anonymous user and the old `session_csrf_token`; LoginForm posts that stale token.
- `LoginForm.vue` itself does `window.location.href = withPrefix("/")` after login for this reason.

## Fix (on the branch)
- ChangePassword: `window.location.assign(withPrefix("/"))` instead of `router.push("/")`.
- vitest: `ChangePassword.test.ts` "reloads home after saving, since the server logs the user in" (red on old code).
- integration_selenium: `test/integration_selenium/test_password_reset.py` - mock emails
  (`ConfiguresMockEmails._read_password_reset_link`), request reset, follow link, save, assert logged in, log out,
  log in with new password. Old client: UI stays logged out / login rejected.
- Same path also affects the expired-password flow (`expiredUser`), untested here.

Target: release_26.2 (or earlier releases if the router.push dates back - check `git log -S'router.push("/")' -- client/src/components/Login/ChangePassword.vue`).
