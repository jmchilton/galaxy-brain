### P2 1: The REST `run-as` 500 fix has no API test (implementation verified)

The user-visible fix is `Authorization: Bearer <token matching no user>` plus a `run-as` header: base Galaxy raised `AttributeError` in `user_can_do_run_as(None)` (500), the PR returns 403. Only the unit assert `user_can_do_run_as(None)` covers it. The new API test `test_run_as_without_credentials` sends no credentials, which `get_api_user` short-circuits before the run-as check on base too, so it passes before and after and doesn't exercise the fix.

Add an API test next to it. The test driver already sets `api_allow_run_as`, so the request reaches the run-as check:

<details><summary>Details</summary>

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

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort: the test fails with 500 against the base `user_can_do_run_as` body and passes (403) on the PR.

</details>

### P3 1: MCP's x-api-key hint never shows on OIDC-enabled servers (implementation verified)

`get_operations_manager` adds the "send a Galaxy API key in an x-api-key header" hint only when `by_credentials` returns `None`. But an OIDC provider raises `AuthenticationFailed("Invalid access token.")` for any token it can't decode as a JWT (`AuthnzManager._match_access_token_to_user_in_provider`). So on a server with OIDC configured (the usegalaxy.* servers, where a user is likeliest to paste an API key into a client's Bearer setting), the user gets `get_user failed: Invalid access token.` with no pointer to `x-api-key`. `test_bearer_token_without_oidc` only covers the no-OIDC case.

Catch `AuthenticationFailed` from `by_credentials` when the credential was an access token and re-raise with the same hint appended, and add a Keycloak test sending a Galaxy API key as Bearer. The hint then also follows other OIDC rejections (an expired token, a user who never logged in via OIDC). That's harmless, but expected.

<details><summary>Details</summary>

```python
try:
    user = user_manager.by_credentials(api_key, access_token)
except AuthenticationFailed as e:
    if not access_token:
        raise
    raise AuthenticationFailed(f"{e.err_msg} {BEARER_TOKEN_HINT}") from e
if not user:
    raise AuthenticationFailed(f"Invalid access token. {BEARER_TOKEN_HINT}")
```

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the new Keycloak test `test_mcp_bearer_galaxy_api_key_hints_x_api_key` fails on the PR (error is just `Invalid access token.`, from a JWT `DecodeError`) and passes with the fix.

</details>

### P3 2: `by_credentials` docstring says a rejected access token returns `None`; it usually raises (implementation verified)

The docstring says "An access token returns None when no OIDC provider is configured or none of them accepts the token". In practice an undecodable, expired, or under-scoped token, or one for a user who never logged in via OIDC, raises `AuthenticationFailed`. `None` comes back only when no provider is configured or none can process the token. The matching comment in `mcp.py` ("Only an access token that no OIDC provider accepts gets here") repeats the overstatement.

Suggested wording: "An access token raises if an OIDC provider rejects it, and returns None if no provider is configured or none can process it."

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort, against `lib/galaxy/authnz/managers.py` and the red run for P3 1.

</details>

### P3 3: The OIDC MCP test hand-rolls a fastmcp client instead of the shared MCP request helper (implementation verified)

`test_mcp_auth_by_access_token` uses `fastmcp.Client` + `asyncio.run`, while `test/integration/test_mcp_endpoint.py` already has `mcp_request(url, method, params, headers)`, which takes an `Authorization` header just as easily. The helper can't be imported from `test/integration/oidc/` as it stands (no package `__init__`).

Move `mcp_request` into `galaxy_test.base` (e.g. `galaxy_test/base/mcp_util.py`) and use it from both modules. This keeps MCP calls in tests consistent and drops the `asyncio`/`fastmcp` imports from the OIDC test module.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort: after the move, `TestMCPApiKey` (10 tests) and both Keycloak MCP tests pass.

</details>
