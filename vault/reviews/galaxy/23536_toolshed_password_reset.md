# Review: galaxyproject/galaxy #23536 — Add password reset to the tool shed

_Reviewed by Claude (AI assistant) on jmchilton's behalf. Base merge-base `98a977c56c`, 14 files, +645/-21._
_Every finding below was re-checked against the code by a second adversarial pass; corrections applied. See `23536_verification.md` for the item-by-item verdicts._

## Summary

The PR gives the Tool Shed a self-service password reset: `POST /api_internal/reset_password` mails a 24h `PasswordResetToken` link, `PUT /api_internal/change_password` grows a `token` branch that redeems it while logged out, two new Quasar pages (`/user/forgot_password`, `/user/reset_password`) drive both, and a new admin-only `PUT /api/users/{encoded_user_id}/password` lets an admin set any user's password from `AdminControls.vue`. Two genuine adjacent bug fixes ride along (the change-password `confirm` field was collected but never sent, and the success redirect pointed at a route that does not exist). The security shape is mostly right — anti-enumeration is deliberate and commented, the honeypot and rate limiter are actually applied, the admin endpoint is `require_admin=True`, the token is bound to its user, and the caller-session gap in `UserManager.change_password` was spotted and worked around. The main problems are (a) the reset URL is built from the attacker-controllable `Host` header when the shed already has `config.tool_shed_url` for exactly this, and (b) the whole thing is a second, parallel implementation of `galaxy.managers.users.UserManager.get_reset_token` / `send_reset_email` / `__set_password` rather than an extension of them — and `UserManager` is already app-agnostic enough to serve the shed (`self.model_class = app.model.User`, plus an existing `app_type` seam), so the reuse is genuinely available rather than blocked (with one caveat found on a second pass: `send_reset_email` reads `config.hostname`, which does not exist on the shed config — hence the seam must take the host from the caller). Test coverage is real but shallow on the security properties it most wants to defend.

---

## Blocking

### 1. Reset URL is built from the request `Host` header — reset-link poisoning
`lib/tool_shed/managers/users.py:114`

```python
reset_url = f"{urljoin(trans.request.base, RESET_PASSWORD_PATH)}?{urlencode({'token': reset_token.token})}"
```

CONFIRMED: `trans.request.base` is `GalaxyASGIRequest.base` → `str(starlette_request.base_url)` (`lib/galaxy/webapps/galaxy/api/__init__.py:271-273`), and Starlette derives `base_url` from the `Host` header in the ASGI scope. The documented deployment forwards that header verbatim — `server_name _;` plus `proxy_set_header Host $http_host;` (`doc/source/admin/nginx.md:103,121`) — so it is fully attacker-controlled. The endpoint is unauthenticated, so anyone can POST `{"email": "victim@…", "bear_field": ""}` with `Host: evil.example` and the victim receives a real, valid reset link pointing at the attacker's domain. Clicking it hands over a live token → account takeover. This is CWE-640 / host-header injection.

Concrete fix: the shed already has the right abstraction for this. `SessionRequestContext.repositories_hostname` (`lib/tool_shed/context.py:149-154`) returns `config.tool_shed_url` when set and only falls back to the request base. Build the link from that:

```python
base = trans.repositories_hostname  # config.tool_shed_url when configured
reset_url = f"{base}/{RESET_PASSWORD_PATH}?{urlencode({'token': reset_token.token})}"
```

Note this fix is **partial as written**: `repositories_hostname` falls back to `str(self.request.base)` when `tool_shed_url` is unset (`tool_shed/context.py:154`), and `tool_shed_url` has no default (`tool_shed_config_schema.yml:49`). To actually close the hole, either make `tool_shed_url` required or refuse to mail a link when it is unset.

