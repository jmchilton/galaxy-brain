---
type: research
subtype: component
tags: [research/component, galaxy/api, galaxy/security]
component: "CORS Handling"
galaxy_areas: [api, security]
status: draft
created: 2026-06-18
revised: 2026-06-18
revision: 1
ai_generated: true
summary: "Five CORS mechanisms — global origin-validated middleware, per-route reflected-origin landings, OPTIONS catch-all, legacy WSGI path, display-app proxy"
sources: ["/Users/jxc755/projects/repositories/galaxy-brain/.ingest-dossiers/Component-CORS-Handling.md"]
related_notes:
  - "[[Component - Data Fetch]]"
  - "[[Component - Workflow API]]"
  - "[[PR 21942 - Shared Agent Operations and MCP Server]]"
---

# CORS Handling

Verified against `origin/dev` @ SHA `f91f8f21ed2c1424aa84fc3179377be3a071e8e1`.

## Overview

Galaxy has **no single "CORS middleware."** Cross-Origin Resource Sharing headers are emitted by **five independent mechanisms** with divergent policies — some validate the request Origin against config, some reflect *any* Origin, some only set headers. Auditing "is CORS locked down" means checking all five, not just the one config setting.

The live config setting is **`allowed_origin_hostnames`** (note: not `allowed_origin_hosts`). It defaults to null, in which case the global middleware is not installed at all.

**Scope:** server-side CORS — config surface, header-emitting code paths, preflight (OPTIONS) handling. Out of scope: generic auth/session internals except where they intersect CORS (credentials mode), and other security headers — except `X-Frame-Options`, noted only because it shares the `add_galaxy_middleware()` registration and test-reset mechanism.

## The five mechanisms

| # | Mechanism | Location | Origin policy | Gated by |
|---|-----------|----------|---------------|----------|
| 1 | `GalaxyCORSMiddleware` (global, FastAPI/Starlette) | `fast_app.py:123,154` | Validated vs `allowed_origin_hostnames` | `allowed_origin_hostnames` truthy |
| 2 | Per-route `allow_cors=True` → `APICorsRoute` + `cors_preflight` dep | `api/__init__.py:418,462,588` | **Reflects request Origin** (`"*"` fallback) | per-route opt-in |
| 3 | API-wide OPTIONS catch-all (FastAPI) | `webapps/base/api.py:286` | sets headers only; no Origin | always (ASGI) |
| 4 | Legacy WSGI transaction CORS | `webapps/base/webapp.py:284,423-471` | Validated vs `allowed_origin_hostnames` | config truthy; **WSGI path only** |
| 5 | Datatype display-app (GEDA) + interactive-tool proxy | `controllers/dataset.py:581`; `web/proxy/js/lib/proxy.js:117` | reflects Origin / `allow_cors` XML attr | per display-app param |

The live ASGI server uses #1, #2, #3. #4 is the historical WSGI/Paste path, dormant under the ASGI launcher (see below). #5 are special-purpose.

## Mechanism 1 — Global `GalaxyCORSMiddleware` (primary path)

**File:** `lib/galaxy/webapps/galaxy/fast_app.py`

```python
class GalaxyCORSMiddleware(CORSMiddleware):  # lines 123-129
    def __init__(self, *args, **kwds):
        self.config = kwds.pop("config")
        super().__init__(*args, **kwds)

    def is_allowed_origin(self, origin: str) -> bool:
        return config_allows_origin(origin, self.config)
```

Subclasses Starlette's `CORSMiddleware`, overriding only `is_allowed_origin`. Preflight handling, `Access-Control-Allow-Methods`, `Vary: Origin`, etc. inherited from Starlette.

**Registration** (`add_galaxy_middleware`, lines 154-168):
```python
def add_galaxy_middleware(app: FastAPI, gx_app):
    if x_frame_options := gx_app.config.x_frame_options:
        app.add_middleware(XFrameOptionsMiddleware, x_frame_options=x_frame_options)
    ...
    if gx_app.config.get("allowed_origin_hostnames", None):
        app.add_middleware(GalaxyCORSMiddleware, config=gx_app.config,
                           allow_headers=["*"], allow_methods=["*"], max_age=600)
```

- **Only added when `allowed_origin_hostnames` is set** (default unset → no global CORS middleware; common production case).
- `allow_headers=["*"]`, `allow_methods=["*"]`, `max_age=600`. `allow_credentials` not set → Starlette default `False` (no `Access-Control-Allow-Credentials`).
- Origins not passed as `allow_origins`; the `is_allowed_origin` override drives the decision.
- Sits beside `XFrameOptionsMiddleware` (lines 132-151), which appends `X-Frame-Options` except on `/published/...embed=true` (`_is_embed_request`, `webapp.py:280`).

**Origin validation — `config_allows_origin`** (`lib/galaxy/webapps/base/webapp.py:284-304`): compares only the **hostname** (port/scheme stripped via `urlparse`); each configured entry is an exact string match or a compiled regex (full-match enforced via `match.group() == origin`); `"*"` wildcard allowed; empty/null Origin → `False`.

