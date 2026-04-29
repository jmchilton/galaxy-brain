# Tool Source Storage

**Date:** 2026-04-28
**Repo:** `galaxy-tool-util-ts`
**Depends on:** `MERGED_CACHE_UI_PLAN.md` (phases 1-5 landed). Adds the storage backing for the `tool_source` slot reserved in §2.1.

---

## 1. Goal

Make `GET /api/tools/{tool_id}/versions/{tool_version}/tool_source` return the raw tool wrapper XML (or YAML / CWL when applicable) instead of 501. The slot, the openapi route, and the disabled UI tab already exist — this plan fills in the storage / fetch path.

Driver: an external project consumes raw tool source. Storage policy choices should optimize for **cheap, accurate raw bytes** for that consumer over UI ergonomics.

## 2. Non-goals

- Tool source *editing* — read only.
- Inlining macros automatically. Source is whatever the upstream returns; if a tool depends on a `<macros><import>macros.xml</import></macros>` sibling, the consumer expands.
- New auth or rate-limiting — same posture as the rest of the cache surface.
- Mirroring raw source for the entire ToolShed proactively. On-demand only.

## 3. What "tool source" means here

For Galaxy-style tools, "tool source" is the wrapper XML — the file containing `<tool id=...>`. Most tools also reference one or more sibling files (macros, requirements XML, test data layout). The contract:

- **Primary file:** the file that contains the `<tool>` element. ~5-50 KB typical, ~12 KB for `rgFastQC.xml`.
- **Sibling references:** call sites like `<macros><import>foo.xml</import></macros>`. We surface them in a manifest but do **not** resolve them in the primary response. A follow-up endpoint can provide them.

