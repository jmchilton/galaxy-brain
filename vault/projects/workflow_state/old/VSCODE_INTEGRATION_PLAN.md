# VSCode Integration Plan

**Target:** Upstream PRs to [galaxyproject/galaxy-workflows-vscode](https://github.com/galaxyproject/galaxy-workflows-vscode) via [jmchilton/galaxy-workflows-vscode](https://github.com/jmchilton/galaxy-workflows-vscode)  
**Fork checkout:** `/Users/jxc755/projects/repositories/galaxy-workflows-vscode`  
**Goal:** Bring tool-state-aware language services to the existing extension using this monorepo's infrastructure.

---

## Existing Extension Architecture (Summary)

- **Two LSP servers:** Format2 (YAML, gx-workflow-ls-format2) + Native (JSON, gx-workflow-ls-native)
- **Schema system:** Custom YAML Salad loader in Format2 server (~400 lines), stale v19.09 schemas
- **DI:** Inversify for service injection
- **Dual build:** Node + WebWorker (works on vscode.dev)
- **Cleaning:** Basic property stripping via `cleanableProperties` setting
- **No tool-state awareness:** `state:` typed as `Any`, zero completions inside it
- **No ToolShed integration:** Only a test-toolshed warning rule

---

## Phases

### Phase 1: JSON Schema Integration for Structural Validation

**Goal:** Replace stale YAML Salad schemas with JSON Schema for Format2 workflow structure, generated directly from `@galaxy-tool-util/schema`.

**Schema source:** `@galaxy-tool-util/schema` defines the Effect Schemas for gxformat2/native workflows. The extension adds it as an npm dependency and calls `JSONSchema.make()` at activation time to produce the structural JSON Schema in-process — no server, no static files, no syncing.

1. Add `@galaxy-tool-util/schema` as a dependency of the Format2 language server package
2. At server startup, generate structural JSON Schema:
   ```typescript
   import { GxFormat2WorkflowSchema } from "@galaxy-tool-util/schema";
   import * as JSONSchema from "effect/JSONSchema";
   const structuralSchema = JSONSchema.make(GxFormat2WorkflowSchema);
   ```
3. Add a `JsonSchemaNodeResolver` alongside existing `SchemaNodeResolver`:
   - Walks JSON Schema `$ref`/`$defs` instead of YAML Salad records
   - Implements same interface: `getNodeFromPath()`, `getCompletionItems()`, `getHoverInfo()`
4. Wire into Format2 language service via Inversify binding
5. Verify completion/hover/validation parity with old YAML Salad path
6. Keep YAML Salad loader as fallback initially; feature-flag the switch

**No server dependency.** The schema is generated in-process from the npm package. Schema updates arrive via `npm update @galaxy-tool-util/schema`. Web extension compatibility (Phase 7) may need a server fallback if the Effect dependency is too large for the web bundle — but that's a later concern.

**Test:** Run existing extension integration tests with JSON Schema path enabled. Compare completion results.

**What improves:** Comment types, creator types, `pick_value`, `when` field, `state`/`tool_state` field types — all now have real schemas instead of `Any?`.

### Phase 2: Tool Registry Service ✅ COMPLETE

**Goal:** Extension can resolve tool definitions from local cache + direct ToolShed fetch.

**Delivered** (branch `wf_tool_state`, commits `a917f85` → `eb261bc` → `e4a1472` → `445558e` → `c3bbe72`):

1. **VSCode settings added** (`package.json`):
   - `galaxyWorkflows.toolCache.directory` (default `~/.galaxy/tool_info_cache`)
   - `galaxyWorkflows.toolShed.url` (default `https://toolshed.g2.bx.psu.edu`)

2. **`ToolRegistryServiceImpl`** — thin ~60-line Inversify injectable wrapper around `@galaxy-tool-util/core`'s `ToolInfoService`. Delegates all cache/fetch logic upstream; extension owns only `configure()`, `hasCached()`, `listCached()`, `populateCache()`, and `cacheSize`. No duplicate types, no copied cache logic.

3. **LSP handlers** (`server/packages/server-common/src/services/toolCacheService.ts`):
   - `GET_WORKFLOW_TOOL_IDS`, `POPULATE_TOOL_CACHE`, `GET_TOOL_CACHE_STATUS` request identifiers in `shared/src/requestsDefinitions.ts`
   - Wired via Inversify + `server.ts`

4. **"Populate Tool Cache" command** (`client/src/commands/populateToolCache.ts`) — scans open workflow docs, pre-fetches referenced tools, shows progress notification.

5. **Status bar item** (`client/src/statusBar.ts`) — shows "Tools: X/Y cached" for current workspace.

6. **Test suite migrated to Vitest/ESM** — removed Jest/CJS workarounds (`module: "commonjs"` override, `transformIgnorePatterns`, `moduleNameMapper` for `@galaxy-tool-util/core`). Tests now import upstream ESM packages directly.

7. **`ToolStateValidator` added upstream** in `@galaxy-tool-util/schema` (`report_models` branch) — bridges `ToolInfoService` → `ToolStateDiagnostic[]` without exposing Effect internals. Ready for Phase 3 to call.

**Deferred from original plan:** Web extension support (Phase 7) — `ToolInfoService` uses `node:fs`, excluded from web build for now.

### Phase 3: Tool State Completions ✅ COMPLETE

**Delivered** (commits `bf3cd04` → `0a9f709`):

- **`toolStateTypes.ts`** — Shared types (`ToolParam` hierarchy: base, select, boolean, section, repeat, conditional) + type guards + AST helper `getStringPropertyFromStep`
- **`ToolStateCompletionService`** — detects `state`/`tool_state` in node path (after `steps/<name>`), navigates AST to get `tool_id`/`tool_version`, fetches cached params, generates:
  - Property name completions with `param_name: ` insertText and `gx_integer → integer` detail
  - Select option value completions (filtered by prefix)
  - Boolean `true`/`false` value completions
  - Navigates into sections, repeats, conditionals (all branches)
  - Filters hidden params and already-declared keys
- **`GxFormat2CompletionService`**: optional `ToolRegistryService`, async `doComplete()`, hooks state completions before schema resolution
- **`GxFormat2WorkflowLanguageServiceImpl`**: injects `ToolRegistryService` via Inversify
- **Not implemented:** default-value insertText; conditional branch filtering deferred to Phase 5

**Tests:** 17 integration tests (name completions, prefix filter, existing-key exclusion, select/boolean values, section/repeat/conditional navigation, tool_state key, uncached tool, insertText format, detail type field).

### Phase 4: Tool State Validation + Hover ✅ COMPLETE

**Delivered** (commit `4497b09`):

- **`ToolStateValidationService`** — for each step with `tool_id` + `state`/`tool_state`:
  - Tool not in cache → `Information` diagnostic on `tool_id` value ("run Populate Tool Cache")
  - Unknown parameter name → `Warning` with diagnostic on key node
  - Invalid select value → `Error` with diagnostic on value node + list of valid options
  - Recurses into sections, repeats, conditionals (all branches)
  - Only validates structured YAML map state (skips JSON-string `tool_state`)
  - Diagnostic source: `"Tool State"`
- **`GxFormat2HoverService`** — extended with optional `ToolRegistryService`; when hovering inside state block shows `**name** type`, label, help, select options list, or `true | false` hint
- **`GxFormat2WorkflowLanguageServiceImpl`**: `doValidation()` calls `ToolStateValidationService`; hover service receives `ToolRegistryService`

**Not implemented:** debounce (handled by LSP framework); numeric range validation; conditional branch-aware validation (Phase 5).

**Tests:** 14 integration tests (unknown param warning, select error, valid values, section recursion, multi-step, uncached info, hover name/type/help, hover select options, hover boolean).

### Phase 5: Conditional Branch Filtering + Connection Completions

**Goal:** Smart completions that understand conditional branches and workflow connections.

1. Conditional discriminator filtering (~50 lines):
   - When cursor is inside a conditional in `state:`, read the test parameter value from AST
   - Match against `const` values in JSON Schema `oneOf` variants
   - Return only the matching branch's properties for completions
   - Validation already works correctly via `oneOf` + `const`
2. Connection source completions:
   - When completing `source:` in `in:` blocks:
     - Parse workflow to build step graph (labels, outputs, types)
     - Suggest `step_label/output_name` from upstream steps
     - Filter by type compatibility if output type info available from tool schemas
   - Show type mismatch warnings as diagnostics for existing connections

### Phase 6: Enhanced Cleaning + Workspace Features

**Goal:** Tool-aware cleaning and workspace-level integration.

1. Upgrade cleaning commands:
   - Current: strips configurable property list (dumb)
   - New: use tool definitions to identify stale keys (schema-aware clean)
   - Preview diff before applying (existing `previewCleanWorkflow` command)
   - Add "Clean All Workflows" command for workspace
2. Workspace features:
   - Auto-discover workflows on activation, offer to populate tool cache
   - Watch for file changes — re-validate on save
   - Resolve `run:` subworkflow references for navigation (Ctrl+Click on `run: subworkflow.gxwf.yml`)
3. Conversion commands:
   - "Convert to Format2" / "Convert to Native" commands
   - Preview conversion result in diff editor

### Phase 7: Web Platform + gxwf-web Integration

**Goal:** Full functionality on vscode.dev backed by gxwf-web server.

1. Detect web environment → require proxy/gxwf-web URL for tool operations
2. gxwf-web as backend:
   - Extension can delegate validate/lint/clean operations to gxwf-web
   - Contents API for remote file management
   - Settings: `galaxy.workflows.gxwfWeb.url`
3. Bundle common tool schemas ("schema pack"):
   - Pre-cache schemas for IWC corpus tools + popular ToolShed tools
   - Ship as part of extension for offline use
4. IndexedDB cache for fetched schemas in web context

---

## Implementation Strategy for Upstream PRs

Each phase should be **one or a few focused PRs**:

1. **Phase 1:** Single PR — JSON Schema structural validation (no new dependencies beyond the schema file)
2. **Phase 2:** Single PR — ToolRegistryService + settings + "Populate Cache" command
3. **Phase 3:** Single PR — Tool state completions
4. **Phase 4:** Can bundle with Phase 3 or separate — validation + hover
5. **Phase 5:** Two PRs — conditional filtering, then connection completions
6. **Phase 6:** Multiple small PRs — cleaning upgrade, workspace features, conversion commands
7. **Phase 7:** Separate PR series — web platform, gxwf-web integration

PRs should be self-contained and independently useful. Phase 1 improves structural validation with zero new infrastructure. Phase 2 adds infrastructure. Phases 3-4 deliver the headline feature (tool state completions).

---

## Dependencies on This Monorepo

| Extension needs | Monorepo provides |
|---|---|
| Structural JSON Schema | `@galaxy-tool-util/schema` as npm dep — `JSONSchema.make(GxFormat2WorkflowSchema)` in-process |
| Per-tool JSON Schema | `@galaxy-tool-util/schema` — `createFieldModel()` + `JSONSchema.make()` from cached `ParsedTool` |
| Tool metadata + cache | `@galaxy-tool-util/core` as npm dep — `ToolCache`, `fetchFromToolShed()` |
| Report model shapes | `@galaxy-tool-util/schema` report-models (for gxwf-web integration, Phase 7) |

The extension depends on the monorepo **as npm packages** for Phases 1-4. No server dependency until Phase 7 (web platform).

---

## Unresolved Questions

1. ~~Should the JSON Schema for structural validation be committed to the extension repo (static), or fetched at runtime?~~ **Resolved:** Generated in-process from `@galaxy-tool-util/schema` npm package via `JSONSchema.make()`. No server, no static files.
2. The extension uses Inversify for DI — should ToolRegistryService use this, or is it simpler as a plain class? (Inversify is already entrenched, so probably use it.)
3. For web compatibility: can we get CORS headers added to ToolShed 2.0's `/api/tools/` endpoints? This would eliminate the need for a proxy in the web case.
4. The extension's `SchemaLoader` is deeply integrated — should Phase 1 replace it entirely, or add a parallel path and switch per-setting?
5. How to handle tool version resolution when steps omit `tool_version`? Default to latest from ToolShed? Show a warning?
