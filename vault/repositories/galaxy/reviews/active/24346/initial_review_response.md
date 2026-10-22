

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

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24346_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24346_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24346_review_0) (based on [`684e1ce9bcc`](https://github.com/jmchilton/galaxy/commit/684e1ce9bcc), head [`e9740665028`](https://github.com/jmchilton/galaxy/commit/e9740665028)) applies the verified review findings. It drops the `_resolve_api_key` unit tests that duplicate the integration coverage. It reads the `x-api-key` header with `get_http_headers(include_all=True)` so future fastmcp header stripping can't silently drop it. It replaces the `api_key_header.model.name` lookup with an `API_KEY_HEADER_NAME` constant shared by the REST API and MCP. In `TestMCPApiKey`, it adds a `_mcp_url` helper driven by `mcp_server_path` and a guard test showing that an invalid header doesn't fall back to the `api_key` argument. The edited unit file (8 tests) and the whole `TestMCPApiKey` class (8 tests, one server boot) pass locally.

- [`ad915e15952`](https://github.com/jmchilton/galaxy/commit/ad915e15952) Drop _resolve_api_key unit tests covered by TestMCPApiKey: removes the three `test_resolve_api_key_*` tests and their import.
- [`fec1bd9e285`](https://github.com/jmchilton/galaxy/commit/fec1bd9e285) Read MCP x-api-key header without fastmcp's credential stripping: calls `get_http_headers(include_all=True)`, which has been available since fastmcp 2.13.0.
- [`62eca406d32`](https://github.com/jmchilton/galaxy/commit/62eca406d32) Share x-api-key header name constant between REST API and MCP: adds `API_KEY_HEADER_NAME` in `galaxy.webapps.galaxy.api`, used by `APIKeyHeader` and `mcp.py`.
- [`4667e0b70f2`](https://github.com/jmchilton/galaxy/commit/4667e0b70f2) Add _mcp_url helper to TestMCPApiKey: adds a `mcp_server_path` class attribute, wired into the config, and uses `_mcp_url` at both call sites.
- [`e9740665028`](https://github.com/jmchilton/galaxy/commit/e9740665028) Test invalid x-api-key header doesn't fall back to api_key argument: adds `test_invalid_header_not_overridden_by_argument`, a guard that passes against the current code.

</details>

</details>

### P2 1: Drop the `_resolve_api_key` unit tests (implementation verified)

`test_resolve_api_key_prefers_header`, `_falls_back_to_argument`, and `_missing` in `test/unit/webapps/api/test_mcp.py` restate the one-line `headers.get(...) or api_key or None`. `TestMCPApiKey` already proves each realistic case end to end through the JSON-RPC transport: `test_header_only`, `test_argument_only`, `test_header_wins_over_argument`, `test_empty_argument_falls_back_to_header`, and `test_no_key`.

Remove the three tests and the `_resolve_api_key` import. The review branch does this, and the remaining 8 tests in the file still pass.

Fixed in [`ad915e15952`](https://github.com/jmchilton/galaxy/commit/ad915e15952).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: Header read relies on fastmcp's default header-stripping list (implementation verified)

`get_http_headers()` with no arguments drops headers that fastmcp treats as credentials or hop-by-hop. In the pinned 4.1.0 that list includes `authorization` and `cookie` but not `x-api-key`, so nothing is broken today. `pyproject.toml` allows `fastmcp>=2.13.0` with no upper bound, though. If a later release adds `x-api-key` to the list, the header gets dropped silently. Header-only clients would then fail with "API key required", and a model-supplied `api_key` would win, reversing the precedence this PR sets up. `test_header_only` would catch this on a pin bump, but the fix is one argument.

Use `get_http_headers(include_all=True)`. `include_all` is already there in 2.13.0 (`include=` isn't), and it keeps fastmcp's background-task header fallback, which `get_http_request().headers` would lose. Only `x-api-key` is read from the result.

Fixed in [`fec1bd9e285`](https://github.com/jmchilton/galaxy/commit/fec1bd9e285).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: Share a named header constant instead of reading `api_key_header.model.name` (implementation verified)

`API_KEY_HEADER = api_key_header.model.name` gets a plain string by reaching into FastAPI's OpenAPI security model. Reusing the REST source of truth is right, but the attribute path is indirect. The `.get()` on fastmcp's lowercased header dict also only works because the REST name happens to be lowercase.

Add `API_KEY_HEADER_NAME = "x-api-key"` in `lib/galaxy/webapps/galaxy/api/__init__.py`, build `APIKeyHeader(name=API_KEY_HEADER_NAME, ...)` from it, and import it in `mcp.py`. That keeps a single source while making the value and its lowercase requirement obvious.

Fixed in [`62eca406d32`](https://github.com/jmchilton/galaxy/commit/62eca406d32).

<details><summary>Details</summary>

The literal also appears in `fast_app.py` and `webapps/base/webapp.py`. Those are pre-existing lines this PR doesn't touch, so the branch leaves them alone.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 3: Pin that an invalid header doesn't fall back to the argument (implementation verified)

According to `_resolve_api_key`'s docstring, the header wins so that the model can't override the operator's choice of user. `test_header_wins_over_argument` uses two valid keys, though. A later "try the header, then the argument if lookup fails" change would pass every current test.

Add `test_invalid_header_not_overridden_by_argument`, which sends header `not-a-real-key` with a valid `api_key` argument and asserts the "API key is not valid" error. The branch adds it, and it passes against the PR's code. It guards the current behavior rather than going red to green.

Fixed in [`e9740665028`](https://github.com/jmchilton/galaxy/commit/e9740665028).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 4: Helper for the repeated MCP URL in `TestMCPApiKey` (implementation verified)

`_call_tool` and `test_api_key_not_required_in_tool_schemas` both build `f"{self.url}api/mcp"`, which hard-codes the default path. `TestMCPEndpoint` drives the same thing from a `mcp_server_path` class attribute instead.

Add a `mcp_server_path` class attribute, set it as `config["mcp_server_path"]`, and use a `_mcp_url` property at both call sites.

Fixed in [`4667e0b70f2`](https://github.com/jmchilton/galaxy/commit/4667e0b70f2).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
