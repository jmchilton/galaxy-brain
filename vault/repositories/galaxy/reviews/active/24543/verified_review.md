### P2 1: Replace the stubbed unit test with a multi-session API test (implementation verified)

`test/unit/webapps/test_user_logout.py` stubs `trans.handle_user_logout` and unwraps `@web.json` via `_orig`, so it checks only the parsed bool and never exercises session invalidation, which is where the reported bug showed up. `ApiTestCase._login_browser_session` already supports logging real browser sessions in, so an API test can cover the user-visible behavior with no stubs.

The review branch adds `test_logout_ends_other_sessions_only_with_logout_all` to `lib/galaxy_test/api/test_users.py`. It logs four `requests.Session`s in as one user. A plain sign-out and a `logout_all=false` sign-out each leave the other sessions logged in, and `logout_all=true` ends them. It also moves the CSRF-token scrape out of `_login_browser_session` into `_browser_csrf_token` and adds `_logout_browser_session` in `lib/galaxy_test/base/api.py`, and it deletes the unit test.

<details><summary>Evidence</summary>

Passes on the review branch. With the `string_as_bool` line in `user.py` reverted it fails at the `logout_all="false"` step, because the surviving session has been logged out:

```
>           self._assert_browser_session_email(survivor, email)
lib/galaxy_test/api/test_users.py:776:
E       AssertionError: assert None == '8f9khf7cyh@bx.psu.edu'
```

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: The `@click="userLogout"` on the Masthead user dropdown never fires (implementation verified)

`Masthead.vue` puts `@click="userLogout"` on a `MastheadDropdown`. That component declares no `click` emit. The listener looks like the source of the `MouseEvent` passed as `logoutAll` that the PR's `=== true` guard handles, but it never runs. Sign Out goes only through the menu item's `handler: () => userLogout()`. Changing it to `@click="userLogout()"` would be wrong: if the listener ever started firing, any click on the dropdown, including the toggle, would sign the user out. The review branch removes the listener.

<details><summary>Evidence</summary>

A throwaway vitest mounted `Masthead` with `@/utils/logout` mocked. Clicking the `#user` toggle made 0 `userLogout` calls. Clicking Sign Out made exactly one call, with no arguments (`args=[[]]`). The existing `Masthead.test.js` and `logout.test.js` pass after the removal (20 tests).

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
