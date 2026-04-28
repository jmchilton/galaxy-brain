# VS Code Tool Cache Inspector — TreeView + Virtual Document

**Date:** 2026-04-27
**Repo:** `galaxy-workflows-vscode` (worktree `wf_tool_state`)
**Depends on:** `CACHE_ABSTRACTIONS_PLAN.md` — assumes the upstream `@galaxy-tool-util/core` additions (`removeCached`, `loadCachedRaw`, `getCacheStats`, optional `CacheStorage.stat`) have shipped.

---

## 1. Goal

Give workflow authors a way to inspect, drill into, and manage the tool-info cache that backs validation/completion/hover. Two surfaces, both reusing existing patterns in this repo:

- **TreeView** — a second Explorer view ("Tool Cache") next to the existing "Workflow Tools" tree. Lists every cached tool, with inline actions (refetch / delete / open raw / open in ToolShed).
- **Virtual document** — a read-only `galaxy-tool-cache:` URI scheme that opens the raw cached JSON for a single entry in a normal editor tab. Gets JSON syntax highlighting, search, copy, and "Compare with…" diffs for free.

Both surfaces are storage-agnostic by construction — they go through new LSP requests on `ToolCacheService`, so Node (filesystem) and browser (IndexedDB) builds behave identically.

## 2. Non-goals

- No webview / custom panel.
- No diff-against-live-ToolShed UI in this pass (the data is reachable via `loadCachedRaw` + `ToolInfoService.fetch`; defer the UI).
- No changes to the existing "Workflow Tools" tree — distinct concern (workflow-step → tool) vs. this view's concern (cache contents, regardless of any open document).

## 3. Architecture overview

```
client/
├── providers/
│   ├── toolCacheTreeProvider.ts      # NEW — TreeDataProvider<CachedToolItem>
│   └── toolCacheDocumentProvider.ts  # NEW — TextDocumentContentProvider for galaxy-tool-cache:
└── commands/
    ├── refreshToolCacheView.ts       # NEW — title action
    ├── deleteCachedTool.ts           # NEW — inline + context menu
    ├── refetchCachedTool.ts          # NEW — inline (reuses populateToolCacheForTool)
    └── openCachedToolRaw.ts          # NEW — opens galaxy-tool-cache:/<key>.json

server/packages/server-common/src/services/toolCacheService.ts
    + handlers for new LSP requests (see §5)

shared/src/requestsDefinitions.ts
    + new request IDs and payload types

server/packages/server-common/src/providers/toolRegistry.ts
    + thin wrappers around new ToolCache methods
```

The new client pieces register at the same point as their existing analogues (in `client/src/common/index.ts` and `client/src/commands/setup.ts`). The new view contribution lives next to `galaxyWorkflows.toolsView` in `package.json`.

## 4. Server: extend `ToolCacheService`

`server/packages/server-common/src/services/toolCacheService.ts` already handles five custom requests. Add four more, all thin wrappers over `ToolRegistryService` + the upstream `ToolCache`:

| Request | Params | Result |
|---|---|---|
| `listCachedTools` | — | `{ tools: CachedToolEntry[], stats: CacheStats }` |
| `getCachedToolRaw` | `{ cacheKey }` | `{ contents: string \| null, error?: string }` |
| `deleteCachedTool` | `{ cacheKey }` | `{ removed: boolean }` |
| `getToolCacheStats` | — | `{ stats: CacheStats }` |

(`refetchCachedTool` is already covered by the existing `populateToolCacheForTool`; reuse it.)

`CachedToolEntry` extends what `listCached()` already returns with the optional size and a `decodable: boolean` flag derived from a `try { decode } catch { false }` step. UI can show a warning glyph for orphan/undecodable entries.

```ts
// shared/src/requestsDefinitions.ts
export interface CachedToolEntry {
  cacheKey: string;
  toolId: string;
  toolVersion: string;
  source: string;            // "api" | "galaxy" | "local" | "orphan" | ...
  sourceUrl: string;
  cachedAt: string;          // ISO 8601
  sizeBytes?: number;        // present if storage.stat is implemented
  decodable: boolean;        // false → schema mismatch, render warning
  toolshedUrl?: string;      // derived via parseToolShedRepoUrl()
}

export interface CacheStats {
  count: number;
  totalBytes?: number;
  bySource: Record<string, number>;
  oldest?: string;
  newest?: string;
}
```

