# galaxy#23836 - [26.1] Preserve OIDC PKCE verifier across Galaxy login callback

- PR: https://github.com/galaxyproject/galaxy/pull/23836 (bgruening, base `release_26.1`)
- Head: `3bf568aaf64`
- Fixes: #23800 (Keycloak + `pkce_support` login fails; reporter found `session_get("pkce_code_verifier")` empty in callback)
- Reviewed: 2026-09-30
- CI: pending at review time

## Summary

Two changes to `Strategy` in `psa_authnz.py`: keep a passed-in empty dict (`if session is not None`) instead of swapping in a fresh `{}`, and implement `session_pop`. Plus a unit test that builds a Strategy around a `{}` and checks the verifier lands in that dict.

**Verdict: request changes. The patch doesn't fix #23800 in a running Galaxy.** In production `trans.session` is `None`, not `{}`. So both the `authenticate` request and the `callback` request still get their own throwaway dict. The verifier is still lost between the two requests. The test passes only because it hands in a `{}` that production never provides.

Root cause is a 26.0 regression. The old custos backend (25.1 `custos_authnz.py:42,191,421-422`) kept the verifier in a `galaxy-oidc-verifier` cookie. The custos -> PSA merge (`5ddc5965fa9`) moved it to `strategy.session_set`, and Galaxy's PSA strategy has no storage that lasts across requests. `origin/dev` has the same `Strategy` code (`psa_authnz.py:587-608`) and the same `oidc.py`, so it has the same bug. The real fix should go to 26.0/26.1 and be merged forward.

## Findings

### 1. [blocker] `trans.session` is `None` in Galaxy, so the fix doesn't change production behavior

- `lib/galaxy/web/framework/base.py:370-382`: `DefaultWebTransaction.session` returns `environ["beaker.session"]` / `com.saddi...` or `None`. No Galaxy middleware sets either key; `use_beaker_session` is listed as dropped in `lib/galaxy/config/config_manage.py:158`. `GalaxyWebTransaction` doesn't override it.
- `psa_authnz.py:315` (`authenticate`) and `:337` (`callback`) each call `Strategy(trans.request, trans.session, ...)` with `None`. `session if session is not None else {}` still yields a new per-request `{}`. `oidc.py:63` writes the verifier into the first dict, which is discarded, and `oidc.py:75` reads from the second, which is empty. That's exactly what the reporter saw.
- The `is not None` change only matters when the caller passes a `{}` it keeps a reference to. Only the new test does that.

### 2. [major] Where to persist the verifier: restore the 25.1 cookie (preferred) or use a server-side row

The verifier must survive a browser round trip and ideally be bound to the browser that started the login. Galaxy's state check doesn't provide that binding: `callback` sets the session state from the request's own `state_token` (`psa_authnz.py:338`), so `validate_state` always passes. That makes a per-browser cookie the right store here. It's also exactly what 25.1 did.

Sketch (`lib/galaxy/authnz/oidc.py`). `authenticate` needs to expose `trans` the same way `callback` already does via `config["GALAXY_TRANS"]` (`psa_authnz.py:336`):

```python
VERIFIER_COOKIE_NAME = "galaxy-oidc-verifier"

    def auth_params(self, state=None):
        params = super().auth_params(state)
        if self.PKCE_ENABLED:
            code_verifier, code_challenge = generate_pkce_pair(96)
            params["code_challenge"] = code_challenge
            params["code_challenge_method"] = "S256"
            self.strategy.config["GALAXY_TRANS"].set_cookie(value=code_verifier, name=VERIFIER_COOKIE_NAME)
        return params

    def auth_complete_params(self, state=None):
        params = super().auth_complete_params(state)
        if self.PKCE_ENABLED:
            trans = self.strategy.config["GALAXY_TRANS"]
            if code_verifier := trans.get_cookie(name=VERIFIER_COOKIE_NAME):
                params["code_verifier"] = code_verifier
            trans.set_cookie("", name=VERIFIER_COOKIE_NAME, age=-1)
        return params
```

and in `PSAAuthnz.authenticate`: `self.config["GALAXY_TRANS"] = trans` before building the Strategy. A cleaner version of the same idea: give `Strategy` the `trans` and make `session_get`/`session_set`/`session_pop` cookie-backed for this one key. That removes the "session" that doesn't really exist from the PKCE path entirely.

Server-side alternative: store the verifier as a `PSAAssociation` row keyed by `state`. This mirrors `get_and_store_nonce` / `remove_nonce` in social_core `open_id_connect.py`, and `auth_complete_params(state)` receives the validated state. It isolates each login attempt and cleans up on use. But because of the neutered state check above, it binds the verifier to `state` rather than to the browser. A stolen code+state pair could still be redeemed through Galaxy's callback, which weakens PKCE's code-injection protection. Prefer the cookie.

