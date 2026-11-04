# Performance challenge debrief: #24523

Profile gx_performance_challenger, model Opus 5.5, low effort. Reviewed commit `55b681c1fa9`. Static analysis only; no Galaxy server or Postgres measurements were run.

## Scope

Per-request credential lookup: `UserManager.by_credentials` (lib/galaxy/managers/users.py), `get_api_user` (lib/galaxy/webapps/galaxy/api/__init__.py), MCP `get_operations_manager` / `_resolve_credentials` (lib/galaxy/webapps/galaxy/api/mcp.py), `galaxy_rate_limit_key` (fast_app.py).

## Findings by path

**REST API key path: unchanged cost.** `get_api_user` still does one `APIKeys` select by key (plus lazy `user` load) via `by_api_key`; the refactor only moves the branch into `by_credentials`. The early return for anonymous requests keeps the no-credential path query-free.

**REST Bearer path: unchanged cost.** Same `by_oidc_access_token` call as before.

**MCP API key path: unchanged cost.** `gx_app[UserManager]` instead of `UserManager(gx_app)` is a one-time construction difference at app startup, not per request.

**MCP Bearer path: new, per tool call.** MCP is `stateless_http`, so every tool call re-authenticates. Per call, per configured OIDC provider until one matches: construct a `PSAAuthnz` + PSA `Strategy`/backend (CPU only), unverified JWT decode to check `iss`, `find_valid_key` against social_core's class-level JWKS cache (24h TTL), signature verify, then one `UserAuthnzToken` select on `(provider, uid)`, which is covered by the existing unique constraint. Roughly comparable to the API-key path plus a JWT verify; acceptable for MCP call rates. Sync tools run in fastmcp 4's threadpool (`fastmcp/utilities/async_utils.py` uses `anyio.to_thread.run_sync`), so the sync DB/JWT work does not block the event loop; the `fastmcp>=4.0.0` floor helps here.

**Rate limiter.** `galaxy_rate_limit_key` keys on `x-api-key`/`key`, then session cookie, then IP; Bearer requests fall through to IP. Pre-existing for REST Bearer, and the limiter only decorates the plugins chat and notification endpoints (not `/mcp`). Keying by raw Bearer token would let clients reset their bucket by refreshing tokens and keying by `sub` needs a decode, so no clear fix is recommended here. Not raised as a finding.

## Non-performance notes

None beyond the above. Bug-hunting was out of scope.

## Measurement plan (if anyone wants data)

1. Postgres container + Galaxy with one OIDC provider (Keycloak dev container) on a free port.
2. Enable SQLAlchemy echo / `sqlalchemy_debug` style query counting; issue 100 MCP `connect` calls with `x-api-key` vs `Authorization: Bearer`. Expect 1-2 queries per call for both.
3. Time p50/p95 per call for each; expect Bearer within a few ms (RSA verify) of API key.
4. Confirm JWKS is fetched once across the 100 Bearer calls (IdP access log).

## Result

No P1/P2/P3 performance findings.
