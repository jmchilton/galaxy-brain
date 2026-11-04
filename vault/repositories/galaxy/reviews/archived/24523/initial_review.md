# Initial review: galaxyproject/galaxy#24523

- Profile: default
- Model: Claude Opus 5.5 (effort set by coordinator; not exposed to agent)
- Reviewed commit: `55b681c1fa9` (diff vs `origin/release_26.2`)

## Verdict

Approve-worthy backport. The net diff (excluding `uv.lock`) is byte-identical to the dev merge of #24427 (`a9a68082414`), so this is a faithful backport. `UserManager.by_credentials` is a good shared abstraction replacing duplicated REST/MCP lookup, `gx_app[UserManager]` reuses the DI'd manager instead of constructing a fresh one, and `API_KEY_HEADER_NAME` is now used in rate-limiting and the Tool Shed. The `run-as` 500 fix is correct. Only minor findings below.

## Findings

### P3 1: MCP Bearer hint never reaches users on OIDC-enabled servers

`get_operations_manager` only adds the "send a Galaxy API key in an x-api-key header" hint when `by_credentials` returns `None`. But `AuthnzManager._match_access_token_to_user_in_provider` (`lib/galaxy/authnz/managers.py:497-505`) raises `AuthenticationFailed("Invalid access token.")` for any token it can't decode as a JWT. So on a server with an OIDC provider configured (e.g. the usegalaxy.* servers, which are the likeliest place a user pastes a Galaxy API key into an `Authorization: Bearer` client setting), the user gets `connect failed: Invalid access token.` with no pointer to `x-api-key`. The hint fires only when no OIDC is configured, which is what `test_bearer_token_without_oidc` covers.

Suggested fix: in `get_operations_manager`, when the credential was an access token, catch `AuthenticationFailed` from `by_credentials` and re-raise with the same hint appended (or build the hint once and use it for both the `None` and the raise cases). A Keycloak integration test sending `Bearer <galaxy api key>` would cover it.

### P3 2: `by_credentials` docstring says a rejected access token returns `None`; it usually raises

"An access token returns None when no OIDC provider is configured or none of them accepts the token." In practice an undecodable token, an expired token, a token for a user who never logged in via OIDC, or one missing required scopes all raise `AuthenticationFailed` (`managers.py:477-512`); `None` comes back only when no provider is configured or every provider returns `(None, None)` / `NotImplementedError`. The matching comment in `mcp.py` ("Only an access token that no OIDC provider accepts gets here") inherits the same overstatement. Suggest: "A bad API key raises; an access token raises if a provider rejects it and returns None if no provider can process it."

### P3 3: The REST `run-as` 500 fix has no API-level test; `test_run_as_without_credentials` passes on the base too

The PR description's REST fix is Bearer-token-matching-no-user + `run-as` header → previously `AttributeError` in `user_can_do_run_as(None)` (500), now 403. It's covered only by the unit test `test_user_can_do_run_as(None)`. The new API test `test_run_as_without_credentials` sends no credentials at all, which the base `get_api_user` already short-circuited (`else: return None`) before the run-as check, so it is green before and after and doesn't exercise the fix. The test driver already sets `api_allow_run_as="test@bx.psu.edu"` (`lib/galaxy_test/driver/driver_util.py:237`), so a red-to-green API test is cheap:

```python
def test_run_as_with_unmatched_bearer_token(self):
    run_as_user = self._setup_user("for_run_as@bx.psu.edu")
    response = self._get(
        "users/current",
        headers={"Authorization": "Bearer not-a-real-token", "run-as": run_as_user["id"]},
        anon=True,
    )
    self._assert_status_code_is(response, 403)
```

Either add it alongside or replace `test_run_as_without_credentials` (which pins pre-existing behavior only).

## Notes (not actionable on this PR)

- Sibling path: the legacy WSGI `_authenticate_api` (`lib/galaxy/webapps/base/webapp.py:555-590`) still does its own key-then-session-then-Bearer lookup with case-sensitive `"Bearer " in` parsing, diverging from `by_credentials` (key-then-Bearer) and `_resolve_credentials` (case-insensitive scheme). Pre-existing and untouched; a candidate for adopting `by_credentials` on dev, not in a release backport.
- `galaxy_rate_limit_key` keys only on API key/session, so Bearer-authenticated MCP/REST requests fall back to client-IP bucketing. Pre-existing; also not for a backport.
- Behavior choice worth knowing (tested, intentional): a bad `x-api-key` header or bad Bearer header rejects the call even when the model supplies a valid `api_key` argument — operator config always wins over the model.
- Two error shapes from the same function (`ValueError` for missing credentials, `AuthenticationFailed` wrapped by `_mcp_error_handler` into `ValueError("connect failed: ...")` for rejected ones) — harmless.
- fastmcp floor bump to `>=4.0.0` is justified by `get_http_headers(include=...)`; release_26.2 already pins 4.1.0.
