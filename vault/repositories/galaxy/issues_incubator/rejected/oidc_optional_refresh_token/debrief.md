# Debrief: oidc_optional_refresh_token

Outcome: **reject**. See the Rejection section.

## Research

- Source: `local/oidc_optional_refresh_token.md`. The draft claimed the PSA pipeline rejects new users who come back with no `refresh_token`, and proposed a per-provider `require_refresh_token` option.
- dev sha: `b62d06dcdce` (origin-https/dev, fetched 2026-10-14; newer than the `36fe2ce8428` noted at handoff). social-auth-core pin on dev is 5.2.0, the same as the venv.
- Code read:
  - `contains_required_data` raises only `if is_new and not response.get("refresh_token")`.
  - social_core's `BaseAuth.authenticate` does `setdefault("is_new", False)`. Only `social_user` sets it, and that step runs after `contains_required_data` in `AUTH_PIPELINE`, so the branch is unreachable with the default pipeline.
  - Origin: `405a08522e8` (vjalili, 2018). The step order was the same then.
- Repro (unit, scratch worktree from dev):
  - Reuses the mocked-IdP fixtures in `test/unit/authnz/test_deferred_user_creation.py`, with the token endpoint returning no `refresh_token`.
  - The direct flow and the `require_create_confirmation` flow both create the user, which is stored with `refresh_token: None`.
  - A spy on `contains_required_data` records `is_new == False`, and a direct call with `is_new=True` raises. Result: 2 passed. The test is in the reject file.
- Config: neither `oidc_backends_config.xsd` nor the sample has a refresh-token requirement option. The sample only mentions `offline_access` in `<extra_scopes>`, as commented-out guidance. The Keycloak rig realm (`test/integration/oidc/galaxy-realm-export.json`) issues refresh tokens; a client attribute `use.refresh.tokens=false` would be the way to test without them, but that's moot now.
- Upstream search (`gh search issues/prs`): "refresh token", "require_session_refresh", "contains_required_data", "Missing refresh token", "refresh_token oidc".
  - No duplicate, and no prior report of a login rejection.
  - Related: #21180 (open; refresh tokens that can't be decoded, AzureAD/PingFed); #18826 and #19385 (`offline_access` / refresh failures); #21234 (Keycloak/CILogon moved to PSA, custos removed; custos also stored `None`); #22449, #22828, #23432 (the `require_session_refresh` series).

## Review round (subagent)

- Rejection held up. The reviewer re-checked social-core 5.1.0 and 5.2.0, Galaxy's `Strategy` and `callback` (no `is_new` passed, no `@partial` steps), and the pipeline order in every revision of `psa_authnz.py` since `405a08522e8`.
- As a sanity check, it forwarded `is_new=True` from the spy, and both repro cases then failed with "Missing refresh token". That shows the test really reaches the check.
- Edits:
  - added the `verify` row to the table, the social-core version note, and the custos and #21234 history;
  - rewrote the #18826 and #19385 descriptions accurately;
  - named the opt-in configs that *would* make the branch fire: a reordered `oidc_auth_pipeline`, or `oidc_auth_pipeline_extra` listing the function again. `config_schema.yml` uses `contains_required_data` as the example path for both;
  - extended the cleanup-PR note.
- Confidentiality grep was clean.

## Leftover

- The opt-in `oidc_auth_pipeline_extra` case is read from the code, not tested. The reviewer noted it would fire only in the direct flow, because the confirmation flow redirects first.
- Optional follow-up: a tiny cleanup PR that removes the unreachable branch and the misleading docstring line, and picks a different example path in `config_schema.yml`. No issue is needed for it.
- Scratch worktree removed after the review.

## Release check (added 2026-10-14)

`release_25.1` (`2ae14b0eac3`, pins social-auth-core 4.7.0), `release_26.0` and `release_26.1` have the same order: `contains_required_data` before `social_user`. social-core 4.7.0's `BaseAuth.authenticate` also does `kwargs.setdefault("is_new", False)`. So the check is unreachable with the default pipeline on every supported release; no backport needed.

## Rejection

**Verdict: don't file.** The premise is false on current `dev` (`b62d06dcdce`). Galaxy doesn't reject new OIDC users whose token response has no `refresh_token`. They log in, and the stored association just has `refresh_token: None`. So a `require_refresh_token` option would control nothing.

### Why the "Missing refresh token" check never fires

`contains_required_data` (`lib/galaxy/authnz/psa_authnz.py`) only raises when `is_new` is true:

```python
if is_new and not response.get("refresh_token"):
    raise MalformedContents(err_msg=f"Missing refresh token. {hint_msg}")
```

In the default `AUTH_PIPELINE`, `is_new` is always `False` at that point:

