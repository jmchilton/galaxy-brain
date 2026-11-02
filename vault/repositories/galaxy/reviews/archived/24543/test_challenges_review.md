# Test challenges review: #24543 (head 41b869bc0b2)

Profile: gx_test_challenger, low effort. No red-to-green run performed (low effort); assessment from diff + existing infra.

## Answer to John's question

Yes, drop `test/unit/webapps/test_user_logout.py`, but replace it with an **API test**, not Selenium/Playwright. The bug is purely server-side string parsing plus DB session invalidation; an API test with two `requests.Session`s exercises the real controller, real `handle_user_logout`, and real `galaxy_session.is_valid` state, which the unit test stubs out entirely (`StubTrans.handle_user_logout` just records the arg). E2E would add browser cost without covering anything the API test doesn't; the client side is already covered by vitest.

Infra already exists: `ApiTestCase._login_browser_session(session, email, password)` (`lib/galaxy_test/base/api.py:184`), used by `test_reset_password` in `lib/galaxy_test/api/test_users.py:769` which asserts a browser session got logged out via `api/users/current` lacking `email`. That is exactly the pattern needed.

## P2 1: Replace stub unit test with a two-session API test

The unit test mocks `trans` and `_orig`-unwraps the `@web.json` decorator; it would pass even if `handle_user_logout` ignored `logout_all`, and it couples to decorator internals. A two-session API test proves the user-visible regression (plain Sign Out killed other sessions) and the positive "sign out everywhere" path.

Sketch, in `lib/galaxy_test/api/test_users.py` next to `test_reset_password`:

```python
@requires_new_user
def test_logout_only_ends_other_sessions_with_logout_all(self):
    email = f"{DatasetPopulator(self.galaxy_interactor).get_random_name()}@bx.psu.edu"
    self._setup_user(email, password="testpass")
    with requests.Session() as a, requests.Session() as b, requests.Session() as c:
        for s in (a, b, c):
            self._login_browser_session(s, email, "testpass")
        self._browser_logout(a, logout_all="false")
        assert "email" not in a.get(urljoin(self.url, "api/users/current")).json()
        assert b.get(urljoin(self.url, "api/users/current")).json()["email"] == email
        self._browser_logout(b, logout_all="true")
        assert "email" not in c.get(urljoin(self.url, "api/users/current")).json()
```

`_browser_logout` needs the logged-in session's CSRF token: GET the root/`login/start` page, regex `session_csrf_token = "(.*)"` (as `_login_browser_session` does), then `session.get(urljoin(self.url, "user/logout"), params={"session_csrf_token": token, "logout_all": ...})`. Worth factoring the token scrape out of `_login_browser_session` into a shared helper in `lib/galaxy_test/base/api.py`. Parametrize/cover omitted `logout_all` too (the client's new default). Red check: revert the one-line `string_as_bool` change; the `"false"` case should fail on session `b`.

## P3 1: Selenium/Playwright test optional, not a replacement

If an E2E is wanted at all, it is a single masthead Sign Out in the browser while a second `requests.Session` (via `_login_browser_session`, same user) stays logged in. No existing multi-context/multi-browser helper exists in `lib/galaxy/selenium` or `lib/galaxy_test/selenium` (`logout()` in `navigates_galaxy.py:2843` is single-session). Mixing a selenium session with an API-level second session is feasible but the API test above covers the server; only add E2E if the client wiring (`userLogout()` called with a click event) is a concern, and vitest already covers that.

## Client vitest

Not trivial. `does not treat a non-boolean argument as logout all` pins the actual client bug (MouseEvent passed as `logoutAll`), and both tests assert URL shape against a backward-compat constraint (unpatched servers). Keep. Minor: `expect.not.stringContaining("logout_all")` with `toHaveBeenCalledWith` passes on any URL missing the param; fine here. No positive `logoutAll === true` → `logout_all=true` assertion was added in the diff; check existing tests cover it, else add one (P3, cheap).
