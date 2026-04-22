# VS Code Galaxy Workflows Extension -- Architecture

**Date:** 2026-04-12 (reviewed/updated 2026-04-21)
**Branch:** `wf_tool_state`
**Location:** `/Users/jxc755/projects/worktrees/galaxy-workflows-vscode/branch/wf_tool_state`

---

## 1. Overview

Galaxy Workflows is a VS Code language extension for authoring [Galaxy](https://galaxyproject.org/) workflow files. It provides two LSP language servers -- one per workflow format -- backed by shared infrastructure and the upstream `@galaxy-tool-util` monorepo. The extension does **not** execute workflows or require a running Galaxy instance; it is purely an authoring tool that validates syntax and tool parameters, provides IntelliSense, and offers workflow transformation commands.

**Supported formats:**

| Language ID | File extensions | Format |
|---|---|---|
| `galaxyworkflow` | `.ga` | Native Galaxy workflow (JSON) |
| `gxformat2` | `.gxwf.yml`, `.gxwf.yaml` | GxFormat2 workflow (YAML, CWL-inspired) |
| `gxwftests` | `-test.yml`, `-tests.yml`, `-test.yaml`, `-tests.yaml` | Galaxy workflow test definitions (YAML) |

**Key capabilities:**
- Schema-driven validation and diagnostics for both workflow formats
- Tool parameter validation against cached tool definitions from the Galaxy ToolShed
- IntelliSense: completions for workflow structure, tool parameters, and step connections
- Hover documentation for schema fields and tool parameters
- Workflow cleaning (removing runtime state, decoding string-encoded `tool_state`)
- Bidirectional format conversion (Native <-> Format2)
- File export, preview diffs, and Git-based clean comparison
- Document symbols/outline
- Code actions and quick fixes

---

## 2. Directory Layout

```
galaxy-workflows-vscode/
+-- client/                           # VS Code extension client (TypeScript)
|   +-- src/
|   |   +-- extension.ts              # Node entry point -- creates two LanguageClients
|   |   +-- browserExtension.ts       # Web extension entry point (vscode.dev)
|   |   +-- common/
|   |   |   +-- index.ts              # initExtension() -- shared init for Node and Web
|   |   +-- commands/                 # VS Code command implementations
|   |   |   +-- index.ts              # Command module re-exports
|   |   |   +-- setup.ts              # Command registration entry point
|   |   |   +-- cleanWorkflow.ts      # Clean (in-place) command
|   |   |   +-- previewCleanWorkflow.ts  # Preview-clean (diff editor) command
|   |   |   +-- convertWorkflow.ts    # Preview convert commands
|   |   |   +-- exportWorkflow.ts     # Export-as-file commands
|   |   |   +-- convertFile.ts        # In-place file conversion commands
|   |   |   +-- populateToolCache.ts  # Populate Tool Cache command
|   |   |   +-- selectForCleanCompare.ts / compareCleanWith.ts  # Git clean-diff
|   |   +-- providers/                # Virtual document providers
|   |   |   +-- cleanWorkflowProvider.ts           # Fetches cleaned content from server
|   |   |   +-- cleanWorkflowDocumentProvider.ts   # Virtual doc scheme for clean preview
|   |   |   +-- convertedWorkflowDocumentProvider.ts # Virtual doc scheme for conversion preview
|   |   |   +-- git/                  # Git integration (BuiltinGitProvider)
|   |   +-- requests/
|   |   |   +-- gxworkflows.ts        # Routes custom LSP requests to correct client
|   |   +-- statusBar.ts             # "Tools: N cached" status bar item
|   |   +-- languageTypes.ts         # Client-side type re-exports
|   +-- tests/
|       +-- e2e/                     # End-to-end tests (VS Code Test API)
|       +-- unit/                    # Unit tests (Jest)
+-- server/
|   +-- gx-workflow-ls-native/       # Native (.ga) language server
|   |   +-- src/
|   |   |   +-- node/server.ts / browser/server.ts  # Entry points (Node / Web Worker); each binds a platform-specific CacheStorageFactory
|   |   |   +-- inversify.config.ts            # DI container bindings
|   |   |   +-- languageService.ts             # NativeWorkflowLanguageServiceImpl
|   |   |   +-- nativeWorkflowDocument.ts      # NativeWorkflowDocument model
|   |   |   +-- schema/jsonSchemaLoader.ts     # JSON Schema generation from Effect schema
|   |   |   +-- services/
|   |   |   |   +-- nativeToolStateValidationService.ts  # Two-pass tool_state validation
|   |   |   |   +-- nativeToolStateCompletionService.ts  # Tool_state completions for .ga
|   |   |   |   +-- nativeHoverService.ts      # Hover for tool parameters
|   |   |   |   +-- nativeConnectionService.ts # Input connection completions
|   |   |   +-- validation/rules/    # Format-specific validation rules
|   |   |   +-- providers/           # Symbols provider
|   |   +-- tests/
|   +-- gx-workflow-ls-format2/      # Format2 (.gxwf.yml) language server
|   |   +-- src/
|   |   |   +-- node/server.ts / browser/server.ts
|   |   |   +-- inversify.config.ts
|   |   |   +-- languageService.ts             # GxFormat2WorkflowLanguageServiceImpl
|   |   |   +-- gxFormat2WorkflowDocument.ts   # GxFormat2WorkflowDocument model
|   |   |   +-- schema/
|   |   |   |   +-- jsonSchemaLoader.ts        # Schema generation + SchemaDefinitions
|   |   |   |   +-- schemaNodeResolver.ts      # Path-to-schema-node navigation
|   |   |   |   +-- definitions.ts             # SchemaNode hierarchy (RecordSchemaNode, FieldSchemaNode, etc.)
|   |   |   +-- services/
|   |   |   |   +-- completionService.ts       # Multi-source completion (connections + state + schema)
|   |   |   |   +-- hoverService.ts            # Hover for schema fields and tool params
|   |   |   |   +-- toolStateValidationService.ts  # Single-pass tool state validation
|   |   |   |   +-- schemaValidationService.ts # YAML schema validation
|   |   |   |   +-- workflowConnectionService.ts   # Step connection source completions
|   |   |   +-- validation/rules/    # Format-specific + IWC validation rules
|   |   |   +-- providers/           # Symbols provider
|   |   +-- tests/
|   +-- packages/
|       +-- server-common/           # Shared LSP infrastructure
|       |   +-- src/
|       |   |   +-- server.ts                    # GalaxyWorkflowLanguageServerImpl
|       |   |   +-- inversify.config.ts          # Common DI bindings
|       |   |   +-- languageTypes.ts             # Core interfaces, LanguageServiceBase
|       |   |   +-- configService.ts             # LSP configuration management
|       |   |   +-- ast/
|       |   |   |   +-- types.ts                 # Unified ASTNode type hierarchy
|       |   |   |   +-- nodeManager.ts           # ASTNodeManager -- AST navigation
|       |   |   +-- models/
|       |   |   |   +-- workflowDocument.ts      # Abstract WorkflowDocument
|       |   |   |   +-- workflowTestsDocument.ts # WorkflowTestsDocument
|       |   |   |   +-- documentsCache.ts        # DocumentsCacheImpl
|       |   |   +-- providers/
|       |   |   |   +-- codeActionHandler.ts     # Quick fix for legacy tool_state
|       |   |   |   +-- completionHandler.ts     # LSP completion dispatcher
|       |   |   |   +-- formattingHandler.ts     # Document formatting dispatcher
|       |   |   |   +-- hover/hoverHandler.ts    # Hover dispatcher + contributors
|       |   |   |   +-- symbolsHandler.ts        # Document symbols dispatcher
|       |   |   |   +-- handler.ts               # ServerEventHandler base class
|       |   |   |   +-- toolRegistry.ts          # ToolRegistryServiceImpl
|       |   |   |   +-- toolStateCompletion.ts   # ToolStateCompletionService (shared)
|       |   |   |   +-- validation/
|       |   |   |       +-- toolStateValidation.ts    # runObjectStateValidationLoop()
|       |   |   |       +-- toolStateDiagnostics.ts   # Diagnostic builders + mapToolStateDiagnosticsToLSP()
|       |   |   |       +-- toolStateAstHelpers.ts    # AST helpers for tool_state navigation
|       |   |   |       +-- profiles.ts               # Validation profile definitions
|       |   |   +-- services/
|       |   |       +-- index.ts                 # ServiceBase abstract class
|       |   |       +-- cleanWorkflow.ts         # CleanWorkflowService
|       |   |       +-- convertWorkflow.ts       # ConvertWorkflowService
|       |   |       +-- toolCacheService.ts      # ToolCacheService (cache requests + auto-resolution)
|       |   +-- tests/unit/
|       +-- yaml-language-service/   # Custom YAML parser + language service
|       |   +-- src/
|       |   |   +-- parser/          # Position-aware YAML parser -> ASTNode
|       |   |   +-- textBuffer.ts    # Line/offset conversion utilities
|       |   |   +-- formatter.ts     # YAML formatting
|       |   |   +-- inversify.config.ts
|       |   +-- tests/unit/
|       +-- workflow-tests-language-service/  # Test file (..-test.yml) language service
|           +-- src/                 # Completions, hover, symbols, validation for test files
|           +-- tests/unit/
+-- shared/
|   +-- src/
|       +-- requestsDefinitions.ts   # Custom LSP request/notification IDs and payload types
+-- workflow-languages/              # TextMate grammars + language configurations
|   +-- syntaxes/                    # .tmLanguage.json files (JSON, YAML)
|   +-- configurations/             # Language configuration JSON
+-- test-data/                       # Sample workflow files for tests
+-- assets/                          # Extension icon
```

---

## 3. Upstream Dependencies

The extension depends on two packages from the `galaxy-tool-util` TypeScript monorepo:

| Package | Role |
|---|---|
| `@galaxy-tool-util/core` (+ `/node` subpath) | `ToolInfoService` -- fetches tool XML from Galaxy ToolShed TRS API, parses it into structured tool definitions. Pluggable `CacheStorage` backends: `IndexedDBCacheStorage` (exported from the top-level entry, used by browser builds) and `FilesystemCacheStorage` + `getCacheDir()` (exported from the `/node` subpath, used by Node builds). The extension never imports Node-only modules into browser bundles — each server has separate `node/server.ts` and `browser/server.ts` entries that bind the appropriate `CacheStorage` factory via Inversify. |
| `@galaxy-tool-util/schema` | Effect-based schemas for Galaxy workflow types AND workflow-tests. `cleanWorkflow()` -- strips runtime-only properties and decodes string-encoded `tool_state`. `toFormat2Stateful()` / `toNativeStateful()` -- bidirectional conversion preserving tool state. `ToolStateValidator` -- validates tool state dicts against parsed tool parameter schemas. `findParamAtPath()` -- navigates tool parameter trees for completion/hover. `lintWorkflow()` -- additional structural lint rules. Canonical DTOs: `WorkflowInput`, `WorkflowOutput`, `WorkflowDataType` (re-exported from `server-common/languageTypes` and `shared/requestsDefinitions`). Utilities: `isCompatibleType`, type guards (`isBooleanParam`, `isConditionalParam`, `isRepeatParam`, `isSectionParam`, `isSelectParam`). Workflow-tests JSON Schema is sourced from `testsSchema` in this package -- the previously-vendored `workflow-languages/schemas/tests.schema.json` has been removed. |

Effect Schemas (`@effect/schema`) are compiled to JSON Schema at startup via `EffectJSONSchema.make()` and handed to the underlying JSON/YAML language services for structural validation.

**Published versions (as of 2026-04-21):** `@galaxy-tool-util/schema@0.4.0`, `@galaxy-tool-util/core@0.3.0`. These are the floor; bump both when a matching `core` release ships.

---

## 4. Client Architecture

### 4.1 Extension Activation

The extension has two entry points:

- **Node** (`client/src/extension.ts`) -- creates two `LanguageClient` instances connected to child Node processes via IPC.
- **Web** (`client/src/browserExtension.ts`) -- creates two `LanguageClient` instances connected to Web Workers.

Both call `initExtension()` in `client/src/common/index.ts`, which:

1. Initializes the Git provider (VS Code builtin Git extension API).
2. Registers all commands, providers, and requests against the **native** client.
3. Starts both language clients.
4. Sets up request routing so custom LSP requests reach the correct server based on the document's language ID.
5. Subscribes to `TOOL_RESOLUTION_FAILED` notifications from the Format2 server and surfaces them via an Output channel + a once-per-session warning toast.
6. Creates the `ToolCacheStatusBar` which polls the native server's cache size.

### 4.2 Language Client Configuration

Both clients share the same `LanguageClientOptions` builder. Each client's `documentSelector` limits which files it handles:

- Native client: `{ language: "galaxyworkflow", scheme: "file" }`
- Format2 client: `{ language: "gxformat2" }`, `{ language: "gxwftests" }`

The native client can also pass `toolAutoResolution: true` in `initializationOptions` to enable proactive tool resolution on document open (the format2 server uses this).

### 4.3 Custom LSP Request Routing

`client/src/requests/gxworkflows.ts` registers handlers for custom requests (`GET_WORKFLOW_INPUTS`, `GET_WORKFLOW_OUTPUTS`, etc.) that choose which language client to use based on the active document or the URI's extension. This allows commands to work transparently regardless of which server owns the document.

### 4.4 Commands

11 commands are registered in `package.json` under `contributes.commands`:

| Command ID | Enabled When | Behavior |
|---|---|---|
| `previewCleanWorkflow` | `.ga` open | Sends `CLEAN_WORKFLOW_CONTENTS` to server, opens diff editor showing cleaned vs. original |
| `cleanWorkflow` | `.ga` open | Sends `CLEAN_WORKFLOW_DOCUMENT` to server, which applies a workspace edit in-place |
| `selectForCleanCompare` | Git context | Stores a reference to a workflow revision for later comparison |
| `compareCleanWith` | After select | Opens diff of two cleaned workflow revisions (Git timeline/explorer) |
| `populateToolCache` | Always | Sends `GET_WORKFLOW_TOOL_IDS` then `POPULATE_TOOL_CACHE` to server |
| `previewConvertToFormat2` | `.ga` open | Shows conversion preview in diff editor |
| `previewConvertToNative` | `.gxwf.yml` open | Shows conversion preview in diff editor |
| `exportToFormat2` | `.ga` open | Converts and writes a new `.gxwf.yml` file alongside the original |
| `exportToNative` | `.gxwf.yml` open | Converts and writes a new `.ga` file alongside the original |
| `convertFileToFormat2` | `.ga` open | Replaces the file's content with converted Format2 YAML |
| `convertFileToNative` | `.gxwf.yml` open | Replaces the file's content with converted native JSON |

Commands appear in the command palette, editor context menu, and explorer context menu (for Git comparison commands), controlled by `when` clauses in `package.json`.

### 4.5 Virtual Document Providers

Preview and diff operations use VS Code's virtual document system:

- **`CleanWorkflowDocumentProvider`** -- registered under a custom URI scheme. When VS Code opens a URI like `galaxy-clean-workflow:///path.ga`, it sends `CLEAN_WORKFLOW_CONTENTS` to the server and returns the cleaned text.
- **`ConvertedWorkflowDocumentProvider`** -- similar scheme for conversion previews.

These providers enable read-only diff views without modifying the original file.

### 4.6 Status Bar

`ToolCacheStatusBar` displays `"Tools: N cached"` in the status bar. It polls the server via `GET_TOOL_CACHE_STATUS` on a timer and updates the count.

### 4.7 Settings

Defined in `package.json` under `contributes.configuration`:

| Setting | Type | Default | Scope | Description |
|---|---|---|---|---|
| `galaxyWorkflows.validation.profile` | `"basic"` or `"iwc"` | `"basic"` | resource | Validation strictness level |
| `galaxyWorkflows.toolCache.directory` | string | `~/.galaxy/tool_info_cache` | machine | Filesystem path to shared tool cache |
| `galaxyWorkflows.toolShed.url` | string | `https://toolshed.g2.bx.psu.edu` | machine | ToolShed base URL for fetching tool definitions |

---

## 5. Server Architecture

### 5.1 Dual-Server Model

Two independent language server processes run simultaneously. Each is a separate Node process (or Web Worker) with its own Inversify DI container, document cache, and language service. They share no runtime state.

| Server | Package | Language IDs Served | Debug Port |
|---|---|---|---|
| Native | `gx-workflow-ls-native` | `galaxyworkflow` | 6009 |
| Format2 | `gx-workflow-ls-format2` | `gxformat2`, `gxwftests` | 6010 |

Both servers instantiate the same `GalaxyWorkflowLanguageServerImpl` from `server-common` but bind different language service implementations via Inversify.

### 5.2 GalaxyWorkflowLanguageServerImpl

`server/packages/server-common/src/server.ts`

This is the central server orchestrator, decorated with `@injectable()`. Constructor-injected dependencies:

- `Connection` -- the LSP JSON-RPC connection
- `DocumentsCache` -- parsed document storage
- `ConfigService` -- settings management
- `WorkflowDataProvider` -- workflow input/output queries
- `WorkflowLanguageService` -- format-specific language service (bound by each server's DI config)
- `WorkflowTestsLanguageService` -- test file language service
- `ToolRegistryService` -- tool cache and validation
- `CacheStorageFactory` -- `(cacheDir?) => CacheStorage`; the Node entry binds `FilesystemCacheStorage(getCacheDir(cacheDir))`, the browser entry binds `() => new IndexedDBCacheStorage()`. The server calls the factory during `initialize()` to build the concrete storage handed to `ToolRegistryService.configure()`.

**Lifecycle:**

```
constructor()
  -> register document change tracking (onDidChangeContent, onDidClose, onDidOpen)
  -> connection.onInitialize -> initialize()
  -> register handlers (Formatting, Hover, Completion, Symbols, CodeAction)
  -> register services (CleanWorkflow, ConvertWorkflow, ToolCache)
  -> connection.onShutdown -> cleanup()

initialize(params)
  -> configService.initialize(capabilities)
  -> read settings, toolRegistryService.configure({ toolShedUrl, storage: cacheStorageFactory(cacheDir) })
  -> check initializationOptions.toolAutoResolution
  -> return ServerCapabilities

onDidChangeContent(textDocument)
  -> languageService.parseDocument(textDocument) -> DocumentContext
  -> documentsCache.addOrReplaceDocument(documentContext)
  -> validateDocument(documentContext)

onDidOpen(textDocument)
  -> toolCacheService.scheduleResolution(documentContext)  [if auto-resolution enabled]

validateDocument(documentContext)
  -> configService.getDocumentSettings(uri)
  -> languageService.validate(documentContext, profile) -> Diagnostic[]
  -> connection.sendDiagnostics({ uri, diagnostics })
```

**Advertised LSP capabilities:**

| Capability | Trigger |
|---|---|
| `documentFormattingProvider` | -- |
| `hoverProvider` | -- |
| `completionProvider` | Trigger chars: `"`, `:` |
| `documentSymbolProvider` | -- |
| `codeActionProvider` | -- |

### 5.3 Dependency Injection

Each server assembles its DI container from:

1. **Common container** (`server-common/src/inversify.config.ts`) -- binds singleton services shared by all servers:
   - `ConfigService` -> `ConfigServiceImpl`
   - `DocumentsCache` -> `DocumentsCacheImpl`
   - `WorkflowDataProvider` -> `WorkflowDataProviderImpl`
   - `ToolRegistryService` -> `ToolRegistryServiceImpl`

2. **Format-specific bindings** (e.g. `gx-workflow-ls-native/src/inversify.config.ts`):
   - `WorkflowLanguageService` -> `NativeWorkflowLanguageServiceImpl` (or `GxFormat2WorkflowLanguageServiceImpl`)
   - `GalaxyWorkflowLanguageServer` -> `GalaxyWorkflowLanguageServerImpl`
   - `SymbolsProvider` -> format-specific symbols provider

3. **Sub-module containers** (`ContainerModule`):
   - `YAMLLanguageServiceContainerModule` -- custom YAML parser
   - `WorkflowTestsLanguageServiceContainerModule` -- test file support

### 5.4 Event Handlers

`ServerEventHandler` is the base class for objects that register LSP event listeners. Handlers are created in `GalaxyWorkflowLanguageServerImpl.registerHandlers()`:

| Handler | LSP Method | Delegation |
|---|---|---|
| `FormattingHandler` | `textDocument/formatting` | `languageService.format()` |
| `HoverHandler` | `textDocument/hover` | `languageService.doHover()` + optional contributors |
| `CompletionHandler` | `textDocument/completion` | `languageService.doComplete()` |
| `SymbolsHandler` | `textDocument/documentSymbol` | `languageService.getSymbols()` |
| `CodeActionHandler` | `textDocument/codeAction` | Checks for `legacy-tool-state` diagnostics |

Each handler looks up the `DocumentContext` from the cache, resolves the correct `LanguageService` by language ID, and delegates.

### 5.5 Custom LSP Services

`ServiceBase` is the abstract base for services that register custom LSP request handlers (as opposed to standard LSP methods). Services are registered in `GalaxyWorkflowLanguageServerImpl.registerServices()`:

| Service | Custom Requests Handled |
|---|---|
| `CleanWorkflowService` | `CLEAN_WORKFLOW_DOCUMENT`, `CLEAN_WORKFLOW_CONTENTS` |
| `ConvertWorkflowService` | `CONVERT_WORKFLOW_CONTENTS` |
| `ToolCacheService` | `GET_WORKFLOW_TOOL_IDS`, `POPULATE_TOOL_CACHE`, `GET_TOOL_CACHE_STATUS` |

`ServiceBase` provides a `detectLanguageId()` helper that sniffs raw text content (JSON object -> `"galaxyworkflow"`, else -> `"gxformat2"`) to route content-based requests to the correct language service.

---

## 6. Shared Infrastructure (`server-common`)

### 6.1 AST Type System

`server/packages/server-common/src/ast/types.ts`

A unified AST node hierarchy that works identically for JSON (from `vscode-json-languageservice`) and YAML (from the custom YAML parser):

```
ASTNode (discriminated union on `type`)
+-- ObjectASTNode   { type: "object",  properties: PropertyASTNode[] }
+-- PropertyASTNode { type: "property", keyNode: StringASTNode, valueNode: ASTNode, colonOffset: number }
+-- ArrayASTNode    { type: "array",   items: ASTNode[] }
+-- StringASTNode   { type: "string",  value: string }
+-- NumberASTNode   { type: "number",  value: number }
+-- BooleanASTNode  { type: "boolean", value: boolean }
+-- NullASTNode     { type: "null",    value: null }
```

All nodes carry `offset` and `length` fields for position tracking. `NodePath = Segment[]` where `Segment = string | number` represents a navigation path through the AST (property name or array index).

This unified type is critical: it means all validation, completion, hover, and navigation logic in `server-common` is format-agnostic. The same AST helper that walks a JSON `.ga` file works on a YAML `.gxwf.yml` file.

### 6.2 ASTNodeManager

`server/packages/server-common/src/ast/nodeManager.ts`

Central AST navigation utility, constructed from a `ParsedDocument` (which wraps the format-specific parse result). Key methods:

| Method | Purpose |
|---|---|
| `getNodeFromOffset(offset)` | Find the deepest AST node at a byte offset |
| `getPathFromNode(node)` | Build a `NodePath` breadcrumb (e.g. `["steps", 0, "tool_id"]`) |
| `getNodeRange(node)` | Convert AST node offset/length to LSP `Range` |
| `getStepNodes()` | Return all workflow step `ObjectASTNode`s (handles both native dict-of-dicts and format2 array-of-objects) |
| `getDeclaredPropertyNames(node)` | Get existing property keys (for completion filtering) |
| `visit(visitor)` | Depth-first AST traversal |
| `isNodeEmpty()` | Check if a node has meaningful content |

`getStepNodes()` abstracts over the two step representations: native workflows use `"steps": { "0": {...}, "1": {...} }` (object with numeric string keys) while format2 uses `steps: [{...}, {...}]` (array). The manager returns `ObjectASTNode[]` in both cases.

### 6.3 Document Model Hierarchy

```
DocumentContext (interface)
  +-- DocumentBase (abstract)
      +-- WorkflowDocument (abstract)
      |   +-- NativeWorkflowDocument      (native server)
      |   +-- GxFormat2WorkflowDocument    (format2 server)
      +-- WorkflowTestsDocument            (format2 server)
```

`DocumentContext` provides: `languageId`, `uri`, `textDocument`, `nodeManager`, `internalDocument` (format-specific parse result).

`WorkflowDocument` adds: `getWorkflowInputs()`, `getWorkflowOutputs()`, `getToolIds()`.

### 6.4 Documents Cache

`DocumentsCacheImpl` stores parsed `DocumentContext` instances keyed by URI. Updated on every `onDidChangeContent` event, cleared on `onDidClose`. Provides a `schemesToSkip` list (e.g. virtual document schemes) to suppress validation of preview documents.

### 6.5 LanguageServiceBase

`server/packages/server-common/src/languageTypes.ts`

Abstract base class for all language services, parameterized on `T extends DocumentContext`. Provides:

- Abstract methods that format-specific services implement: `parseDocument()`, `format()`, `doHover()`, `doComplete()`, `getSymbols()`, `doValidation()`
- Concrete validation orchestration: `validate(doc, profileId?)` calls `doValidation()` then iterates the selected profile's validation rules
- Default `cleanWorkflowText()` (identity) and `convertWorkflowText()` (throws) -- overridden by format-specific services
- Validation profile management: `initializeValidationProfiles()`, `getValidationProfile()`

### 6.6 Validation Profiles

Two profiles control validation strictness:

- **`basic`** -- standard validation: schema conformance, tool state parameter checking
- **`iwc`** -- adds Intergalactic Workflow Commission best-practice rules (required `release`, `creator`, `license` properties, recommended tool versions, etc.)

Profiles are instances of the `ValidationProfile` interface, containing a `Set<ValidationRule>`. Each `ValidationRule` is an object with `validate(documentContext): Promise<Diagnostic[]>`. The profile's `name` is used as the `source` field in emitted diagnostics.

### 6.7 Configuration Service

`ConfigServiceImpl` manages per-document settings via the LSP configuration protocol. It caches settings per URI, watches for `workspace/didChangeConfiguration` notifications, and triggers re-validation of all open documents when configuration changes.

---

## 7. Tool Registry and Cache

### 7.1 ToolRegistryServiceImpl

`server/packages/server-common/src/providers/toolRegistry.ts`

Wraps `@galaxy-tool-util/core`'s `ToolInfoService` and `@galaxy-tool-util/schema`'s `ToolStateValidator`. Key interface:

```typescript
interface ToolRegistryService {
  configure(settings: { toolShedUrl: string; storage: CacheStorage }): void;
  hasCached(toolId: string, toolVersion?: string): Promise<boolean>;
  listCached(): Promise<Array<{ cache_key, tool_id, tool_version, source, source_url, cached_at }>>;
  getCacheSize(): Promise<number>;
  getToolParameters(toolId: string, toolVersion?: string): Promise<unknown[] | null>;
  populateCache(tools: ToolRef[]): Promise<PopulateToolCacheResult>;
  validateNativeStep(toolId, toolVersion, toolState, inputConnections?): Promise<ToolStateDiagnostic[]>;
  hasResolutionFailed(toolId, toolVersion?): boolean;
  markResolutionFailed(toolId, toolVersion?): void;
}
```

**Cache lifecycle:**

1. On `configure()`, creates a new `ToolInfoService` with the specified `CacheStorage` (Node: `FilesystemCacheStorage`; browser: `IndexedDBCacheStorage`) and ToolShed URL. The storage instance is produced by the injected `CacheStorageFactory`, not by the registry itself — the registry is storage-agnostic.
2. `hasCached()` is async and delegates to `ToolInfoService.cache.hasCached()` (storage-backed; no in-memory mirror).
3. `populateCache()` batch-fetches tools from the ToolShed with concurrency of 5. Returns `{ fetched, alreadyCached, failed }`.
4. `getToolParameters()` returns the parsed tool input parameters from cache, or `null` if not cached. Does not trigger network fetches.
5. `getCacheSize()` returns the current cached-tool count (replaced the old sync `cacheSize` getter when storage became async).
6. A `_resolutionFailed` set tracks tools that couldn't be resolved, preventing repeated fetch attempts.

No custom cache logic exists in the extension -- all cache management lives upstream in `@galaxy-tool-util/core`.

### 7.2 ToolCacheService

`server/packages/server-common/src/services/toolCacheService.ts`

Handles three LSP requests:

- `GET_WORKFLOW_TOOL_IDS` -- iterates all open documents in the cache, extracts unique `{ toolId, toolVersion }` pairs from workflow steps
- `POPULATE_TOOL_CACHE` -- delegates to `ToolRegistryService.populateCache()`
- `GET_TOOL_CACHE_STATUS` -- returns `{ cacheSize }`

**Auto-resolution** (when `autoResolutionEnabled`):

When a document is opened, `scheduleResolution()` collects uncached tool refs, debounces them (300ms), then batch-fetches via `_flushResolution()`. On completion:
- Marks failed tools via `markResolutionFailed()` so diagnostics can update their severity/message
- Re-validates all affected documents
- Sends `TOOL_RESOLUTION_FAILED` notification to client for any failures

The pending/in-flight sets prevent duplicate fetches when multiple documents reference the same tool.

---

## 8. Tool State -- The Central Feature

Galaxy workflows store per-step tool configuration in a `tool_state` field. In native (`.ga`) workflows, `tool_state` can appear in two forms:

1. **String-encoded** (legacy): `"tool_state": "{\"param1\": \"value1\", ...}"` -- a JSON string containing a JSON object. This is the format Galaxy's API exports.
2. **Object-valued** (post-clean): `"tool_state": { "param1": "value1", ... }` -- a proper JSON object. This is the form after running `cleanWorkflow()`.

In Format2 (`.gxwf.yml`) workflows, tool configuration is always under the `state:` key as a native YAML mapping (never string-encoded).

The extension's tool state subsystem provides validation, completion, and hover across both representations.

### 8.1 Shared AST Helpers

`server/packages/server-common/src/providers/validation/toolStateAstHelpers.ts`

Format-agnostic helpers operating on the unified `ASTNode` types:

| Function | Purpose |
|---|---|
| `collectStepsWithObjectState(nodeManager)` | Iterates all workflow steps that have both a `tool_id` and an object-valued `tool_state` or `state` block. Returns `StepWithToolState[]` with the tool ID, version, AST nodes for the tool_id and state, and the parent step node. |
| `astObjectNodeToRecord(node)` | Recursively converts an `ObjectASTNode` tree to a plain `Record<string, unknown>` dict for upstream validators. Preserves native boolean, number, and null types. |
| `dotPathToAstProperty(stateNode, dotPath)` | Walks a dot-separated path (e.g. `"repeat_group.0.param_name"`) through an ObjectASTNode tree. Handles numeric segments as array indices. Returns the `PropertyASTNode` at the final segment, or null. |
| `dotPathToAstRange(stateNode, dotPath, nodeManager, "key"|"value")` | Like `dotPathToAstProperty` but returns an LSP `Range` targeting either the key node (for "unknown parameter" diagnostics) or the value node (for "invalid value" diagnostics). Falls back to the state node range on navigation failure. |
| `getStringPropertyFromStep(root, stepPath, propertyName)` | Navigates from root along a `NodePath` to a step, then reads a string-valued property. Used to extract `tool_id` and `tool_version` during completion/hover. |
| `getObjectNodeFromStep(root, stepPath, propertyName)` | Same navigation but returns an ObjectASTNode. Used to get the `state`/`tool_state` node for building state dicts during completion. |

Display helpers shared by hover and completion:

| Function/Type | Purpose |
|---|---|
| `isSelectParam(p)` | Type guard for select/genomebuild parameters |
| `isHidden(p)` | Check if a parameter is hidden (excluded from completions) |
| `buildParamHoverMarkdown(param)` | Build markdown documentation for a tool parameter: name, type, label, help text, options list (for selects), values (for booleans) |

### 8.2 Shared Validation Loop

`server/packages/server-common/src/providers/validation/toolStateValidation.ts`

`runObjectStateValidationLoop()` factors out the common validation pattern used by both format2 and native Pass A:

```
For each step returned by collectStepsWithObjectState(nodeManager):
  1. Check registry.hasCached(toolId, toolVersion)
     -> If not cached: emit buildCacheMissDiagnostic() and skip
        - If resolution previously failed: Warning severity, "could not resolve"
        - If not yet attempted: Information severity, "run Populate Tool Cache"
  2. Call format-specific validator(toolId, toolVersion, stateNode, stepNode)
     -> Returns ToolStateDiagnostic[] from upstream
  3. Build range resolver: (path, "key"|"value") -> dotPathToAstRange(stateNode, path, nodeManager, target)
  4. mapToolStateDiagnosticsToLSP(rawDiags, resolver) -> LSP Diagnostic[]
```

The `StepStateValidator` type signature allows each format to inject its own validation logic while reusing the outer loop.

### 8.3 Diagnostic Mapping

`server/packages/server-common/src/providers/validation/toolStateDiagnostics.ts`

`mapToolStateDiagnosticsToLSP()` converts raw `ToolStateDiagnostic[]` from the upstream validator into LSP `Diagnostic[]`:

1. **Group by path** -- multiple diagnostics at the same dot-path are collected together.
2. **Unknown parameter detection** -- if any diagnostic in a group contains "is unexpected", emit a Warning: `Unknown tool parameter 'X'.` targeting the key node.
3. **Value error merging** -- for union types, multiple "Expected X, actual Y" diagnostics are merged into a single Error: `Invalid value 'Y' for 'X'. Must be one of: A, B, C.` targeting the value node.
4. **Fallback** -- if neither pattern matches, the raw message is used as-is.

### 8.4 Native Tool State Validation (Two-Pass)

`server/gx-workflow-ls-native/src/services/nativeToolStateValidationService.ts`

**Pass A -- Object-valued `tool_state`:**
- Calls `runObjectStateValidationLoop()` with a validator that:
  - Converts the state AST to a record via `astObjectNodeToRecord()`
  - Extracts `input_connections` from the step's sibling property
  - Delegates to `ToolRegistryService.validateNativeStep(toolId, toolVersion, stateDict, connections)`
- Diagnostics have precise AST-backed ranges pointing to exact keys/values

**Pass B -- String-encoded `tool_state`:**
- Calls `collectNativeStepsWithStringState()` to find steps where `tool_state` is a `StringASTNode`
- For each: emits a `buildLegacyToolStateHintDiagnostic()` with code `legacy-tool-state` and Hint severity
- Attempts to `JSON.parse()` the string, then validates the parsed dict
- All diagnostics from Pass B are pinned to the entire `tool_state` string node's range (no sub-element precision)
- The hint diagnostic triggers the "Clean workflow" code action

### 8.5 Format2 Tool State Validation (Single-Pass)

`server/gx-workflow-ls-format2/src/services/toolStateValidationService.ts`

Format2 always uses object-valued `state:`, so only Pass A applies. Calls `runObjectStateValidationLoop()` with a validator that:
- Converts the state AST to a record
- Delegates to `validateFormat2StepStateStrict()` from `@galaxy-tool-util/schema`

### 8.6 Tool State Completion

`server/packages/server-common/src/providers/toolStateCompletion.ts`

`ToolStateCompletionService` provides parameter-aware completions inside `state:` / `tool_state` blocks. Shared by both formats.

**Path detection:**

`findStateInPath(path: NodePath)` scans the path for a `"state"` or `"tool_state"` segment preceded by `"steps"`, returning the index and key name. This tells the completion system whether the cursor is inside a tool state block.

**Completion text context:**

`getCompletionTextContext(doc, offset)` computes:
- `afterColon` -- whether the cursor is after a `:` on the current line (value position vs. key position)
- `currentWord` -- the partial word at the cursor (for prefix filtering)
- `overwriteRange` -- the range to replace with the completion text

**Completion logic:**

```
doComplete(root, nodePath, stateInfo, textCtx, existingKeys):
  1. Extract stepPath and innerPath from nodePath relative to stateInfo.stateIndex
  2. Read tool_id and tool_version from the step via getStringPropertyFromStep()
  3. Fetch tool parameters via ToolRegistryService.getToolParameters()
  4. Build state dict from the state node (for conditional branch filtering)
  5. Call findParamAtPath(params, innerPath, stateDict) to navigate to the cursor's context

  If result.param exists and afterColon (value position):
    -> valueItems(): select params get option list, booleans get true/false
  If result.param exists and !afterColon (key position within a section/repeat/conditional):
    -> Navigate into the param's children to get contextParams
  Else:
    -> Use result.availableParams as contextParams

  Filter contextParams: remove hidden, prefix-match currentWord, exclude existingKeys
  Map to CompletionItem[] with kind=Field, insertText="name: "
```

This supports arbitrarily nested tool parameter structures: sections, repeats, and conditionals (where the visible parameters depend on the currently-selected conditional test value).

### 8.7 Tool State Hover

Both format-specific hover services share the same pattern:

1. Detect cursor position in `state:`/`tool_state` via `findStateInPath()`
2. Extract `tool_id`/`tool_version` from the enclosing step
3. Fetch tool parameters from the registry
4. Call `findParamAtPath()` to locate the parameter at the cursor's path
5. Call `buildParamHoverMarkdown()` to generate documentation

The hover markdown shows: parameter name, type label (e.g. `select`, `integer`, `boolean`), label, help text, and available options (for select and boolean types).

---

## 9. Code Actions

`server/packages/server-common/src/providers/codeActionHandler.ts`

The `CodeActionHandler` watches for diagnostics with code `legacy-tool-state` (emitted by native Pass B). When found, it offers a single quick fix:

**"Clean workflow (convert tool_state to object form)"**

- Kind: `QuickFix`, marked as `isPreferred`
- Calls `languageService.cleanWorkflowText()` on the full document text
- Produces a `WorkspaceEdit` that replaces the entire document content with the cleaned version
- Attached to the legacy-tool-state diagnostics so it appears in the lightbulb menu

This is the primary mechanism for migrating pre-clean workflows to the object-valued `tool_state` form that enables precise diagnostics, completions, and hover.

---

## 10. Workflow Cleaning and Conversion

### 10.1 CleanWorkflowService

`server/packages/server-common/src/services/cleanWorkflow.ts`

Two request handlers:

- `CLEAN_WORKFLOW_CONTENTS` -- takes raw text, returns cleaned text. Used by preview commands and code actions.
- `CLEAN_WORKFLOW_DOCUMENT` -- takes a document URI, applies a `WorkspaceEdit` to clean the document in-place.

Both delegate to the format-specific `languageService.cleanWorkflowText()`.

The native implementation prefetches tool parameters (via `ToolInputsResolver`) so that `cleanWorkflow()` from `@galaxy-tool-util/schema` can accurately filter tool_state to only include actual tool parameters, removing runtime artifacts. This is the "tool-aware" cleaning path -- without cached tool definitions, cleaning still works but may retain some extraneous keys.

### 10.2 ConvertWorkflowService

`server/packages/server-common/src/services/convertWorkflow.ts`

Handles `CONVERT_WORKFLOW_CONTENTS` requests. Optionally cleans before converting (`params.clean`). Delegates to:

- Native service: `toFormat2Stateful()` from `@galaxy-tool-util/schema`
- Format2 service: `toNativeStateful()` from `@galaxy-tool-util/schema`

Errors are returned as typed results (`{ contents: "", error: "..." }`) rather than thrown, so the client can display them via `showErrorMessage()`.

---

## 11. Format-Specific Servers

### 11.1 Native Workflow Language Service

`server/gx-workflow-ls-native/src/languageService.ts`

Class: `NativeWorkflowLanguageServiceImpl extends LanguageServiceBase<NativeWorkflowDocument>`

Wraps `vscode-json-languageservice` (the same library that powers VS Code's built-in JSON support). The JSON language service provides:
- JSON parsing into the shared `ASTNode` types
- Schema-driven validation (completions, hover, and error diagnostics from JSON Schema)

**Schema loading** (`schema/jsonSchemaLoader.ts`): At startup, generates a JSON Schema from the Effect schema for native Galaxy workflows via `EffectJSONSchema.make(NativeGalaxyWorkflowSchema)`. This schema is registered with `vscode-json-languageservice` which handles structural validation automatically.

**NativeWorkflowDocument** (`nativeWorkflowDocument.ts`): Extends `WorkflowDocument` with native-specific logic:
- Extracts workflow inputs from steps of type `data_input`, `data_collection_input`, `parameter_input`
- Parses `tool_id`, `tool_version` from step properties
- For string-encoded `tool_state`, does `JSON.parse()` to extract input defaults

**Validation** (`doValidation()`):
1. JSON language service schema validation -> `Diagnostic[]`
2. Pass A (object-valued tool_state) via `runObjectStateValidationLoop()`
3. Pass B (string-encoded tool_state) via `NativeToolStateValidationService`
4. Profile rules (basic or IWC)

**Completion** (`doComplete()`): Three-tier, first match wins:
1. Tool state completion (if inside `tool_state` object) -> `NativeToolStateCompletionService`
2. Input connection completion (if inside `input_connections`) -> `NativeWorkflowConnectionService`
3. JSON language service schema-driven completions (fallback)

### 11.2 Format2 Workflow Language Service

`server/gx-workflow-ls-format2/src/languageService.ts`

Class: `GxFormat2WorkflowLanguageServiceImpl extends LanguageServiceBase<GxFormat2WorkflowDocument>`

Uses the custom `@gxwf/yaml-language-service` for YAML parsing (see section 12).

**Schema loading** (`schema/jsonSchemaLoader.ts`): More complex than native. Generates a JSON Schema from Effect schema, then extracts `$defs` into a `SchemaDefinitions` map containing `SchemaRecord`s and `SchemaEnum`s. A `SchemaNodeResolver` maps YAML paths to schema definitions, enabling context-aware completions and hover.

**GxFormat2WorkflowDocument** (`gxFormat2WorkflowDocument.ts`): Extends `WorkflowDocument`:
- Extracts inputs from top-level `inputs:` mapping
- Extracts outputs from top-level `outputs:` mapping
- Resolves tool IDs from `steps[*].tool_id`

**Validation** (`doValidation()`):
1. YAML syntax validation (parse errors)
2. Schema validation via `GxFormat2SchemaValidationService`
3. Tool state validation (single-pass) via `ToolStateValidationService`
4. Profile rules

**Completion** (`GxFormat2CompletionService`): Multi-source, first match wins:
1. Step connection source completion -- if cursor is in a `source:` value position inside a step's `in:` block, offers `step_name/output_name` strings from upstream steps and workflow inputs. Respects YAML ordering to prevent forward references.
2. Tool state parameter completion -- if cursor is inside a `state:` block, delegates to `ToolStateCompletionService`
3. Schema completion -- falls back to schema-driven completions for workflow structure. Uses `SchemaNodeResolver` to determine available fields, enum values, and documentation at the cursor's path. Skips certain schema refs (`InputParameter`, `OutputParameter`, `WorkflowStep`) since these are user-defined structures, not fixed schemas.

**Hover** (`GxFormat2HoverService`): Two sources:
1. Tool state parameter hover -- if cursor is inside `state:`, shows parameter documentation
2. Schema node hover -- resolves cursor path to schema node, shows property documentation

### 11.3 Connection Completion Service (Format2)

`server/gx-workflow-ls-format2/src/services/workflowConnectionService.ts`

Provides completions for step input connections (`in:` / `source:` values):

- `findSourceInPath()` -- detects if the cursor is at a `source:` value position
- `getAvailableSources()` -- enumerates valid connection sources:
  - Workflow-level inputs from the `inputs:` map
  - Outputs from all steps defined before the current step in YAML order (preventing forward references)
  - Returns `"step_name/output_name"` strings

---

## 12. YAML Language Service

`server/packages/yaml-language-service/`

A custom YAML parser and language service, **not** a wrapper around `js-yaml` or the `yaml` npm package. This custom implementation is necessary because:

1. Standard YAML libraries don't provide position-aware AST nodes with exact offset/length tracking needed for LSP features (hover, diagnostics at specific ranges, completions).
2. The parser produces the same unified `ASTNode` type hierarchy as the JSON parser, enabling format-agnostic tooling in `server-common`.

Components:
- **Parser** -- produces `ObjectASTNode`, `ArrayASTNode`, `StringASTNode`, etc. with accurate offsets
- **TextBuffer** -- line/offset conversion utilities, word boundary detection
- **Formatter** -- YAML document formatting respecting existing style
- **Inversify ContainerModule** -- binds `YAMLLanguageService` as a singleton

---

## 13. Workflow Tests Language Service

`server/packages/workflow-tests-language-service/`

A separate language service for `*-test.yml` / `*-tests.yml` files. Loaded as a sub-module of the Format2 server.

Features:
- Schema-driven validation of test file structure (schema sourced from `testsSchema` in `@galaxy-tool-util/schema` -- the vendored 4k-line `workflow-languages/schemas/tests.schema.json` was removed in commit `cf629f9`)
- Completions for `job:`, `outputs:`, `history:` sections
- Hover for test file properties
- Document symbols (test cases as outline)

Uses the same `yaml-language-service` parser and unified `ASTNode` types.

---

## 14. Custom LSP Protocol

`shared/src/requestsDefinitions.ts`

All custom LSP communication uses request/notification identifiers under the `galaxy-workflows-ls.` namespace:

**Requests (client -> server):**

| Identifier | Params | Result |
|---|---|---|
| `cleanWorkflowDocument` | `{ uri }` | `{ error }` |
| `cleanWorkflowContents` | `{ contents }` | `{ contents }` |
| `getWorkflowInputs` | `{ uri }` | `{ inputs: WorkflowInput[] }` |
| `getWorkflowOutputs` | `{ uri }` | `{ outputs: WorkflowOutput[] }` |
| `getWorkflowToolIds` | -- | `{ tools: ToolRef[] }` |
| `populateToolCache` | `{ tools: ToolRef[] }` | `{ fetched, alreadyCached, failed[] }` |
| `getToolCacheStatus` | -- | `{ cacheSize }` |
| `convertWorkflowContents` | `{ contents, targetFormat, clean? }` | `{ contents, error? }` |

**Notifications (server -> client):**

| Identifier | Params |
|---|---|
| `toolResolutionFailed` | `{ failures: Array<{ toolId, error }> }` |

**Shared types:**

- `WorkflowInput { name, type: WorkflowDataType, doc?, default?, optional? }` (re-exported from `@galaxy-tool-util/schema`)
- `WorkflowOutput { name, uuid?, doc?, type? }` (re-exported from `@galaxy-tool-util/schema`)
- `ToolRef { toolId, toolVersion? }`
- `WorkflowDataType` -- union `"boolean" | "collection" | "color" | "data" | "double" | "File" | "float" | "int" | "integer" | "long" | "null" | "string" | "text"` widened with `(string & {})` to stay structurally compatible with the upstream schema package (which accepts custom datatype strings). The known union still drives autocomplete; `isCompatibleType()` is also re-exported from the schema package.

---

## 15. Data Flow Diagrams

### 15.1 Document Open / Edit -> Diagnostics

```
Document change event (onDidChangeContent)
  -> languageService.parseDocument(textDocument)
     -> JSON.parse / YAML.parse -> ASTNode tree
     -> Wrap in NativeWorkflowDocument / GxFormat2WorkflowDocument
     -> Create ASTNodeManager
  -> documentsCache.addOrReplaceDocument(context)
  -> validateDocument(context)
     -> configService.getDocumentSettings(uri)
     -> languageService.validate(context, profile)
        -> doValidation()
           -> Schema validation (JSON Schema / YAML Schema) -> Diagnostic[]
           -> Tool state validation:
              -> collectStepsWithObjectState()
              -> For each step:
                 -> registry.hasCached(toolId)?
                    No  -> buildCacheMissDiagnostic() (Info or Warning)
                    Yes -> validator(toolId, version, stateNode, stepNode)
                           -> astObjectNodeToRecord(stateNode) -> dict
                           -> upstream.validate(dict) -> ToolStateDiagnostic[]
                           -> mapToolStateDiagnosticsToLSP(rawDiags, rangeResolver) -> Diagnostic[]
              -> [Native only] collectNativeStepsWithStringState()
                 -> buildLegacyToolStateHintDiagnostic() -> Hint Diagnostic
                 -> JSON.parse(string) -> validate -> Diagnostic[]
        -> For each rule in profile:
           -> rule.validate(context) -> Diagnostic[]
     -> connection.sendDiagnostics({ uri, diagnostics })
```

### 15.2 Tool State Completion (Format2)

```
textDocument/completion request
  -> CompletionHandler.onCompletion(params)
     -> documentsCache.get(uri) -> context
     -> languageService.doComplete(context, position)
        -> GxFormat2CompletionService.doComplete()
           -> nodeManager.getNodeFromOffset(offset) -> node
           -> nodeManager.getPathFromNode(node) -> path

           1. Connection completion:
              -> findSourceInPath(path)?
                 Yes -> getAvailableSources() -> CompletionList
                 No  -> continue

           2. Tool state completion:
              -> findStateInPath(path)?
                 Yes -> getCompletionTextContext(doc, offset) -> { afterColon, currentWord, overwriteRange }
                     -> ToolStateCompletionService.doComplete(root, path, stateInfo, textCtx, existingKeys)
                        -> getStringPropertyFromStep(root, stepPath, "tool_id") -> toolId
                        -> toolRegistryService.getToolParameters(toolId) -> params[]
                        -> findParamAtPath(params, innerPath, stateDict) -> { param, availableParams }
                        -> afterColon? valueItems(param) : nameItems(contextParams)
                     -> CompletionList
                 No  -> continue

           3. Schema completion:
              -> schemaNodeResolver.resolveSchemaContext(path) -> SchemaNode
              -> Generate field/enum completions from SchemaNode
              -> CompletionList
```

### 15.3 Tool Cache Population

```
User: Command Palette -> "Populate Tool Cache"
  -> client: PopulateToolCacheCommand.execute()
     -> GET_WORKFLOW_TOOL_IDS request to server
        -> server: iterate documentsCache.all()
           -> extractToolRefsFromDocument(doc) for each
           -> deduplicate by toolId@toolVersion
        -> return { tools: ToolRef[] }
     -> POPULATE_TOOL_CACHE request with tool list
        -> server: toolRegistryService.populateCache(tools)
           -> for each tool (concurrency=5):
              -> ToolInfoService.fetchTool(toolId, version)
                 -> ToolShed TRS API fetch -> tool XML
                 -> Parse XML -> structured tool definition
                 -> ToolCache.saveTool() -> filesystem + memory
           -> return { fetched, alreadyCached, failed[] }
     -> client: show results message
```

### 15.4 Auto-Resolution (on Document Open)

```
onDidOpen(textDocument)
  -> documentsCache.get(uri) -> docContext
  -> toolCacheService.scheduleResolution(docContext)
     -> extractToolRefsFromDocument(doc) -> ToolRef[]
     -> filter: not hasCached() -> uncached[]
     -> add to _pending map (debounced 300ms)
     -> _flushResolution():
        -> collect tools not already _inFlight
        -> toolRegistryService.populateCache(toFetch)
           -> [fetch from ToolShed...]
        -> on failure: markResolutionFailed(toolId)
        -> revalidateDocument() for all affected URIs
        -> sendNotification(TOOL_RESOLUTION_FAILED) for failures
           -> client: log to Output channel, show once-per-session warning toast
```

### 15.5 Code Action (Clean Workflow)

```
textDocument/codeAction request (cursor on legacy-tool-state diagnostic)
  -> CodeActionHandler.onCodeAction(params)
     -> filter diagnostics by code === "legacy-tool-state"
     -> if any found:
        -> languageService.cleanWorkflowText(document.getText())
        -> return CodeAction {
             title: "Clean workflow (convert tool_state to object form)"
             kind: QuickFix, isPreferred: true
             edit: WorkspaceEdit replacing full document with cleaned text
           }
  -> User applies fix -> document is replaced with cleaned content
     -> onDidChangeContent fires -> re-parse, re-validate
     -> Pass B no longer finds string tool_state -> hint disappears
     -> Pass A validates object tool_state with precise diagnostics
```

---

## 16. Build System

Two build targets per server, each with its own source subdirectory:

- **Node** (`src/node/server.ts`) -- standard Node.js LSP server, the default for desktop VS Code. Imports `FilesystemCacheStorage` / `getCacheDir` from `@galaxy-tool-util/core/node`.
- **Browser** (`src/browser/server.ts`) -- Web Worker LSP server for `vscode.dev`. Imports `IndexedDBCacheStorage` from the top-level `@galaxy-tool-util/core` entry (no Node-only symbols).

Prior to commit `e0c37a2`, browser builds relied on `tsup` shims/aliases to stub out Node-only imports. Those shims were dropped once the upstream core package split its entries, and each server's `tsup.config.ts` now just points at the two source entries directly.

Built via `tsup` (esbuild wrapper). Key scripts:

| Script | Command |
|---|---|
| `compile` | Clean + compile client + compile servers |
| `watch` | Concurrent watch mode for client and servers |
| `test` | Run client tests (Jest) + server tests (Vitest) |
| `test:e2e` | Compile + run end-to-end tests with VS Code Test API |
| `test-browser` | Launch `vscode-test-web` for browser testing |
| `vscode:prepublish` | Full compile (triggered by `vsce package`) |

The browser build excludes Node-only modules (`node:fs`, etc.). Tool cache operations that require filesystem access are not available in the browser build.

---

## 17. Testing Strategy

| Layer | Framework | Type | Scope |
|---|---|---|---|
| Client E2E | VS Code Test API + Mocha | End-to-end (real editor) | Both formats: diagnostics, commands, providers |
| Client unit | Jest | Unit | Conversion utilities, helper functions |
| Server common | Vitest (ESM) | Unit | AST helpers, tool registry, diagnostics, tool state |
| Native server | Vitest (ESM) | Unit + Integration | Parsing, rules, symbols, tool state validation |
| Format2 server | Vitest (ESM) | Unit + Integration | Parsing, completion, hover, validation, symbols |
| YAML service | Vitest (ESM) | Unit | Parser correctness, text buffer, formatting |
| Test file service | Vitest (ESM) | Unit | Completion, hover, symbols, validation |

Test data lives in `/test-data/` with sample workflows in both formats.

---

## 18. Extension Points

### Adding a new LSP feature (e.g. go-to-definition)

1. Add request/response types in `shared/src/requestsDefinitions.ts`
2. Add capability in `server.ts` `initialize()` return
3. Create handler class extending `ServerEventHandler` in `server-common/src/providers/`
4. Register handler in `GalaxyWorkflowLanguageServerImpl.registerHandlers()`
5. Implement format-specific logic in each language service
6. Add client-side registration if needed (middleware, custom routing)

### Adding a new validation rule

1. Implement the `ValidationRule` interface (`validate(doc) -> Diagnostic[]`)
2. Create rule file in the appropriate server's `validation/rules/` directory
3. Add the rule to the desired profile in that server's `initializeValidationProfiles()`

### Adding tool state support for a new parameter type

1. Add the parameter type to `@galaxy-tool-util/schema` (upstream)
2. Add type guard function (e.g. `isNewParam()`)
3. Handle in `ToolStateCompletionService.valueItems()` for completions
4. Handle in `buildParamHoverMarkdown()` for hover documentation
5. The validation pipeline handles it automatically via the upstream validator

### Pushing logic upstream to galaxy-tool-util

1. Implement in the relevant package under the `galaxy-tool-util` monorepo
2. Export from the package's `index.ts`
3. Run `npm update @galaxy-tool-util/schema` (or `core`) in the extension
4. Import and use -- no other wiring needed

---

## 19. Error Handling and Graceful Degradation

The extension degrades gracefully when tool definitions are unavailable:

| Condition | Behavior |
|---|---|
| Tool not in cache, not yet attempted | Information diagnostic on `tool_id`: "Run 'Populate Tool Cache'" |
| Tool not in cache, resolution failed | Warning diagnostic: "Could not resolve tool from ToolShed" |
| Tool in cache | Full validation, completion, and hover |
| String-encoded `tool_state` (legacy) | Hint diagnostic + "Clean workflow" quick fix; validation with reduced precision |
| Schema validation errors | Error diagnostics with precise AST ranges |
| Network unavailable | Existing cache still works; new fetches fail silently |
| Malformed `tool_state` JSON string | Silently skipped (no crash, no diagnostic) |
| `ConvertWorkflowService` errors | Returned as typed result, displayed via `showErrorMessage()` |
| Tool resolution failures | Logged to dedicated Output channel; toast shown once per session |

---

## 20. Architecture Diagram

```
+-----------------------------------------------------------------------+
|                         VS Code Editor                                 |
|  +------------------------------------------------------------------+ |
|  |                   Extension Client                                | |
|  |  +---------------------------+  +-----------------------------+  | |
|  |  | Commands (clean, convert, |  | Providers (virtual docs,    |  | |
|  |  |   export, populate cache) |  |   Git, status bar)          |  | |
|  |  +---------------------------+  +-----------------------------+  | |
|  |  +---------------------------+  +-----------------------------+  | |
|  |  | Request Router            |  | Notification Handlers       |  | |
|  |  | (routes by language ID)   |  | (tool resolution failures)  |  | |
|  |  +-------------+-------------+  +-----------------------------+  | |
|  +----------------|--------------------------------------------------+ |
+--------------------|---------------------------------------------------+
                     | IPC / Web Worker
     +---------------+----------------+
     |                                |
+----v--------+            +----------v------+
| Native      |            | Format2         |
| Server      |            | Server          |
| (.ga JSON)  |            | (.gxwf.yml YAML)|
+-------------+            +-----------------+
| Language    |            | Language        |
|  Service    |            |  Service        |
|  - JSON LS  |            |  - YAML LS      |
|  - 2-pass   |            |  - 1-pass       |
|    validate |            |    validate     |
|  - complete |            |  - complete     |
|  - hover    |            |  - hover        |
|  - format   |            |  - format       |
+------+------+            +--------+--------+
       |                            |
       +--------+       +-----------+
                |       |
        +-------v-------v--------+
        |    server-common        |
        |  +-------------------+ |
        |  | ASTNodeManager    | |
        |  | ToolRegistry      | |
        |  | ToolState helpers | |
        |  | Validation loop   | |
        |  | Diagnostic mapper | |
        |  | CodeActionHandler | |
        |  | Clean/Convert svc | |
        |  | ToolCacheService  | |
        |  | ConfigService     | |
        |  +-------------------+ |
        +-----------|------------+
                    |
        +-----------v-----------+
        |  @galaxy-tool-util    |
        |  +------+ +--------+ |
        |  | core | | schema | |
        |  +------+ +--------+ |
        +-----------|------------+
                    |
        +-----------v-----------+
        |  Galaxy ToolShed      |
        |  (TRS API)            |
        +-----------------------+
```

---

## 21. Changelog vs. Original (2026-04-12 → 2026-04-21)

Post-`2026-04-12` commits that shifted architecture into upstream `@galaxy-tool-util`:

- **`e0c37a2`** — Dropped browser shims. `@galaxy-tool-util/core` now has a split entry: top-level exports `IndexedDBCacheStorage`, `/node` subpath exports `FilesystemCacheStorage`/`getCacheDir`. Each server gained `src/node/` + `src/browser/` subdirs with separate `server.ts` entries, each binding its own `CacheStorageFactory`. `ToolRegistryService.configure()` signature changed from `{ cacheDir, toolShedUrl }` to `{ storage, toolShedUrl }`; cache-query methods (`hasCached`, `listCached`, `getToolParameters`) are now async; `cacheSize` getter replaced by `getCacheSize(): Promise<number>`.
- **`cf629f9`** — `WorkflowInput` / `WorkflowOutput` / `WorkflowDataType` / `isCompatibleType` now re-exported from `@galaxy-tool-util/schema` (locally-defined copies deleted from `server-common/utils.ts`). `WorkflowInput.doc` made optional; `WorkflowDataType` widened with `(string & {})`. Vendored `workflow-languages/schemas/tests.schema.json` (4187 lines) deleted; workflow-tests service consumes `testsSchema` from the schema package.
- **`b07e510`** — Moved off monorepo workspace deps onto published `@galaxy-tool-util/schema@0.4.0` + `@galaxy-tool-util/core@0.3.0` (core lags schema by one minor).
- **`5040bd5`** — Bumped vscode-languageserver libs, `reflect-metadata`, `@types/vscode` (inversify intentionally held back).

Commits that altered client/server surface area but not the architectural shape:

- `2c85a7f`, `a0d0760` — Added `exportTo{Format2,Native}` and `convertFileTo{Format2,Native}` commands; renamed the original conversion commands to `previewConvertTo*` (11-command list in §4.4 is current). Source split: `client/src/commands/convertFile.ts` and `previewCleanWorkflow.ts` are the current filenames (§2 had the older names).
- `b980e1e` — Conversion routing fix: format2→native commands now go through the gxFormat2 client (not native).
- `a867fb2` — Connection-source completions now handle both object-form and array-of-objects `out:` shapes.
- `2fec34e`, `6e0fc95`, `266ec6c`, `7b7bcc4`, `ffec4cd` — E2E test infrastructure expansion (hermetic empty cache, shared populated cache, conversion-suite factory, temp-fixture wrapper, IWC profile switch test, state-block completion test). No runtime behavior change; §17 summary still accurate at the level it describes.
