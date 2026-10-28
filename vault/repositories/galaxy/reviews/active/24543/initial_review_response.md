(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via claude-opus-5-5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via claude-opus-5-5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via claude-opus-5-5 at medium effort.

</details>

<details><summary>Risks</summary>

Risks are minimal - this release-branch fix narrows how `/user/logout` parses `logout_all` (now `string_as_bool`, matching `/authnz/logout`) and stops the client sending it on plain sign-out; it doesn't lock Galaxy into difficult-to-change choices (a two-way door).

<details><summary>Risk Details</summary>

- Small server behavior change: `/user/logout?logout_all=<value>` previously ended all sessions for any non-empty value; now only `true`/`yes`/`on`/`1` (case-insensitive) do. A script relying on another truthy string (unlikely) would silently get a plain logout.
- Mixed-version deploys (new client, old server or vice versa) are safe: client omits the param unless true, so old servers no longer misread `"false"`.
- Easy rollback: three-line code change plus tests.

</details>

<details><summary>Risk Review Advice</summary>

Confirm the narrowed parsing is acceptable as an intentional fix and consistent with `authnz.logout`'s `asbool`. Check the Masthead and ExternalIdentities callers (which pass no argument or an event) now map to plain logout, and that the "Sign out of all sessions" path still sends `logout_all=true`.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24543_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24543_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24543_review_0) is based on the PR head `41b869bc0b2`. It replaces the PR's stubbed unit test with an API test: four real browser sessions log in as the same user, and the test checks that a plain sign-out and a `logout_all=false` sign-out leave the other sessions logged in, while `logout_all=true` ends them. The test fails at the `"false"` step when the server fix is reverted. The branch also removes a `click` listener on the Masthead user dropdown that never fires.

- [`0f1523486a0`](https://github.com/jmchilton/galaxy/commit/0f1523486a0) Replace stubbed logout unit test with multi-session API test: adds `test_logout_ends_other_sessions_only_with_logout_all`, factors `_browser_csrf_token` and `_logout_browser_session` into `lib/galaxy_test/base/api.py`, and deletes `test/unit/webapps/test_user_logout.py`.
- [`5c3f65240bf`](https://github.com/jmchilton/galaxy/commit/5c3f65240bf) Drop dead click listener on Masthead user dropdown: removes `@click="userLogout"`, which `MastheadDropdown` never emits.

</details>

</details>

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

Fixed on the review branch in [`0f1523486a0`](https://github.com/jmchilton/galaxy/commit/0f1523486a0).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: The `@click="userLogout"` on the Masthead user dropdown never fires (implementation verified)

`Masthead.vue` puts `@click="userLogout"` on a `MastheadDropdown`. That component declares no `click` emit. The listener looks like the source of the `MouseEvent` passed as `logoutAll` that the PR's `=== true` guard handles, but it never runs. Sign Out goes only through the menu item's `handler: () => userLogout()`. Changing it to `@click="userLogout()"` would be wrong: if the listener ever started firing, any click on the dropdown, including the toggle, would sign the user out. The review branch removes the listener.

<details><summary>Evidence</summary>

A throwaway vitest mounted `Masthead` with `@/utils/logout` mocked. Clicking the `#user` toggle made 0 `userLogout` calls. Clicking Sign Out made exactly one call, with no arguments (`args=[[]]`). The existing `Masthead.test.js` and `logout.test.js` pass after the removal (20 tests).

</details>

Fixed on the review branch in [`5c3f65240bf`](https://github.com/jmchilton/galaxy/commit/5c3f65240bf).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
