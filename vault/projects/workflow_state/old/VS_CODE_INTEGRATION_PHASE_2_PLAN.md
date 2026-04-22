# VSCode Extension Phase 2: Tool Registry Service — Detailed Plan

**Parent plan:** `VSCODE_INTEGRATION_PLAN.md` Phase 2  
**Extension repo:** `/Users/jxc755/projects/repositories/galaxy-workflows-vscode`  
**Fork:** `jmchilton/galaxy-workflows-vscode`

---

## Goal

Extension resolves tool definitions from the local filesystem cache (`~/.galaxy/tool_info_cache`) and fetches on-demand from ToolShed 2.0 TRS API. No proxy server required. Provides a "Populate Tool Cache" command and a status bar indicator.

This phase is infrastructure — it doesn't change completions or validation yet. Phases 3-4 consume this service.

---

## Existing Architecture (Relevant Details)

**DI container:** Inversify. Services registered via symbols in `TYPES` object at:
- `server/packages/server-common/src/languageTypes.ts` (lines ~301-312)

**Service registration:** `server/packages/server-common/src/inversify.config.ts`
- Singleton bindings: `container.bind<T>(TYPES.T).to(TImpl).inSingletonScope()`
- Format2 server inherits base container and adds its own bindings

**Settings:** `ConfigService` reads from `"galaxyWorkflows"` namespace via LSP `workspace.getConfiguration()`. Per-document caching. Settings declared in root `package.json` under `contributes.configuration`.

**Current settings shape:**
```typescript
interface ExtensionSettings {
  cleaning: { cleanableProperties: string[] };
  validation: { profile: "basic" | "iwc" };
}
```

**Command pattern:** `CustomCommand` abstract class in `client/src/commands/`. Each command has an `identifier` string and `execute()` method. Registered in `client/src/commands/setup.ts`. Declared in `package.json` `contributes.commands`.

**Custom LSP requests:** Defined in `shared/src/requestsDefinitions.ts`. Client sends via `client.sendRequest()`, server handles via `connection.onRequest()`.

**AST access to tool_id:** Steps are AST nodes with properties. Existing code extracts `tool_id` via:
```typescript
const tool_id = step.properties.find((p) => p.keyNode.value === "tool_id");
const value = tool_id?.valueNode?.value?.toString();
```
(See `server/packages/server-common/src/providers/validation/rules/TestToolShedValidationRule.ts`)

---

## Cache Format (from galaxy-tool-util monorepo)

The `galaxy-tool-cache` CLI writes to `~/.galaxy/tool_info_cache/`:
- `index.json` — `{ entries: { [cacheKey]: CacheIndexEntry } }`
- `{cacheKey}.json` — full `ParsedTool` JSON (id, version, name, description, inputs, outputs, etc.)

`CacheIndexEntry`:
```typescript
{ tool_id: string, tool_version: string, source: string, source_url: string, cached_at: string }
```

`cacheKey` format: SHA-256-based hash of `(toolshedUrl, trsToolId, version)`.

`ParsedTool.inputs` is the parameter tree used to generate per-tool JSON Schemas via `createFieldModel()` + `JSONSchema.make()`.

---

## Steps

### Step 1: Add Settings

**File:** `package.json` (root)

Add to `contributes.configuration.properties`:

```json
"galaxyWorkflows.toolCache.directory": {
  "type": "string",
  "default": "~/.galaxy/tool_info_cache",
  "description": "Directory containing cached tool definitions (shared with galaxy-tool-cache CLI)."
},
"galaxyWorkflows.toolShed.url": {
  "type": "string",
  "default": "https://toolshed.g2.bx.psu.edu",
  "description": "ToolShed URL for fetching tool definitions on cache miss."
}
```

**File:** `server/packages/server-common/src/configService.ts`

Extend `ExtensionSettings` interface:

```typescript
interface ExtensionSettings {
  cleaning: CleaningSettings;
  validation: ValidationSettings;
  toolCache: { directory: string };
  toolShed: { url: string };
}
```

Update `defaultSettings`:

```typescript
const defaultSettings: ExtensionSettings = {
  cleaning: { cleanableProperties: ["position", "uuid", "errors", "version"] },
  validation: { profile: "basic" },
  toolCache: { directory: "~/.galaxy/tool_info_cache" },
  toolShed: { url: "https://toolshed.g2.bx.psu.edu" },
};
```

**Test:** Verify settings are read correctly by ConfigService (unit test with mock connection).

---

