# Initial review: #24543 — [26.2] Fix plain Sign Out ending all of a user's sessions

- Profile: default
- Model: claude-opus-5-5, effort low (agent setting)
- Reviewed commit: `41b869bc0b2` (diff vs `origin/release_26.2`)
- Tests not run locally: worktree has no `.venv` / `client/node_modules`.

## Verdict

Correct, minimal fix; approve-worthy. Root cause confirmed: `User.logout` passed the raw query string to `handle_user_logout`, whose `if logout_all and ...` treats `"false"` as truthy. Masthead's `@click="userLogout"` also passed a `MouseEvent`, so the client sent `logout_all=[object MouseEvent]`. Both are fixed: server parses with `util.string_as_bool` (unknown strings -> False), client sends `logout_all` only for `=== true`. No real bugs found. Only test-shape and consistency suggestions below.

Sibling paths checked:
- `authnz.py` `OIDC.logout` already uses `asbool`; `get_logout_url` forwards raw value, parsed downstream — fine.
- Impersonation / admin / password reset (`admin.py:419`, `managers/users.py:659`, `webapp.py:399,919`) call `handle_user_logout()` with default `False` — unaffected; impersonation sign-out goes through the same `userLogout` client path, so fixed.
- Tool Shed `api2/users.py` uses a pydantic `bool` field — unaffected.
- No security finding (bug over-revokes the user's own sessions; no privilege gain).

## Findings

### P2 1: Regression test stubs out the behavior that was broken; an API test with two browser sessions is cheap here

`test/unit/webapps/test_user_logout.py` stubs `trans.handle_user_logout` and only asserts the parsed bool reaching it. The bug lived in the interaction with `handle_user_logout`'s session invalidation, which the test never exercises. `lib/galaxy_test/base/api.py` already has `_login_browser_session` (used by `test_users.py::test_reset_password` and `test_histories.py`), so an API test is straightforward: log the same user into two `requests.Session`s, GET `user/logout?session_csrf_token=<token>` (and once with `logout_all=false`) from one, assert the other still sees its email at `api/users/current`; then `logout_all=true` and assert the other becomes anonymous. That covers the actual reported behavior and the "Sign out of all sessions" path with no stubs. The stub unit test could then be dropped or kept as a cheap parse check.

### P3 1: Sibling controllers parse `logout_all` with different helpers

`user.py` now uses `util.string_as_bool` (unknown -> False) while `authnz.py:249` uses `asbool` (unknown string -> `ValueError` -> 500). Before this PR, an OIDC-enabled Masthead click sent `logout_all=[object MouseEvent]` to `authnz/logout`, which `asbool` rejects; stale cached clients after upgrade will still do that until reload. Using `string_as_bool` in `authnz.py` too (one line, and `asbool` import may become unused there) keeps both logout endpoints lenient and identical.

### P3 2: Fix the Masthead call site that passes the click event

`client/src/components/Masthead/Masthead.vue:232` `@click="userLogout"` passes the `MouseEvent` as `logoutAll`. The `=== true` guard neutralizes it, but `@click="userLogout()"` (matching the handler at line 229) removes the root cause rather than relying on the guard.

### P3 3: Client comment slightly overstates old-server behavior

`logout.js` comment says unpatched servers treat even `"false"` as true; that holds for `/user/logout` only — `authnz/logout` already parsed with `asbool`. Something like "unpatched `/user/logout` treats any value as true" is accurate. Cheap nit.
