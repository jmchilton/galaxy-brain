# PR 22130 — OIDC `post_logout_redirect_uri`

PR: https://github.com/galaxyproject/galaxy/pull/22130  
Reviewed head: `5659bb6482a879a25871f67b7f5349d37df6be53`  
Follow-up fixes: `f4890be36a4`, `f3dcd6823ce`  
Recommendation: **The blocking logout-all regression is fixed; await fresh CI. The client fallback concern remains non-blocking.**

## Summary

This is a worthwhile correction to Galaxy's OIDC logout flow. It keeps the user available long enough to recover the provider's stored ID token, sends the standard `id_token_hint` and `post_logout_redirect_uri` parameters, invalidates the Galaxy session in the same server request, and includes a real Keycloak integration test that demonstrates that the provider session is gone after logout. The merge resolution against current `dev` is narrow and sensible.

## Findings

### Resolved: `userLogoutAll()` silently degraded to a single-session logout for OIDC users

The client now includes `logout_all=true` in its request to `/authnz/logout` (`client/src/utils/logout.js:14-19,35-41`). However, that URL is registered to `get_logout_url`, which resolves the provider and issues a redirect to the provider-specific `logout` action. The redirect built at `lib/galaxy/webapps/galaxy/controllers/authnz.py:235-239` forwards only `provider`; it drops `logout_all` (and every other query parameter). Consequently the provider-specific action receives its default `logout_all=False` at line 222 and `trans.handle_user_logout()` at line 229 invalidates only the current session.

This affects the OIDC path regardless of whether the provider was supplied explicitly or recovered from the provider cookie: both requests first pass through the fixed `/authnz/logout` route. It violates the explicit security behavior promised by “Log out all sessions.”

Forward `logout_all` through `get_logout_url` into the provider-specific redirect (preferably as a named argument rather than forwarding arbitrary `kwargs`). Add a test that enters through `/authnz/logout?logout_all=true`, follows the provider-resolution redirect, and verifies that another session for the same user is invalidated. The new Keycloak test calls `/authnz/logout` without `logout_all`, so it cannot catch this regression.

Resolved in `f4890be36a4`: `get_logout_url` now forwards the named `logout_all` argument, with a focused provider-resolution regression test. All 10 controller tests pass.

The resulting CI mypy failure in the existing logout unit test was fixed in `f3dcd6823ce` by typing its `SimpleNamespace` transaction double with an explicit `GalaxyWebTransaction` cast. The affected unit test passes locally; fresh CI is pending.

### Non-blocking but worth addressing: a rejected combined request leaves the browser in a poor logout state

The old client sequence invalidated the Galaxy session first and only then attempted IdP logout. The new order is necessary to retain access to the ID token, and expected provider/configuration failures are handled server-side before `handle_user_logout()` runs. But if the combined Axios request itself rejects (routing error, server error before the controller reaches `handle_user_logout()`, or a transport failure), the promise has no rejection handler. Session storage is cleared only in the success continuation (`client/src/utils/logout.js:46-55`), while the provider marker is removed eagerly. The user receives no redirect and may remain logged into Galaxy.

A rejection fallback to the CSRF-protected `/user/logout` request would preserve the old best-effort Galaxy logout guarantee when combined IdP logout cannot complete. A small client test for this branch would also cover the substantial orchestration rewrite, which the server-side Keycloak integration test does not exercise.

## What I checked

- Compared the PR's five changed files against current `origin/dev`, excluding merge-commit bulk.
- Reviewed the OIDC parameter construction, ID-token lookup, provider routing, Galaxy session invalidation, `logout_all` behavior, client fallback behavior, and the Keycloak integration scenario.
- `git diff --check origin/dev...HEAD` passes.
- The reconciled branch's 56 tests in `test/unit/authnz/test_psa_authnz.py` were reported passing before review.
- Fresh GitHub CI for the merge commit was queued at review time.

## Suggested disposition

Fix and test the lost `logout_all` parameter, then merge once CI is green. The request-rejection fallback is a smaller resilience issue, but it would be good to resolve in this PR because the client control-flow rewrite creates it. The underlying standards fix and provider-level integration coverage are both valuable.
