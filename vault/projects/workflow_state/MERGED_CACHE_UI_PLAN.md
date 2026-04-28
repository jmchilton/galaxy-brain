# Merged Cache UI: gxwf-web + tool-cache-proxy

**Date:** 2026-04-27
**Repo:** `galaxy-tool-util`
**Scope:** unify the cache surfaces of `gxwf-web` and `tool-cache-proxy` and give the proxy a UI.

---

## 1. Goal

Bring `gxwf-web` and `tool-cache-proxy` onto a shared cache layer with overlapping HTTP surfaces and a shared debug UI. Where Galaxy/ToolShed already defines a route shape, both servers adopt it; cache management lives in its own namespace owned by this repo.

Out of scope: authentication / authorization. Both servers stay unauthenticated; no `requireAdmin` flag, no token machinery. Revisit if/when a deployment story changes.

## 2. Two API namespaces

Each server exposes both surfaces.

### 2.1 Read surface — modeled after Galaxy/ToolShed `api2/tools.py`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/tools?q&page&page_size` | Search across cached tools (q is a substring match over id/name/description; in-memory). |
| `GET` | `/api/ga4gh/trs/v2/tools` | TRS index — list cached tools in TRS `Tool[]` shape. |
| `GET` | `/api/ga4gh/trs/v2/tools/{tool_id}` | TRS get a single `Tool` (includes `versions[]`). |
| `GET` | `/api/ga4gh/trs/v2/tools/{tool_id}/versions` | `ToolVersion[]`. |
| `GET` | `/api/tools/{tool_id}/versions/{tool_version}` | `ParsedTool` (the Galaxy meta-model — not a Shed-specific variant). |
| `GET` | `/api/tools/{tool_id}/versions/{tool_version}/parameter_request_schema` | JSON Schema. |
| `GET` | `/api/tools/{tool_id}/versions/{tool_version}/parameter_landing_request_schema` | JSON Schema. |
| `GET` | `/api/tools/{tool_id}/versions/{tool_version}/parameter_test_case_xml_schema` | JSON Schema. |
| `GET` | `/api/tools/{tool_id}/versions/{tool_version}/tool_source` | Raw source. 501 until cache stores source. |

`(tool_id, tool_version)` is the public addressing scheme on the read surface. `cacheKey` does not appear here.