### Step 2: Define ToolRegistryService Interface + TYPES Symbol

**File:** `server/packages/server-common/src/languageTypes.ts`

Add symbol:
```typescript
// In TYPES object
ToolRegistryService: Symbol.for("ToolRegistryService"),
```

Add interface:
```typescript
/** Metadata about a cached tool's parameter tree. */
export interface CachedToolInfo {
  toolId: string;
  toolVersion: string;
  /** Raw ParsedTool JSON — inputs array is the parameter tree. */
  parsedTool: ParsedToolJson;
  source: "cache" | "fetched";
}

/** Lightweight representation of ParsedTool — no Effect dependency. */
export interface ParsedToolJson {
  id: string;
  version: string;
  name: string;
  description: string | null;
  inputs: ToolParameterJson[];
  outputs: ToolOutputJson[];
  [key: string]: unknown;
}

export interface ToolParameterJson {
  name: string;
  argument: string | null;
  type: string;
  label: string;
  help: string | null;
  optional: boolean;
  value: unknown;
  [key: string]: unknown;
}

export interface ToolOutputJson {
  name: string;
  [key: string]: unknown;
}

export interface ToolRegistryService {
  /** Resolve tool info by ID + version. Returns null if not found anywhere. */
  getToolInfo(toolId: string, toolVersion?: string): Promise<CachedToolInfo | null>;

  /** Check if tool is available (cache or fetchable). Fast — checks cache only. */
  hasCached(toolId: string, toolVersion?: string): boolean;

  /** List all tools in the local cache. */
  listCached(): CachedToolEntry[];

  /** Pre-fetch and cache all tools referenced in a set of tool_id/version pairs. */
  populateCache(tools: Array<{ toolId: string; toolVersion?: string }>): Promise<PopulateCacheResult>;

  /** Number of tools in local cache. */
  readonly cacheSize: number;
}

export interface CachedToolEntry {
  cacheKey: string;
  toolId: string;
  toolVersion: string;
  source: string;
  cachedAt: string;
}

export interface PopulateCacheResult {
  fetched: number;
  alreadyCached: number;
  failed: Array<{ toolId: string; error: string }>;
}
```

**Note:** These types are deliberately plain JSON — no Effect/Schema dependency in the extension. The extension reads cached `ParsedTool` JSON files directly without the Effect decode step. If the JSON is malformed it just returns null.

---

### Step 3: Implement ToolRegistryServiceImpl

**New file:** `server/packages/server-common/src/providers/toolRegistry.ts`

```typescript
@injectable()
export class ToolRegistryServiceImpl implements ToolRegistryService {
  private memoryCache = new Map<string, CachedToolInfo>();
  private cacheDir: string;
  private toolShedUrl: string;
  private indexData: Record<string, CachedToolEntry> | null = null;

  constructor() {
    // Defaults — overridden by configure() after settings load
    this.cacheDir = path.join(os.homedir(), ".galaxy", "tool_info_cache");
    this.toolShedUrl = "https://toolshed.g2.bx.psu.edu";
  }

  /** Called after ConfigService loads settings. */
  configure(settings: { cacheDir: string; toolShedUrl: string }): void;

  async getToolInfo(toolId: string, toolVersion?: string): Promise<CachedToolInfo | null>;
  // 1. Check memoryCache
  // 2. Check filesystem (read {cacheKey}.json, parse as JSON, wrap in CachedToolInfo)
  // 3. On miss: fetch from ToolShed TRS API
  // 4. On successful fetch: write to filesystem cache + memory cache
  // 5. Return null on all failures (log warning)

  hasCached(toolId: string, toolVersion?: string): boolean;
  // Check memoryCache, then check index.json entries

  listCached(): CachedToolEntry[];
  // Read index.json, return entries

  async populateCache(tools): Promise<PopulateCacheResult>;
  // For each tool: getToolInfo() with concurrency limit (5 parallel fetches)
  // Track fetched/cached/failed counts

  // --- Private helpers ---

  private resolveCoordinates(toolId: string, toolVersion?: string): { toolshedUrl, trsToolId, version, cacheKey };
  // Mirrors ToolCache.resolveToolCoordinates() logic from monorepo
  // Parses toolshed URL from tool_id string (e.g. "toolshed.g2.bx.psu.edu/repos/iuc/bedtools/...")
  // Falls back to configured toolShedUrl for bare tool IDs

  private async readFromFilesystem(cacheKey: string): Promise<ParsedToolJson | null>;
  // Read {cacheDir}/{cacheKey}.json, JSON.parse, return or null on error

  private async fetchFromToolShed(trsToolId: string, version: string, toolshedUrl: string): Promise<ParsedToolJson>;
  // HTTP GET {toolshedUrl}/api/tools/{trsToolId}/versions/{version}
  // 30s timeout, Accept: application/json
  // Parse response as JSON, return

  private async writeToCache(cacheKey: string, tool: ParsedToolJson, meta: CachedToolEntry): Promise<void>;
  // Write {cacheDir}/{cacheKey}.json
  // Update index.json (read-modify-write)
  // mkdir -p if needed

  private loadIndex(): Record<string, CachedToolEntry>;
  // Read {cacheDir}/index.json synchronously, cache in this.indexData

  private computeCacheKey(toolshedUrl: string, trsToolId: string, version: string): string;
  // SHA-256 hash matching monorepo's cacheKey() function
}
```

