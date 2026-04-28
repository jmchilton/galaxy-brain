# `@galaxy-tool-util/core`: cache-inspection primitives for tool-cache UIs

## Background

`ToolCache` (`packages/core/src/cache/tool-cache.ts`) and `CacheStorage` (`packages/core/src/cache/storage/interface.ts`) already give consumers a clean storage-agnostic surface — same code path for `FilesystemCacheStorage` (Node) and `IndexedDBCacheStorage` (browser/Web Worker), with `tool-cache-proxy` and the VS Code extension as the two main consumers today.

We're about to build a "Tool Cache Inspector" UI in `galaxy-workflows-vscode` (TreeView + virtual JSON document, fed via new LSP requests on `ToolCacheService`). To keep the extension storage-agnostic and avoid forking primitives, the data layer should live upstream. `tool-cache-proxy` would benefit from the same primitives — listing/inspecting/deleting cached entries is a generic capability, not extension-specific.

This issue tracks the small set of additions needed on `ToolCache` / `CacheStorage` to make that work cleanly. None require schema changes; most are thin wrappers over what's already there.

## Proposed additions

### 1. Single-entry delete — `ToolCache.removeCached(cacheKey)`

Today only `clearCache(toolIdPrefix?)` exists. Deleting a single cached tool by `cache_key` (the natural identity surfaced by `listCached()`) requires either an awkward prefix or reaching past `ToolCache` directly into `storage` + `index`.

```ts
async removeCached(cacheKey: string): Promise<boolean>; // true if removed
```

Drives "Delete this entry" in the inspector and `DELETE /tools/<key>` in the proxy.

### 2. Raw-payload accessor — `ToolCache.loadCachedRaw(cacheKey)`

`loadCached()` runs `S.decodeUnknownSync(ParsedTool)` and returns `null` on decode failure (only a `console.debug` is emitted). That's the right default for runtime, but it hides exactly the entries an inspector needs to show — stale schema versions, partial writes, hand-crafted entries.

```ts
async loadCachedRaw(cacheKey: string): Promise<unknown | null>;
```

Skips decoding; lets the UI render raw JSON and surface decode failures explicitly. Trivial wrapper over `storage.load(key)`.

### 3. Per-entry size — optional `CacheStorage.stat?(key)`

For "how big is the cache?" / "which tool is the heavy one?" the inspector needs size info.

```ts
interface CacheStorage {
  // ...existing...
  stat?(key: string): Promise<{ sizeBytes: number; mtime?: string } | null>;
}
```

- `FilesystemCacheStorage`: `fs.stat()` of the file.
- `IndexedDBCacheStorage`: `JSON.stringify(value).length` (or `Blob` size if entries are stored as blobs).
- Optional method so existing implementations stay compatible.

Alternative: stash `size_bytes` on `CacheIndexEntry`. Rejected here because it forces an index write on every save and duplicates ground-truth held by the storage backend.

### 4. Aggregate stats — `ToolCache.getCacheStats()`

Single call so dashboards / status bars don't have to re-fetch list + stat loops:

```ts
interface CacheStats {
  count: number;
  totalBytes?: number;            // omitted if storage doesn't implement stat()
  bySource: Record<string, number>;
  oldest?: string;                // ISO timestamp from cached_at
  newest?: string;
}
async getCacheStats(): Promise<CacheStats>;
```

### 5. Better lazy-index backfill in `loadCached`

When `storage.load(key)` succeeds but `index.has(key)` is false, `loadCached` currently writes:

```ts
await this.index.add(key, d.id ?? "unknown", d.version ?? "unknown", "unknown");
```

Two small improvements:
- Pull `version` off the decoded `ParsedTool` (we just decoded it) instead of off the raw `data` shape.
- Use a distinguished source value like `"orphan"` so the inspector can flag entries whose index metadata was reconstructed rather than authored. Drop-in, no schema change.

### 6. (Optional) Top-level re-export of `CacheStorage`

Already exported from `cache/index.ts` and the top-level `index.ts` — confirming this stays the case so browser/extension consumers can implement the interface without reaching into `/node`.

## Out of scope here

- Inspector UI itself (lives in `galaxy-workflows-vscode`).
- New LSP requests (`listCachedTools`, `getCachedToolRaw`, `deleteCachedTool`, `getCacheStats`) — these wrap the upstream API on `ToolCacheService` and don't need anything beyond items 1–4.
- Diff-against-live-ToolShed (can be built on `loadCachedRaw` + existing `ToolInfoService.fetch`).

## Suggested PR shape

One PR, two commits — small surface, mostly additive:

1. `ToolCache.removeCached`, `loadCachedRaw`, `getCacheStats`, lazy-index backfill polish + tests.
2. Optional `CacheStorage.stat?` + implementations on filesystem and indexeddb backends + tests.

Bumps `@galaxy-tool-util/core`. The extension floor moves to whatever minor ships these; `tool-cache-proxy` can opportunistically adopt for richer endpoints.
