# gxwf-web + gxwf-ui: Tool Cache Debugging Panel

**Date:** 2026-04-27
**Repo:** `galaxy-tool-util` worktree `vs_code_integration`
**Depends on:** `CACHE_ABSTRACTIONS_PLAN.md` — `ToolCache.removeCached`, `loadCachedRaw`, `getCacheStats`, and `CacheStorage.stat` have all already shipped (see `packages/core/src/cache/tool-cache.ts`). No upstream blockers; this plan can land directly.
**Related but separate:** `VS_CODE_CACHE_TREE_PLAN.md` — that work targets the VS Code extension. This work is for the standalone web app and shares only the upstream `ToolCache` primitives.

---

## 1. Goal

Add a "Tool Cache" tab to the standalone `gxwf-ui` web app, backed by new `gxwf-web` API routes that expose the existing `state.cache: ToolCache` for inspection and management. This is a debugging surface for the cache the server already maintains and shares with anything embedded in the page (including the Monaco-hosted VS Code extension when it's wired in) — but the panel itself stands alone and depends only on `gxwf-web`.

Concretely:

- Browse every cached tool, grouped by source.
- Open the raw cached JSON for any entry.
- Delete a single entry.
- Re-fetch a specific tool from its ToolShed.
- Show aggregate stats (count, total size, by-source counts, oldest/newest).
- Optionally clear the entire cache (with confirm).

## 2. Non-goals

- No changes to the embedded Monaco / VS Code extension. The panel reads/writes the same `ToolCache` instance the embedded extension uses, but the UI is independent.
- No diff-against-live-ToolShed in this pass (data is reachable; defer the UI).
- No write-side endpoints beyond delete, re-fetch, clear. No "edit the cached JSON" flow.

## 3. Current shape (orientation)

`gxwf-web` (`packages/gxwf-web/src/`):

- `router.ts` — flat `matchRoute(method, url)` switch over `Route` union, dispatch in a single `switch (route.handler)`. `AppState` carries `directory`, `cache: ToolCache`, `workflows`, optional `cacheDir`, `uiDir`, `extraConnectSrc`. **Does not currently carry a `ToolInfoService`** — `app.ts` constructs one via `makeNodeToolInfoService(...)` and only stashes its `cache` on state. This is the main upstream change refetch needs (see §4 / §11).
- API surface today: `/api/contents/*` (file CRUD + checkpoints), `/workflows`, `/workflows/{path}/{op}`, `/api/schemas/structural`. Static fallback to `state.uiDir` for everything else.
- `openapi.json` is hand-authored. `pnpm --filter @galaxy-tool-util/gxwf-web codegen` (or `pnpm codegen` from the package dir) regenerates `src/generated/api-types.ts` via `openapi-typescript`.

`gxwf-client` (`packages/gxwf-client/src/index.ts`) — thin `openapi-fetch` wrapper; types come from `@galaxy-tool-util/gxwf-web` (re-exported from the generated file).

`gxwf-ui` (`packages/gxwf-ui/src/`):

- Vue 3 + PrimeVue, Vue Router with three routes: `/`, `/workflow/:path`, `/files/:path?`.
- `App.vue` has the navbar with "Workflows" / "Files" / external "IWC" links and a dark-mode toggle.
- Composables in `composables/` wrap the API client (`useApi.ts`, `useWorkflows.ts`, `useContents.ts`, etc.).

## 4. Architecture

```
gxwf-web/src/
├── router.ts                    # extend Route union + handler switch
└── tool-cache.ts                # NEW — handler module (mirrors workflows.ts shape)

gxwf-web/openapi.json            # extend with /api/tool-cache/* paths + schemas
gxwf-web/src/generated/          # regenerate via `npm run codegen`

gxwf-ui/src/
├── App.vue                      # add nav link
├── router/index.ts              # add route
├── views/
│   └── ToolCacheView.vue        # NEW
├── components/
│   ├── ToolCacheTable.vue       # NEW — list + filters + per-row actions
│   ├── ToolCacheStats.vue       # NEW — header strip
│   └── ToolCacheRawDialog.vue   # NEW — modal with raw JSON
└── composables/
    └── useToolCache.ts          # NEW — reactive wrapper over the typed client
```

The new server module is intentionally a sibling of `workflows.ts` so the router stays small — `router.ts` only adds Route variants and a single handler block that delegates to `tool-cache.ts` operations.

**`AppState` change:** add `infoService: ToolInfoService` (resolves the §11 open question — go with the clean version). `app.ts` already constructs one via `makeNodeToolInfoService(...)` and discards everything but `service.cache`; promote the whole service onto state, derive `state.cache = state.infoService.cache` for back-compat with existing handlers. Plumb the type through `index.ts` exports.

## 5. API design

All routes are additive under a new `/api/tool-cache` prefix. CORS / error handling pass through the existing `createRequestHandler` machinery.

| Method | Path | Body / Query | Response |
|---|---|---|---|
| `GET`    | `/api/tool-cache`              | — | `{ entries: CachedToolEntry[], stats: CacheStats }` |
| `GET`    | `/api/tool-cache/stats`        | — | `CacheStats` |
| `GET`    | `/api/tool-cache/{cacheKey}`   | — | `{ contents: unknown, decodable: boolean }` (raw payload) |
| `DELETE` | `/api/tool-cache/{cacheKey}`   | — | `{ removed: boolean }` |
| `DELETE` | `/api/tool-cache`              | `?prefix=<toolIdPrefix>` optional | `{ removed: number }` |
| `POST`   | `/api/tool-cache/refetch`      | `{ toolId, toolVersion?, toolshedUrl? }` | `{ fetched, alreadyCached, failed[] }` |
| `POST`   | `/api/tool-cache/add`          | `{ toolId, toolVersion? }` | `{ cacheKey, alreadyCached }` (diagnostic "populate this id") |

Schemas (added to `openapi.json` `components.schemas`):

```ts
CachedToolEntry {
  cacheKey: string;
  toolId: string;
  toolVersion: string;
  source: string;          // "api" | "galaxy" | "local" | "orphan" | …
  sourceUrl: string;
  cachedAt: string;        // ISO 8601
  sizeBytes?: number;      // present iff storage.stat is implemented
  decodable: boolean;
  toolshedUrl?: string;    // derived for entries with a parseable ToolShed id
}
CacheStats {
  count: number;
  totalBytes?: number;
  bySource: { [source: string]: number };
  oldest?: string;
  newest?: string;
}
```

`cacheKey` in the path is URL-encoded; the upstream `cacheKey()` function returns hex-style strings so encoding is normally a no-op.

The `CachedToolEntry` field names above are camelCase, but `ToolCache.listCached()` / the `CacheIndex` return snake_case (`cache_key`, `tool_id`, `tool_version`, `source_url`, `cached_at`). `decorate()` does the rename — keep snake_case private to the cache index and present camelCase at the HTTP boundary so the OpenAPI/TS types feel idiomatic on the UI side.

`refetch` and `add` both go through `state.infoService.getToolInfo(toolId, toolVersion)`, which already (a) resolves coordinates, (b) tries each configured `ToolSource` in order, and (c) writes through `cache.saveTool`. Refetch differs only in that it calls `cache.removeCached(cacheKey)` first to force a re-pull rather than returning the existing entry. Both responses include `alreadyCached` so the UI can distinguish a fresh fetch from a no-op.

### Implementation in `tool-cache.ts`

Pure thin wrappers; everything routes through `state.cache` and is storage-agnostic by virtue of the upstream additions:

```ts
export async function listToolCache(state: AppState): Promise<{ entries: CachedToolEntry[]; stats: CacheStats }> {
  const raw = await state.cache.listCached();           // existing
  const stats = await state.cache.getCacheStats();      // new upstream
  const entries = await Promise.all(raw.map(async (e) => decorate(state, e)));
  return { entries, stats };
}

export async function getToolCacheRaw(state: AppState, cacheKey: string) {
  const contents = await state.cache.loadCachedRaw(cacheKey);   // new upstream
  if (contents === null) throw new HttpError(404, `No cached entry: ${cacheKey}`);
  const decodable = canDecode(contents);                        // try ParsedTool decode
  return { contents, decodable };
}

export async function deleteToolCacheEntry(state: AppState, cacheKey: string) {
  const removed = await state.cache.removeCached(cacheKey);     // new upstream
  if (!removed) throw new HttpError(404, `No cached entry: ${cacheKey}`);
  return { removed };
}

export async function clearToolCache(state: AppState, prefix?: string) {
  // Avoid double-listAll: snapshot once, clear, report the snapshot length
  // (clearCache currently removes everything matching, so the count is exact).
  // If we want to be defensive, change upstream `ToolCache.clearCache` to
  // return the removed count; small change worth doing if this ships.
  const before = await state.cache.listCached();
  const matched = prefix === undefined
    ? before
    : before.filter((e) => e.tool_id.startsWith(prefix.replace(/\*$/, "")));
  await state.cache.clearCache(prefix);
  return { removed: matched.length };
}
```

`decorate()` adds `decodable` (cheap try/catch decode) and `toolshedUrl` (via the existing tool-id parser) on top of the raw index entry.

### Router additions (`router.ts`)

- New `Route` variants: `toolCacheList`, `toolCacheStats`, `toolCacheRead`, `toolCacheDelete`, `toolCacheClear`, `toolCacheRefetch`.
- `matchRoute()` adds an `if (rawPath === "/api/tool-cache" || rawPath.startsWith("/api/tool-cache/"))` block before the existing `/api/contents` and workflows blocks — wide-but-targeted prefix avoids cross-talk with other prefixes.
- New `case` branches in the dispatch switch, each delegating to one `tool-cache.ts` function.

### OpenAPI / client regeneration

1. Edit `openapi.json` — add the seven paths and two schemas above.
2. Run `pnpm --filter @galaxy-tool-util/gxwf-web codegen` (or `pnpm codegen` from `packages/gxwf-web/`) — regenerates `src/generated/api-types.ts`.
3. `gxwf-client` re-exports automatically via `@galaxy-tool-util/gxwf-web` types — `pnpm build` to typecheck the client.

## 6. UI: navbar tab and routing

`App.vue` navbar gains a third internal link, sandwiched before the external IWC link:

```html
<RouterLink to="/" class="nav-link">Workflows</RouterLink>
<RouterLink to="/files" class="nav-link">Files</RouterLink>
<RouterLink to="/cache" class="nav-link">Tool Cache</RouterLink>
<a href="https://iwc.galaxyproject.org/" …>IWC …</a>
```

`router/index.ts` gets a fourth route, lazy-loaded to keep the dashboard bundle lean:

```ts
{ path: "/cache", component: () => import("../views/ToolCacheView.vue") },
```

## 7. UI: `ToolCacheView.vue`

Layout:

```
┌──────────────────────────────────────────────────────────────────────┐
│  Tool Cache                                          [Refresh] [⋯]   │
│                                                                      │
│  ┌── ToolCacheStats ────────────────────────────────────────────┐    │
│  │ 42 tools · 3.1 MB · 38 toolshed · 3 orphan · 1 local         │    │
│  │ Oldest: 2025-12-14   Newest: 2026-04-27                      │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Filter: [search box]   Source: [All ▾]   ☐ Show only undecodable    │
│                                                                      │
│  ┌── ToolCacheTable ────────────────────────────────────────────┐    │
│  │ ✓  bwa-mem            0.7.17.2  api    87 KB  2 days ago  ⋯  │    │
│  │ ✓  samtools_view      1.15.1    api    52 KB  3 days ago  ⋯  │    │
│  │ ⚠  legacy_tool        1.0       api    11 KB  21 days ago ⋯  │    │
│  │ ⚠  unknown_id         unknown   orph    3 KB    today    ⋯   │    │
│  │ …                                                            │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

Components:

- **`ToolCacheStats.vue`** — receives `CacheStats` as a prop, renders the strip. Pure presentational.
- **`ToolCacheTable.vue`** — PrimeVue `DataTable` with: tool id, version, source, size (sortable), cached_at (sortable), and an actions column. Per-row buttons (PrimeVue `SplitButton` or three icon buttons): "View raw", "Re-fetch", "Open in ToolShed" (if `toolshedUrl`), "Delete". Filters at the top: search, source dropdown, "show only undecodable" checkbox.
- **`ToolCacheRawDialog.vue`** — PrimeVue `Dialog` with a read-only Monaco/textarea showing pretty-printed JSON. Footer buttons: Copy, Close. Loaded lazily on first open.

The `⋯` title-bar overflow has: `Refresh`, `Add tool…` (toolId + optional version → POST `/add`; primary diagnostic-populate flow), `Clear all (with confirm)`, `Clear by prefix…` (input dialog).

Re-fetch flow uses an existing toast (`primevue/toast`, already mounted in `App.vue`) — success → "Re-fetched bwa-mem 0.7.17.2", failure → "Failed: <reason>". Re-fetch always refreshes the table.

Delete shows an inline `ConfirmDialog` (PrimeVue) — single click deletes if "Don't ask again this session" is set in the same dialog.

## 8. UI: `useToolCache.ts` composable

Mirrors `useWorkflows.ts`. Reactive `entries`, `stats`, `loading`, `error`. Methods: `refresh`, `del(cacheKey)`, `clear(prefix?)`, `refetch(toolId, toolVersion)`, `loadRaw(cacheKey)`. Each method uses the typed client from `useApi.ts` and re-runs `refresh()` on mutating success.

## 9. Tests

- **`gxwf-web/test/`** — `tool-cache.spec.ts`. Build a temp cache with a couple of fixture entries (one decodable, one orphan / hand-broken). Exercise each route: list, stats, read raw, delete, delete-by-prefix, refetch. Mock `ToolInfoService.fetch` for the refetch test.
- **`gxwf-web/test/router.spec.ts`** — extend the existing route-matching matrix with the new paths.
- **`gxwf-ui`** (Vitest) — `ToolCacheTable.spec.ts` rendering test with canned API responses; `useToolCache.spec.ts` round-trip with `msw` or fetch stubs.
- **No new e2e** in this pass — defer until the panel has shape.

## 10. Rollout order

1. Land the upstream additions from `CACHE_ABSTRACTIONS_PLAN.md`. Bump `@galaxy-tool-util/core` floor in `gxwf-web`.
2. `gxwf-web`: implement `tool-cache.ts`, extend `router.ts`. Tests.
3. Update `openapi.json`. Run `npm run codegen`. Verify `gxwf-client` rebuild typechecks.
4. `gxwf-ui`: composable, view, components, router entry, navbar link. Tests.
5. README touch-up on `gxwf-web` and `gxwf-ui` — list the new endpoints / nav tab.

## 11. Open questions

- **Refetch source resolution.** For an `orphan` entry whose original `tool_id` / `version` / `toolshed_url` are partially "unknown", refetch can't run without prompting. Default: disable the refetch button and show a tooltip; let the user delete and re-add via a real workflow or via the new "Add tool…" dialog. Worth a look once item 5 from `CACHE_ABSTRACTIONS_PLAN.md` lands and orphans get cleaner metadata.
- **~~`ToolInfoService` on `AppState`~~.** Resolved — go with the clean version (§4): add `infoService: ToolInfoService` to `AppState`, derive `state.cache` from it.
- **Auth.** None of the existing endpoints authenticate. Tool-cache delete/clear are higher-impact than file CRUD only because they affect a shared cache rather than per-user files. Default: same posture as the rest of the API; revisit if the deployment story changes.
- **Pagination.** A bulk Galaxy install can have hundreds of cached tools. PrimeVue `DataTable` handles client-side paging fine for low thousands. Server-side paging is overkill until a deployment hits it.
- **Live updates.** Tab does not auto-refresh while open. SSE / WebSocket would be nice but is disproportionate to this surface; manual refresh is fine for a debugging tool.
- **`clearCache` return value.** Worth a 1-line upstream change to make `ToolCache.clearCache(prefix?)` return the removed count, instead of recomputing it in the handler. Defer if it complicates the upstream API for non-web callers.
- **`loadCachedRaw` 404 vs decode-failure.** `loadCachedRaw` returns `null` only when the storage backend has no entry for the key; a malformed JSON blob would still surface (as the raw object the storage parsed). The 404 path in the handler is correct, but worth a test confirming a hand-corrupted entry returns 200 with `decodable: false`, not 500.
