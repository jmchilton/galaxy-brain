Branch `pr_24346_review_1` (based on `684e1ce9bcc`, head `6f002204f29`) keeps only the two findings John chose to post from `pr_24346_review_0`: it replaces the `api_key_header.model.name` lookup with an `API_KEY_HEADER_NAME` constant shared by the REST API and MCP, and adds a `_mcp_url` helper driven by `mcp_server_path` in `TestMCPApiKey`. The MCP unit tests (11) and `TestMCPApiKey` (7) pass locally.

- `54095f0b84b` Share x-api-key header name constant between REST API and MCP: cherry-pick of `62eca406d32`.
- `6f002204f29` Add _mcp_url helper to TestMCPApiKey: cherry-pick of `4667e0b70f2`.
