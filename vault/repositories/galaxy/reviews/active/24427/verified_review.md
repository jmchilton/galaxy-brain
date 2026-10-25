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

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: `enable_mcp_server` docs don't mention Bearer tokens (implementation verified)

`enable_mcp_server.desc` in `config_schema.yml` still says the MCP server "requires API key authentication" and that the `api_key` argument "is ignored when the header is set". After this PR, MCP also accepts an OIDC access token as `Authorization: Bearer`, and that header also overrides the argument. This is the only admin-facing description of MCP authentication.

Update the description and regenerate `galaxy_options.rst` and `galaxy.yml.sample` with `config_manage.py`. The new text says that servers with OIDC accept an OIDC access token as `Authorization: Bearer <token>`, that a Galaxy API key isn't accepted as a Bearer token, and that the argument is ignored when either header is set.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: `by_credentials` return type leaves out `BootstrapAdminUser` (implementation verified)

`by_credentials` is annotated `-> model.User | None`, but for the bootstrap admin key it returns `by_api_key(...)`'s `schema.BootstrapAdminUser()`. Because `by_api_key` is untyped, mypy doesn't catch this. The new method is the shared entry point, so callers will rely on its annotation. The PR already widens `user_can_do_run_as` to accept `BootstrapAdminUser`.

<details><summary>Evidence</summary>

Once `by_credentials` is widened, mypy flags `get_api_user`: `Incompatible return value type (got "User | BootstrapAdminUser | None", expected "User | None")` at `lib/galaxy/webapps/galaxy/api/__init__.py:190`. That error was hidden before the fix.

</details>

Widen `by_credentials` and `get_api_user` to `User | BootstrapAdminUser | None`. Nothing else ripples, because downstream dependencies already `cast` the value. mypy on the touched modules adds no new errors.

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

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 4: No Keycloak MCP test for a rejected OIDC token (implementation verified)

The Keycloak MCP test covers only the happy path. With OIDC configured, most bad tokens raise inside `match_access_token_to_user` instead of returning `None`, and no test checks that the error reaches an MCP client.

Mirror `test_auth_by_access_token_never_logged_in` over MCP: use a `gxyuser_never_logged_in` token and call `call_tool(..., raise_on_error=False)`. Then assert that `result.is_error` is set and that the text contains "The user should log into Galaxy at least once".

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>