(Galaxy proper has the same weakness, though not via `url_builder` — that returns a path (`webapps/base/webapp.py:309-312`). Galaxy's host comes from `trans.request.host` interpolated into `PASSWORD_RESET_TEMPLATE` (`galaxy/managers/users.py:71-82`, `:628-635`). If the shared seam below is taken, fix it there and both benefit.)

---

## Should fix

### 2. A password change never expires the account's *other* outstanding reset tokens
`lib/tool_shed/managers/users.py:109-113,129-135`, `lib/galaxy/managers/users.py:513`

`send_password_reset_email` mints a fresh `PasswordResetToken` on every request and never expires prior ones; `change_password`'s token branch expires only the row it redeemed; the shed's `set_user_password` touches no tokens at all. Nothing else in the tree ever writes `PasswordResetToken` — the only references are the two constructors and the `get`/expiry in `change_password`.

Consequence, in exactly the scenario the PR's own comment invokes (`api2/users.py:229-230`, "An admin reset is how a compromised account is recovered"): the admin sets a new password and kills every session, but any token issued for that account in the preceding 24h is still redeemable, and redeeming it sets the password again — undoing the recovery. Same hole after a self-service change: an unused link from an earlier "forgot password" click stays live for its full 24h.

Concrete fix: one query in whichever function ends up owning "set this user's password" — expire all rows in `user.reset_tokens` (relationship at `tool_shed/webapp/model/__init__.py:130`). Rider: nothing caps outstanding tokens either, so the unauthenticated endpoint lets a caller accumulate unbounded live tokens for a registered address, throttled only per-IP at 10/min (`api2/users.py:58-59,322`).

### 3. Token single-use invalidation only survives by accident
`lib/galaxy/managers/users.py:513-514` (pre-existing), relied on from `lib/tool_shed/webapp/api2/users.py:303`

CONFIRMED by tracing: `UserManager.change_password` sets `token_result.expiration_time = now()` and `sa_session.add(token_result)` but never commits, and `__set_password` already committed at `:555`. There is no request-teardown commit to catch it — `ModelMapping.unset_request_id` calls `session.close()` (`lib/galaxy/model/base.py:116-121`), which discards pending state. The expiry reaches the DB here only because the new endpoint then calls `invalidate_user_sessions(...)`, whose `session.commit()` (`api2/users.py:436`) flushes it.

That is correct today and `test_password_reset_token_cannot_be_redeemed_twice` passes for real — but it passes for the wrong reason: reorder or drop that call and tokens silently become multi-use. Galaxy's own caller has the same dependency (`controllers/user.py:349-352` relies on `trans.handle_user_login`'s commit at `webapps/base/webapp.py:879`).

Not blocking — nothing misbehaves as shipped, and the fix is in a file this PR does not touch. But if the `UserManager` seam below is taken, add `trans.sa_session.commit()` after `:514` and move the token invalidation *before* `__set_password` while you are there, so a crash between the two cannot leave a changed password with a live token.

### 4. `send_password_reset_email` re-implements `UserManager.get_reset_token` instead of calling it
`lib/tool_shed/managers/users.py:105-113` and `:138-145`

`_user_for_password_reset` (exact-match → `func.lower` fallback → `deleted` check) plus `PasswordResetToken(user)` / `add` / `commit` is a line-for-line re-implementation of `UserManager.get_reset_token` (`lib/galaxy/managers/users.py:656-665`). CONFIRMED reusable: `UserManager.__init__` does `self.model_class = app.model.User` (`lib/galaxy/managers/users.py:96`), so a shed-constructed `UserManager` queries `tool_shed.webapp.model.User`; `by_email` already takes `case_sensitive` and `deleted`. The API class already holds `self.user_manager` (`lib/tool_shed/webapp/api2/users.py:124`) and already calls `user_manager.change_password` from the very next endpoint. Fix: pass the manager (or construct `UserManager(trans.app)`) and call `reset_user, prt = user_manager.get_reset_token(trans, email)`; delete `_user_for_password_reset`. See "Abstraction & reuse" for the fuller seam.

