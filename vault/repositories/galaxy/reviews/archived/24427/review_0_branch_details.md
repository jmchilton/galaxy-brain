`pr_24427_review_0` builds on the reviewed commit `e1124110491` and holds no behavior changes. It adds the missing tests, a doc update and a typing fix:

- **Tests:**
  - API tests that pin the run-as 500 fix on both the FastAPI and legacy WSGI paths. Both fail on the base logic and pass with the PR.
  - An MCP integration test that pins `x-api-key` over `Authorization: Bearer`.
  - A Keycloak MCP test that checks a rejected OIDC token's error reaches the MCP client.
- **Docs:** documents Bearer-token MCP auth in `enable_mcp_server` and regenerates the sample config and RST.
- **Typing:** widens `by_credentials` and `get_api_user` to include `BootstrapAdminUser`.

Every new test was run individually and passes.

- `ed9a05f651d` Add API tests for run-as with no matched user. Adds `test_run_as_with_unmatched_bearer_token` (FastAPI) and `test_legacy_run_as_with_anonymous_session` (WSGI `/api/tools`) to `test_framework.py`. Both expect 403, where the base returns 500.
- `5401bb9adbf` Include BootstrapAdminUser in by_credentials return type. Widens the return types of `by_credentials` and `get_api_user`, which clears the mypy error the wider type exposes.
- `97a3fbd222c` Document Bearer token auth for the MCP server. Updates `enable_mcp_server.desc` and regenerates `galaxy_options.rst` and `galaxy.yml.sample`.
- `f39ced10965` Pin x-api-key over Authorization Bearer in MCP integration test. Adds `TestMCPApiKey.test_header_key_wins_over_bearer_token`.
- `83b369af487` Test MCP surfaces a rejected OIDC token error. Adds `test_mcp_auth_by_access_token_never_logged_in` to the Keycloak `TestGalaxyOIDCLoginIntegration`.