Mapping at the route:
- Body: raw bytes, `Content-Type: application/xml; charset=utf-8` (or `text/yaml` / `text/plain` for non-XML formats).
- Response header `X-Galaxy-Tool-Source-Format: xml | yaml | cwl`.
- Response header `X-Galaxy-Tool-Source-Macros: foo.xml,bar.xml` when the wrapper imports siblings (comma-separated, paths relative to the wrapper's directory). Empty / absent when none.

## 4. Where source comes from

`ToolInfoService.getToolInfo` already loads tools from configured sources to produce `ParsedTool`. The same fetcher knows the bytes — we just don't currently keep them. Two upstream shapes today:

- **`type: toolshed`** — uses ToolShed API. Equivalent fetch for raw XML: walk `/api/repositories/{id}/contents` → primary tool file → `raw_file` content. Heavier than ideal.
- **`type: galaxy`** (live Galaxy server) — `GET /api/tools/{tool_id}/raw_tool_source` returns the wrapper verbatim. This is the precedent shape we are mirroring.

**Decision needed:** for `type: toolshed`, do we (a) mirror Galaxy's `raw_tool_source` semantics by fetching from a configured Galaxy server, or (b) fetch raw bytes directly from the ToolShed (the source of truth, but a different code path)? Most likely (b) — the ToolShed is what `tool-cache-proxy` is *for*, no need to require a Galaxy alongside.

## 5. Storage policy — three options

**Option A — Eager + write-through.** `getToolInfo` fetches *and* stores raw source whenever it parses. Source available immediately for any cached tool. Cost: every fetch pays the bandwidth + ~12 KB extra disk.

**Option B — Lazy fetch on demand.** Cache stays lean; the `tool_source` handler fetches from the upstream on hit, returns directly. No disk cost, slow first call, repeated calls hit upstream every time.

**Option C — Lazy fetch + write-through.** First hit fetches and stores, subsequent hits serve from disk. Best for the actual consumer (read-heavy, repeat hits). Cost is amortized over use, not paid upfront.

**Recommendation: C.** It's strictly better than B for any tool the consumer touches twice; pays nothing for tools the consumer never views (unlike A). Implementation cost over B is one extra `cache.saveToolSource(...)` call.

**Decision needed:** confirm C, or pick differently if the external consumer's access pattern argues otherwise.

## 6. Cache layer changes

In `packages/core/src/cache/`:

- `ToolCache` gains:
  ```ts
  loadToolSource(cacheKey): Promise<{ bytes: Uint8Array; format: SourceFormat; macros: string[] } | null>
  saveToolSource(cacheKey, bytes, format, macros): Promise<void>
  ```
- `CacheStorage` (filesystem backend) writes `<key>.source` next to `<key>.json`. Format + macros recorded in the existing index entry, not as a sidecar.
- `CachedToolEntry` (admin DTO) gains `hasSource: boolean` and `sourceBytes?: number` so the admin UI can show coverage.

In `packages/core/src/cache-http/handlers.ts`:

- `getToolSource` becomes:
  1. Try `cache.loadToolSource(cacheKey)`. If hit, return the bytes + headers.
  2. Otherwise, ask `infoService.fetchToolSource(toolId, toolVersion)`. If miss → 404.
  3. Write through (`cache.saveToolSource(...)`), then return.
- Returns a `{ bytes, format, macros }` shape. The router adapter sets headers and writes bytes (NOT json).

**Open:** does `getToolSource` need a `?refresh=true` flag to bypass cache and re-fetch upstream? Probably yes — mirrors the existing `refetch` pattern for parsed tools.

## 7. Adapter changes (gxwf-web + tool-cache-proxy)

`dispatchCacheRoute` currently returns `unknown` and the adapter calls `json(res, 200, result)`. Tool source returns bytes, not JSON — needs a different return shape:

```ts
type CacheResult =
  | { kind: "json"; body: unknown }
  | { kind: "bytes"; body: Uint8Array; contentType: string; headers?: Record<string, string> };
```

`dispatchCacheRoute` returns `CacheResult`; adapters branch on `kind`. Trivial change in both adapters.

## 8. UI

- `ToolCacheRawDialog` — the `tool_source` tab is currently `disabled: true`. Flip to `false`; loader fetches from `/api/tools/{id}/versions/{ver}/tool_source` (text response, not JSON).
- Display in a `<pre>` with XML syntax highlighting where convenient (consider lazy-loading a small XML highlighter; not blocking).
- `ToolCacheTable` — optionally show a small badge / icon on entries with `hasSource: true`.

## 9. OpenAPI

Both specs already declare the route. Update the `200` response in both:
- Content type `application/xml; charset=utf-8` (and `text/yaml`, `text/plain` alternates).
- Response headers: `X-Galaxy-Tool-Source-Format`, `X-Galaxy-Tool-Source-Macros`.
- Add `?refresh=true` query parameter.

Regenerate `api-types.ts` in both servers.

## 10. Tests

Unit (`packages/core/test/`):
- `loadToolSource` / `saveToolSource` round-trip on the filesystem backend.
- `getToolSource` lazy-fetch + write-through path with a mocked `infoService.fetchToolSource`.
- 404 when neither cache nor upstream has it.

Integration (each server's router test):
- `GET …/tool_source` returns 200 + raw bytes + correct headers when source is cached.
- Same after lazy fetch (mocked upstream).
- `?refresh=true` re-fetches even when cached.
- Macro headers populated when wrapper imports sibling files.

## 11. Rollout

1. Cache layer: `loadToolSource` / `saveToolSource` + filesystem backend. Tests.
2. `infoService.fetchToolSource` for `type: toolshed` and `type: galaxy`. Tests.
3. `getToolSource` handler + `CacheResult` shape change in `dispatchCacheRoute`. Adapter byte-writing path in both servers. Tests.
4. OpenAPI updates + codegen.
5. UI: enable the disabled tab + optional table badge.
6. Changeset (minor on `core`, `gxwf-web`, `tool-cache-proxy`; patch on `cache-ui`).

## 12. Open questions

- **Source-of-truth fetch path** for `type: toolshed` — direct ToolShed contents API, or require a configured Galaxy as the canonical raw_tool_source provider? (My read: ToolShed direct.)
- **Macro file resolution** — surface them via a separate endpoint (`…/tool_source/macros/{path}`) now, defer entirely, or recommend the consumer fetch from the ToolShed independently?
- **Storage policy** — confirm Option C (lazy + write-through), or pick differently based on consumer access pattern.
- **`?refresh=true`** — mirror the parsed-tool refetch flag, or rely on the cache-admin `refetch` to invalidate parsed + source together?
- **Format detection** — sniff the bytes (`<tool` → xml, `cwlVersion:` → cwl, etc.) or trust the upstream's content-type header?
- **Sync with Python `gxwf-web`** — Python doesn't have these routes today. If/when the cache lands there, do we co-design the raw-source endpoint shape now (this plan) so both sides converge on day one?
