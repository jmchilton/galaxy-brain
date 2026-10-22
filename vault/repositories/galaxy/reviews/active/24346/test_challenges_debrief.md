# Test challenges debrief — galaxy#24346

- Profile: [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md)
- Model: claude-opus-5-5, effort medium
- Reviewed commit: `684e1ce9bcc`
- Static analysis only; no tests run.

## Tests in the PR

Integration (`test/integration/test_mcp_endpoint.py`):
- `mcp_request` generalizes the old `mcp_server_info` JSON-RPC helper; `mcp_server_info` now wraps it. Good reuse, no duplication.
- New `TestMCPApiKey` class (own server boot, `enable_mcp_server` at default `/api/mcp`):
  - `test_api_key_not_required_in_tool_schemas` — every tool exposes `api_key` and none requires it. Guards the signature reorder across all ~45 tools. Keep.
  - `test_header_only` — mixed-case `X-API-Key` header; also proves fastmcp's `get_http_headers()` lowercases and doesn't strip the header (it strips `authorization`, not `x-api-key`). Keep.
  - `test_argument_only`, `test_header_wins_over_argument`, `test_empty_argument_falls_back_to_header`, `test_no_key`, `test_invalid_header_key` — real end-to-end checks of the precedence rules through the JSON-RPC transport. Keep.
  - Users/keys via existing `_setup_user_get_key`. Good.

Unit (`test/unit/webapps/api/test_mcp.py`):
- `test_resolve_api_key_prefers_header`, `test_resolve_api_key_falls_back_to_argument`, `test_resolve_api_key_missing` — exercise the one-line `headers.get(...) or api_key or None`.

## Challenges

### Unit tests: drop (duplicate integration coverage)
All three `_resolve_api_key` tests assert the same precedence the integration class already proves end to end:
- header preferred → `test_header_wins_over_argument`, `test_header_only`
- argument fallback → `test_argument_only`
- empty argument → `test_empty_argument_falls_back_to_header`
- nothing → `test_no_key`

The only cases not mirrored at integration level are an empty `x-api-key` header falling back to the argument, and `("", {"x-api-key": ""})` → `None`. Neither is a realistic client behavior worth pinning; if wanted, add one integration case (empty header + valid argument). Dropping also removes `_resolve_api_key` from the test's private-import list.

### Integration: pin "invalid header doesn't fall back"
The helper's docstring states the security intent: the header (operator config) wins so the model can't pick a different user. `test_header_wins_over_argument` uses two valid keys. Nothing checks that an invalid header plus a valid argument fails rather than falling back to the argument. A future "try header, then argument on lookup failure" refactor would pass every current test. Add `test_invalid_header_not_overridden_by_argument`: header `not-a-real-key`, argument = valid key, assert `API key is not valid` error.

### Integration: helper for repeated URL
`f"{self.url}api/mcp"` appears twice in `TestMCPApiKey` (`_call_tool`, `test_api_key_not_required_in_tool_schemas`). Add a `_mcp_url` property (or `_list_tools` helper) and mirror the `mcp_server_path` class attribute used by `TestMCPEndpoint` instead of hard-coding the default path.

### E2E
None needed — no client/UI changes; behavior is fully observable over HTTP.

### Mocks / design
No mocks. `_resolve_api_key` as a pure module-level function is already the right shape; nothing to restructure.

## Test plan (recommended)
1. Delete the three `test_resolve_api_key_*` unit tests and the `_resolve_api_key` import.
2. Add `TestMCPApiKey.test_invalid_header_not_overridden_by_argument`.
3. Add `_mcp_url` helper; use it in both call sites.
4. Run only `TestMCPApiKey` (one integration server boot).