## Mechanism 2 — Per-route `allow_cors=True` (landing-request path)

**File:** `lib/galaxy/webapps/galaxy/api/__init__.py`. A **separate, more permissive** opt-in, independent of `allowed_origin_hostnames`.

`FrameworkRouter.wrap_with_alias` (lines 452-510) pops an `allow_cors` kwarg; when true it (a) swaps the route class to `APICorsRoute`, and (b) registers an explicit per-route OPTIONS endpoint backed by the `cors_preflight` dependency.

**Preflight** (`cors_preflight`, lines 418-427): wildcard `Access-Control-Allow-Origin: *`, allow-headers restricted to the CORS safe-listed set + Range, max-age 600, status 200.

**`APICorsRoute`** (lines 588-616) wraps the handler to append CORS headers to the *actual* response, **reflecting the request Origin** (`request.headers.get("Origin", "*")`). Deliberately injects headers even on the exception path, so a 400/validation error still carries `Access-Control-Allow-Origin` and the client can read the error body cross-origin (see [[Component - UI Error Handling]]). No `allowed_origin_hostnames` check — any origin is reflected.

**Consumers** (the only four at SHA — all `public=True` landing-creation endpoints designed to be hit by arbitrary external sites):
- `api/tools.py:279` `POST /api/file_landings`
- `api/tools.py:288` `POST /api/data_landings`
- `api/tools.py:345` `POST /api/tool_landings`
- `api/workflows.py:1197` `POST /api/workflow_landings`

## Mechanism 3 — API-wide OPTIONS catch-all

**File:** `lib/galaxy/webapps/base/api.py:286-294`. `@app.options("/api/{rest_of_path:path}")` returns `Access-Control-Allow-Headers: *` + max-age but **no `Access-Control-Allow-Origin`** (origin comes from mechanism 1 when configured). Registered *after* all routers so per-route `allow_cors` OPTIONS (mechanism 2) win; the global middleware short-circuits preflight before routing so this never collides with it (ordering invariant codified in the source comments). Near-duplicate in the legacy `api/authenticate.py:40-51` OPTIONS handler.

## Mechanism 4 — Legacy WSGI transaction CORS (dormant under ASGI)

**File:** `lib/galaxy/webapps/base/webapp.py`. `GalaxyWebTransaction.__init__` calls `set_cors_headers()` (line 343) per request (methods at 423-471): reflects the Origin if `config_allows_origin` passes, else sets **HTTP 400**. Shares `config_allows_origin` with mechanism 1 (consistent *policy*), but rides the old Paste/WSGI stack. Preflight wired in `buildapp.py` (`app_pair`, lines 51-57; `wsgi_preflight` block, lines 182-191).

**Dormancy:** `wsgi_preflight` defaults **`False`** in `lib/galaxy/main_config/__init__.py:68`; the ASGI launcher passes `config.wsgi_preflight` (`fast_factory.py:64`). So under uvicorn/ASGI the WSGI OPTIONS route is **not** registered and FastAPI mechanisms 1-3 own CORS. `wsgi_preflight` is a code/main_config flag, **not** in `config_schema.yml`.

## Mechanism 5 — Display applications (GEDA) & interactive-tool proxy

**Datatype display apps** (`controllers/dataset.py:581-584`): per-display-link opt-in via the `allow_cors` XML attribute on a display-application data param (`display_applications/parameters.py:51`; schema `display_applications/xsd/geda.xsd:271`, default false). When true, reflects the request Origin and echoes requested headers — does **not** consult `allowed_origin_hostnames` (a per-config-author trust decision). Used by cross-origin dataset viewers: IGV, avivator, icn3d, biom, intermine, minerva, qiime2 q2view.

**Interactive-tool / dynamic proxy** (`web/proxy/js/lib/proxy.js:116-119,153-156`): the Node.js proxy sets `Access-Control-Allow-Origin` to the request origin and `Access-Control-Allow-Credentials: true` on HTTP and WS responses — the **only** path emitting `Allow-Credentials`.

**Misc one-off:** `api/workflows.py:1625` sets `Access-Control-Expose-Headers: Content-Disposition` on the invocation-report PDF streaming response.

## Config surface

**Setting:** `allowed_origin_hostnames` (CSV string).
- Schema: `config_schema.yml:2369-2378` (`type: str`, not required). Returns an `Access-Control-Allow-Origin` matching the request Origin when its hostname matches one of the listed strings or `/regex/` entries. E.g. `mysite.com,usegalaxy.org,/^[\w\.]*example\.com/`.
- Sample: `config/sample/galaxy.yml.sample:1876` → `#allowed_origin_hostnames: null` (default null).
- Parsing: `config/__init__.py:992` → `_parse_allowed_origin_hostnames` (1483-1499) `listify`s the CSV, returns `None` if empty, compiles `/.../`-wrapped entries to `re` patterns (`re.UNICODE`), keeps others as literal strings. Runtime value: `list[str | re.Pattern]` or `None`.

