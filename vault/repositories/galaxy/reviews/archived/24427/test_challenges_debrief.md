# Test challenges debrief — galaxy#24427

Profile: gx_test_challenger (process `GX_PROCESS_CHALLENGE_TESTS.md`), Opus 5.5, reviewed commit `e1124110491` (diffed against `origin/dev` merge-base). Review-directory mode: nothing edited in the PR worktree.

## Tests in the PR

| Test | Layer | Red on base? | Verdict |
|---|---|---|---|
| `TestUserManager.test_by_credentials` | unit | n/a (new method) | Keep. `FakeAuthnzManager` is a small real fake, not a mock. The "bad key + good token raises" case can't be reached at the API layer without Keycloak, so it earns its place. |
| `TestUserManager.test_user_can_do_run_as` | unit | `None` case red | Keep the email-list and `BootstrapAdminUser` cases (bootstrap-admin run_as has no API coverage). The `None` case is the PR's bug fix and belongs at the API layer (see P2 1); once there, the unit `None` assertion is redundant. |
| `test_resolve_credentials_*` (5) | unit | n/a (renamed pure function) | Keep. Pure function, no mocks; covers case-insensitive scheme, `Basic`, empty `Bearer `, empty header. `..._bearer_token_beats_argument` overlaps `test_invalid_bearer_token_with_valid_argument` but is cheap. |
| `test_run_as_without_credentials` | API | green (pin) | Keep; baseline pin per PR description. |
| `test_api_key_wins_over_bearer_token` | API | green (pin) | Keep; baseline pin. |
| `TestMCPApiKey.test_no_key` (edited) | integration | red (new text) | Keep. |
| `test_invalid_header_key_with_valid_argument` | integration | green (pin) | Keep. |
| `test_bearer_token_without_oidc` | integration | red | Keep. Exercises `get_http_headers(include={"authorization"})` end-to-end, the riskiest piece (fastmcp drops the header by default). |
| `test_invalid_bearer_token_with_valid_argument` | integration | red | Keep. |
| `TestGalaxyOIDCLoginIntegration.test_mcp_auth_by_access_token` | Keycloak integration | red | Keep; real OIDC token through a real fastmcp `Client(auth=...)`. |

Helpers: the MCP integration tests reuse the file's `mcp_request`/`_call_tool`/`_error_text` helpers; REST tests use `_get`/`_setup_user`/`anon=True`. No repeated raw HTTP that needs a new helper. The Keycloak test's inline `fastmcp.Client` + `asyncio.run` matches how `test/integration/test_agents.py` drives MCP, so no change recommended.

E2E: none needed — no UI surface.

Ran locally (main clone `.venv`, worktree `lib` on `PYTHONPATH`): `test_UserManager.py -k "by_credentials or run_as"` 2 passed; `test_mcp.py -k resolve_credentials` 5 passed (needs `--import-mode=importlib` locally due to a conftest path clash, environment only). API/integration/Keycloak tests not run.

## Gaps / test plan

1. **API coverage for the run_as 500 fix (P2 1).** On base, `user_can_do_run_as(None)` evaluates `None or user.bootstrap_admin_user` → `AttributeError` → 500. API tests set `api_allow_run_as="test@bx.psu.edu"` (`lib/galaxy_test/driver/driver_util.py:237`), so the list is non-empty and both paths are reachable in `lib/galaxy_test/api/test_framework.py`:
   - FastAPI: `self._get("users/current", headers={"Authorization": "Bearer not-a-real-token", "run-as": run_as_user["id"]}, anon=True)` → expect 403 (500 on base).
   - Legacy WSGI: anonymous `POST tools` (`@expose_api_anonymous`, `decorators.py:250` copies the `run-as` header into the payload, `:330` refuses with 403) with a `run-as` header → expect 403 (500 on base).
   Then drop the `None` assertion from the unit test.
2. **MCP: header beats Bearer at the integration layer (P3 1).** Only the unit test pins `x-api-key` + `Authorization: Bearer` → API key wins. One integration test (`headers={"x-api-key": key, "Authorization": "Bearer not-a-real-token"}` → that key's email) would prove both headers reach the tool together through `get_http_headers(include=...)`.
3. **MCP + rejected OIDC token (P3 2).** With OIDC configured, a decodable token with no matching user raises `AuthenticationFailed` ("...log into Galaxy at least once...") and an undecodable one raises "Invalid access token." (`lib/galaxy/authnz/managers.py:499-513`). `None` comes back only when no provider can process the token. In the Keycloak class, a `gxyuser_never_logged_in` token over MCP (mirroring `test_auth_by_access_token_never_logged_in`) should surface that error to the MCP client. Today only the happy path is tested.