**Key implementation details:**

- **Tool ID parsing:** A tool_id like `toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_intersectbed/2.31.1` encodes: toolshed URL (`toolshed.g2.bx.psu.edu`), TRS ID (`iuc~bedtools~bedtools_intersectbed` after repos→tilde conversion), version (`2.31.1`). The parsing regex is straightforward and already implemented in the monorepo at `packages/core/src/cache/tool-id.ts`. Replicate the logic (~30 lines).

- **Cache key computation:** Must match `packages/core/src/cache/cache-key.ts` exactly so the extension reads cache files written by `galaxy-tool-cache`. Check the monorepo's implementation — it's a simple hash of `{toolshedUrl}/{trsToolId}/{version}`.

- **HTTP fetch:** Use `globalThis.fetch` (available in Node 18+, which VSCode ships). For the web extension build, `fetch` is natively available. No new dependencies needed.

- **Concurrency limit in populateCache:** Simple semaphore pattern — `Promise.all` with a pool of 5.

- **~/ expansion:** The `cacheDir` setting may contain `~` — expand to `os.homedir()` at configure time.

**Test strategy:**
1. Unit test `resolveCoordinates()` with various tool_id formats
2. Unit test filesystem read/write with temp directory
3. Unit test `getToolInfo()` with mock fetch (cache miss → fetch → cache hit)
4. Integration test: write a cache file manually, verify `getToolInfo()` reads it
5. Verify cache key compatibility: run `galaxy-tool-cache add` for a tool, then verify the extension reads it

---

### Step 4: Register in Inversify + Wire to Server

**File:** `server/packages/server-common/src/inversify.config.ts`

```typescript
container
  .bind<ToolRegistryService>(TYPES.ToolRegistryService)
  .to(ToolRegistryServiceImpl)
  .inSingletonScope();
```

**File:** `server/packages/server-common/src/server.ts`

In `GalaxyWorkflowLanguageServerImpl`:

```typescript
@inject(TYPES.ToolRegistryService)
public readonly toolRegistryService: ToolRegistryService;
```

In the `initialize()` method, after config is loaded:

```typescript
// Configure tool registry with loaded settings
const settings = await this.configService.getDocumentSettings("");
const toolRegistry = this.toolRegistryService as ToolRegistryServiceImpl;
toolRegistry.configure({
  cacheDir: settings.toolCache.directory,
  toolShedUrl: settings.toolShed.url,
});
```

In `onConfigurationChanged()`, re-configure if settings changed.

**File:** `server/packages/server-common/src/server.ts` — also expose on the interface:

Add to `GalaxyWorkflowLanguageServer` interface:
```typescript
toolRegistryService: ToolRegistryService;
```

This makes it available to language services via `this.server.toolRegistryService` (set in `LanguageServiceBase.setServer()`).

---

### Step 5: "Populate Tool Cache" Command

**New file:** `client/src/commands/populateToolCache.ts`

```typescript
export class PopulateToolCacheCommand extends CustomCommand {
  static readonly identifier = "galaxy-workflows.populateToolCache";
  readonly identifier = PopulateToolCacheCommand.identifier;

  async execute(): Promise<void> {
    // 1. Collect tool_ids from all open workflow documents
    //    Send a new LSP request: GET_WORKFLOW_TOOL_IDS
    //    Server extracts tool_id + tool_version from all steps in all open workflows
    //
    // 2. Show progress notification:
    //    window.withProgress({ location: ProgressLocation.Notification, title: "Populating tool cache..." })
    //
    // 3. Send POPULATE_TOOL_CACHE request to server with the tool list
    //    Server calls toolRegistryService.populateCache()
    //
    // 4. Show result: "Fetched X tools, Y already cached, Z failed"
    //
    // 5. Update status bar
  }
}
```

