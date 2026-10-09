# PR 23371: Guard OIDC logout controller when third-party login is disabled

PR: https://github.com/galaxyproject/galaxy/pull/23371
Author: SAY-5
Head: `a76edd5fbb074da40bb06e2021c5853f6b2a04d5` (base `dev`, +42/-0, 2 files)
Fixes: #23145 (Sentry `AttributeError: 'NoneType' object has no attribute 'logout'`)
CI: 56 pass, 2 skipped, 1 fail. The failure is `Integration / Test (3.10, 0)`: `test/integration/objectstore/test_tee_streaming.py` jobs sat `queued` until they timed out. That test is unrelated to this change.
Reviewer requested: mvdbeek (2026-08-26). No reviews yet. The only PR comment is mvdbeek's cross-site logout observation, which belongs to a separate topic.

## Verdict

**Approve.** The fix is correct and minimal, and the test is adequate. Nothing blocks merge. The points below are a description correction plus coordination with #22130.

## How the endpoint is reached (verified)

- The `/authnz/*` routes in `buildapp.py:87-98` are registered only when `enable_oidc` is set. The catch-all `/{controller}/{action}` route (`buildapp.py:109`) is unconditional, though, so `/authnz/logout?provider=x` still dispatches to `OIDC.logout` on an OIDC-off instance. `app.authnz_manager` is `None` there (`app/__init__.py:1052`), so the call crashes.
- On such an instance, `/authnz/logout` resolves to `logout` directly through the catch-all route. It does not go through `get_logout_url`. The PR description names the stale-cookie `get_logout_url` path as the trigger, but that path is not really the entry point, and changing `get_logout_url` would not have prevented the crash. The guard is in the right place: at the method that dereferences the manager.
- Client (`client/src/utils/logout.js`): the client calls `/authnz/logout` only when `Galaxy.config.enable_oidc` is true, and only after `/user/logout` has already ended the Galaxy session. The response handler uses `redirect_uri` if present. Otherwise it goes to `post_user_logout_href`. So a `{"message": ...}` response degrades cleanly, the same way the method's existing failure branch does. Skipping `trans.handle_user_logout()` in the guard is harmless because the client has already logged out. The test asserts this skip explicitly.

## Findings

### 1. The PR description overstates the existing guards (description fix, non-blocking)

The description says "`login`, `callback`, and `create_user` in the same controller already return an error message when `enable_oidc` is off." Only `login` (line 88) has the guard. `callback` (L144), `create_user` (L180), `disconnect` (L210), `index` (L60) and `get_cilogon_idps` (L252) all still dereference `authnz_manager` without checking, and the same catch-all route reaches every one of them. Sentry has only reported `logout` so far, so fixing just that is a reasonable scope. The description should be corrected, though.

Optional: the disabled-message string now appears twice. A tiny module-level constant (or a `_oidc_disabled(trans)` helper) would let the other actions reuse it later. I would not ask for a decorator or a full sweep in this PR.

### 2. Conflicts with #22130 (coordination; affects whichever PR merges second)

- **Textual:** `git merge-tree HEAD <22130 head f3dcd6823ce>` reports a content conflict in `authnz.py`. #22130 rewrites the `def logout(...)` signature line (it adds `logout_all=False`), and this PR inserts its lines directly below that one. Resolving it is trivial.
- **Semantic:** #22130 changes the call to `trans.handle_user_logout(logout_all=asbool(logout_all))`. This PR's `StubTrans.handle_user_logout(self)` accepts no arguments, so after both merge, `test_logout_delegates_when_oidc_is_enabled` fails with a `TypeError`. Whoever merges second needs `def handle_user_logout(self, logout_all=False)` in the stub.
- #22130 does not cover this guard, and it does not need to absorb it. The two changes are independent. Merging this small one first and rebasing #22130 is simplest.

### Nits (optional)

- Test location: `test/unit/webapps/test_authnz_logout.py` follows the sibling `test_authnz_login_next.py` (same `StubTrans` + `Bunch` style, calling the method undecorated). That file is scoped to the callback cookie, so a separate module is fine. Adding `assert rval["message"] == ...` or checking against the constant would pin the response more tightly than `"message" in rval`.

## What I checked

- Diff against `merge-base(HEAD, origin/dev)`. Guards in `authnz.py`, route registration in `buildapp.py`, `authnz_manager` init, and the client `logout.js`.
- Ran the new test: `PYTHONPATH=lib <galaxy venv>/bin/python -m pytest -q test/unit/webapps/test_authnz_logout.py` passes (2 tests). Without the guard, the first test hits `None.logout` (red-to-green by construction).
- Checked #22130 at `f3dcd6823ce` with `git merge-tree`.

## Draft GitHub comment

> Posted by Claude (AI assistant) on behalf of jmchilton.
>
> Thanks, this looks good to me. The guard is at the right spot. The `/authnz/*` routes are only registered with `enable_oidc`, but the generic `/{controller}/{action}` route still reaches `OIDC.logout`. The client only calls this endpoint after `/user/logout`, and it falls back to `post_user_logout_href` when there's no `redirect_uri`, so returning `{"message": ...}` degrades cleanly.
>
> Two small things:
>
> - The description says `callback` and `create_user` already have this guard, but only `login` does. `callback`, `create_user`, `disconnect`, `index` and `get_cilogon_idps` still dereference `authnz_manager` without a check. Fine to keep this PR scoped to the Sentry report. It might just be worth correcting the description, and maybe hoisting the message string into a constant so the others can reuse it later.
> - Heads up: #22130 changes this method to call `trans.handle_user_logout(logout_all=...)` and textually conflicts here. Whichever lands second will need `StubTrans.handle_user_logout(self, logout_all=False)` in the new test.
>
> The failing integration shard is `test_tee_streaming` (queued-job timeouts) and looks unrelated.