`ToolRegistryServiceImpl` grows matching methods (`listCachedDetailed`, `loadCachedRaw`, `removeCached`, `getCacheStats`) that delegate straight through to the underlying `ToolCache`. No new logic — keep the registry storage-agnostic and let upstream do the work.

`getCachedToolRaw` returns the payload **stringified** (`JSON.stringify(value, null, 2)`) so the virtual document provider doesn't have to know about parsed objects.

### Cache-mutation notifications

When `deleteCachedTool` or a refetch runs, every open document referencing that tool needs re-validation (validation already keys off `hasCached()`). Two options:

- **Cheap:** the existing `validateAllOpenDocuments()` hook fires after any cache mutation. Already used by auto-resolution.
- **Eventual:** a new `cacheChanged` server→client notification so the tree refreshes itself without polling.

Start with the cheap option plus a manual refresh button on the tree title; add the notification later only if the tree feels stale in practice.

## 5. Client: TreeView

`client/src/providers/toolCacheTreeProvider.ts` — `ToolCacheTreeProvider implements TreeDataProvider<CachedToolItem>`. Pattern matches `workflowToolsTreeProvider.ts` almost verbatim.

**Tree structure.** Two levels:

```
Tool Cache  [stats: 42 tools · 3.1 MB]
├── ▸ toolshed.g2.bx.psu.edu (38)
│   ├── ✓ bwa-mem 0.7.17.2     [refetch] [delete] [open in toolshed]
│   ├── ✓ samtools_view 1.15.1 [refetch] [delete] [open in toolshed]
│   ├── ⚠ legacy_tool 1.0      [refetch] [delete]            ← decodable=false
│   └── …
├── ▸ orphan (3)
│   └── ⚠ unknown_id unknown   [refetch] [delete]
└── ▸ local (1)
    └── ✓ my_local_tool 0.1    [delete]
```

- **Top-level groups:** by `source`. Stable order (`api` first, `orphan` last). Group label shows count.
- **Leaves:** one per cached entry. Label = `<toolId> <version>`. Icon = `check` for decodable, `warning` for `decodable: false`.
- **Tooltip** (`MarkdownString`): `cacheKey`, `cachedAt`, size (if known), source URL, decode status.
- **Inline actions** (`view/item/context`, group `inline@1..3`):
  - `galaxy-workflows.refetchCachedTool` (icon `refresh`)
  - `galaxy-workflows.deleteCachedTool` (icon `trash`)
  - `galaxy-workflows.openToolInToolShed` (icon `link-external`) — only when `toolshedUrl` is set; reuses existing command
- **Default click action** on a leaf → `openCachedToolRaw` (opens the virtual document, see §6).
- **Title actions** (`view/title`):
  - `galaxy-workflows.refreshToolCacheView` (icon `refresh`)
  - `galaxy-workflows.populateToolCache` (icon `cloud-download`) — already exists; piggyback for "fetch everything referenced by open docs"
  - Optional: `galaxy-workflows.clearToolCache` (icon `clear-all`) with a confirm modal — defer until the tree has had some real-world use.

**View contribution** (`package.json`):

```jsonc
{
  "id": "galaxyWorkflows.toolCacheView",
  "name": "Tool Cache",
  "icon": "$(database)",
  "when": "galaxyWorkflows.toolCacheView.enabled"  // optional gate
}
```

Place it in the same Explorer container as `toolsView`. No `when` clause on file extension — the cache exists independently of any open document.

**Refresh triggers.** Conservative set:

- Manual: title-bar refresh.
- After any of: `populateToolCache`, `populateToolCacheForTool`, `deleteCachedTool`.
- On `TOOL_RESOLUTION_FAILED` (a failed fetch may have left the failure flag set).
- Optional later: `cacheChanged` notification.

The provider keeps the last response cached and only re-queries on these triggers — no polling. Routing question: which server owns the cache? Both servers have their own `ToolRegistryService`. They share storage on disk in Node mode but have separate `IndexedDBCacheStorage` instances in browser mode. Pick the **native** server as the canonical source for the tree (matches the existing `ToolCacheStatusBar`, which polls native), and document this. Format2-only sessions still work because the format2 server populates the same shared filesystem cache; in browser builds the trees would diverge per server, which is acceptable for an inspector — note in a comment, revisit only if it becomes a problem.

## 6. Client: virtual document

