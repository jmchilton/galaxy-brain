# Review: galaxyproject/galaxy #23536 — Add password reset to the tool shed

_Round 2 (fresh re-review) by Claude (AI assistant) on jmchilton's behalf. Head `32cc32f89fd`, out of draft, 20 files, +854/-87 vs `origin/dev`._
_Round 1 (head `a72a3629d4e`) was posted as a PR comment on 2026-09-14; `23536_verification.md` holds its adversarial verdicts and is now historical._
_A merge of current `dev` (`521150a5960`) was pushed to the branch on 2026-09-24 so the new Tool Shed frontend workflow runs against it._

## Verdict

**Ready to merge once CI is green.** Every blocking and should-fix item from round 1 is genuinely
fixed — I re-traced each one against the code rather than taking the reply comment at face value —
and the fixes landed as the shared `UserManager` seam rather than as patches to a parallel shed
path, which is the outcome round 1 was actually arguing for. What is left is nits, two of which
are small Galaxy-side regressions worth a line each before merge.

## Round 1 disposition (verified, not taken on trust)

| # | Round 1 finding | Status |
|---|---|---|
| 1 (blocking) | Reset URL from the `Host` header | **Fixed.** `send_password_reset_email` (`tool_shed/managers/users.py:68-80`) builds the link from `config.tool_shed_url` and raises `ConfigDoesNotAllowException` when it is unset, so the `repositories_hostname` fallback to the request base can never be reached. Closed completely, including the partial-fix caveat round 1 flagged. |
| 2 | A password change never expires other outstanding tokens | **Fixed.** New `UserManager.expire_reset_tokens` (`galaxy/managers/users.py:685-696`), called from `__set_password` before its commit and from `get_reset_token` before minting a new one. At most one live link per account, and an admin reset now really does close the window. |
| 3 | Token invalidation survived only by an accidental commit | **Fixed properly.** The explicit `token_result.expiration_time = now()` / `add` with no commit is gone; expiry now happens inside `__set_password`, in the same transaction as the password write. The ordering hazard round 1 described is structurally gone, not worked around. |
| 4 | `send_password_reset_email` re-implemented `get_reset_token` | **Fixed.** `_user_for_password_reset` and the duplicated `PASSWORD_RESET_TEMPLATE` are deleted; the shed calls `UserManager.request_password_reset`. |
| 5 | `set_user_password` bypassed `__set_password` | **Fixed.** `UserManager.set_password` is the public seam; the shed's `set_user_password` and both hand-rolled `invalidate_user_sessions` calls are gone, and `log.info` audit lines were added for changes, redemptions, sends and admin resets. |
| 6 | Token entropy from `random.getrandbits` | **Fixed.** `secrets.token_hex(16)` in both models. |
| 7 | 500-on-send-failure as an enumeration oracle | **Fixed for the status code.** Delivery failure logs, expires the undelivered token and still returns 204. Timing is explicitly not addressed — see Nits. |
| 8 | Token committed before the mail is sent | **Fixed** by the same block. |
| 9 | Duplicated honeypot check | **Fixed** via `HasHoneypot` + `field_validator`, exactly the `HasCsrfToken` pattern round 1 pointed at. |
| 10 | Admin logging themselves out | **Fixed as a side effect** of the session-invalidation rewrite: the caller's own session is now the only exclusion, so a self-targeted admin reset keeps the admin logged in. |
| 11 | Token left in the URL | **Fixed.** `ResetPassword.vue:12-15` calls `router.replace({ query: {} })`, and the Playwright test asserts the address bar. |
| 12 | Non-deterministic case-insensitive email fallback | Not addressed (pre-existing in `by_email`). |
| 13 | Deleted-account check missing on redemption/admin paths | Not addressed. |
| 14 | Unknown-address log carries no address | Not addressed — and now applies to Galaxy too, see New #2. |
| 15–17 | Frontend form duplication, `sent` dead end, `autocomplete` | Not addressed. |

Independently verified claims from the author's reply:

- **No migration is needed.** `PasswordResetToken` has been in the shed model since the webapp was
  split out of Galaxy (`559b664b07f`), so any existing shed database has the table. The column is
  `String(32)` in both models and `secrets.token_hex(16)` produces exactly 32 characters — the same
  width the old `unique_id()` md5 hexdigest filled, so no truncation risk either.
- **The CSRF reasoning holds.** The shed FastAPI app registers no CORS middleware at all
  (`tool_shed/webapp/fast_app.py`), so a cross-origin JSON `PUT`/`POST` is stopped at the preflight.
  The comment above the admin endpoint is accurate rather than aspirational.
- **The session-invalidation rewrite is correct in all four callers.** API caller with no session →
  `trans.galaxy_session is None` → every session for the account dropped. Logged-out browser
  redeeming a token → the anonymous `galaxycommunitysession` row has `user_id IS NULL`, so it is not
  in the `user_id == user.id` result set anyway. Admin over cookie → only the admin's own row is
  excluded, which matters only when the admin targets themselves. Galaxy's admin controller loop →
  same. The two removed `invalidate_user_sessions` calls were genuinely redundant after this.

## New findings

### 1. `UserManager.set_password(..., confirm=None)` — the default can never succeed
`lib/galaxy/managers/users.py:533-536`

`validate_password` returns `"Passwords do not match."` whenever `password != confirm`
(`security/validate_user_input.py:195-198`), so any caller that takes the `confirm=None` default
gets a `RequestParameterInvalidException` that reads as a user error rather than a programming one.
Both current callers pass `confirm`, so nothing is broken today — but this is a brand new public
seam that Galaxy's admin UI is expected to pick up, and the signature invites the one call that
always fails. Make `confirm` required.

