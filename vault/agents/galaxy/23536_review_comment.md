> **Posted by Claude (AI assistant) on John Chilton's behalf** — not authored by them personally. Every claim below was traced against the code and then re-checked by a second adversarial pass whose job was to falsify it; four items from the first draft were corrected or downgraded before posting, so the list is deliberately shorter than it started.

Nice feature, and the security shape is mostly right — the anti-enumeration is deliberate and commented, the honeypot and rate limiter really are attached, `require_admin=True` really is enforced, the token is bound to its user by construction, and you spotted the caller-session gap in `change_password` and worked around it. Two of the adjacent bug fixes are real finds (the never-validated `confirm`, and `/user/password_change_success` being a route that does not exist).

Most of what follows is one blocking item plus a reuse question.

## Blocking: the reset link is built from the request `Host` header

`lib/tool_shed/managers/users.py:114`

```python
reset_url = f"{urljoin(trans.request.base, RESET_PASSWORD_PATH)}?{urlencode({'token': reset_token.token})}"
```

`trans.request.base` is `str(starlette_request.base_url)` (`lib/galaxy/webapps/galaxy/api/__init__.py:271-273`), which Starlette derives from the `Host` header in the ASGI scope, and the documented nginx config forwards that header verbatim (`server_name _;` + `proxy_set_header Host $http_host;` — `doc/source/admin/nginx.md:103,121`). The endpoint is unauthenticated, so anyone can `POST {"email": "victim@…", "bear_field": ""}` with `Host: evil.example` and the victim receives a genuine, valid reset link pointing at the attacker's domain. Clicking it hands over a live token.

The shed already has the right abstraction — `SessionRequestContext.repositories_hostname` (`lib/tool_shed/context.py:149-154`) prefers `config.tool_shed_url`:

```python
reset_url = f"{trans.repositories_hostname}/{RESET_PASSWORD_PATH}?{urlencode({'token': reset_token.token})}"
```

One caveat: that property falls back to `str(self.request.base)` when `tool_shed_url` is unset, and `tool_shed_url` has no default (`tool_shed_config_schema.yml:49`), so the swap alone only closes the hole on instances that configure it. Refusing to mail a link when `tool_shed_url` is unset (alongside the existing `smtp_server is None` guard) would close it properly.

Galaxy proper has the same weakness, incidentally — not via `url_builder`, which returns a path, but via `trans.request.host` interpolated into `PASSWORD_RESET_TEMPLATE` (`lib/galaxy/managers/users.py:71-82`, `:628-635`). If the shared seam below happens, both get fixed at once.

## A password change never expires the account's *other* outstanding reset tokens

`send_password_reset_email` mints a fresh `PasswordResetToken` on every request (`managers/users.py:109-113`) and never expires prior ones; `change_password`'s token branch expires only the row it redeemed (`lib/galaxy/managers/users.py:513`); `set_user_password` touches no tokens at all. Nothing else in the tree ever writes `PasswordResetToken`.

That matters most in exactly the scenario your own comment invokes at `api2/users.py:229-230` — "an admin reset is how a compromised account gets recovered." The admin sets a new password and drops every session, but any token issued for that account in the preceding 24h is still redeemable, and redeeming it sets the password again, undoing the recovery. Same hole, less dramatically, after a self-service change: an unused link from an earlier "forgot password" click stays live for its full 24h.

Fix is one query in whichever function ends up owning "set this user's password" — expire all rows in `user.reset_tokens` (`tool_shed/webapp/model/__init__.py:130`). Related: nothing caps outstanding tokens, so a caller can accumulate unbounded live tokens for a registered address, throttled only per-IP at 10/min.

## Reuse: this is a second implementation of machinery that is already app-agnostic

`UserManager.__init__` does `self.model_class = app.model.User` (`lib/galaxy/managers/users.py:96`), so a shed-constructed `UserManager` queries `tool_shed.webapp.model.User` — and the shed already constructs one via `depends(UserManager)` (`api2/users.py:124`) and already calls `user_manager.change_password` from the adjacent endpoint. So the shed is not walled off from this code; it is already leaning on it for half the flow. What got re-implemented alongside:

| New shed code | Existing code it duplicates |
|---|---|
| `managers/users.py:138-145` `_user_for_password_reset` + `:109-113` token creation | `galaxy/managers/users.py:656-664` `UserManager.get_reset_token` |
| `managers/users.py:41-52` `PASSWORD_RESET_TEMPLATE` | `galaxy/managers/users.py:71-82` `PASSWORD_RESET_TEMPLATE` |
| `managers/users.py:91-126` `send_password_reset_email` | `galaxy/managers/users.py:623-654` `UserManager.send_reset_email` |
| `managers/users.py:129-135` `set_user_password` | `galaxy/managers/users.py:531-558` `UserManager.__set_password` |
| `api2/users.py:231,303` explicit `invalidate_user_sessions` | the invalidation block inside `__set_password` (`:542-553`) |
| `api2/users.py:329-330` honeypot check | `:257-259` honeypot check |

Checking what actually blocks reuse: exactly three things in `send_reset_email` are Galaxy-specific, and one of them hard-fails — `trans.app.config.hostname` (`galaxy/managers/users.py:628`) is set only in `galaxy/config/__init__.py:1408-1410` and does not exist on the shed config at all, so calling it shed-side today would `AttributeError`. The other two are the `/login/start` route and the product name. Everything else is genuinely common: `smtp_server`, `email_from`, `pretty_datetime_format`, the email allow/blocklist config and `canonical_email_rules` all exist on the shed config, and `validate_email` / `validate_password` are model-agnostic.

So the seam suggests itself — the host becomes the caller's problem, which is also where the blocking fix lands:

```python
# galaxy/managers/users.py
def request_password_reset(self, trans, email, *, reset_url_for, product="Galaxy") -> None:
    """Issue a reset token for ``email`` and mail ``reset_url_for(token)``.

    Raises ConfigDoesNotAllowException / RequestParameterInvalidException;
    returns silently when no account matches (anti-enumeration).
    """
```

`send_reset_email` becomes a thin message-returning wrapper for the legacy controller; the shed calls it with `reset_url_for=lambda t: f"{trans.repositories_hostname}/user/reset_password?token={t}"` and `product="Tool Shed"`. Second seam: promote `__set_password` to a public `UserManager.set_password(trans, user, password, confirm)` — `set_user_password` disappears and both hand-rolled `invalidate_user_sessions` calls collapse into the manager's own invalidation.

Worth flagging for that second seam: Galaxy has **no** admin "set another user's password" API today — `api/users.py:1060` routes through `change_password(trans, id=id, **payload)`, which still requires `current`. So this PR invents a genuinely new capability, which seems like an argument for building it in `UserManager` where Galaxy's admin UI can pick it up later rather than shed-side only.

## Smaller things

- **Token entropy.** `PasswordResetToken` gets its token from `galaxy.util.unique_id`, which is `md5(str(random.getrandbits(128)))` — Mersenne Twister, not a CSPRNG. Inherited, not introduced here, and the md5 wrapper means raw MT output is not directly observable, so it is not a turnkey exploit. But this PR is what turns that value into an emailed bearer credential for the shed. `secrets.token_hex(16)` is the one-line fix; it touches Galaxy session keys too, so possibly its own PR.
- **The 500 path is an enumeration oracle.** Unknown addresses return at `managers/users.py:108` before any mail is attempted, so the `InternalServerError` at `:125` is only reachable for addresses that *do* have an account. Any SMTP flakiness turns 500-vs-204 into exactly the signal the endpoint is trying to hide. Suggest catching the send failure, logging it, and still returning 204. The same change covers the adjacent issue that a token is committed at `:112` before the send is attempted, so a failed send leaves a live 24h token nobody can use — expire it in the failure branch.
- **Timing side channel, same endpoint.** The known-address branch does an INSERT + commit plus a synchronous SMTP round trip; the unknown branch does one or two SELECTs. Handing the send to a background task would flatten it.
- **Admin resetting *themselves*** kills every session for that user id including the one making the request (`api2/users.py:231`), and the UI then reports success while the next admin action 403s. Being logged out after changing your own password is defensible — the ask is just a warning in `AdminControls.vue` when the selected user is the current one.
- **Duplicated honeypot check.** You extracted `LOOKS_LIKE_A_BOT` but left the `if x.bear_field != "": raise` copied at `api2/users.py:257-259` and `:329-330`. A `class HasHoneypot(BaseModel)` with a pydantic `field_validator` — the same pattern as `HasCsrfToken` two model classes above — would carry it.
- **No audit record on any password path.** `trans.log_event` is `pass` on `SessionRequestContextImpl` (`tool_shed/context.py:180-181`), so the `log_event` inside `__set_password` writes nothing shed-side either. An admin resetting someone else's password is the one genuinely audit-worthy action here; a real `log.info` with both user ids would be worth adding (and for token redemption too).
- **The inline comment at `api2/users.py:300-302`** is slightly off in a way worth correcting since it is load-bearing for a reviewer: the extra `invalidate_user_sessions` is needed because `__set_password`'s invalidation is wrapped in `if trans.galaxy_session:` (`galaxy/managers/users.py:543`) and an API redeemer has no session at all, so *nothing* is invalidated — not because the caller's own session is excluded. For a browser redeemer the anonymous session row has `user_id IS NULL`, the exclusion matches nothing, and the extra call is redundant.
- **Token stays in the URL.** `ResetPassword.vue` reads `?token=` and then `router.push`es away, leaving the live token in history. `router.replace({ query: {} })` right after reading it would clear that.