`client/src/providers/toolCacheDocumentProvider.ts` — `TextDocumentContentProvider` for the `galaxy-tool-cache` URI scheme. Pattern matches `cleanWorkflowDocumentProvider.ts`.

**URI shape:** `galaxy-tool-cache:/<cacheKey>.json`

The `.json` suffix is purely so VS Code picks the JSON language mode. The path component carries the cache key (URL-encoded if needed; the upstream `cacheKey()` returns hex-style strings, so encoding is normally a no-op).

**Content resolution:**

```ts
async provideTextDocumentContent(uri: Uri): Promise<string> {
  const cacheKey = decodeURIComponent(uri.path.replace(/^\//, "").replace(/\.json$/, ""));
  const { contents, error } = await client.sendRequest(GET_CACHED_TOOL_RAW, { cacheKey });
  if (error) throw new Error(error);
  if (contents === null) return "// Cache entry not found.\n";
  return contents;  // already JSON.stringify'd by the server
}
```

**Open command** (`openCachedToolRaw`):

```ts
const uri = Uri.parse(`galaxy-tool-cache:/${encodeURIComponent(cacheKey)}.json`);
await window.showTextDocument(uri, { preview: true });
```

Read-only; the provider never emits `onDidChange` for an existing URI (delete-and-reopen if a refetch happens — the tree refresh handles the user flow). The "Compare with…" gesture works automatically because both sides are just text documents.

## 7. Commands and wiring

| Command ID | Where invoked | Implementation |
|---|---|---|
| `galaxy-workflows.refreshToolCacheView` | Tree title | Calls `provider.refresh()` |
| `galaxy-workflows.openCachedToolRaw` | Default click on leaf | Builds `galaxy-tool-cache:` URI, `window.showTextDocument` |
| `galaxy-workflows.deleteCachedTool` | Inline / context | Confirm modal → `DELETE_CACHED_TOOL` → tree refresh |
| `galaxy-workflows.refetchCachedTool` | Inline | Reuses `populateToolCacheForTool({ toolId, toolVersion })` then refresh |
| `galaxy-workflows.clearToolCache` (optional) | Tree title | Confirm modal → `CLEAR_TOOL_CACHE` (only if added) |

All new commands extend `CustomCommand` for consistency with the pattern landed in `e5029ea`.

## 8. Tests

Mirror the existing test pattern:

- **Unit (server-common):** `toolCacheServiceListAndDelete.test.ts` — populate a fixture cache, assert `LIST_CACHED_TOOLS` shape (groups, decodable flag for hand-broken entries, sizes when storage exposes `stat`), `GET_CACHED_TOOL_RAW` round-trips raw JSON unchanged, `DELETE_CACHED_TOOL` removes the entry and the index entry.
- **Unit (client):** `toolCacheTreeProvider.test.ts` — feed canned responses, assert tree shape, icon choice for decodable vs. orphan, inline action wiring.
- **E2E:** `toolCacheView.e2e.ts` — open a workflow, run `populateToolCache`, assert the tree populates, click a leaf and verify a `galaxy-tool-cache:` editor opens with non-empty JSON, run delete and assert the entry is gone. Pattern matches `toolsView.e2e.ts`.

Red-to-green ordering: server tests first against the upstream API, then client unit, then E2E.

## 9. Rollout order

1. Land upstream additions from `CACHE_ABSTRACTIONS_PLAN.md`; bump `@galaxy-tool-util/core` floor here.
2. Server: extend `ToolRegistryService` + `ToolCacheService` with the new requests. Tests.
3. Shared: add request IDs and payload types in `shared/src/requestsDefinitions.ts`.
4. Client: virtual document provider + `openCachedToolRaw` command. (Standalone — testable without the tree.)
5. Client: tree provider + view contribution + commands. Tests.
6. E2E.
7. Documentation pass on `VS_CODE_ARCHITECTURE.md` (new §7.5 "Tool Cache Inspector", §14 request table additions).

## 10. Open questions

- Native vs. format2 server as cache source — accept native-as-canonical, or query both and merge? Default: native-only, document the browser-mode caveat.
- Show "Clear Cache" title action from day one or hold? Default: hold; add once delete-one is exercised.
- Surface decode failures as diagnostics on `tool_id` (parallel to the existing not-cached / resolution-failed states) or only in the inspector? Default: inspector only for now — decode failures are rare and a UI gesture is the right escalation path.
- `cacheChanged` server→client notification now or later? Default: later, only if the tree feels stale in practice.
