# VSCode Extension Phase 2 (Try 2): Tool Registry — ESM-First Plan

**Supersedes:** `VS_CODE_INTEGRATION_PHASE_2_PLAN.md`  
**Depends on:** Rebase `wf_tool_state` onto `3400beb` (ESM migration, already in `branch/esm` worktree)

---

## Why Try 2

Try 1 duplicated ~150 lines of logic (tool ID parsing, cache key hashing, filesystem read/write) and invented plain-TypeScript mirror types (`ParsedToolJson`, `ToolParameterJson`) that already exist properly upstream as Effect schemas/interfaces. The reason was ESM: the upstream packages are pure ESM and Jest ran in CJS.

After `3400beb` the build is tsup + ESM; Jest gets `ts-jest` transpiling to CJS only at test time. **Direct top-level imports of `@galaxy-tool-util/*` work everywhere — no lazy `require()`, no `execSync` subprocess hacks.** Try 2 deletes the duplicates and makes the extension a thin wrapper.

---

## What Upstream Already Provides (Nothing to Build)

| Upstream symbol | Package | What it does |
|---|---|---|
| `ToolInfoService` | `@galaxy-tool-util/core` | `getToolInfo(toolId, toolVersion?)` → `ParsedTool \| null` — checks memory cache, then filesystem, then fetches from ToolShed/Galaxy, auto-saves |
| `ToolCache` | `@galaxy-tool-util/core` | Two-layer cache (memory + fs). `hasCached()`, `listCached()`, `loadCached()`, `saveTool()` |
| `DEFAULT_CACHE_DIR`, `DEFAULT_TOOLSHED_URL` | `@galaxy-tool-util/core` | Canonical defaults, shared with CLI |
| `ParsedTool` | `@galaxy-tool-util/core` | Effect Schema struct for tool metadata; `ParsedTool.inputs` is the raw parameter tree |
| `ToolParameterModel[]` | `@galaxy-tool-util/schema` | Plain TS interface — trusted cast from `ParsedTool.inputs as ToolParameterModel[]` |
| `createFieldModel(bundle, stateRep)` | `@galaxy-tool-util/schema` | `ParsedTool.inputs` → Effect Schema for tool_state at a given state representation |
| `validateNativeStepState(inputs, toolState, connections)` | `@galaxy-tool-util/schema` | Validates native `.ga` tool_state, throws `ConversionValidationFailure` on mismatch |
| `validateFormat2StepState(inputs, format2State)` | `@galaxy-tool-util/schema` | Validates format2 tool_state |
| `fetchFromToolShed`, `fetchFromGalaxy` | `@galaxy-tool-util/core` | Direct HTTP fetchers (already wrapped by `ToolInfoService`) |

---

## Proposed Upstream Additions (in `@galaxy-tool-util/schema`)

The extension needs something it can call with a `tool_id` string and get structured diagnostics back — without knowing about Effect, parameter models, or state representations. That bridge belongs upstream where it can be tested properly.

### New: `ToolStateValidator` class

**File:** `packages/schema/src/tool-state-validator.ts`

```typescript
import type { ToolInfoService } from "@galaxy-tool-util/core";
import type { ToolParameterModel } from "./schema/bundle-types.js";
import { validateNativeStepState, validateFormat2StepState, ConversionValidationFailure } from "./workflow/stateful-validate.js";

export interface ToolStateDiagnostic {
  /** Dot-separated parameter path, or "" for top-level issues. */
  path: string;
  message: string;
  severity: "error" | "warning";
}

export class ToolStateValidator {
  constructor(private readonly toolInfo: ToolInfoService) {}

  async validateNativeStep(
    toolId: string,
    toolVersion: string | null,
    toolState: Record<string, unknown>,
    inputConnections: Record<string, unknown> = {},
  ): Promise<ToolStateDiagnostic[]> {
    const parsed = await this.toolInfo.getToolInfo(toolId, toolVersion);
    if (!parsed) return [];
    const inputs = parsed.inputs as ToolParameterModel[];
    try {
      validateNativeStepState(inputs, toolState, inputConnections);
      return [];
    } catch (e) {
      if (e instanceof ConversionValidationFailure) {
        return e.issues.map((msg) => ({ path: "", message: msg, severity: "error" as const }));
      }
      throw e;
    }
  }

  async validateFormat2Step(
    toolId: string,
    toolVersion: string | null,
    format2State: Record<string, unknown>,
  ): Promise<ToolStateDiagnostic[]> {
    const parsed = await this.toolInfo.getToolInfo(toolId, toolVersion);
    if (!parsed) return [];
    const inputs = parsed.inputs as ToolParameterModel[];
    try {
      validateFormat2StepState(inputs, format2State);
      return [];
    } catch (e) {
      if (e instanceof ConversionValidationFailure) {
        return e.issues.map((msg) => ({ path: "", message: msg, severity: "error" as const }));
      }
      throw e;
    }
  }
}
```

