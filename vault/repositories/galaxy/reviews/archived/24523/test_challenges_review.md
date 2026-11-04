# Test challenges review — PR #24523

Profile: gx_test_challenger. Model: Claude Opus 5.5, effort low. Reviewed commit: 55b681c1fa9. Details: [test_challenges_debrief.md](test_challenges_debrief.md).

Overall tests are well-layered: pure-function unit tests for `_resolve_credentials`, a non-Mock fake for authnz, API + MCP integration + Keycloak OIDC coverage of the new Bearer path.

### P2 1: Unmatched-Bearer + run-as fix only covered by unit test
On base, REST `Authorization: Bearer <unmatched>` with a `run-as` header hits `None.bootstrap_admin_user` (AttributeError -> 500); the PR makes it 403. Only `test_user_can_do_run_as(None)` covers it. Add to `lib/galaxy_test/api/test_framework.py` next to `test_run_as_without_credentials`: `self._get("users/current", headers={"Authorization": "Bearer not-a-real-token", "run-as": id}, anon=True)` -> assert 403. Red on base, green on PR; then the `None` unit assert can go.

### P3 1: `test_by_credentials` overlaps higher-layer tests
"API key wins" and "token alone -> OIDC user" duplicate `test_api_key_wins_over_bearer_token` and `test_mcp_auth_by_access_token`. Keep the bad-key-plus-good-token-raises and no-credentials cases; drop the rest.

### P3 2: OIDC MCP test bypasses shared MCP helper
`test_mcp_auth_by_access_token` hand-rolls `fastmcp.Client` + `asyncio.run`; `test_mcp_endpoint.py` has `mcp_request(url, method, params, headers)`. Passing `{"Authorization": f"Bearer {token}"}` through that helper would keep MCP calls consistent and drop the `asyncio`/`fastmcp` imports from the OIDC test module.
