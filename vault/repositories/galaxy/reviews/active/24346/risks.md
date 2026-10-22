Profile gx_risk_assessment, Claude Opus 5.5 at low effort, reviewed commit 684e1ce9bcc.

The one-way risk is small but real: this sets the MCP endpoint's client auth contract (`x-api-key` header preferred over the now-optional `api_key` argument, header wins when both are set), which MCP client configs and docs will start depending on in a still-experimental feature.

<details><summary>Risk Details</summary>

- Establishes `x-api-key` as the documented MCP header and "header beats argument" precedence; later moving to `Authorization: Bearer`/OAuth or flipping precedence would break configured clients.
- Every tool's schema changes: `api_key` goes from required to optional and moves after `ctx`. Clients calling by name (normal MCP) are unaffected; any client or test relying on required-field validation or positional order changes behavior.
- Header extraction relies on fastmcp's `get_http_headers()` default filtering; a fastmcp upgrade that changes which headers it forwards could silently drop the key and fall back to the model-supplied argument.
- The `api_key` argument path is kept, so keys can still pass through model context; the PR reduces but doesn't remove that exposure.
- Rollback is otherwise cheap: feature is experimental and disabled by default, and the change is confined to `mcp.py`, config docs and tests.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether `x-api-key` (matching Galaxy's REST `api_key_header`) is the header name they want to commit to for MCP, versus a standard `Authorization` bearer scheme, and confirm the header-over-argument precedence is the intended trust model.

Check that the integration tests exercise the real HTTP header path through fastmcp (not just `_resolve_api_key`) so a dependency change in header forwarding would be caught.

</details>