## Tests

The six API tests are real integration tests against a live shed with a mock mailbox, and they do cover end-to-end redemption and single-use — nothing was weakened to make anything pass. The gaps I would most want filled, in order:

1. **Expired token.** Untested. `galaxy/managers/users.py:507` is the only expiry enforcement in the system and nothing exercises it. Backdate `expiration_time` in the DB after requesting, assert 400.
2. **Session invalidation.** The PR's headline claim — redemption drops the account's sessions — is untested on both the token path and the admin path. Create a session/key for the user, reset, assert the old one no longer authenticates.
3. **Token → user binding.** Correct by construction, but it is the most catastrophic possible failure mode and deserves a red-green test that user A's token cannot set user B's password.
4. **Honeypot on the new endpoint.** `bear_field != ""` → 400 has no test.
5. **Playwright stops at the banner.** `test_forgot_password` asserts only that `.reset-password-sent` appears; `ResetPassword.vue` — the page that actually takes a token out of a URL and changes a password — is never loaded by any browser test. Reading the token out of `TOOL_SHED_TEST_EMAIL_PATH` and visiting the link would cover the whole flow in about ten more lines.
6. **Confirm-mismatch should assert the token survives.** `test_password_reset_rejects_mismatched_confirmation` checks 400 and that the old password still works, but not that the token is still redeemable. It is — and burning a token on a typo would be a bad regression to pick up silently.

One structural note: `driver.py:128-129` points every test at a single shared `email.json`, and one test deletes it. That is safe only because these run sequentially in one class — `test_frontend_login.py` writes the same path from the browser suite. Having `_reset_token_from_email` assert `email["to"]` matches the expected address (it currently only checks the subject) would make a stale token fail loudly rather than confusingly.

Also worth knowing: `driver.py:93` sets `TOOL_SHED_SENSITIVE_API_REQUEST_LIMIT = "10000/second"`, so the rate limit the PR description mentions is effectively off under test and can't be verified there.

## Questions

1. `GET /api/users` (`api2/users.py:127-134`) has no auth dependency at all — any anonymous caller can enumerate every username on the shed. Given that, how much is the careful email-based anti-enumeration on the reset endpoint buying? Not an objection to the anti-enumeration; more a question of whether the index endpoint wants tightening in the same breath.
2. Was invalidating *all* the user's sessions on token redemption (rather than Galaxy's `handle_user_login`, which logs them straight in) deliberate? The shed behaviour is strictly safer — just noting the two apps now diverge and the shed user must log in again after a reset.
3. Intentional that `/api_internal/change_password` takes no `session_csrf_token` while `login` and `logout` do? It looks safe to me — the JSON content type forces a preflight, the shed's CORS is opt-in per route, and the attacker needs the token or the current password either way — but if that was reasoned through, a comment would save the next reader the trace. Same question applies to the new admin endpoint, which is the higher-value target.
4. Should the admin reset live in `UserManager` so Galaxy's admin UI can adopt it later, or is the shed the intended only home?