Export from `packages/schema/src/index.ts`:
```typescript
export { ToolStateValidator, type ToolStateDiagnostic } from "./tool-state-validator.js";
```

**Why upstream, not in the extension:**
- Tests live in `packages/schema/tests/` — real `ToolInfoService` with a temp cache dir, no VSCode/LSP in sight
- Phase 3 in the extension becomes: instantiate `ToolStateValidator`, call it, map `ToolStateDiagnostic[]` to LSP `Diagnostic[]`
- The extension never has to know about Effect, parameter models, or state representations

**Tests to write (red-to-green in monorepo):**
1. `validateNativeStep` with a pre-cached tool — returns empty for valid state
2. `validateNativeStep` with invalid state — returns diagnostics with messages
3. `validateNativeStep` with unknown tool — returns empty (not an error)
4. `validateFormat2Step` analogous cases
5. Both methods handle `createFieldModel` returning `undefined` (unsupported param types) — returns empty

---

## VSCode Extension Changes

### Step 1: Rebase onto `3400beb`

Cherry-pick or rebase the `wf_tool_state` commits onto the `esm` branch. After rebase:
- Webpack configs are gone, replaced by tsup
- All tsconfigs use `"module": "ESNext", "moduleResolution": "bundler"`
- Jest configs use ts-jest with `module: "commonjs"` override
- Direct top-level `import` of `@galaxy-tool-util/schema` just works

Delete the workaround code added in Try 1:
- `server/packages/server-common/src/providers/toolRegistry.ts` — replaced below
- The `ParsedToolJson`, `ToolParameterJson`, `ToolOutputJson`, `CachedToolEntry`, `CachedToolInfo`, `PopulateCacheResult` types from `languageTypes.ts` — use upstream types
- The integration test `nativeSchemaLoader.test.ts` with `execSync` subprocess — replace with direct import test

### Step 2: Settings

**File:** `package.json`

Add to `contributes.configuration.properties` (same as Try 1):
```json
"galaxyWorkflows.toolCache.directory": {
  "type": "string",
  "default": "~/.galaxy/tool_info_cache",
  "scope": "machine",
  "markdownDescription": "Cached tool definitions directory (shared with `galaxy-tool-cache` CLI)."
},
"galaxyWorkflows.toolShed.url": {
  "type": "string",
  "default": "https://toolshed.g2.bx.psu.edu",
  "scope": "machine",
  "markdownDescription": "ToolShed URL for fetching tool definitions on cache miss."
}
```

**File:** `server/packages/server-common/src/configService.ts`

Extend `ExtensionSettings` with `toolCache: { directory: string }` and `toolShed: { url: string }`. Defaults mirror `DEFAULT_CACHE_DIR` / `DEFAULT_TOOLSHED_URL` from upstream.

### Step 3: `ToolRegistryService` — Thin Wrapper

**File:** `server/packages/server-common/src/languageTypes.ts`

Interface (import `ParsedTool` type from `@galaxy-tool-util/core`):

```typescript
import type { ParsedTool } from "@galaxy-tool-util/core";

export interface ToolRegistryService {
  getToolInfo(toolId: string, toolVersion?: string): Promise<ParsedTool | null>;
  hasCached(toolId: string, toolVersion?: string): boolean;
  listCached(): Array<{ cache_key: string; tool_id: string; tool_version: string; source: string; cached_at: string }>;
  populateCache(tools: Array<{ toolId: string; toolVersion?: string }>): Promise<PopulateCacheResult>;
  configure(settings: { cacheDir: string; toolShedUrl: string }): void;
  readonly cacheSize: number;
}
```

