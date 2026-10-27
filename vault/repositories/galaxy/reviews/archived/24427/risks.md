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
