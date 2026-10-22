# Test challenges review — galaxy#24346

- Profile: [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md)
- Model: claude-opus-5-5, effort medium
- Reviewed commit: `684e1ce9bcc`
- Debrief / test plan: [test_challenges_debrief.md](test_challenges_debrief.md)

Verdict: test coverage is good. Integration tests drive the real JSON-RPC transport and cover header-only, argument-only, header precedence, empty argument, missing key, invalid key, and the optional-`api_key` schema for every tool. Existing helpers (`_setup_user_get_key`, generalized `mcp_request`) are reused. No E2E needed. Findings are cleanup plus one missing guard. No bugs found.

## P2 1: Drop `_resolve_api_key` unit tests — duplicated by integration tests

`test_resolve_api_key_prefers_header`, `_falls_back_to_argument`, and `_missing` in `test/unit/webapps/api/test_mcp.py` restate the one-line `headers.get(...) or api_key or None`. Every realistic case is already proven end to end in `TestMCPApiKey` (`test_header_wins_over_argument`, `test_header_only`, `test_argument_only`, `test_empty_argument_falls_back_to_header`, `test_no_key`). Remove them and the `_resolve_api_key` import. If the empty-header fallback matters, add it as one integration case instead.

## P3 1: Pin that an invalid header doesn't fall back to the argument

`_resolve_api_key`'s docstring says the header wins so the model can't override the operator's user choice. `test_header_wins_over_argument` uses two valid keys, so a future "try header, then argument if lookup fails" change would pass every test. Add an integration case: header `not-a-real-key` plus a valid `api_key` argument, assert the `API key is not valid` error.

## P3 2: Helper for the repeated MCP URL in `TestMCPApiKey`

`f"{self.url}api/mcp"` is built in both `_call_tool` and `test_api_key_not_required_in_tool_schemas`. Add a `_mcp_url` helper (ideally from a `mcp_server_path` class attribute, matching `TestMCPEndpoint`) and use it in both.