**New LSP request identifiers** in `shared/src/requestsDefinitions.ts`:

```typescript
export const GET_WORKFLOW_TOOL_IDS = "galaxy-workflows/getWorkflowToolIds";
export const POPULATE_TOOL_CACHE = "galaxy-workflows/populateToolCache";
export const GET_TOOL_CACHE_STATUS = "galaxy-workflows/getToolCacheStatus";
```

**Server-side handlers** — new service in `server/packages/server-common/src/services/toolCacheService.ts`:

```typescript
@injectable()
export class ToolCacheService extends ServiceBase {
  activate(connection: Connection, server: GalaxyWorkflowLanguageServer): void {
    connection.onRequest(GET_WORKFLOW_TOOL_IDS, () => {
      return this.extractToolIds(server);
    });

    connection.onRequest(POPULATE_TOOL_CACHE, async (params: { tools: ToolRef[] }) => {
      return server.toolRegistryService.populateCache(params.tools);
    });

    connection.onRequest(GET_TOOL_CACHE_STATUS, () => {
      return { cacheSize: server.toolRegistryService.cacheSize };
    });
  }

  private extractToolIds(server: GalaxyWorkflowLanguageServer): ToolRef[] {
    // Walk all cached documents
    // For each workflow document, iterate steps
    // Extract tool_id + tool_version from step AST properties
    // Deduplicate
    const toolRefs: ToolRef[] = [];
    for (const doc of server.documentsCache.all()) {
      // Use the existing nodeManager to walk step nodes
      // step.properties.find(p => p.keyNode.value === "tool_id")
      // step.properties.find(p => p.keyNode.value === "tool_version")
    }
    return toolRefs;
  }
}
```

Register `ToolCacheService` in inversify alongside other services.

**File:** `package.json` — declare command:

```json
{
  "command": "galaxy-workflows.populateToolCache",
  "title": "Populate Tool Cache",
  "category": "Galaxy Workflows"
}
```

**File:** `client/src/commands/setup.ts` — register:

```typescript
new PopulateToolCacheCommand(context, gxFormat2LanguageClient).register();
```

---

### Step 6: Status Bar Indicator

**New file:** `client/src/statusBar.ts`

```typescript
export class ToolCacheStatusBar {
  private item: StatusBarItem;
  private client: LanguageClient;
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor(client: LanguageClient) {
    this.client = client;
    this.item = window.createStatusBarItem(StatusBarAlignment.Right, 100);
    this.item.command = "galaxy-workflows.populateToolCache";
    this.item.tooltip = "Galaxy Tool Cache — click to populate";
  }

  async refresh(): Promise<void> {
    try {
      const status = await this.client.sendRequest<{ cacheSize: number }>(
        GET_TOOL_CACHE_STATUS
      );
      this.item.text = `$(database) Tools: ${status.cacheSize}`;
      this.item.show();
    } catch {
      this.item.hide();
    }
  }

  startPolling(intervalMs = 30_000): void {
    this.refresh();
    this.refreshInterval = setInterval(() => this.refresh(), intervalMs);
  }

  dispose(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    this.item.dispose();
  }
}
```

Initialize in `client/src/common/index.ts` `initExtension()`:

```typescript
const statusBar = new ToolCacheStatusBar(gxFormat2LanguageClient);
statusBar.startPolling();
context.subscriptions.push(statusBar);
```

---

### Step 7: Workspace Auto-Discovery (Optional, can defer)

On extension activation, if workspace contains workflow files:

1. Extract tool_ids from all `.gxwf.yml` and `.ga` files in workspace
2. Check how many are cached vs not
3. If >50% uncached, show notification: "X tools not cached. Populate now?" with "Yes" / "Later" buttons
4. "Yes" triggers the populate command

This is a nice-to-have. Can be a separate small PR after the core service lands.

---

## File Summary