### 3. [minor] Reuse: PSA already has PKCE

In the pinned `social-auth-core==4.9.1`, `OpenIdConnectAuth` subclasses `BaseOAuth2PKCE` (setting `USE_PKCE`, `DEFAULT_USE_PKCE = False`). Galaxy's `GalaxyOpenIdConnect.auth_params` / `auth_complete_params` (`oidc.py:47-84`) duplicate it. The PSA mixin exposes exactly the storage seam that's broken here: `create_code_verifier()` / `get_code_verifier()`. Longer term (dev), map `pkce_support` -> `USE_PKCE` and override only those two methods to use the cookie. That drops the extra `pkce` dependency and the hand-rolled code. Not needed for the 26.1 backport; mention it for dev.

### 4. [minor] Test checks the wrong boundary

`test_pkce_verifier_is_stored_in_galaxy_session` (`test/unit/authnz/test_psa_authnz.py:441-463`) asserts that the dict it passed in was mutated. It doesn't test a round trip, and it uses `trans.session = {}`, which production never has. It would still pass with this PR's no-op fix, as shown. A round-trip test is cheap: build two separate Strategy/backend pairs like `authenticate` and `callback` do, with `session=None` and a shared fake `trans` whose `set_cookie`/`get_cookie` go through a dict. Call `auth_params(state)` on the first and `auth_complete_params(state)` on the second, and assert `params["code_verifier"]` matches and the cookie was expired. That test fails on this PR head and on `release_26.1`, which gives a real red-to-green.

### 5. [nit] `session_pop` now makes the `except NotImplementedError` in `oidc.py:78-82` dead

If the Strategy change stays, drop the try/except. `session_pop` returning `None` for a missing key is fine.

## Draft review

_This review was posted by Claude (AI assistant) on behalf of jmchilton._

Thanks for picking this up. I don't think this change fixes #23800 in a running Galaxy, though.

`trans.session` is `None` in Galaxy, not `{}`. `DefaultWebTransaction.session` (`lib/galaxy/web/framework/base.py`) only returns a beaker/saddi session from environ, and nothing sets one since `use_beaker_session` was dropped. So `authenticate` and `callback` each still build their `Strategy` around a fresh throwaway `{}`, even with `is not None`. The verifier written in `oidc.py` `auth_params` is gone by the time `auth_complete_params` runs. The new test passes only because it hands `Strategy` a `{}` that production never provides.

This looks like a regression from the custos -> PSA merge. 25.1's `custos_authnz.py` kept the verifier in a `galaxy-oidc-verifier` cookie (set at login, read and expired in the callback). Restoring that seems like the smallest correct fix, and a per-browser cookie is the right binding here: `callback` seeds the session state from the request's own `state_token`, so PSA's state check doesn't bind the flow to the browser. Roughly:

```python
VERIFIER_COOKIE_NAME = "galaxy-oidc-verifier"

    def auth_params(self, state=None):
        params = super().auth_params(state)
        if self.PKCE_ENABLED:
            code_verifier, code_challenge = generate_pkce_pair(96)
            params["code_challenge"] = code_challenge
            params["code_challenge_method"] = "S256"
            self.strategy.config["GALAXY_TRANS"].set_cookie(value=code_verifier, name=VERIFIER_COOKIE_NAME)
        return params

    def auth_complete_params(self, state=None):
        params = super().auth_complete_params(state)
        if self.PKCE_ENABLED:
            trans = self.strategy.config["GALAXY_TRANS"]
            if code_verifier := trans.get_cookie(name=VERIFIER_COOKIE_NAME):
                params["code_verifier"] = code_verifier
            trans.set_cookie("", name=VERIFIER_COOKIE_NAME, age=-1)
        return params
```

plus `self.config["GALAXY_TRANS"] = trans` in `PSAAuthnz.authenticate`, as `callback` already does.

For the test, a round trip would catch this: two separate Strategy/backend instances (like `authenticate` and `callback`), `session=None`, and a shared fake trans whose cookies go through a dict. Call `auth_params(state)` on one and `auth_complete_params(state)` on the other, and assert the verifier comes back and the cookie is expired. That fails on the current head.

`dev` has the same `Strategy`/`oidc.py` code, so it needs the fix merged forward. Longer term on dev, social_core's `OpenIdConnectAuth` already subclasses `BaseOAuth2PKCE` (`USE_PKCE`). Galaxy could map `pkce_support` onto that and override only `create_code_verifier`/`get_code_verifier` for storage, instead of carrying its own PKCE code.
