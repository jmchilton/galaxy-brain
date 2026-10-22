

<details><summary>Automated Review Details</summary>

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via claude-opus-5-5 at medium effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/learning_galaxy.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via claude-opus-5-5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via claude-opus-5-5 at medium effort.

</details>

<details><summary>Risks</summary>

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

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24346_review_1) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24346_review_1`](https://github.com/jmchilton/galaxy/tree/pr_24346_review_1) (based on [`684e1ce9bcc`](https://github.com/jmchilton/galaxy/commit/684e1ce9bcc), head [`6f002204f29`](https://github.com/jmchilton/galaxy/commit/6f002204f29)) replaces the `api_key_header.model.name` lookup with an `API_KEY_HEADER_NAME` constant shared by the REST API and MCP, and adds a `_mcp_url` helper driven by `mcp_server_path` in `TestMCPApiKey`. The MCP unit tests and the `TestMCPApiKey` class pass locally.

- [`54095f0b84b`](https://github.com/jmchilton/galaxy/commit/54095f0b84b) Share x-api-key header name constant between REST API and MCP: adds `API_KEY_HEADER_NAME` in `api/__init__.py` and imports it in `mcp.py`.
- [`6f002204f29`](https://github.com/jmchilton/galaxy/commit/6f002204f29) Add _mcp_url helper to TestMCPApiKey: builds the MCP URL from a `mcp_server_path` class attribute at both call sites.

</details>

</details>

### P3 1: Share a named header constant instead of reading `api_key_header.model.name` (implementation verified)

`API_KEY_HEADER = api_key_header.model.name` gets a plain string by reaching into FastAPI's OpenAPI security model. Reusing the REST source of truth is right, but the attribute path is indirect. The `.get()` on fastmcp's lowercased header dict also only works because the REST name happens to be lowercase.

Add `API_KEY_HEADER_NAME = "x-api-key"` in `lib/galaxy/webapps/galaxy/api/__init__.py`, build `APIKeyHeader(name=API_KEY_HEADER_NAME, ...)` from it, and import it in `mcp.py`. That keeps a single source while making the value and its lowercase requirement obvious.

Fixed in [`54095f0b84b`](https://github.com/jmchilton/galaxy/commit/54095f0b84b).

<details><summary>Details</summary>

The literal also appears in `fast_app.py` and `webapps/base/webapp.py`. Those are pre-existing lines this PR doesn't touch, so the branch leaves them alone.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: Helper for the repeated MCP URL in `TestMCPApiKey` (implementation verified)

`_call_tool` and `test_api_key_not_required_in_tool_schemas` both build `f"{self.url}api/mcp"`, which hard-codes the default path. `TestMCPEndpoint` drives the same thing from a `mcp_server_path` class attribute instead.

Add a `mcp_server_path` class attribute, set it as `config["mcp_server_path"]`, and use a `_mcp_url` property at both call sites.

Fixed in [`6f002204f29`](https://github.com/jmchilton/galaxy/commit/6f002204f29).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
