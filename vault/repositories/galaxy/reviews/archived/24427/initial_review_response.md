(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile gx_risk_assessment, Claude Opus 5.5 at low effort, reviewed commit e1124110491.

The one-way risk is that MCP now accepts OIDC Bearer tokens as a credential and fixes a precedence order (`x-api-key` header, then Bearer, then the model-supplied `api_key` argument), which MCP clients and OIDC deployments will start to depend on; the `fastmcp>=4.0.0` floor is a major-version dependency jump that downstream packagers inherit.

<details><summary>Risk Details</summary>

- MCP auth surface grows: any OIDC access token that `authnz_manager.match_access_token_to_user` accepts now authenticates MCP tool calls, so MCP inherits whatever audience/issuer checks that path does (or doesn't) apply to REST.
- Credential precedence becomes a contract: header API key beats Bearer, Bearer beats the `api_key` tool argument. Clients sending both a header key and a token get the key's user without warning; reordering later would change which user a call acts as.
- A Bearer header now silently overrides the model-supplied `api_key` argument, where previously the Authorization header was ignored by MCP.
- `by_credentials` is a new shared `UserManager` method; its asymmetric contract (bad API key raises, unmatched token returns None) is now relied on by both REST and MCP callers.
- MCP error behavior changes: invalid credentials now raise `AuthenticationFailed` instead of `ValueError` with a help message, which can change what MCP clients surface to users.
- `fastmcp>=2.13.0` -> `>=4.0.0` (root and `packages/web_apps`) is a two-major jump; deployers pinning older fastmcp or packaging `galaxy-web-apps` must move, and backing it out later is awkward once 4.x APIs are used.
- REST `get_api_user` refactor and `user_can_do_run_as` typing are behavior-preserving on inspection (anonymous + `run-as` still returns None early); rollback is cheap.

</details>

<details><summary>Risk Review Advice</summary>

Humans should confirm that OIDC access-token validation (`match_access_token_to_user`) is appropriate for MCP, where tokens may be minted for other audiences, and that the header > Bearer > argument precedence is the order Galaxy wants to commit to before MCP clients rely on it.

Also confirm the fastmcp 4.x floor is actually required by this change (the diff uses only `get_http_headers(include=...)` from fastmcp) and is acceptable for the release/package matrix; if not, a lower floor keeps this a two-way door.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24427_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24427_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24427_review_0) builds on the reviewed commit `e1124110491` and holds no behavior changes. It adds the missing tests, a doc update and a typing fix:

- **Tests:**
  - API tests that pin the run-as 500 fix on both the FastAPI and legacy WSGI paths. Both fail on the base logic and pass with the PR.
  - An MCP integration test that pins `x-api-key` over `Authorization: Bearer`.
  - A Keycloak MCP test that checks a rejected OIDC token's error reaches the MCP client.
- **Docs:** documents Bearer-token MCP auth in `enable_mcp_server` and regenerates the sample config and RST.
- **Typing:** widens `by_credentials` and `get_api_user` to include `BootstrapAdminUser`.

Every new test was run individually and passes.

- [`ed9a05f651d`](https://github.com/jmchilton/galaxy/commit/ed9a05f651d) Add API tests for run-as with no matched user. Adds `test_run_as_with_unmatched_bearer_token` (FastAPI) and `test_legacy_run_as_with_anonymous_session` (WSGI `/api/tools`) to `test_framework.py`. Both expect 403, where the base returns 500.
- [`5401bb9adbf`](https://github.com/jmchilton/galaxy/commit/5401bb9adbf) Include BootstrapAdminUser in by_credentials return type. Widens the return types of `by_credentials` and `get_api_user`, which clears the mypy error the wider type exposes.
- [`97a3fbd222c`](https://github.com/jmchilton/galaxy/commit/97a3fbd222c) Document Bearer token auth for the MCP server. Updates `enable_mcp_server.desc` and regenerates `galaxy_options.rst` and `galaxy.yml.sample`.
- [`f39ced10965`](https://github.com/jmchilton/galaxy/commit/f39ced10965) Pin x-api-key over Authorization Bearer in MCP integration test. Adds `TestMCPApiKey.test_header_key_wins_over_bearer_token`.
- [`83b369af487`](https://github.com/jmchilton/galaxy/commit/83b369af487) Test MCP surfaces a rejected OIDC token error. Adds `test_mcp_auth_by_access_token_never_logged_in` to the Keycloak `TestGalaxyOIDCLoginIntegration`.

</details>

</details>

### P2 1: No API test for the run-as 500 this PR fixes (implementation verified)

The `user_can_do_run_as(None)` fix is the PR's one user-visible bug fix, but only a unit assertion covers it. Both affected paths can be reached from the default API test server, which already sets `api_allow_run_as`:

- FastAPI: an unmatched `Authorization: Bearer` token plus `run-as`.
- Legacy WSGI: an anonymous session posting to `/api/tools` with `run-as`.

With the base `user_can_do_run_as`, both return 500 instead of 403.

<details><summary>Evidence</summary>

With only the `user_can_do_run_as` body put back to the base version (`None or user.bootstrap_admin_user`), both new tests fail with `500 ... Internal Server Error`. With the PR's version, both pass and return 403. The legacy request needs a `galaxysession` cookie. A request with no session at all is refused with "API authentication or Galaxy session required" before the run-as check runs.

</details>

Add both cases next to the existing run-as tests in `lib/galaxy_test/api/test_framework.py`. The legacy test also asserts `err_code == 400001` (`USER_CANNOT_RUN_AS`), so it pins the run-as refusal and not some other 403. Once these land, the unit `None` assertion is optional; the review branch keeps it.

<details><summary>Details</summary>

```python
def test_run_as_with_unmatched_bearer_token(self):
    run_as_user = self._setup_user("for_run_as@bx.psu.edu")
    response = self._get(
        "users/current",
        headers={"run-as": run_as_user["id"], "Authorization": "Bearer not-a-real-token"},
        anon=True,
    )
    self._assert_status_code_is(response, 403)

def test_legacy_run_as_with_anonymous_session(self):
    # /api/tools POST is still served by the legacy WSGI app.
    run_as_user = self._setup_user("for_run_as@bx.psu.edu")
    cookies = {"galaxysession": get(self.url).cookies["galaxysession"]}
    response = post(
        self._api_url("tools"),
        json={"tool_id": "cat1"},
        headers={"run-as": run_as_user["id"]},
        cookies=cookies,
    )
    self._assert_status_code_is(response, 403)
    assert response.json()["err_code"] == 400001
```

</details>

Fixed on the review branch in [`ed9a05f651d`](https://github.com/jmchilton/galaxy/commit/ed9a05f651d).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: `enable_mcp_server` docs don't mention Bearer tokens (implementation verified)

`enable_mcp_server.desc` in `config_schema.yml` still says the MCP server "requires API key authentication" and that the `api_key` argument "is ignored when the header is set". After this PR, MCP also accepts an OIDC access token as `Authorization: Bearer`, and that header also overrides the argument. This is the only admin-facing description of MCP authentication.

Update the description and regenerate `galaxy_options.rst` and `galaxy.yml.sample` with `config_manage.py`. The new text says that servers with OIDC accept an OIDC access token as `Authorization: Bearer <token>`, that a Galaxy API key isn't accepted as a Bearer token, and that the argument is ignored when either header is set.

Fixed on the review branch in [`97a3fbd222c`](https://github.com/jmchilton/galaxy/commit/97a3fbd222c).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: `by_credentials` return type leaves out `BootstrapAdminUser` (implementation verified)

`by_credentials` is annotated `-> model.User | None`, but for the bootstrap admin key it returns `by_api_key(...)`'s `schema.BootstrapAdminUser()`. Because `by_api_key` is untyped, mypy doesn't catch this. The new method is the shared entry point, so callers will rely on its annotation. The PR already widens `user_can_do_run_as` to accept `BootstrapAdminUser`.

<details><summary>Evidence</summary>

Once `by_credentials` is widened, mypy flags `get_api_user`: `Incompatible return value type (got "User | BootstrapAdminUser | None", expected "User | None")` at `lib/galaxy/webapps/galaxy/api/__init__.py:190`. That error was hidden before the fix.

</details>

Widen `by_credentials` and `get_api_user` to `User | BootstrapAdminUser | None`. Nothing else ripples, because downstream dependencies already `cast` the value. mypy on the touched modules adds no new errors.

Fixed on the review branch in [`5401bb9adbf`](https://github.com/jmchilton/galaxy/commit/5401bb9adbf).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: No MCP integration test that `x-api-key` beats `Authorization: Bearer` (implementation verified)

Only the `_resolve_credentials` unit tests pin this order. An integration test proves that both headers reach the tool together through `get_http_headers(include={"authorization"})`. That passthrough is the riskiest piece of the change, because fastmcp drops `Authorization` by default.

Add a `TestMCPApiKey` case that sends a valid `x-api-key` and a bogus Bearer token and expects the key's user. This pins existing behavior, so it is green on the PR. It is not a red test.

<details><summary>Details</summary>

```python
def test_header_key_wins_over_bearer_token(self) -> None:
    _, key = self._setup_user_get_key("mcp-header-beats-bearer@bx.psu.edu")
    result = self._call_tool("get_user", {}, headers={"x-api-key": key, "Authorization": "Bearer not-a-real-token"})
    assert self._email_from_get_user(result) == "mcp-header-beats-bearer@bx.psu.edu"
```

</details>

Fixed on the review branch in [`f39ced10965`](https://github.com/jmchilton/galaxy/commit/f39ced10965).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 4: No Keycloak MCP test for a rejected OIDC token (implementation verified)

The Keycloak MCP test covers only the happy path. With OIDC configured, most bad tokens raise inside `match_access_token_to_user` instead of returning `None`, and no test checks that the error reaches an MCP client.

Mirror `test_auth_by_access_token_never_logged_in` over MCP: use a `gxyuser_never_logged_in` token and call `call_tool(..., raise_on_error=False)`. Then assert that `result.is_error` is set and that the text contains "The user should log into Galaxy at least once".

Fixed on the review branch in [`83b369af487`](https://github.com/jmchilton/galaxy/commit/83b369af487).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>
