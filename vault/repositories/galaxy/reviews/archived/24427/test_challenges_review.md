# Test challenges review — galaxy#24427

Profile: gx_test_challenger. Model: Opus 5.5. Effort: as set by coordinator. Reviewed commit: `e1124110491` (vs `origin/dev` merge-base). Detail and per-test verdicts: [test_challenges_debrief.md](test_challenges_debrief.md).

**Verdict:** Tests are well layered — small real fake instead of mocks, pure-function unit tests for header resolution, MCP integration tests that exercise the real `Authorization` header passthrough, plus a Keycloak end-to-end check. No tests to drop or rewrite. The one gap: the PR's actual bug fix (run_as with no user → 500) is pinned only by a unit test, though it is easy to reach at the API layer.

### P2 1: Add API tests for the anonymous/unmatched-Bearer run_as fix

The `user_can_do_run_as(None)` fix is covered only by a unit assertion. On base, a request whose credentials resolve to no user plus a `run-as` header 500s (`None or user.bootstrap_admin_user`). The API test config already sets `api_allow_run_as` (`lib/galaxy_test/driver/driver_util.py:237`), so both affected paths fail red on base and pass with the PR:

- FastAPI: `GET users/current` with `Authorization: Bearer not-a-real-token` and `run-as`, `anon=True` → 403.
- Legacy WSGI: anonymous `POST tools` with `run-as` (`expose_api_anonymous`; `decorators.py` copies the header into the payload and refuses with 403) → 403.

Add both next to the existing run_as tests in `lib/galaxy_test/api/test_framework.py`, then drop the now-redundant `None` assertion from `test_user_can_do_run_as`. Keep its `BootstrapAdminUser` case, which has no API coverage.

### P3 1: Integration test for `x-api-key` beating `Authorization: Bearer` over MCP

That order is pinned only by `_resolve_credentials` unit tests. One `TestMCPApiKey` case that sends both headers (valid key, bogus Bearer) and expects the key's user would confirm both headers reach the tool together through `get_http_headers(include={"authorization"})`.

### P3 2: Keycloak MCP test for a rejected OIDC token

The Keycloak MCP test covers only the happy path. With OIDC configured, most bad tokens raise inside `match_access_token_to_user` (`lib/galaxy/authnz/managers.py:499-513`) rather than returning `None`, and nothing checks that those errors reach an MCP client. Mirror `test_auth_by_access_token_never_logged_in` over MCP (token for `gxyuser_never_logged_in`) and assert the tool errors with "log into Galaxy at least once". The new `"Invalid access token."` `None` branch is covered only with no authnz manager configured. That's fine, since with OIDC on, `None` needs a token no configured provider can process.

Ran locally: new `test_UserManager` (2) and `_resolve_credentials` (5) unit tests pass. API, integration and Keycloak tests not run.
