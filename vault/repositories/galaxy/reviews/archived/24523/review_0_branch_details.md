Branch `pr_24523_review_0` (from reviewed commit `55b681c1fa9`) has four commits, one per finding:

- An API test that pins the REST `run-as` 500→403 fix. It is red against the base `user_can_do_run_as` body and green on the PR.
- Corrected `by_credentials` docstring and its MCP comment.
- The MCP x-api-key hint is now appended when an OIDC provider rejects a Bearer token, with a Keycloak test that is red before the fix and green after.
- The MCP JSON-RPC test helper moves into `galaxy_test.base`, so the OIDC MCP tests use it instead of a hand-rolled fastmcp client.

- `292e5c30ffe` Test run-as with an unmatched Bearer token returns 403: adds `test_run_as_with_unmatched_bearer_token` to `lib/galaxy_test/api/test_framework.py` (P2 1).
- `8c61c9b894e` Say by_credentials raises when an OIDC provider rejects a token: docstring in `managers/users.py` and comment in `api/mcp.py` (P3 2).
- `0e7cf226cb4` Point rejected MCP Bearer tokens at x-api-key on OIDC servers too: adds the `BEARER_TOKEN_HINT` constant, wraps `by_credentials` in `get_operations_manager`, and adds Keycloak test `test_mcp_bearer_galaxy_api_key_hints_x_api_key` (P3 1).
- `e5383063fe8` Share mcp_request between MCP and OIDC integration tests: new `lib/galaxy_test/base/mcp_util.py`, used by `test_mcp_endpoint.py` and `oidc/test_auth_oidc.py`, which drops `asyncio`/`fastmcp` imports (P3 3).
