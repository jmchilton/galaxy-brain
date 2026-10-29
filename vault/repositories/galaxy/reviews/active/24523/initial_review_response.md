

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) was run via Claude Opus 5.5 at medium effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile gx_risk_assessment, model Opus 5.5, effort low, reviewed commit 55b681c1fa9.

Mostly a two-way door: the shared credential lookup is a refactor, but accepting OIDC Bearer tokens on the MCP endpoint and raising the `fastmcp` floor to 4.0 on a release branch are behaviors deployers and MCP clients may start depending on.

<details><summary>Risk Details</summary>

- MCP now authenticates `Authorization: Bearer` OIDC access tokens; once clients are configured this way, removing it would break them.
- Credential precedence on MCP (`x-api-key` header, then Bearer, then the model-supplied `api_key` argument) becomes de facto contract; a Bearer header now silently overrides the `api_key` argument.
- An invalid Bearer token now raises `AuthenticationFailed` instead of `ValueError`, changing the error shape MCP clients see.
- `fastmcp>=4.0.0` (from `>=2.13.0`) in `pyproject.toml` and `packages/web_apps` on `release_26.2` forces a major-version upgrade on anyone installing the 26.2 packages; this is the hardest part to walk back for downstream deployers.
- REST `get_api_user` behavior is intended to be unchanged (API key still wins over Bearer; anonymous `run-as` still ignored), now pinned by new API tests.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether a `fastmcp` major-version floor bump is acceptable in a point release, and confirm `get_http_headers(include={"authorization"})` is the 4.x API the code needs (4.0 is presumably required for it, since fastmcp strips `authorization` by default).

They should also confirm Bearer-on-MCP is wanted in 26.2 as a supported feature rather than a dev-only addition, since deployers with OIDC will start relying on it.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24523_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24523_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24523_review_0) (from reviewed commit `55b681c1fa9`) has four commits, one per finding:

- An API test that pins the REST `run-as` 500→403 fix. It is red against the base `user_can_do_run_as` body and green on the PR.
- Corrected `by_credentials` docstring and its MCP comment.
- The MCP x-api-key hint is now appended when an OIDC provider rejects a Bearer token, with a Keycloak test that is red before the fix and green after.
- The MCP JSON-RPC test helper moves into `galaxy_test.base`, so the OIDC MCP tests use it instead of a hand-rolled fastmcp client.

- [`292e5c30ffe`](https://github.com/jmchilton/galaxy/commit/292e5c30ffe) Test run-as with an unmatched Bearer token returns 403: adds `test_run_as_with_unmatched_bearer_token` to `lib/galaxy_test/api/test_framework.py` (P2 1).
- [`8c61c9b894e`](https://github.com/jmchilton/galaxy/commit/8c61c9b894e) Say by_credentials raises when an OIDC provider rejects a token: docstring in `managers/users.py` and comment in `api/mcp.py` (P3 2).
- [`0e7cf226cb4`](https://github.com/jmchilton/galaxy/commit/0e7cf226cb4) Point rejected MCP Bearer tokens at x-api-key on OIDC servers too: adds the `BEARER_TOKEN_HINT` constant, wraps `by_credentials` in `get_operations_manager`, and adds Keycloak test `test_mcp_bearer_galaxy_api_key_hints_x_api_key` (P3 1).
- [`e5383063fe8`](https://github.com/jmchilton/galaxy/commit/e5383063fe8) Share mcp_request between MCP and OIDC integration tests: new `lib/galaxy_test/base/mcp_util.py`, used by `test_mcp_endpoint.py` and `oidc/test_auth_oidc.py`, which drops `asyncio`/`fastmcp` imports (P3 3).

</details>

</details>

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

Fixed on the review branch in [`292e5c30ffe`](https://github.com/jmchilton/galaxy/commit/292e5c30ffe).

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

Fixed on the review branch in [`0e7cf226cb4`](https://github.com/jmchilton/galaxy/commit/0e7cf226cb4).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the new Keycloak test `test_mcp_bearer_galaxy_api_key_hints_x_api_key` fails on the PR (error is just `Invalid access token.`, from a JWT `DecodeError`) and passes with the fix.

</details>

### P3 2: `by_credentials` docstring says a rejected access token returns `None`; it usually raises (implementation verified)

The docstring says "An access token returns None when no OIDC provider is configured or none of them accepts the token". In practice an undecodable, expired, or under-scoped token, or one for a user who never logged in via OIDC, raises `AuthenticationFailed`. `None` comes back only when no provider is configured or none can process the token. The matching comment in `mcp.py` ("Only an access token that no OIDC provider accepts gets here") repeats the overstatement.

Suggested wording: "An access token raises if an OIDC provider rejects it, and returns None if no provider is configured or none can process it."

Fixed on the review branch in [`8c61c9b894e`](https://github.com/jmchilton/galaxy/commit/8c61c9b894e).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort, against `lib/galaxy/authnz/managers.py` and the red run for P3 1.

</details>

### P3 3: The OIDC MCP test hand-rolls a fastmcp client instead of the shared MCP request helper (implementation verified)

`test_mcp_auth_by_access_token` uses `fastmcp.Client` + `asyncio.run`, while `test/integration/test_mcp_endpoint.py` already has `mcp_request(url, method, params, headers)`, which takes an `Authorization` header just as easily. The helper can't be imported from `test/integration/oidc/` as it stands (no package `__init__`).

Move `mcp_request` into `galaxy_test.base` (e.g. `galaxy_test/base/mcp_util.py`) and use it from both modules. This keeps MCP calls in tests consistent and drops the `asyncio`/`fastmcp` imports from the OIDC test module.

Fixed on the review branch in [`e5383063fe8`](https://github.com/jmchilton/galaxy/commit/e5383063fe8).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort: after the move, `TestMCPApiKey` (10 tests) and both Keycloak MCP tests pass.

</details>
