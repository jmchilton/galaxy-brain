### P2 1: Drop the `_resolve_api_key` unit tests (implementation verified)

`test_resolve_api_key_prefers_header`, `_falls_back_to_argument`, and `_missing` in `test/unit/webapps/api/test_mcp.py` restate the one-line `headers.get(...) or api_key or None`. `TestMCPApiKey` already proves each realistic case end to end through the JSON-RPC transport: `test_header_only`, `test_argument_only`, `test_header_wins_over_argument`, `test_empty_argument_falls_back_to_header`, and `test_no_key`.

Remove the three tests and the `_resolve_api_key` import. The review branch does this, and the remaining 8 tests in the file still pass.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: Header read relies on fastmcp's default header-stripping list (implementation verified)

`get_http_headers()` with no arguments drops headers that fastmcp treats as credentials or hop-by-hop. In the pinned 4.1.0 that list includes `authorization` and `cookie` but not `x-api-key`, so nothing is broken today. `pyproject.toml` allows `fastmcp>=2.13.0` with no upper bound, though. If a later release adds `x-api-key` to the list, the header gets dropped silently. Header-only clients would then fail with "API key required", and a model-supplied `api_key` would win, reversing the precedence this PR sets up. `test_header_only` would catch this on a pin bump, but the fix is one argument.

Use `get_http_headers(include_all=True)`. `include_all` is already there in 2.13.0 (`include=` isn't), and it keeps fastmcp's background-task header fallback, which `get_http_request().headers` would lose. Only `x-api-key` is read from the result.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: Share a named header constant instead of reading `api_key_header.model.name` (implementation verified)

`API_KEY_HEADER = api_key_header.model.name` gets a plain string by reaching into FastAPI's OpenAPI security model. Reusing the REST source of truth is right, but the attribute path is indirect. The `.get()` on fastmcp's lowercased header dict also only works because the REST name happens to be lowercase.

Add `API_KEY_HEADER_NAME = "x-api-key"` in `lib/galaxy/webapps/galaxy/api/__init__.py`, build `APIKeyHeader(name=API_KEY_HEADER_NAME, ...)` from it, and import it in `mcp.py`. That keeps a single source while making the value and its lowercase requirement obvious.

<details><summary>Details</summary>

The literal also appears in `fast_app.py` and `webapps/base/webapp.py`. Those are pre-existing lines this PR doesn't touch, so the branch leaves them alone.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 3: Pin that an invalid header doesn't fall back to the argument (implementation verified)

According to `_resolve_api_key`'s docstring, the header wins so that the model can't override the operator's choice of user. `test_header_wins_over_argument` uses two valid keys, though. A later "try the header, then the argument if lookup fails" change would pass every current test.

Add `test_invalid_header_not_overridden_by_argument`, which sends header `not-a-real-key` with a valid `api_key` argument and asserts the "API key is not valid" error. The branch adds it, and it passes against the PR's code. It guards the current behavior rather than going red to green.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 4: Helper for the repeated MCP URL in `TestMCPApiKey` (implementation verified)

`_call_tool` and `test_api_key_not_required_in_tool_schemas` both build `f"{self.url}api/mcp"`, which hard-codes the default path. `TestMCPEndpoint` drives the same thing from a `mcp_server_path` class attribute instead.

Add a `mcp_server_path` class attribute, set it as `config["mcp_server_path"]`, and use a `_mcp_url` property at both call sites.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