No other CORS-specific config keys. `x_frame_options` is adjacent (same middleware-add function) but a distinct security header.

## Preflight (OPTIONS) priority

Three preflight paths can be live simultaneously, in routing-time priority:
1. **Global middleware** (mech 1): if configured, Starlette short-circuits preflight before routing, validating Origin and emitting full preflight headers.
2. **Per-route `allow_cors` OPTIONS** (mech 2): wildcard origin, safelisted headers, 200.
3. **API catch-all OPTIONS** (mech 3): allow-headers `*`, no origin.

## Tests

- `lib/galaxy_test/api/test_landing.py:337-359` `test_invalid_workflow_landing_creation_cors` — canonical test. `OPTIONS /api/workflow_landings` with `Origin: https://foo.example` → 200 + reflected `Access-Control-Allow-Origin`; then an *invalid* POST still returns the reflected origin alongside the 400 (validates `APICorsRoute` exception-path injection). See [[Component - API Tests]].
- `lib/galaxy_test/base/populators.py:965` `create_workflow_landing` asserts `access-control-allow-origin` present on success POST.
- `lib/galaxy_test/driver/driver_util.py:50-52,825-839` — test-server middleware reset. `GalaxyCORSMiddleware`/`XFrameOptionsMiddleware` capture `gx_app.config` at add-time; `driver_util` strips both from `app.user_middleware`, nulls `app.middleware_stack`, and re-runs `add_galaxy_middleware` per test. **Key gotcha for config-varying CORS tests** (see [[PR 22070 - Static YAML Agent Backend for Deterministic Testing]]).

## Extension points

- **New per-route CORS endpoint:** `allow_cors=True` on a `@router.<verb>(...)` route (only sensible for `public=True` endpoints meant for arbitrary external origins). Gets reflected-Origin + auto OPTIONS.
- **New display-app cross-origin fetch:** `allow_cors="true"` on a `<param type="data">` in a GEDA XML (`geda.xsd`).
- **Tightening global policy:** edit `config_allows_origin` (`base/webapp.py:284`) — shared by middleware and legacy WSGI paths.

## Known issues / gotchas

1. **Policy divergence:** mech 1/4 validate Origin against config; mech 2/5 reflect *any* Origin. Landing endpoints and GEDA display apps intentionally bypass `allowed_origin_hostnames`. Audit all five.
2. **`allow_credentials` only in the proxy:** `GalaxyCORSMiddleware` does not enable credentials; only `proxy.js` emits `Allow-Credentials: true` (with reflected Origin).
3. **Middleware config capture:** middleware binds `gx_app.config` at registration; cached test apps need the `driver_util` reset or they enforce stale origin policy.
4. **Default = no global CORS:** with `allowed_origin_hostnames` unset, the global middleware isn't added — cross-origin XHR to most of `/api` fails by browser policy, while the four landing endpoints still work. Easy to misread as "CORS broken."
5. **Hostname-only match:** `config_allows_origin` discards port and scheme, so `http://evil.com:1234` and `https://evil.com` are indistinguishable to the allow-list.
6. **Empty/null Origin → 400 in WSGI path** (`webapp.py:471`) but the ASGI middleware just omits the header — behavioral divergence (mostly moot since WSGI preflight is off by default).

## Related Notes

- [[Component - Data Fetch]] — landing/fetch endpoints include the `allow_cors=True` `/api/data_landings` route; its landing-payload `origin` field is distinct from the CORS request Origin.
- [[Component - Workflow API]] — hosts `POST /api/workflow_landings` (`allow_cors=True`); reconciles its "Public (CORS enabled)" note as mechanism 2 (reflected-Origin, not config-gated).
- [[PR 21942 - Shared Agent Operations and MCP Server]] — its "MCP inherits CORS via `app.mount`" claim is corrected here: the global `GalaxyCORSMiddleware` is registered on the **root** app, so a mounted sub-app inherits mechanism 1 CORS **only when `allowed_origin_hostnames` is configured**; route-level mechs 2/3 do not extend into the sub-app's internal routes.
- [[Component - UI Error Handling]] — `APICorsRoute` attaches CORS headers to error responses so cross-origin clients can read serialized `MessageException` bodies.
- [[Component - API Tests]] — `populators.py` CORS assertion and OPTIONS helper live in this test plumbing.
- [[Component - Backend Logging Architecture]] — covers the same `fast_app.py` app-init/middleware-stack region where CORS middleware is registered.
- [[Component - Window Manager]] / [[Component - Markdown Visualizations]] — render embedded viewers; GEDA `allow_cors` display apps are the cross-origin fetch consumers.
- [[Component - Agents Backend]] / [[PR 21434 - AI Agent Framework and ChatGXY]] — agent/MCP surfaces are mounted sub-apps whose CORS inheritance is clarified here.
