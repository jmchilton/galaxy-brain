# After resetting a password, logging in fails with "Wrong session token found, denying request."

After saving a new password from a reset link, Galaxy still looks logged out, and logging in with the new password is rejected with "Wrong session token found, denying request."

1. While logged out, go to **Login** > **Forgot password? Click here to reset your password.** > **Send password reset email**.
2. Open the emailed `/login/start?token=...` link, enter and confirm a new password, then click **Save new password**.
3. You land on `/`, and the masthead still shows **Login / Register**.
4. Click **Login** and enter the email and new password. A red alert says "Wrong session token found, denying request."

Reloading the page shows the user was logged in all along. The expired-password change form uses the same component and endpoint, so it likely has the same problem (not tested).

## Context

Found while working through the 26.2 GTN FAQ `faqs/galaxy/user_preferences_forgot_password.md` on `release_26.2`. The same code is on `dev`.

<details><summary>Cause</summary>

- `UserController.change_password` (`lib/galaxy/webapps/galaxy/controllers/user.py`) calls `trans.handle_user_login(user)` after a token (or expired-user `id`) password change, so the server starts a new logged-in session.
- `client/src/components/Login/ChangePassword.vue` then only does `router.push("/")`. The page doesn't reload, so the client keeps the anonymous user and the old `session_csrf_token`, and `LoginForm` posts that stale token.
- By contrast, `LoginForm.vue` does a full reload (`window.location.href = withPrefix("/")`) after login.

</details>

## Proposed Approach

In `ChangePassword.vue`, do a full page load (`window.location.assign(withPrefix("/"))`) after saving, as `LoginForm` does, so the client picks up the logged-in session.

<details><summary>Fix and tests</summary>

A fix with tests is on 🌿 [`jmchilton/galaxy:galaxy_ui_driver`](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver) (commit 76c58d2fb7f, "Reload after a password change so the client picks up the login"):

- vitest: `ChangePassword.test.ts` checks that saving reloads home. It fails on the current code.
- integration_selenium: `test/integration_selenium/test_password_reset.py` uses mock emails to request a reset, follow the link, save, check the user is logged in, log out, and log back in with the new password. On the current client the UI stays logged out and the login is rejected.

</details>

## Alternative Approaches

The client could instead refresh the current user and the CSRF token in place, without a reload. That touches the user store and the token handling for a rare flow, and the login form already settles on a full reload, so we prefer to match it.