### 5. `set_user_password` bypasses `__set_password`
`lib/tool_shed/managers/users.py:129-135`, `lib/galaxy/managers/users.py:531-558`

It duplicates `UserManager.__set_password` minus the "invalidate other sessions" block, which is then re-added by hand at the call site (`lib/tool_shed/webapp/api2/users.py:231`). Two consequences: (a) no password-change path in the shed leaves an audit record — `trans.log_event` is a no-op on `SessionRequestContextImpl` (`tool_shed/context.py:180-181`), so the `log_event` inside `__set_password` writes nothing for the self-service path either; an admin resetting someone else's password is the one genuinely audit-worthy action here and deserves a real `log.info`, and so does token redemption; (b) the docstring says "admin only" but the function does not enforce it, so the only guard is the route decorator.

Concrete fix: promote `__set_password` to a public `UserManager.set_password(trans, user, password, confirm)` and have the shed call it; add a real `log.info("Admin %s reset the password for user %s.", trans.user.id, user.id)` in the endpoint (not `log_event`, which the shed discards). If the manager function is kept, add a `trans.user_is_admin` assertion as defence in depth.

### 6. Reset token entropy comes from `random.getrandbits`, not `secrets`
`lib/tool_shed/webapp/model/__init__.py:215` → `galaxy.util.unique_id` (`lib/galaxy/util/__init__.py:358-367`)

CONFIRMED: `unique_id()` is `md5(str(random.getrandbits(128)))` — Mersenne Twister, not a CSPRNG. Inherited from Galaxy, not introduced here, and the md5 wrapper means raw MT outputs are not directly observable, so this is not a turnkey exploit. But this PR is what makes the value an emailed bearer credential for the shed, and the fix is one line: `secrets.token_hex(16)` in `unique_id` (or a dedicated `PasswordResetToken` default). Worth doing in this PR or an immediate follow-up since it is the token that gates account takeover.

### 7. The 500 path and the fast-return path make the anti-enumeration guarantee weaker than advertised
`lib/tool_shed/managers/users.py:106-126`

Two leaks of the same bit the endpoint is trying to hide:
- `InternalServerError` on mail failure (`:125`) is only reachable for addresses that *do* have an account — unknown addresses return at `:108` before any mail is attempted. Any SMTP flakiness turns 500-vs-204 into an oracle.
- Timing: unknown address returns after one or two SELECTs; known address does a token INSERT + commit + a full SMTP round trip. An extra INSERT + commit plus a synchronous SMTP round trip on the known-address branch — a large and easily measurable difference. (Estimate from reading the code, not measured.)

Concrete fix: catch the send failure, log it, and still return 204 (the user is told to retry; the admin sees the log). For timing, the cheap mitigation is to hand the send off to a background task so both branches return immediately; at minimum, do not let the outcome of the send change the status code.

### 8. `send_password_reset_email` commits the token before the mail is sent
`lib/tool_shed/managers/users.py:112-125`

If `send_mail` raises, a valid 24h token is already in the DB with no way for anyone to use it and no way for the user to know. Minor on its own, but combined with #7 the fix is the same: commit the token, attempt the send, and on failure expire the token (`reset_token.expiration_time = now()`) before returning.

### 9. Honeypot check is now duplicated
`lib/tool_shed/webapp/api2/users.py:257-259` and `:329-330`

The PR correctly extracted `LOOKS_LIKE_A_BOT` but left the `if x.bear_field != "": raise` check copied. Concrete fix: a `class HasHoneypot(BaseModel)` with a pydantic `field_validator` on `bear_field` that raises `RequestParameterInvalidException`, inherited by `UiRegisterRequest` and `UiResetPasswordRequest` — this is the same pattern already used for `HasCsrfToken` (`:69-70`), two model classes above `UiResetPasswordRequest`.