| Action | File | What |
|--------|------|------|
| Edit | `package.json` | Add settings + command declaration |
| Edit | `server/packages/server-common/src/languageTypes.ts` | Add TYPES symbol + interfaces |
| Edit | `server/packages/server-common/src/configService.ts` | Extend ExtensionSettings |
| **New** | `server/packages/server-common/src/providers/toolRegistry.ts` | ToolRegistryServiceImpl |
| Edit | `server/packages/server-common/src/inversify.config.ts` | Bind ToolRegistryService |
| Edit | `server/packages/server-common/src/server.ts` | Inject + expose on interface |
| Edit | `shared/src/requestsDefinitions.ts` | Add 3 request identifiers |
| **New** | `server/packages/server-common/src/services/toolCacheService.ts` | LSP request handlers |
| **New** | `client/src/commands/populateToolCache.ts` | Populate command |
| Edit | `client/src/commands/setup.ts` | Register command |
| **New** | `client/src/statusBar.ts` | Cache status indicator |
| Edit | `client/src/common/index.ts` | Initialize status bar |

**New files:** 4  
**Edited files:** 7

---

## Testing Plan

### Unit Tests

1. **Tool ID parsing** — various formats:
   - Full ToolShed ID: `toolshed.g2.bx.psu.edu/repos/iuc/bedtools/bedtools_intersectbed/2.31.1`
   - Bare tool ID: `cat1`
   - TRS-style ID: `iuc~bedtools~bedtools_intersectbed`
   - Missing version → returns null

2. **Cache key compatibility** — generate cache keys and verify they match files written by `galaxy-tool-cache add`:
   - Run `galaxy-tool-cache add toolshed.g2.bx.psu.edu/repos/devteam/fastqc/fastqc/0.74+galaxy0`
   - Verify the extension's `computeCacheKey()` produces the same filename

3. **Filesystem cache read** — write a known `{key}.json` + `index.json` to temp dir, verify `getToolInfo()` returns it

4. **Memory cache** — call `getToolInfo()` twice, verify second call doesn't hit filesystem

5. **Fetch fallback** — mock `fetch`, verify:
   - Cache miss triggers fetch
   - Successful fetch writes to filesystem + memory cache
   - Failed fetch returns null (doesn't throw)
   - Timeout (>30s) returns null

6. **populateCache** — mock fetch, pass 10 tools, verify concurrency ≤5, verify result counts

### Integration Tests

7. **Settings propagation** — configure `toolCache.directory` via mock client settings, verify ToolRegistryService uses it

8. **Populate command** — open a workflow fixture, run `PopulateToolCacheCommand`, verify tools appear in cache

9. **Cross-compatibility** — use `galaxy-tool-cache` CLI to populate cache for a workflow, then verify extension reads the same cache correctly (critical for shared-cache story)

### Red-to-Green Order

1. Write test for `resolveCoordinates()` → implement
2. Write test for `computeCacheKey()` → implement, verify against monorepo's output
3. Write test for filesystem read → implement `readFromFilesystem()`
4. Write test for `getToolInfo()` with pre-populated cache → implement cache-hit path
5. Write test for `getToolInfo()` with mock fetch → implement fetch + write-back
6. Write test for `populateCache()` → implement with concurrency
7. Write test for settings propagation → wire ConfigService
8. Write integration test for populate command → implement command + LSP handlers

---

## Deferred

- **Proxy/gxwf-web integration:** Phase 7. Not needed for desktop — the extension reads local cache and fetches directly from ToolShed.
- **Galaxy instance as source:** Would require API key settings, CORS handling. Future enhancement.
- **Workspace auto-discovery notification:** Nice UX, but not blocking. Small follow-up PR.
- **Web extension support:** `fetch` works in web context, but filesystem cache does not. Web path needs IndexedDB or server-backed storage (Phase 7 territory).

---

## Unresolved Questions

1. **Cache key function:** ~~Need to verify~~ **Verified.** It's `SHA-256('{toolshedUrl}/{trsToolId}/{toolVersion}')` as hex — 3 lines in `packages/core/src/cache/cache-key.ts`. Tool ID parsing is ~30 lines in `packages/core/src/cache/tool-id.ts`: splits on `/repos/`, extracts `owner~repo~tool` as TRS ID, prefixes `https://` if missing. Both trivial to replicate. Use `node:crypto` createHash (available in both Node and VSCode's electron).
2. **`tool_version` extraction from Format2:** In format2, the version may be embedded in `tool_id` (after the last `/`) rather than a separate `tool_version` field. Need to handle both patterns.
3. **Settings scope:** Should `toolCache.directory` be workspace-scoped or global? Probably global (one cache for all workspaces), but workspace override could be useful for isolated projects.
4. **Index.json locking:** If `galaxy-tool-cache` CLI and the extension both write to the cache simultaneously, index.json could get corrupted. Should we use file locking, or just tolerate rare races (the extension is mostly a reader)?