(`PopulateCacheResult` stays in `shared/requestsDefinitions.ts` — it's a protocol type, not a domain type.)

**File:** `server/packages/server-common/src/providers/toolRegistry.ts`

```typescript
import * as os from "node:os";
import { injectable } from "inversify";
import { ToolInfoService, DEFAULT_CACHE_DIR, DEFAULT_TOOLSHED_URL } from "@galaxy-tool-util/core";
import type { ParsedTool } from "@galaxy-tool-util/core";
import type { PopulateCacheResult, ToolRegistryService } from "../languageTypes";

const POPULATE_CONCURRENCY = 5;

@injectable()
export class ToolRegistryServiceImpl implements ToolRegistryService {
  private toolInfo: ToolInfoService;

  constructor() {
    this.toolInfo = new ToolInfoService();
  }

  configure(settings: { cacheDir: string; toolShedUrl: string }): void {
    const cacheDir = settings.cacheDir.replace(/^~/, os.homedir());
    this.toolInfo = new ToolInfoService({
      cacheDir,
      defaultToolshedUrl: settings.toolShedUrl,
    });
  }

  async getToolInfo(toolId: string, toolVersion?: string): Promise<ParsedTool | null> {
    try {
      return await this.toolInfo.getToolInfo(toolId, toolVersion ?? null);
    } catch {
      return null; // version unknown for bare tool IDs — not an error at this layer
    }
  }

  hasCached(toolId: string, toolVersion?: string): boolean {
    return this.toolInfo.cache.hasCached(toolId, toolVersion ?? null);
  }

  listCached() {
    return this.toolInfo.cache.listCached();
  }

  get cacheSize(): number {
    return this.toolInfo.cache.listCached().length;
  }

  async populateCache(tools: Array<{ toolId: string; toolVersion?: string }>): Promise<PopulateCacheResult> {
    const result: PopulateCacheResult = { fetched: 0, alreadyCached: 0, failed: [] };
    for (let i = 0; i < tools.length; i += POPULATE_CONCURRENCY) {
      const batch = tools.slice(i, i + POPULATE_CONCURRENCY);
      await Promise.all(
        batch.map(async ({ toolId, toolVersion }) => {
          if (this.hasCached(toolId, toolVersion)) {
            result.alreadyCached++;
            return;
          }
          const info = await this.getToolInfo(toolId, toolVersion);
          if (info) {
            result.fetched++;
          } else {
            result.failed.push({ toolId, error: "not found" });
          }
        })
      );
    }
    return result;
  }
}
```

~60 lines vs ~190 in Try 1. All the hard logic (cache, fetch, retry) lives upstream.

**Tests:** The core cache/fetch logic is tested in `@galaxy-tool-util/core`. Extension tests for `ToolRegistryServiceImpl` only need to verify:
1. `configure()` propagates `cacheDir` and `toolShedUrl` to `ToolInfoService`
2. `populateCache()` concurrency and result counting
3. `~` expansion in `cacheDir`

These use a temp dir + a stub `ToolInfoService` (or a real one with no sources configured).

### Step 4: DI Wiring (identical to Try 1)

- `inversify.config.ts` — bind `ToolRegistryService → ToolRegistryServiceImpl`
- `server.ts` — inject, expose on `GalaxyWorkflowLanguageServer` interface, call `configure()` in `initialize()` and `onConfigurationChanged()`

### Step 5: LSP Handlers (identical to Try 1)

- `shared/src/requestsDefinitions.ts` — add `GET_WORKFLOW_TOOL_IDS`, `POPULATE_TOOL_CACHE`, `GET_TOOL_CACHE_STATUS` to `LSRequestIdentifiers`, plus param/result types
- `server/packages/server-common/src/services/toolCacheService.ts` — `ToolCacheService extends ServiceBase`, handles the three requests
- Register in `server.ts → registerServices()`

### Step 6: Client Command + Status Bar (identical to Try 1)

- `client/src/commands/populateToolCache.ts` — `PopulateToolCacheCommand`
- `client/src/statusBar.ts` — `ToolCacheStatusBar` (polls `GET_TOOL_CACHE_STATUS` every 30s)
- Register in `commands/setup.ts` and `common/index.ts`
- Declare command in root `package.json`

---

## File Inventory

### `@galaxy-tool-util/schema` (monorepo)
| Action | File | What |
|---|---|---|
| **New** | `packages/schema/src/tool-state-validator.ts` | `ToolStateValidator` + `ToolStateDiagnostic` |
| Edit | `packages/schema/src/index.ts` | Export new class + type |
| **New** | `packages/schema/tests/tool-state-validator.test.ts` | 5 unit tests |

### `galaxy-workflows-vscode` (extension)
| Action | File | What |
|---|---|---|
| Rebase | all | Onto `3400beb` |
| Delete | `server/packages/server-common/src/providers/toolRegistry.ts` (Try 1) | Replaced |
| Edit | `server/packages/server-common/src/languageTypes.ts` | Interface only, import `ParsedTool` from upstream |
| **New** | `server/packages/server-common/src/providers/toolRegistry.ts` | Thin wrapper |
| Edit | `server/packages/server-common/src/inversify.config.ts` | Bind service |
| Edit | `server/packages/server-common/src/server.ts` | Inject + configure |
| Edit | `server/packages/server-common/src/configService.ts` | Extend settings |
| Edit | `shared/src/requestsDefinitions.ts` | Add 3 identifiers + types |
| **New** | `server/packages/server-common/src/services/toolCacheService.ts` | LSP handlers |
| **New** | `client/src/commands/populateToolCache.ts` | Populate command |
| **New** | `client/src/statusBar.ts` | Cache status bar |
| Edit | `client/src/commands/setup.ts` | Register command |
| Edit | `client/src/common/index.ts` | Init status bar |
| Edit | `package.json` | Settings + command declaration |

---

## Red-to-Green Order

**In monorepo first:**
1. Write `ToolStateValidator` tests (all red)
2. Implement `ToolStateValidator` → tests green
3. Export from `packages/schema/src/index.ts`

**Then in extension:**
4. Rebase onto `3400beb`, resolve conflicts
5. Write test for `ToolRegistryServiceImpl` configure/populate (red)
6. Implement thin `toolRegistry.ts` → tests green
7. Wire DI, settings, server
8. Add LSP handlers + request identifiers
9. Add command + status bar
10. Run full test suite

---

## What Changes vs Try 1

| Concern | Try 1 | Try 2 |
|---|---|---|
| ESM imports | Lazy `require()` inside functions | Direct top-level `import` |
| Integration tests | `execSync` subprocess to run ESM node | Direct import, ts-jest handles transpile |
| `ParsedToolJson` etc. | Duplicate types in extension | Deleted — use `ParsedTool` from upstream |
| `parseToolshedToolId` | Copied 30 lines from monorepo | Deleted — upstream handles it inside `ToolInfoService` |
| `computeCacheKey` | Copied 3 lines from monorepo | Deleted — upstream handles it |
| `ToolRegistryServiceImpl` | 190 lines, owns all cache logic | ~60 lines, delegates to `ToolInfoService` |
| Validation (Phase 3) | Not designed yet | `ToolStateValidator` upstream, ready to call from extension |
| Test location for cache logic | Extension integration tests | Monorepo unit tests |

---

## Unresolved Questions

1. **`@galaxy-tool-util` package version:** The extension's `package.json` pins `@galaxy-tool-util/schema` at `^0.2.0`. Is `ToolStateValidator` landing in a new version? Need to bump version and publish (or use `workspace:*` during dev).
2. **Rebase conflicts:** The `wf_tool_state` branch has Phase 1 ESM workarounds that conflict with `3400beb`'s tsup migration. How complex are the conflicts? Is it easier to cherry-pick Phase 1 + Phase 2 (Try 2) clean onto the ESM branch instead?
3. **`ToolInfoService` re-creation on settings change:** Currently `configure()` creates a new `ToolInfoService`, which throws away the memory cache. Fine for settings changes but worth noting — memory cache does not survive a settings update.
4. **`ToolStateDiagnostic` path field:** `validateNativeStepState` throws with a flat `issues: string[]` array; no per-field path. Is `path: ""` acceptable for Phase 3, or should we parse the issue strings to extract paths from `ParseResult.ArrayFormatter`?
5. **Web extension support:** `ToolInfoService` uses `node:fs` — the web extension build can't use it. Plan for that (Phase 7) or explicitly exclude the tool cache from the web build?