### 10. Admin reset logs the acting admin out of their own session with no warning
`lib/tool_shed/webapp/api2/users.py:231`, `lib/tool_shed/webapp/frontend/src/components/pages/AdminControls.vue:45`

If an admin selects themselves in the `SelectUser` dropdown, `invalidate_user_sessions(trans.sa_session, user.id)` kills every session for that user id including the one that made the request; the UI then cheerfully reports "their open sessions were logged out" and the next admin action 403s (`get_session_from_session_key` returns `None`, `get_admin_user` raises `AdminRequiredException` — `galaxy/managers/session.py:25-31`, `api2/__init__.py:146-149`). Being logged out after changing your own password is defensible, so the ask is the warning rather than the session exclusion: have the frontend flag it when `selectedUsername` matches the current user.

---

## Nits

### 11. Reset token stays in the browser URL and history after redemption
`lib/tool_shed/webapp/frontend/src/components/pages/ResetPassword.vue:11,30`

The token is read from `?token=` and the page then `router.push`es away, leaving `…/user/reset_password?token=<live-until-redeemed>` in history and in the `Referer` of any subsequent same-page navigation. Fix: `router.replace({ query: {} })` right after `queryParamToString(useRoute().query.token)` reads it.

### 12. Case-insensitive email fallback is non-deterministic
`lib/tool_shed/managers/users.py:142`

`select(User).where(func.lower(User.email) == email.lower())).first()` with no `ORDER BY` — if two accounts differ only by case the reset silently targets an arbitrary one. Same defect exists in `UserManager.by_email`, so fixing #3 by reusing it does not resolve this; worth an `.order_by(User.id)` wherever it lands.

### 13. Deleted-account check is missing on the redemption and admin paths
`lib/galaxy/managers/users.py:506-514`, `lib/tool_shed/managers/users.py:129`

`_user_for_password_reset` refuses deleted users at issue time, but neither `change_password`'s token branch nor `set_user_password` re-checks `user.deleted`. An account deleted inside the 24h window can still have its password set. Low impact (login already rejects deleted accounts at `lib/tool_shed/webapp/api2/users.py:350-356`), but the check is one line.

### 14. `log.warning` for an unknown address carries no address
`lib/tool_shed/managers/users.py:107`

The comment explains the enumeration reasoning for the *response*, but the log is server-side. Galaxy logs the email here (`lib/galaxy/managers/users.py:653`). An admin investigating "I never got the mail" has nothing to go on. Consider logging the address (and the remote IP) — it does not weaken the client-facing guarantee.

### 15. Three copies of the same new-password field pair
`ChangePassword.vue:42-48`, `ResetPassword.vue` template, `AdminControls.vue` template

Each hand-rolls `password` + `confirm` `q-input`s with `AUTH_FORM_INPUT_PROPS` and no client-side match check. Extract a `components/NewPasswordFields.vue` with `v-model` on both and a `valid` emit; all three get client-side mismatch feedback for free instead of a 400 round trip.

### 16. `ForgotPassword.vue` `sent` state is a dead end
`lib/tool_shed/webapp/frontend/src/components/pages/ForgotPassword.vue:11,22`

Once `sent` flips true the form is replaced permanently; a user who typo'd the address must navigate away and back. A "Send to a different address" link resetting `sent` would do.

### 17. No `autocomplete` hints on the new password inputs
`ResetPassword.vue`, `AdminControls.vue`

`autocomplete="new-password"` on the new/confirm pair stops password managers offering the *old* password and prompts them to save the new one. Existing `ChangePassword.vue` has the same gap, so this is consistency-neutral — but the new pages are the natural place to start.

---

## Abstraction & reuse

