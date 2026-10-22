# PR #24111 initial review: default profile

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Opus 5.5, low effort
- Reviewed commit: `a55b237469afdcf9af7ab9f19ff09ac9007b3268` (diff vs `origin/release_26.1`, merge-base `dbe4f2f7e41`)
- Private security report: none written. No open-redirect or other security problem found. Server and client allowlist checks agree on every spelling tested: userinfo, backslash, whitespace, control characters, `:443` normalization, IPv6 brackets, and full-width or percent-encoded dots.

## Summary

This is a careful, well-tested PR. The OIDC URL fixes are correct. Pipeline steps now build URLs with `trans.url_builder` from the app root. The callback no longer runs `url_for` a second time. `login_destination()` validates the cookie in one place and is used by both the callback and the confirmation POST. The new `is_safe_login_redirect` builds on `is_safe_local_redirect` rather than replacing it, and the client's `safeLoginRedirect` matches it.

I ran the touched unit suites with a borrowed Galaxy venv: `test/unit/util/test_safe_local_redirect.py`, `test/unit/config/test_allowed_login_redirect_hosts.py`, `test/unit/webapps/test_{authnz_login_next,login,root_login}.py` and `test/unit/authnz/test_{oidc_backends,deferred_user_creation,authnz_controller}.py`. All 166 tests passed. I did not run the Keycloak integration or client tests.

All findings are about reuse and abstraction. None of them blocks merging.

## Findings

### P3 1: Same-origin absolute URL check lives in the user controller and repeats `is_safe_login_redirect`'s refusal rules

`lib/galaxy/webapps/galaxy/controllers/user.py` adds the module-level `DEFAULT_PORTS`, `_origin()` and `_is_absolute_url_to()`. `_is_absolute_url_to` repeats the "refuse backslash / control characters / `@` in netloc" rules that `galaxy.util.is_safe_login_redirect` already applies. These are two copies of one URL-trust policy in two modules. A later hardening of one copy (for example adding the whitespace/`strip()` refusal, which `_is_absolute_url_to` lacks today) will not reach the other. `util.compare_urls` was the old reusable helper. It now only handles the logout comparison.

Suggested fix: move the same-origin check into `galaxy.util` next to `is_safe_login_redirect`. Then either expose it as `is_same_origin_url(base, url)`, which reuses the same pre-parse refusals, or give `is_safe_login_redirect` an optional `own_origin` argument. The password-login path would then be a single call.

### P3 2: The "validate a post-login target against config and log a warning" step is written three times

`root.login`, `User.__get_redirect_url` and `authnz.login_destination` each read `trans.app.config.allowed_login_redirect_hosts`, call `is_safe_login_redirect`, and log the same `"Ignoring post-login redirect target that is not allowed: %s"` message. `login_destination(trans)` is already close to a reusable abstraction. A small helper shared by all three would keep the log text, which the new admin docs quote, in one place. The helper could take `trans` and the raw target and return the validated target or `None`, logging when it refuses. It would also be the obvious place for any future rule, such as refusing logout targets, which currently exists only for password login.

## Non-findings / notes

- The stopped-login detection is split. `PSAAuthnz.callback` knows `stopped = not isinstance(redirect, Redirect)`, but the controller works it out again from a `login/start?` prefix and `!= login_next`. The PR description already lists this as a known limitation and explains the interface trade-off. `PSAAuthnz` is the only `IdentityProvider` implementation, so returning the flag would be cheap if maintainers want it. I don't count this as a finding.
- New config option on `release_26.1`: the PR description raises this for maintainers to decide. Not re-litigated.
- `is_safe_login_redirect` normalizes `allowed_hosts` again on every call, although config parsing has already done it. This is harmless and keeps the function correct for callers that pass raw hosts.
- Test quality is good. The tests are red-to-green per the description. The integration test under `galaxy_url_prefix` covers the doubled-prefix bug end to end, and the unit tests target parser-disagreement edge cases rather than trivial cases.