### 2.2 Cache-admin surface — owned by this repo, no upstream

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/tool-cache` | List with admin decorations (`sizeBytes`, `decodable`, `source`, `cachedAt`, `toolshedUrl`) + stats. |
| `GET` | `/api/tool-cache/stats` | Aggregate counts/bytes/oldest/newest. |
| `DELETE` | `/api/tool-cache/{cacheKey}` | Single delete (cacheKey OK here — admin-internal). |
| `DELETE` | `/api/tool-cache?prefix=` | Bulk delete by tool-id prefix; returns `{removed: n}`. |
| `POST` | `/api/tool-cache/refetch` | `{toolId, toolVersion?}` — force re-pull. |
| `POST` | `/api/tool-cache/add` | `{toolId, toolVersion?}` — populate-by-id. |

## 3. TRS models

The TRS `Tool` / `ToolVersion` shapes are defined by GA4GH (see `lib/tool_shed_client/schema/trs.py` upstream — pydantic models generated from the ga4gh openapi). We need Effect Schema equivalents in `@galaxy-tool-util/schema`.

Required fields (per the GA4GH spec):

- `Tool`: `url` (string), `id` (string), `organization` (string), `toolclass` (`ToolClass`), `versions` (`ToolVersion[]`). Plus optional: `aliases`, `name`, `description`, `meta_version`, `has_checker`, `checker_url`.
- `ToolVersion`: `url` (string), `id` (string). Plus optional: `author`, `name`, `is_production`, `images`, `descriptor_type`, `descriptor_type_version`, `containerfile`, `meta_version`, `verified`, `verified_source`, `signed`, `included_apps`.
- `ToolClass`: optional `id`, `name`, `description`. Galaxy populates a single class; we mirror it.
- Supporting types: `Checksum`, `ImageData`, `ImageType`, `DescriptorType`, `DescriptorTypeVersion`, `FileType` (only the ones referenced from `Tool`/`ToolVersion`).

Mapping from cache → TRS:

- `Tool.id` ← `tool_id` (TRS form, `~`-separated)
- `Tool.url` ← `${self}/api/ga4gh/trs/v2/tools/${tool_id}` (server-relative, fully qualified at response time)
- `Tool.organization` ← `tool_id` owner segment (left of first `~`)
- `Tool.toolclass` ← Galaxy default (e.g. `{id: "GalaxyTool", name: "Galaxy Tool"}`)
- `Tool.versions` ← `ToolVersion[]` derived from cache entries grouped by `tool_id`
- `ToolVersion.id` ← `tool_version`
- `ToolVersion.url` ← `${self}/api/ga4gh/trs/v2/tools/${tool_id}/versions/${tool_version}`
- `ToolVersion.descriptor_type` ← `["GALAXY"]`

Fields we don't have (`author`, `images`, `is_production`, `verified`, `signed`, `meta_version`, etc.) stay `undefined` — the spec marks them optional.

Open: consider whether to reuse the ga4gh openapi as the source of truth and codegen Effect Schemas from it, vs. hand-port. Hand-port is small (maybe 100 lines) and avoids a codegen dependency, but locks us into manual updates if the spec drifts.

## 4. Shared core module

New module `packages/core/src/http/` (decision: in-package, not a separate `cache-http` package — both proxy and gxwf-web already depend on `core`).

Exports:

- DTOs: `CachedToolEntry`, `CacheStats` (Effect Schemas + derived TS types). camelCase at the boundary; snake_case stays internal to the cache index.
- TRS DTOs (§3): `Tool`, `ToolVersion`, `ToolClass`, `Checksum`, `ImageData`, plus enums.
- A `cacheToTrs(entries, baseUrl)` helper that produces TRS-shaped output from the cache index.
- Framework-agnostic handler functions, one per route in §2:
  ```ts
  type HandlerCtx = { service: ToolInfoService; baseUrl: string };
  searchTools(ctx, { q?, page?, pageSize? }): Promise<SearchResults>
  trsListTools(ctx): Promise<Tool[]>
  trsGetTool(ctx, toolId): Promise<Tool>
  trsListVersions(ctx, toolId): Promise<ToolVersion[]>
  getParsedTool(ctx, toolId, toolVersion): Promise<ParsedTool>
  getParameterSchema(ctx, toolId, toolVersion, kind): Promise<JsonSchema>
  // kind ∈ "request" | "landing" | "test_case_xml"
  getToolSource(ctx, toolId, toolVersion): never  // throws 501 for now
  // admin
  listCache(ctx): Promise<{entries, stats}>
  cacheStats(ctx): Promise<CacheStats>
  deleteCacheEntry(ctx, cacheKey): Promise<{removed}>
  clearCache(ctx, prefix?): Promise<{removed: number}>
  refetchTool(ctx, toolId, toolVersion?): Promise<RefetchResult>
  addTool(ctx, toolId, toolVersion?): Promise<AddResult>
  ```
- An `HttpError(status, message, detail?)` class consumed by both adapters.

Each server adapter (gxwf-web's `Route` union dispatch; tool-cache-proxy's `node:http` switch) is one-line wrappers around these functions, plus URL parsing and JSON serialization.

## 5. Shared UI: `cache-ui`

New package `@galaxy-tool-util/cache-ui` (decision: separate package, not a sub-export of `gxwf-ui`).

Why separate:
- `gxwf-ui` carries Workflows / Files / editor shell deps that the proxy doesn't need.
- Decoupling lets the proxy ship a smaller bundle while still using Vue/PrimeVue.
- Versioning the panel separately from the gxwf-ui dashboard is easier when both servers consume it.

Contents (lifted from `packages/gxwf-ui/src/`):
- Components: `ToolCacheView.vue`, `ToolCacheTable.vue`, `ToolCacheStats.vue`, `ToolCacheRawDialog.vue`.
- Composable: `useToolCache.ts`.
- Typed client: a thin wrapper over `openapi-fetch` that takes a base URL at construction. No reliance on a singleton.

Public surface:
```ts
// @galaxy-tool-util/cache-ui
export { ToolCacheView, ToolCacheTable, ToolCacheStats, ToolCacheRawDialog }
export { useToolCache }
export { createCacheClient }  // (baseUrl: string) => CacheClient
export type { CachedToolEntry, CacheStats } from "@galaxy-tool-util/core"
```

Consumer wiring:

- **`gxwf-ui`**: keeps the `/cache` route; the route mounts `<ToolCacheView>` from `cache-ui`. Existing nav shell, dark-mode toggle, Files/Workflows tabs unchanged. Drops the local copies of the four components + composable.
- **`tool-cache-proxy`**: ships a tiny SPA (own Vite project under `packages/tool-cache-proxy/ui/` or pulled in as a workspace dep). `App.vue` mounts `<ToolCacheView>` at `/` with no navbar — title bar shows the configured server name, that's it. Vite build output served by the proxy as static files alongside the API.

`ToolCacheRawDialog` becomes tab-driven, addressing by `(tool_id, tool_version)`:
- Tab 1: `parameter_model` — pretty-printed `ParsedTool` JSON from `GET /api/tools/{id}/versions/{ver}`.
- Tab 2: `parameter_request_schema`.
- Tab 3: `parameter_landing_request_schema`.
- Tab 4: `parameter_test_case_xml_schema`.
- Tab 5: `tool_source` — visible-but-disabled until the source is stored in cache.

Each tab fetches lazily on first activation.

The list view's filter pane gains a "Search" input that hits `GET /api/tools?q=` rather than client-side filtering — consistent semantics across servers, plays well with eventual server-side paging.

## 6. OpenAPI / clients

Each server keeps its own `openapi.json`. The two surfaces overlap on cache routes but diverge elsewhere (gxwf-web has files / workflows / schemas; proxy doesn't). Both reference the same DTOs by structure but maintain separate spec files.

- `gxwf-web/openapi.json` — extend with the read-surface routes from §2.1 plus the existing admin routes from PR #81.
- `tool-cache-proxy/openapi.json` — new file. Describes everything in §2 (read + admin).
- Both regenerate `src/generated/api-types.ts` via `openapi-typescript`.
- `cache-ui` typed client reads the operations it needs from whichever server it's pointed at; since both servers implement the cache routes identically, types resolve cleanly off either spec. The `cache-ui` package picks one as its compile-time source (proxy spec is the smaller / more focused one — use that).

## 7. Rollout

1. **Core foundations.** ✅ Landed on branch `cache_ui` (commit 0836ba8e).
   - TRS Effect Schemas in `@galaxy-tool-util/schema/trs/`: `TrsTool`, `TrsToolVersion`, `TrsToolClass`, `TrsChecksum`, `TrsImageData`, enums. `GALAXY_TOOL_CLASS` const.
   - `packages/core/src/cache-http/` module — directory renamed from `http/` because the workspace's `no-restricted-imports` rule globs `http` and trips on `./http/index.js`.
     - DTOs: admin (`CachedToolEntry`, `ListResponse`, …), `SearchResults`, `ParameterSchemaKind`.
     - `HandlerCtx = { service: ToolInfoService; baseUrl: string }`.
     - Handlers — read: `searchTools`, `trsListTools`, `trsGetTool`, `trsListVersions`, `getParsedTool`, `getParameterSchema`, `getToolSource` (501). Admin: `listCache`, `cacheStats`, `getCacheRaw`, `deleteCacheEntry`, `clearCache`, `refetchTool`, `addTool`.
     - `HttpError(status, message, detail?)` — adapter-translated.
     - `cacheToTrs` / `cacheToTrsOne` / `toTrsToolId` — normalize the readable `tool_id` form historically stored in the cache index to TRS form before grouping/emitting.
   - 18 unit tests in `packages/core/test/cache-http.test.ts` against fastqc fixture; all green.
   - **Decision pinned:** read surface emits TRS-form `toolId`; admin `CachedToolEntry.toolId` keeps the readable form to preserve the existing `gxwf-ui` behavior.

2. **`tool-cache-proxy` route migration.** ✅ Landed on branch `cache_ui`.
   - Router rewritten on top of shared handlers; no business logic in `router.ts` beyond URL parsing + body reading + JSON serialization.
   - `GET /api/tools` → `searchTools` (q/page/page_size).
   - Added `GET /api/ga4gh/trs/v2/tools` / `…/{tool_id}` / `…/{tool_id}/versions`.
   - Split `/schema?representation=` → three concrete `parameter_*_schema` endpoints (request, landing_request, test_case_xml).
   - `GET /api/tools/{id}/versions/{ver}/tool_source` returns 501.
   - Full `/api/tool-cache/*` admin namespace (list, stats, delete-by-key, prefix-clear, refetch, add).
   - Dropped legacy `DELETE /api/tools/cache`.
   - `openapi.json` + `codegen` script (openapi-typescript) → `src/generated/api-types.ts` (725 lines).
   - 20 tests in `test/router.test.ts`; all green.

3. **`gxwf-web` route additions.** ✅ Landed on branch `cache_ui` (commit 14b767ba).
   - Read-surface routes from §2.1 implemented on top of shared handlers; `tool-cache.ts` deleted, `router.ts` is thin URL parsing + JSON serialization.
   - `ToolCacheRawDialog` rewritten as a tabbed dialog addressing entries by `(tool_id, tool_version)` — tabs for parameter model, request schema, landing-request schema, test-case XML schema, and tool source (visible-but-disabled).
   - `GET /api/tool-cache/{cacheKey}` raw-read route removed; `cacheKey` retained as the delete key.
   - Existing `/api/tool-cache/*` admin surface unchanged in shape, routed through shared handlers.
   - `openapi.json` extended (+244 lines), `src/generated/api-types.ts` regenerated.
   - New integration tests in `test/tools-read-surface.test.ts`; legacy `test/tool-cache.test.ts` removed.

4. **`cache-ui` package.** ✅ Landed on branch `cache_ui`.
   - New `@galaxy-tool-util/cache-ui` source-only workspace package (mirrors `gxwf-report-shell` layout — `exports` points at `src/`, no `dist/`).
   - Lifted `ToolCacheView`, `ToolCacheTable`, `ToolCacheStats`, `ToolCacheRawDialog`, `useToolCache`, plus the `useToolCache` test.
   - `useToolCache(client)` now takes a `CacheClient` — module-level singleton dropped (plan §4 wanted "no reliance on a singleton").
   - Compile-time types sourced from `tool-cache-proxy`'s OpenAPI spec; package re-exports `paths` / `components` / `operations`. **Side fix:** proxy's delete path param renamed `cache_key` → `cacheKey` to match `gxwf-web` (regenerated `api-types.ts`).
   - `gxwf-ui` consumes `@galaxy-tool-util/cache-ui`; local component / composable / view copies removed. The `/cache` route is now a tiny wrapper view that constructs `createCacheClient(VITE_API_BASE_URL ?? "")` and mounts `<ToolCacheView :client>`.
   - Public API: `createCacheClient`, `useToolCache`, the four components, plus `CacheClient` / `CachedToolEntry` / `CacheStats` types.
   - 6 tests in `packages/cache-ui/test/useToolCache.test.ts` (lifted from gxwf-ui, rewired to a fake client). Lint / format / typecheck / `pnpm test` all green.

5. **Proxy SPA.** ✅ Landed on branch `cache_ui`.
   - New private workspace package `@galaxy-tool-util/tool-cache-proxy-ui` (Vite + Vue 3, mirrors `gxwf-ui` shape minus router/Monaco). Single page, no nav shell — just a small header bar (`galaxy-tool-proxy / Tool Cache`) and `<ToolCacheView :client>`. Uses default Aura PrimeVue theme.
   - **Decision pinned (open Q):** SPA lives in its own top-level package (`packages/tool-cache-proxy-ui/`), not nested under the proxy. Symmetrical with the `gxwf-web` / `gxwf-ui` split — easier lint / format / build via existing `pnpm -r`.
   - **Decision pinned (open Q):** SPA layout stays single-page for now; the small header bar leaves room for future tabs without committing.
   - **Decision pinned (theming open Q):** `cache-ui` now ships `cache-ui.css` with default `--gx-*` token values. Consumers that already provide them (e.g. `gxwf-ui` via `galaxy.css`) skip the import; the proxy SPA imports it.
   - `tool-cache-proxy` gained `uiDir?: string` on `ProxyContext` (passed via `createProxyContext(config, { uiDir })`). When set, GET requests outside the API namespace fall through to a small `serveStatic` helper with SPA index.html fallback. API routes are matched first, so they never collide.
   - `galaxy-tool-proxy` bin auto-discovers `../public` (populated by the new `copy-ui` script) and respects a `GALAXY_TOOL_PROXY_UI_DIST` env override.
   - Root `pnpm build` now runs `tool-cache-proxy copy-ui` after the workspace build, copying `tool-cache-proxy-ui/dist/` → `tool-cache-proxy/public/`. `public/` is gitignored.
   - 1 new integration test `static UI fallback` (proxy router test suite, total 21 tests). Lint / format / typecheck / `pnpm test` all green; SPA `pnpm build` produces ~840 kB JS / ~16 kB CSS bundle.

   Follow-ups not done in this phase:
   - SPA bundle is large (838 kB). Worth code-splitting later if it matters; everything ships as one chunk today.
   - Dev server flow: SPA dev server (`pnpm --filter @galaxy-tool-util/tool-cache-proxy-ui dev`) on its own port proxies `/api` → `GALAXY_TOOL_PROXY_URL ?? http://localhost:8080`. Smoke-tested via build only — not driven end-to-end against a live proxy yet.

6. **Tests.**
   - Shared handler unit tests in `core` (covers both servers).
   - Integration tests in each server: real HTTP, real FS cache, mocked `infoService.getToolInfo`. Cover read surface (search, TRS list/get/versions, parsed tool, three schema endpoints, tool_source 501) and admin surface (list, stats, delete, prefix-delete, refetch, add).
   - `cache-ui` component tests.

## 8. Open questions

Resolved during Phase 1:

- ~~TRS Effect Schemas hand-port vs codegen?~~ → hand-ported (~80 lines, no codegen dependency).
- ~~Search semantics + pagination defaults?~~ → substring over `tool_id` / `name` / `description`; default `page_size=25`, max 200.
- ~~`ToolClass` content — config-driven or hardcoded?~~ → single hardcoded `GALAXY_TOOL_CLASS` const exported from `@galaxy-tool-util/schema`.

Still open:

- `tool_source` — store in cache eventually (doubles disk for XML-shaped sources), or stay 501 indefinitely?
- Proxy SPA layout — pure single-page (just the panel), or leave room for future tabs (e.g. server config, health)?
- `cache-ui` styling — bring along PrimeVue theme assumptions, or expose theming hooks so consumers can pick? gxwf-ui already chose a theme; proxy will inherit it by default if we don't abstract.
- Where does the proxy SPA live in the monorepo — `packages/tool-cache-proxy/ui/`, or a separate `packages/tool-cache-proxy-ui/` package?