| Pipeline position | `is_new` |
| --- | --- |
| `social_core` `BaseAuth.authenticate` starts the pipeline | `kwargs.setdefault("is_new", False)` |
| `social_details`, `social_uid`, `auth_allowed` | unchanged |
| **`galaxy.authnz.psa_authnz.contains_required_data`** | **`False`** (the check is skipped) |
| `galaxy.authnz.psa_authnz.verify` | unchanged |
| `social_core.pipeline.social_auth.social_user` | the first step that sets `is_new = user is None` |
| `check_user_creation_confirmation`, `create_user_and_activate`, … | see the real value |

This holds for `social-auth-core` 5.1.0 and 5.2.0 (dev's pin). Galaxy passes no `is_new` into `do_complete`, and the default pipeline has no `@partial` step that could resume with a saved one. `contains_required_data` has come before `social_user` in every revision of `psa_authnz.py` since the check was added in `405a08522e8` (2018, "check for missing ID and refresh tokens."). So the branch has been unreachable all along on the default pipeline. It fires only if an admin's config runs the step after `social_user`: a reordered `oidc_auth_pipeline`, or `oidc_auth_pipeline_extra` listing `contains_required_data` again. The docs for both options happen to use that function as their example import path. The deferred-confirmation path (`require_create_confirmation`) doesn't re-check either: `PSAAuthnz.create_user` stores the saved token response as-is. The old custos backend, which served Keycloak and CILogon until #21234, also stored `None` rather than rejecting the login.

<details><summary>Reproduction (unit, passes on dev)</summary>

This reuses the mocked-IdP Keycloak fixtures from `test/unit/authnz/test_deferred_user_creation.py`. The token endpoint answers with no `refresh_token`. A spy records the `is_new` value that `contains_required_data` receives. Both the direct and the confirmation flows create the user. Save as `test/unit/authnz/test_login_without_refresh_token.py` and run `PYTHONPATH=lib pytest test/unit/authnz/test_login_without_refresh_token.py`. Result: 2 passed.

```python
from types import SimpleNamespace
from urllib.parse import (
    parse_qs,
    urlsplit,
)

import pytest

import galaxy.authnz.psa_authnz as psa
from galaxy import model
from galaxy.authnz.keycloak import KeycloakOpenIdConnect
from .test_deferred_user_creation import (  # noqa: F401
    adapter,
    callback,
    provider,
    signing_key,
    start,
    trans,
)


@pytest.mark.parametrize("confirm", [False, True])
def test_new_user_logs_in_without_refresh_token(trans, provider, monkeypatch, confirm):
    trans.app.authnz_manager.oidc_backends_config["keycloak"]["require_create_confirmation"] = confirm
    monkeypatch.setattr(trans.app.config, "enable_account_interface", True, raising=False)
    issued = KeycloakOpenIdConnect.request

    def no_refresh_token(backend, url, *args, **kwargs):
        response = issued(backend, url, *args, **kwargs)
        data = response.json()
        if url.endswith("/token"):
            data = {k: v for k, v in data.items() if k != "refresh_token"}
        return SimpleNamespace(json=lambda: data, text=response.text)

    monkeypatch.setattr(KeycloakOpenIdConnect, "request", no_refresh_token)
    seen = []
    check = psa.contains_required_data
    monkeypatch.setattr(psa, "contains_required_data", lambda *a, **kw: seen.append(kw["is_new"]) or check(*a, **kw))

    redirect, user = callback(trans, start(trans, provider))
    if confirm:
        confirmation_id = parse_qs(urlsplit(redirect).query)["confirmation_id"][0]
        _, user = adapter(trans).create_user(confirmation_id, trans, "/")

    assert seen == [False]  # the "Missing refresh token" branch needs is_new=True
    assert user.email == "verified@example.com"
    assert not trans.sa_session.query(model.UserAuthnzToken).one().extra_data.get("refresh_token")
```

Called directly with `is_new=True`, `contains_required_data({"access_token": "a"}, is_new=True)` does raise "Missing refresh token". If the spy forwards `is_new=True` instead, both cases fail with that error, so the test does reach the check. The check itself works. The pipeline just never reaches it with `is_new=True`.

</details>

### What this means for the draft

- **"First login fails for every new user":** not reproduced. Tokenless logins already work on the default pipeline.
- **"The admin's only lever today is code":** there's nothing to unlock. A `require_refresh_token` option defaulting to `true` would keep today's behavior, which already accepts users with no refresh token.
- **Related history:** #18826 fixed *refresh* failures under the old custos Keycloak backend, which couldn't request `offline_access`. #19385 added a note to the sample config that some providers issue refresh tokens only when `offline_access` is in `<extra_scopes>`. Neither one is about a login rejection. #21180 is about refresh tokens that can't be decoded, a different failure mode.

### What could still be done (not an issue)

- **Tiny cleanup PR, optional:** delete the unreachable branch and the `refresh_token` line in the `contains_required_data` docstring, or reword them so they don't suggest refresh tokens are required. That PR could also pick a different example path for the `oidc_auth_pipeline` / `oidc_auth_pipeline_extra` docs (`config_schema.yml`).
- Don't "fix" the branch to fire, for example by moving the step after `social_user`. That would start rejecting tokenless IdPs, which is the very problem the draft describes.
