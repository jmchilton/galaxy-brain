# Test challenges debrief — PR #24523 @ 55b681c1fa9

Reviewed against doc/source/dev/writing_tests.md. No slow suites run.

## Unit tests
- `test/unit/webapps/api/test_mcp.py` `_resolve_credentials` tests: pure function, no mocks, cover header precedence, scheme case, empty Bearer, non-Bearer schemes. Keep.
- `test_UserManager.py::test_by_credentials`: `FakeAuthnzManager` is a clean noop-style fake (good, not a Mock). "API key wins" overlaps `test_api_key_wins_over_bearer_token` (API) and OIDC lookup overlaps `test_mcp_auth_by_access_token` (integration). Unique value: bad API key + good token raises. Keep; could trim overlapping asserts (P3).
- `test_user_can_do_run_as`: the `None` case documents a real behavior change (old code did `None.bootstrap_admin_user` -> AttributeError -> 500 for REST `Authorization: Bearer <unmatched>` + `run-as`). That user-visible path is easily API-testable and isn't (P2).

## API / integration
- `test_framework.py` new tests use `_get`/`_setup_user`; fine.
- `test_mcp_endpoint.py` new tests reuse `_call_tool`/`_error_text`; fine.
- `test_auth_oidc.py::test_mcp_auth_by_access_token` uses fastmcp `Client` + `asyncio.run` inline, unlike `mcp_request` helper in test_mcp_endpoint.py. Acceptable (needs real Bearer auth), minor inconsistency (P3).
- No MCP test for a valid API key header plus Bearer header together (header precedence) at integration level; unit test covers it. Fine.

## E2E
Not applicable (no UI).

## Test plan
1. Add API test: `Authorization: Bearer not-a-real-token` + `run-as` header on non-OIDC server -> 403 (fails on base with 500).
2. Optional: trim `test_by_credentials` to the cases not covered elsewhere.