**Verdict: this is a parallel path, and the evidence says it did not have to be.** The key fact I checked before claiming it: `UserManager.__init__` does `self.model_class = app.model.User` (`lib/galaxy/managers/users.py:96`) and already carries an `app_type` constructor parameter (`:95`, branched at `:702` and `:717`) that exists precisely to let one `UserManager` serve a non-Galaxy app. (Caveat: the shed's `depends(UserManager)` instance is built with the default `app_type="galaxy"`, so the seam exists but the shed is not using it — harmless, since none of `get_reset_token` / `by_email` / `__set_password` branch on it; only `get_or_create_remote_user` does.) The Tool Shed already constructs one via `depends(UserManager)` (`lib/tool_shed/webapp/api2/users.py:124`) and already calls `user_manager.create`, `user_manager.by_api_key`, `user_manager.get_user_by_identity` and `user_manager.change_password` through it. So the shed is not walled off from this code — it is already leaning on it for the half of the flow that happens to have been written generically.

What got duplicated, specifically:

| New shed code | Existing Galaxy code it re-implements |
|---|---|
| `tool_shed/managers/users.py:138-145` `_user_for_password_reset` + `:109-113` token creation | `galaxy/managers/users.py:656-664` `UserManager.get_reset_token` — identical logic, already app-agnostic |
| `tool_shed/managers/users.py:41-52` `PASSWORD_RESET_TEMPLATE` | `galaxy/managers/users.py:71-82` `PASSWORD_RESET_TEMPLATE` — near-verbatim, 3 `%s` vs 4 |
| `tool_shed/managers/users.py:91-126` `send_password_reset_email` | `galaxy/managers/users.py:623-654` `UserManager.send_reset_email` |
| `tool_shed/managers/users.py:129-135` `set_user_password` | `galaxy/managers/users.py:531-558` `UserManager.__set_password` (minus session invalidation, minus `log_event`) |
| `tool_shed/webapp/api2/users.py:231,303` explicit `invalidate_user_sessions` | the "Invalidate all other sessions" block inside `__set_password` (`galaxy/managers/users.py:542-553`) |
| `tool_shed/webapp/api2/users.py:329-330` honeypot check | `:257-259` honeypot check, three endpoints apart in the same file |

**What the shared seam should look like.** Three things in `send_reset_email` are genuinely Galaxy-specific, and one of them hard-fails: `trans.app.config.hostname` (`galaxy/managers/users.py:628`) is set only in `galaxy/config/__init__.py:1408-1410` and **does not exist on the shed config at all** — nothing named `hostname` is in `lib/tool_shed/webapp/config.py` or `tool_shed_config_schema.yml`, so calling `send_reset_email` from the shed today would `AttributeError`. That is precisely why the seam has to take the host from the caller. The other two are the `/login/start` route and the product name in the subject/template. (`trans.log_event` is a fourth, but harmless — it is a no-op on the shed.)

Everything else really is common, and I checked each: `smtp_server`, `email_from`, `pretty_datetime_format`, `email_domain_allowlist_content`/`blocklist_content` (`tool_shed/webapp/config.py:104-105,110`), `email_ban_file` and `canonical_email_rules` (`tool_shed_config_schema.yml:584,597`) all exist on the shed config, and `validate_email`/`validate_password` are model-agnostic (`trans.app.model.User` plus string checks — `validate_user_input.py:103-139,195-198`). So:

```python
# galaxy/managers/users.py
def request_password_reset(self, trans, email, *, reset_url_for, product="Galaxy") -> None:
    """Issue a reset token for ``email`` and mail ``reset_url_for(token)``.

    Raises ConfigDoesNotAllowException / RequestParameterInvalidException;
    returns silently when no account matches (anti-enumeration).
    """
```

`UserManager.send_reset_email` becomes the thin message-returning wrapper Galaxy's legacy controller still wants (`reset_url_for=lambda t: trans.url_builder("/login/start", token=t)`), and the shed calls `request_password_reset(trans, email, reset_url_for=lambda t: f"{trans.repositories_hostname}/user/reset_password?token={t}", product="Tool Shed")`. That single seam kills the duplicated template, the duplicated token issue, the duplicated smtp guard, and — because the URL is now the caller's responsibility — is also the natural place to land the Blocking #1 fix for both apps.

Second seam, for the admin endpoint: make `__set_password` public as `UserManager.set_password(trans, user, password, confirm)`. The shed's `set_user_password` disappears and both `invalidate_user_sessions` call sites at `api2/users.py:231` and `:303` collapse into the manager's existing invalidation (once #3's ordering is fixed). Worth noting for the author: **Galaxy proper has no admin "set another user's password" API** — I checked `lib/galaxy/webapps/galaxy/api/users.py`; `set_password` at `:1060` routes through `change_password(trans, id=id, **payload)`, which requires `current` via `check_change_password`. So this PR invents a genuinely new capability. That is a reason to build it in `UserManager` where Galaxy's admin UI can pick it up later, not a reason to build it shed-side only.

**Frontend.** No cross-app reuse is possible here — the shed frontend is a standalone Quasar/Vue app, not Galaxy's client — so the new pages are unavoidably new. Within the shed, though, `ResetPassword.vue` and `ChangePassword.vue` and the `AdminControls.vue` block are three copies of the same password/confirm form (nit #15), and `ForgotPassword.vue`/`ResetPassword.vue` each re-do the `ModalForm` + `ErrorBanner` + `error`/`dismiss` boilerplate that `LoginForm.vue` and the register page already have. `SelectUser.vue` *was* reused for the admin picker — that is the one place the PR does the right thing, and it works cleanly (the component self-triggers `usersStore.getAll()`, so `AdminControls`' `storeToRefs(useUsersStore())` resolves without extra wiring).

---

## Test coverage gaps

The 6 API tests are real integration tests against a live shed with a mock mailbox (`mock_emails_to_path://`, `lib/galaxy/util/__init__.py:1714`) and do assert the two properties that matter most — end-to-end redemption and single-use. Nothing was weakened or removed to make anything pass; the `confirm` addition to `UiChangePasswordRequest` was a real fix with a real test. What is missing:

1. **Expired token.** No test at all. `lib/galaxy/managers/users.py:507` is the only expiry enforcement in the system and nothing exercises it. Cheapest version: after `_request_password_reset`, reach into the DB (or monkeypatch `now`) to backdate `expiration_time`, then assert 400.
2. **Session invalidation.** The PR's own headline claim — "redeeming drops the account's sessions" — is untested. Both the token path (`api2/users.py:303`) and the admin path (`:231`) are uncovered. Test shape: create an API key / session for the user, reset, assert the old session no longer authenticates.
3. **Token → user binding.** Nothing asserts that user A's token cannot set user B's password. It is correct by construction (`token_result.user`), but this is the single most catastrophic failure mode and deserves a red-green test.
4. **Rate limit is structurally untestable here.** `lib/tool_shed/test/base/driver.py:93` sets `TOOL_SHED_SENSITIVE_API_REQUEST_LIMIT = "10000/second"`, so the limiter on the new endpoint is effectively off in tests. Not this PR's fault, but the PR body claims "same honeypot + rate limit as register endpoint" and only the honeypot is verifiable — and the honeypot is *also* untested on the new endpoint (`bear_field != ""` → 400 has no test on either endpoint).
5. **`smtp_server is None` → 403.** `ConfigDoesNotAllowException` at `managers/users.py:99` is uncovered; the test driver always configures the mock mailbox.
6. **Admin 403 is covered, admin-on-nonexistent-user is not.** `test_set_password_requires_admin` (`test_shed_users.py:154`) genuinely uses a non-admin (`self.api_interactor` builds a `TEST_USER` key, `lib/tool_shed/test/base/api.py:45-53`) — good. But `ObjectNotFound` (`api2/users.py:227`) and a malformed encoded id (→ `MalformedId` from `security.decode_id`) are untested.
7. **Playwright test stops at the banner.** `test_forgot_password` (`test_frontend_login.py:44-54`) asserts only that `.reset-password-sent` appears. The new `ResetPassword.vue` page — the one that actually takes the token out of a URL and changes a password — is never loaded by any browser test. Extending the existing test to read the token out of `TOOL_SHED_TEST_EMAIL_PATH` and `visit_url` the link would cover the whole flow for roughly ten more lines.
8. **Confirm-mismatch does not assert the token survives.** `test_password_reset_rejects_mismatched_confirmation` (`:132`) asserts 400 and that the old password still works, but not that the token is still redeemable afterwards. It is (the `__set_password` message returns before the expiry line), and that behaviour is worth pinning — burning a token on a typo would be a bad regression.
9. **Mailbox is a single shared file.** `driver.py:128-129` puts one `email.json` in the shared tmp dir and every reset overwrites it; `test_password_reset_does_not_disclose_unknown_email` (`:125`) *deletes* it. That is safe only because these tests run sequentially in one class — `pytest-xdist` or reordering would make it flaky, and `test_frontend_login.py` writes to the same path from the browser suite. At minimum have `_reset_token_from_email` assert `email["to"] == <expected address>` (`:173-179` currently only checks the subject) so a stale token from an earlier test fails loudly instead of confusingly.

---

## Verified / checked and fine

- **Token→user binding.** `change_password`'s token branch takes `user = token_result.user` (`galaxy/managers/users.py:509`); there is no user id in the request body. A token cannot target an arbitrary account. CONFIRMED.
- **Expiry is enforced** at `galaxy/managers/users.py:507` (`not token_result.expiration_time > now()`), 24h set in the model constructor (`tool_shed/webapp/model/__init__.py:218`). Enforcement is correct; only its *testing* is missing (gap #1).
- **`require_admin=True` really is enforced** — `Router.admin_user_dependency = AdminUserRequired` → `get_admin_user` → `AdminRequiredException` (403) (`tool_shed/webapp/api2/__init__.py:146-152`, wired at `:156`). Same mechanism as the pre-existing `POST /api/users`, and `test_set_password_requires_admin` confirms 403 with a genuine non-admin key.
- **Rate limiter is actually attached** to both new endpoints (`api2/users.py:217`, `:322`) using the same `@limiter.limit(SENSITIVE_API_REQUEST_LIMIT)` as every other sensitive route; `limiter` is keyed on remote address (`fast_app.py:145`).
- **Honeypot is required, not optional** — `bear_field: str` has no default, so omitting it is a 422 rather than a bypass.
- **Response shape is identical** for known and unknown addresses (204 both ways), and the frontend renders the same "if an account exists" copy regardless. The *only* divergences are the ones in Should-fix #7.
- **Token is not logged or echoed.** `log.info` at `managers/users.py:126` logs `user.id` only; no response body carries the token; the PR notably does **not** copy Galaxy's `log.debug(body)` on mail failure (`galaxy/managers/users.py:650`), which would have dumped the reset link into the log. Deliberate and correct.
- **Caller's own session gap is real and the extra call is needed — but not for the stated reason.** The deciding line is the `if trans.galaxy_session:` guard (`galaxy/managers/users.py:543`), not the `id !=` exclusion at `:548`. Two cases: an **API redeemer with no cookie** gets `trans.galaxy_session is None` (`api2/__init__.py:100-107`), so the whole block is skipped and *nothing* is invalidated — this is the case the extra `invalidate_user_sessions` at `:303` actually covers. A **browser redeemer** already has an anonymous `galaxycommunitysession` (`fast_app.py:102`), the block runs, and since that row has `user_id IS NULL` the id exclusion matches nothing — `__set_password` already invalidates every one of the victim's sessions, making the extra call redundant. Worth telling the author: the PR's own inline comment at `api2/users.py:300-302` ("`change_password` only clears sessions other than the caller's own, and an anonymous caller has none") carries the same imprecision and should read "`change_password` skips session invalidation entirely when the request carries no session".
- **CSRF.** The token branch has no `ensure_csrf_token` unlike login/logout. I traced this and do not consider it exploitable: both new endpoints require `application/json`, which forces a CORS preflight on any cross-site request, and the attacker would in any case need the token or the current password. Raising it only as a question below. Same reasoning acquits the higher-value target — the cookie-authenticated admin `PUT /api/users/{encoded_user_id}/password`, where a forged request would set an arbitrary user's password: JSON body forces a preflight, and the shed's CORS is opt-in per route (`allow_cors=True` appears only in `api2/repositories.py` and `api2/tools.py`).
- **Python imports are all module-top-level** in both `tool_shed/managers/users.py` and `tool_shed/webapp/api2/users.py`. No function-local imports introduced. `invalidate_user_sessions` is referenced at `:231`/`:303` before its definition at `:428`, which is fine (resolved at call time) and matches the file's existing layout.
- **`schema.ts` regeneration is consistent** with the Python models — `SetPasswordRequest`, `UiResetPasswordRequest`, and the `UiChangePasswordRequest` changes (`confirm` required, `current`/`token` optional-nullable) all match. Note this makes `confirm` a *required* field on `/api_internal/change_password`; harmless since it is an internal endpoint with one consumer, but a stale cached frontend bundle would start 422ing.
- **Routes are consistent.** `/user/forgot_password` and `/user/reset_password` are in both `routes.ts:117-124` and `FRONT_END_ROUTES` (`fast_app.py:138-139`), so deep links and hard refreshes work. The `change_password_success` bug fix is real — `/user/change_password_success` exists at `routes.ts:38` and in `FRONT_END_ROUTES`; the old `/user/password_change_success` existed in neither. CONFIRMED.
- **Error handling in the Vue pages works.** `openapi-fetch` is wrapped in a middleware that throws on non-`ok` (`schema/client.ts:9-19`), so the `try`/`catch` blocks in `ForgotPassword.vue` and `ResetPassword.vue` do catch 4xx/5xx — worth stating because with a bare `openapi-fetch` client they would not.
- **`SelectUser` wiring is correct** — the component calls `usersStore.getAll()` in its own setup (`SelectUser.vue:19`), and `AdminControls.vue` reads `users` from the same pinia store, so the `selectedUserId` computed resolves once loaded. `persist-selection` / `@cleared` match the component's declared emits.
- **The mock-mail scheme is pre-existing**, not invented here (`galaxy/util/__init__.py:1714-1724`); the driver change is a two-line config swap.

---

## Questions for author

1. `GET /api/users` (`api2/users.py:127-134`) has no `require_admin` and no auth dependency — any anonymous caller can enumerate every username on the shed. Given that, how much is the careful email-based anti-enumeration on `/api_internal/reset_password` actually buying? (Not an objection to the anti-enumeration — a question about whether the index endpoint should be tightened in the same breath.)
2. Was the decision to invalidate *all* the user's sessions on token redemption (rather than Galaxy's `handle_user_login(user)` at `controllers/user.py:352`, which logs them straight in) deliberate? The shed behaviour is strictly safer; just flagging that the two apps now diverge and the shed user must log in again after a reset.
3. Intentional that `/api_internal/change_password` takes no `session_csrf_token` while `/api_internal/login` and `/api_internal/logout` do (`api2/users.py:380-391`)? I believe it is safe (JSON content type forces preflight; the attacker needs the token or the current password either way), but the asymmetry is worth a comment in the code if it was reasoned through.
4. Should the admin password reset be in `UserManager` so Galaxy's admin UI can use it too? There is no equivalent in Galaxy today — is the shed the intended only home for this, or the first of two?
5. Any objection to `secrets.token_hex(16)` in `galaxy.util.unique_id`? It would touch Galaxy's own reset tokens and session keys, so it may want to be its own PR — but it is the entropy source this feature now depends on.
