# PR #18467 — Improve password reset UI/UX

Reviewed head: `ee3052d63381596dcb221a0f864acb10b244f5c6`

## Decision

Worth merging after a small rework. Both user-facing problems remain on current `dev`: the forgot-password link still submits the login field in place (even though it may contain a username), and an expired-password login still goes through `/root/login`, whose controller redirects to `/login/start` while retaining only `redirect` and therefore drops `expired_user`. The PR's separate validated email form is clearer, and the corrected expired-password destination activates the already-supported current-password flow.

Do not merge the current head unchanged: the new history-mode route is not registered on the server, so it is only reliable when reached by client-side navigation.

## Findings

### P1 — Register and permit the new anonymous client route

`client/src/entry/analysis/routes/login-routes.ts:25-29` adds `/login/reset_password`, but `lib/galaxy/webapps/galaxy/buildapp.py:225-227` still registers only `/login/start` and `/register/start` as server-side client routes. Consequently, clicking the link works because `router.push` never leaves the loaded SPA, but directly opening or refreshing `/login/reset_password` has no client-side server mapping and resolves through the generic `/login/{action}` path to a nonexistent controller/action (404). This also makes the route unsuitable for bookmarking or returning through browser history after a reload.

Add `webapp.add_client_route("/login/reset_password")`. Because password recovery must work anonymously when `require_login` is enabled, also add this path to the anonymous allowlist in `GalaxyWebTransaction._ensure_logged_in_user` (`lib/galaxy/webapps/base/webapp.py:707-716`) and cover both the server client-route mapping and the require-login bypass. Merely adding the Vue route is not enough for a history-mode application.

### P2 — Cover the two LoginForm transitions that contain the actual regressions

The new tests exercise the reset component and prove that the abstract Vue router recognizes the route, but neither changed transition in `LoginForm.vue` is asserted: the forgot-password link must navigate with the entered email (`:207-211`), and a login response containing `expired_user` must navigate to `/login/start?expired_user=...` rather than the old `/root/login` (`:112-114`). The latter one-line destination change is the entire expired-password bug fix and can currently regress while every added test stays green. Add focused `LoginForm.test.ts` cases for both transitions.

## Product, security, and implementation assessment

- The work is not obsolete. Current `origin/dev` still has both original UX defects; no replacement reset route exists elsewhere.
- The backend already returns a generic success message for valid email syntax whether or not the account exists, so the new form does not add account enumeration.
- Passing the prefilled email in the query string places personal information in browser history and, after a refresh, potentially access logs. This is not a credential and is not unique to Galaxy reset flows, so I would not block this PR on it, but transient router/session state would be more privacy-preserving if the prefill is considered optional.
- The component's success/error handling and native email validation are straightforward. The expired-password redirect correctly feeds the existing `Login.vue`/`ChangePassword.vue` flow, which verifies the current password on the backend before changing it.
- Minor polish: the new card header and email label are not localized, unlike the submit label and surrounding login UI; using `GButton` would also match the current login/change-password components. These are cleanup opportunities rather than reasons to close the PR.

## Verification

- Compared the branch with current `origin/dev` and traced login, password-reset email, expired-password, and password-change backend paths.
- Reviewed the full PR discussion and current CI: all reported checks are green at the reviewed head.
- Focused client tests with repository-supported Node 22.20.0: 3 files, 18 tests passed (`ResetPassword.test.ts`, `login-routes.test.ts`, `LoginForm.test.ts`).
- A first run under host Node 25 produced the known broken `localStorage` test environment; rerunning with the repository-pinned Node version passed and is the meaningful result.

## Recommendation

Keep and finish the PR rather than close it. Add the server route plus `require_login` allowance, add regression assertions for the two LoginForm transitions, then merge if CI remains green. The value is modest but real, the implementation is small, and the remaining blocker is clean and mechanical.