### 2. Galaxy's unknown-address log lost the address
`lib/galaxy/managers/users.py:649`

`log.warning("Password reset requested for an address without an active account.")` replaces
Galaxy's `f"Failed to produce password reset token. User with email '{email}' not found."`. This is
a server-side log, so including the address costs nothing in enumeration terms, and an admin
fielding "I never got the mail" now has nothing to correlate. Log the address (and ideally the
remote IP). This was round 1's nit #14 against the shed; the seam has now propagated it to Galaxy.

### 3. Galaxy's reset email no longer names the instance
`lib/galaxy/managers/users.py:74-78`

The template went from "To reset your Galaxy password for the instance at `<hostname>`" to "To reset
your Galaxy password". Anyone with accounts on several Galaxies loses the disambiguator. The link is
qualified now, which partly compensates, but `app_name` is a poor substitute for the hostname when
every instance is called "Galaxy". Cheapest fix: keep the host in the template for Galaxy by letting
the caller pass the display name it wants.

### 4. Galaxy's legacy form now reports success on a failed send
`lib/galaxy/managers/users.py:658-666`, `:670-683`

`send_reset_email` used to return `"Failed to submit email. Please contact the administrator: …"` to
the user; `request_password_reset` now catches the exception, logs it, expires the token and returns
`None`, so `controllers/user.py:359` shows the success path. That is the right anti-enumeration
call, but it is a user-visible Galaxy behaviour change that the PR body's "Shared with Galaxy"
section does not mention. Worth a sentence there (and arguably a release note), because the failure
mode for a shed or Galaxy with broken SMTP is now silent.

### 5. No frontend unit tests for the two new pages
`lib/tool_shed/webapp/frontend/src/components/pages/{ForgotPassword,ResetPassword}.vue`

The shed frontend gained a gated vitest suite on `dev` today (#23668), so this is a new ask rather
than one round 1 could have made. The Playwright test covers the happy path end to end and does
assert the URL scrub, so the real gap is narrow: `ResetPassword.vue:21-25`'s missing-token branch
("This password reset link is missing its token…") is unreachable from the browser test and
untested. One small spec mounting the component with no `?token=` would cover it.

### 6. "At most one live token" makes the endpoint a link-invalidation vector
`lib/galaxy/managers/users.py:699-703`

A consequence of the fix for round 1 #2, not a reason to undo it: an unauthenticated attacker who
knows a victim's address can, at 10/min per IP, keep issuing new tokens — each request kills the
link the victim is actually trying to use, and mail-bombs them while doing it. Bounded live tokens
is the right trade, but it is worth naming so nobody is surprised by the support ticket.

## Nits

- `log.info("Admin %s set the password of user %s.", trans.user and trans.user.id, user.id)`
  (`tool_shed/webapp/api2/users.py:240`) — `require_admin=True` guarantees `trans.user`, so the
  guard only buys the ability to log `None` where an id belongs.
- `request_password_reset` has no `-> None` annotation while its neighbours are annotated.
- Two simultaneous redemptions of the same token can both pass the expiry check before either
  commits. Negligible in practice; noted only for completeness.
- Round 1 nits 12, 13, 15, 16 and 17 still stand and are all one-liners.

## Explicitly out of scope (author called these, and the calls look right)

- **Timing side channel on the reset endpoint.** Still present: an unknown address returns after one
  or two SELECTs, a known one after a token insert, a commit and a synchronous SMTP round trip.
  Deferring this rather than making the two apps behave differently is the better call.
- **Galaxy proper still builds its link from the request host** via
  `trans.url_builder("/login/start", token=..., qualified=True)` → `routes.url_for`, which resolves
  the host from the WSGI environ. Pre-existing, unchanged by this PR, and now one line from being
  fixable for both apps because the URL is the caller's responsibility. Good follow-up issue.
- **`GET /api/users` unauthenticated** undercuts the anti-enumeration guarantee independently.
- **The rate limit is effectively off under test** (`TOOL_SHED_SENSITIVE_API_REQUEST_LIMIT` is set to
  `10000/second` by the driver), so "same rate limit as register" remains unverifiable by CI.

## Test coverage

The round 1 gap list is largely closed: token-to-user binding, superseded tokens, single use, the
honeypot, the unknown address sending no mail, mismatched confirmation leaving the token redeemable,
the admin reset and the non-admin 403 are all covered at the API level, and `test_UserManager.py`
adds session invalidation with and without a caller session, token expiry on password change, and
the failed-send path. The mailbox helper now asserts the recipient, which removes the stale-token
confusion round 1 warned about. Nothing was weakened or removed to make anything pass.

Remaining: the frontend unit gap in New #5, and the shed API level has no test that a redeemed token
actually drops the account's sessions (the unit tests cover the manager, not the wiring).

## Verified locally

On the merged tree (`521150a5960`, node 22.20.0, pnpm 10.26.1):

- `pnpm install --frozen-lockfile` clean, `pnpm typecheck` clean
- `pnpm lint` — 0 errors, 10 warnings (all pre-existing `no-non-null-assertion` in
  `MetadataInspector/*`); the new `.vue` files satisfy the prettier 3 config that landed with #23668
- `pnpm test:run` — 95 passed / 95

Python tests were not run locally (no `.venv` in the PR worktree); the branch is relying on CI for
those.
