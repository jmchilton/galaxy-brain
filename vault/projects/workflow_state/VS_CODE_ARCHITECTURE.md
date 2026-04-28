# VS Code Galaxy Workflows Extension -- Architecture

**Date:** 2026-04-12 (reviewed/updated 2026-04-23)
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
- Tool-info hover on `tool_id` (name, description, license, EDAM, xrefs, help excerpt, ToolShed link)
- Inline CodeLens on every step's `tool_id` (cache-state icon + click action: Open in ToolShed / retry / populate)
- "Workflow Tools" Explorer tree view listing each step's tool with cached/uncached/failed icons and inline actions
- "Insert Tool Step…" command with ToolShed search (QuickPick) and auto-built step skeleton

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
|   |   |   +-- populateToolCacheForTool.ts  # Per-tool retry (CodeLens target)
|   |   |   +-- openToolInToolShed.ts / refreshToolsView.ts / revealToolStep.ts  # Workflow-tools view actions
|   |   |   +-- insertToolStep.ts / insertToolStepHelpers.ts  # "Insert Tool Step…" (search + skeleton insert)
|   |   |   +-- selectForCleanCompare.ts / compareCleanWith.ts  # Git clean-diff
|   |   +-- providers/                # Virtual document providers
|   |   |   +-- cleanWorkflowProvider.ts           # Fetches cleaned content from server
|   |   |   +-- cleanWorkflowDocumentProvider.ts   # Virtual doc scheme for clean preview
|   |   |   +-- convertedWorkflowDocumentProvider.ts # Virtual doc scheme for conversion preview
|   |   |   +-- workflowToolsTreeProvider.ts       # Explorer tree view + reveal/openToolShed helpers
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
|       |   |   |   +-- codeLensHandler.ts       # CodeLens dispatcher (tool_id lenses)
|       |   |   |   +-- completionHandler.ts     # LSP completion dispatcher
|       |   |   |   +-- formattingHandler.ts     # Document formatting dispatcher
|       |   |   |   +-- hover/hoverHandler.ts    # Hover dispatcher + contributors
|       |   |   |   +-- hover/toolIdHover.ts     # Tool-info hover for cursor on tool_id
|       |   |   |   +-- hover/toolInfoMarkdown.ts # Shared ParsedTool -> markdown block
|       |   |   |   +-- hover/toolShedUrl.ts     # Derive repo URL from a Galaxy tool id
|       |   |   |   +-- symbolsHandler.ts        # Document symbols dispatcher
|       |   |   |   +-- handler.ts               # ServerEventHandler base class
|       |   |   |   +-- toolIdCodeLens.ts        # Build per-step tool_id CodeLenses
|       |   |   |   +-- toolRegistry.ts          # ToolRegistryServiceImpl
|       |   |   |   +-- toolStateCompletion.ts   # ToolStateCompletionService (shared)
|       |   |   |   +-- validation/
|       |   |   |       +-- toolStateValidation.ts    # runObjectStateValidationLoop()
|       |   |   |       +-- toolStateDiagnostics.ts   # Diagnostic builders + mapToolStateDiagnosticsToLSP()
|       |   |   |       +-- toolStateAstHelpers.ts    # AST helpers for tool_state navigation
|       |   |   |       +-- profiles.ts               # Validation profile definitions
|       |   |   +-- services/
|       |   |       +-- index.ts                 # ServiceBase abstract class
|       |   |       +-- toolSearchService.ts     # ToolSearchLspService (SEARCH_TOOLS, GET_STEP_SKELETON)
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
|       +-- toolStatePresentation.ts # Shared presentation atoms (icons, action labels, headlines)
+-- workflow-languages/              # TextMate grammars + language configurations
|   +-- syntaxes/                    # .tmLanguage.json files (JSON, YAML)
|   +-- configurations/             # Language configuration JSON
+-- test-data/                       # Sample workflow files for tests
+-- assets/                          # Extension icon
```

---

## 3. Upstream Dependencies

The extension depends on three packages from the `galaxy-tool-util` TypeScript monorepo:

| Package | Role |
|---|---|
| `@galaxy-tool-util/core` (+ `/node` subpath) | `ToolInfoService` -- fetches tool XML from Galaxy ToolShed TRS API, parses it into structured tool definitions. Pluggable `CacheStorage` backends: `IndexedDBCacheStorage` (exported from the top-level entry, used by browser builds) and `FilesystemCacheStorage` + `getCacheDir()` (exported from the `/node` subpath, used by Node builds). The extension never imports Node-only modules into browser bundles — each server has separate `node/server.ts` and `browser/server.ts` entries that bind the appropriate `CacheStorage` factory via Inversify. |
| `@galaxy-tool-util/search` | `ToolSearchService` -- queries Tool Shed search endpoints across configured sources and returns ranked `NormalizedToolHit[]`. Also exposes `getLatestVersionForToolId()` used by `GET_STEP_SKELETON` when the caller doesn't pin a version. Instantiated once in `ToolRegistryServiceImpl.configure()` alongside the `ToolInfoService`; exposed via `getSearchService()`. |
| `@galaxy-tool-util/schema` | Effect-based schemas for Galaxy workflow types AND workflow-tests. `cleanWorkflow()` -- strips runtime-only properties and decodes string-encoded `tool_state`. `toFormat2Stateful()` / `toNativeStateful()` -- bidirectional conversion preserving tool state. `ToolStateValidator` -- validates tool state dicts against parsed tool parameter schemas. `findParamAtPath()` -- navigates tool parameter trees for completion/hover. `lintWorkflow()` -- additional structural lint rules. `buildStep()` -- synthesizes a native or Format2 step skeleton from a `ParsedTool` (used by `GET_STEP_SKELETON`). `ParsedTool` type (name, version, description, license, EDAM ops/topics, xrefs, citations, help) -- surfaced in hover and tree tooltip. Canonical DTOs: `WorkflowInput`, `WorkflowOutput`, `WorkflowDataType` (re-exported from `server-common/languageTypes` and `shared/requestsDefinitions`). Utilities: `isCompatibleType`, type guards (`isBooleanParam`, `isConditionalParam`, `isRepeatParam`, `isSectionParam`, `isSelectParam`). Workflow-tests JSON Schema is sourced from `testsSchema` in this package -- the previously-vendored `workflow-languages/schemas/tests.schema.json` has been removed. |

Effect Schemas (`@effect/schema`) are compiled to JSON Schema at startup via `EffectJSONSchema.make()` and handed to the underlying JSON/YAML language services for structural validation.

**Published versions (as of 2026-04-23):** `@galaxy-tool-util/schema@0.4.0`, `@galaxy-tool-util/core@0.3.0`, `@galaxy-tool-util/search@^0.2.0`. These are the floor; bump in lockstep when matching releases ship.

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
5. Subscribes to `TOOL_RESOLUTION_FAILED` notifications from **both** servers (either server's auto-resolution flow can emit them, depending on which one owns the document) and surfaces them via an Output channel + a once-per-session warning toast.
6. Creates the `ToolCacheStatusBar` which polls the native server's cache size.
7. Creates the `WorkflowToolsTreeProvider`, registers the `galaxyWorkflows.toolsView` Explorer tree, and wires active-editor / document-change / `TOOL_RESOLUTION_FAILED` events to refresh it (text changes debounced ~500ms).

### 4.2 Language Client Configuration

Both clients share the same `LanguageClientOptions` builder. Each client's `documentSelector` limits which files it handles:

- Native client: `{ language: "galaxyworkflow", scheme: "file" }`
- Format2 client: `{ language: "gxformat2" }`, `{ language: "gxwftests" }`

The native client can also pass `toolAutoResolution: true` in `initializationOptions` to enable proactive tool resolution on document open (the format2 server uses this).

### 4.3 Custom LSP Request Routing

`client/src/requests/gxworkflows.ts` registers handlers for custom requests (`GET_WORKFLOW_INPUTS`, `GET_WORKFLOW_OUTPUTS`, etc.) that choose which language client to use based on the active document or the URI's extension. This allows commands to work transparently regardless of which server owns the document.

### 4.4 Commands

18 commands are registered in `package.json` under `contributes.commands`:

| Command ID | Enabled When | Behavior |
|---|---|---|
| `previewCleanWorkflow` | `.ga` open | Sends `CLEAN_WORKFLOW_CONTENTS` to server, opens diff editor showing cleaned vs. original |
| `cleanWorkflow` | `.ga` open | Sends `CLEAN_WORKFLOW_DOCUMENT` to server, which applies a workspace edit in-place |
| `selectForCleanCompare` | Git context | Stores a reference to a workflow revision for later comparison |
| `compareCleanWith` | After select | Opens diff of two cleaned workflow revisions (Git timeline/explorer) |
| `populateToolCache` | Always | Sends `GET_WORKFLOW_TOOL_IDS` then `POPULATE_TOOL_CACHE` to server |
| `populateToolCacheForTool` | Hidden (`when: false`) | Per-tool retry invoked by the "Resolution failed — retry" CodeLens; sends `POPULATE_TOOL_CACHE_FOR_TOOL` |
| `insertToolStep` | `.ga` or `.gxwf.yml` open | Prompts for search term, sends `SEARCH_TOOLS`, shows QuickPick, sends `GET_STEP_SKELETON`, applies a `WorkspaceEdit` inserting the built step |
| `openToolInToolShed` | Workflow Tools view item / CodeLens | Opens the tool's ToolShed repo page in the external browser |
| `revealToolStep` | Workflow Tools view item | Selects and scrolls to the step's `tool_id` in the active editor |
| `refreshToolsView` | Workflow Tools view title | Re-queries `GET_WORKFLOW_TOOLS` and refreshes the tree |
| `previewConvertToFormat2` | `.ga` open | Shows conversion preview in diff editor |
| `previewConvertToNative` | `.gxwf.yml` open | Shows conversion preview in diff editor |
| `exportToFormat2` | `.ga` open | Converts and writes a new `.gxwf.yml` file alongside the original |
| `exportToNative` | `.gxwf.yml` open | Converts and writes a new `.ga` file alongside the original |
| `convertFileToFormat2` | `.ga` open | Replaces the file's content with converted Format2 YAML |
| `convertFileToNative` | `.gxwf.yml` open | Replaces the file's content with converted native JSON |
| `previewMermaidDiagram` | `.ga` or `.gxwf.yml` open | Opens (or focuses) a `WebviewPanel` for the active workflow; sends `RENDER_WORKFLOW_DIAGRAM` and re-renders on edit (debounced 400 ms) |
| `exportMermaid` | `.ga` or `.gxwf.yml` open | Writes the rendered mermaid source as `<stem>.mmd` alongside the workflow; "Reveal in Explorer" follow-up |

Commands appear in the command palette, editor context menu, and explorer context menu (for Git comparison commands), controlled by `when` clauses in `package.json`.

### 4.5 Virtual Document Providers

Preview and diff operations use VS Code's virtual document system:

- **`CleanWorkflowDocumentProvider`** -- registered under a custom URI scheme. When VS Code opens a URI like `galaxy-clean-workflow:///path.ga`, it sends `CLEAN_WORKFLOW_CONTENTS` to the server and returns the cleaned text.
- **`ConvertedWorkflowDocumentProvider`** -- similar scheme for conversion previews.

These providers enable read-only diff views without modifying the original file.

The diagram preview uses a different mechanism — a `WebviewPanel` rather than a virtual document — owned by `DiagramPreviewPanelManager` (`client/src/providers/diagramPreviewPanelManager.ts`). One panel per `(documentUri, format)` pair (re-invoking the command reveals the existing panel). On `{type: "ready"}` from the bundled webview script, the manager sends `RENDER_WORKFLOW_DIAGRAM` to whichever language client matches `document.languageId` and posts the result back as `{type: "render", payload, error}`. A `RenderScheduler` (per-key debouncer, no vscode dep, tested with Jest fake timers) collapses rapid `onDidChangeTextDocument` events into a single re-render after 400 ms; `onDidCloseTextDocument` disposes the panel. The webview HTML template is loaded via `workspace.fs.readFile` so the same code path works in the Node and browser hosts; the bundled JS lives at `client/dist/media/diagram/<format>.global.js` (tsup IIFE convention) and renders SVG locally with no network access.

### 4.6 Status Bar

`ToolCacheStatusBar` displays `"Tools: N cached"` in the status bar. It polls the server via `GET_TOOL_CACHE_STATUS` on a timer and updates the count.

### 4.7 Settings

Defined in `package.json` under `contributes.configuration`:

| Setting | Type | Default | Scope | Description |
|---|---|---|---|---|
| `galaxyWorkflows.validation.profile` | `"basic"` or `"iwc"` | `"basic"` | resource | Validation strictness level |
| `galaxyWorkflows.toolCache.directory` | string | `~/.galaxy/tool_info_cache` | machine | Filesystem path to shared tool cache |
| `galaxyWorkflows.toolShed.url` | string | `https://toolshed.g2.bx.psu.edu` | machine | ToolShed base URL for fetching tool definitions |

### 4.8 Workflow Tools Tree View

`client/src/providers/workflowToolsTreeProvider.ts`

`WorkflowToolsTreeProvider` implements `TreeDataProvider<WorkflowToolItem>` and feeds the `galaxyWorkflows.toolsView` Explorer view (visibility gated on `resourceExtname` in `.ga/.yml/.yaml`). Data comes from the `GET_WORKFLOW_TOOLS` custom request, routed to whichever server owns the active document:

- **Icon per state** -- `ThemeIcon(TOOL_STATE_ICON_NAME[state])` resolved from `shared/src/toolStatePresentation.ts` (`cached → check`, `uncached → info`, `failed → error`). Same atoms are reused by hover and CodeLens.
- **Tooltip** -- `MarkdownString` with tool name, version, `tool_id`, description, a cache-state hint, and an `[Open in ToolShed](url)` link when the tool id is a ToolShed-style id.
- **Inline item actions** (declared in `package.json` under `view/item/context`, group `inline@1 / inline@2`): `revealToolStep` (selects the step's `tool_id` range in the editor) and `openToolInToolShed` (opens the repo URL via `env.openExternal`).
- **Title action**: `refreshToolsView` (re-queries).
- **Refresh triggers**: `onDidChangeActiveTextEditor`, `onDidSaveTextDocument`, debounced `onDidChangeTextDocument`, and `TOOL_RESOLUTION_FAILED` notifications from either client.
- `WorkflowToolEntry.range` is supplied by the server and lets `revealToolStep` scroll/select without re-parsing on the client.

### 4.9 Insert Tool Step Command

`client/src/commands/insertToolStep.ts` + `insertToolStepHelpers.ts`

`InsertToolStepCommand` (a `CustomCommand` subclass, so it holds references to both clients via its constructor) drives a four-step pipeline:

1. **Input box** (`window.showInputBox`) -- prompts for a search term. Also accepts a scripted `{ query, autoPickToolIdContains }` args object so tests (see `insertToolStep.e2e.ts`) and future code actions can drive the pipeline UI-free.
2. **`SEARCH_TOOLS`** -- sent to the client for the active document's format, wrapped in a `ProgressLocation.Window` progress notification.
3. **`QuickPick`** of `ToolSearchHit`s -- label = tool name, description = `owner/repo · version`, detail = truncated description, plus a per-item "Open in ToolShed" button (icon `link-external`) that opens `<toolshedUrl>/view/<owner>/<repo>`.
4. **`GET_STEP_SKELETON`** -- returns a ready-to-serialize step object. The command then applies a single `WorkspaceEdit` that rewrites the entire document text (via `insertNativeStep` or `insertFormat2Step` helpers that splice the step into the existing JSON/YAML) and moves the cursor to the inserted `tool_id` line.

A reentrancy guard (`_inFlight`) prevents overlapping invocations. The command is contributed under `commandPalette` and gated on `resourceLangId == galaxyworkflow || resourceLangId == gxformat2`.

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
| `codeLensProvider` | `resolveProvider: false` — all lens titles/commands are built eagerly |

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
| `CodeLensHandler` | `textDocument/codeLens` | `languageService.doCodeLens()` — both language services delegate to `buildToolIdCodeLenses()` in server-common |

Each handler looks up the `DocumentContext` from the cache, resolves the correct `LanguageService` by language ID, and delegates.

### 5.5 Custom LSP Services

`ServiceBase` is the abstract base for services that register custom LSP request handlers (as opposed to standard LSP methods). Services are registered in `GalaxyWorkflowLanguageServerImpl.registerServices()`:

| Service | Custom Requests Handled |
|---|---|
| `CleanWorkflowService` | `CLEAN_WORKFLOW_DOCUMENT`, `CLEAN_WORKFLOW_CONTENTS` |
| `ConvertWorkflowService` | `CONVERT_WORKFLOW_CONTENTS` |
| `RenderDiagramService` | `RENDER_WORKFLOW_DIAGRAM` |
| `ToolCacheService` | `GET_WORKFLOW_TOOL_IDS`, `POPULATE_TOOL_CACHE`, `POPULATE_TOOL_CACHE_FOR_TOOL`, `GET_TOOL_CACHE_STATUS`, `GET_WORKFLOW_TOOLS` |
| `ToolSearchLspService` | `SEARCH_TOOLS`, `GET_STEP_SKELETON` |

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
  getToolInfo(toolId: string, toolVersion?: string): Promise<ParsedTool | null>;
  populateCache(tools: ToolRef[]): Promise<PopulateToolCacheResult>;
  validateNativeStep(toolId, toolVersion, toolState, inputConnections?): Promise<ToolStateDiagnostic[]>;
  hasResolutionFailed(toolId, toolVersion?): boolean;
  markResolutionFailed(toolId, toolVersion?): void;
  clearResolutionFailed(toolId, toolVersion?): void;
  getToolShedBaseUrl(): string | undefined;
  getSearchService(): ToolSearchService | undefined;
}
```

**Cache lifecycle:**

1. On `configure()`, creates a new `ToolInfoService` with the specified `CacheStorage` (Node: `FilesystemCacheStorage`; browser: `IndexedDBCacheStorage`) and ToolShed URL. The storage instance is produced by the injected `CacheStorageFactory`, not by the registry itself — the registry is storage-agnostic.
2. `hasCached()` is async and delegates to `ToolInfoService.cache.hasCached()` (storage-backed; no in-memory mirror).
3. `populateCache()` batch-fetches tools from the ToolShed with concurrency of 5. Returns `{ fetched, alreadyCached, failed }`.
4. `getToolParameters()` returns the parsed tool input parameters from cache, or `null` if not cached. Does not trigger network fetches.
5. `getCacheSize()` returns the current cached-tool count (replaced the old sync `cacheSize` getter when storage became async).
6. A `_resolutionFailed` set tracks tools that couldn't be resolved, preventing repeated fetch attempts. `populateCache()` clears the flag for every tool whose fetch succeeds, so a manual retry (via the "Resolution failed — retry" CodeLens or the batch `Populate Tool Cache` command) can recover without a server restart. `clearResolutionFailed()` is also exposed directly.
7. `configure()` also instantiates a `ToolSearchService` from `@galaxy-tool-util/search` with the same sources (currently a single `{ type: "toolshed", url }`) and the shared `ToolInfoService`; `getSearchService()` returns it to the `ToolSearchLspService`.
8. `getToolInfo()` returns the full `ParsedTool` (name, description, version, license, help, EDAM, xrefs, citations) when cached. Used by hover, the CodeLens, and the `GET_WORKFLOW_TOOLS` handler to populate UI metadata.

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

### 7.3 Workflow Tools Provider (`GET_WORKFLOW_TOOLS`)

Also implemented in `ToolCacheService`. For a given document URI:

1. `extractStepSummariesFromDocument(doc)` walks the document's `getStepNodes()` and returns per-step `{ stepId, label, toolId, toolVersion, toolIdRange }` summaries. The same helper also powers `buildToolIdCodeLenses` — it was consolidated in commit `1c3e471` to keep native and format2 walkers in sync.
2. For each step with a tool id: resolve cached/resolution-failed state, fetch `ParsedTool` via `getToolInfo()` when cached (to surface `name` + `description`), and compute `toolshedUrl` via `parseToolShedRepoUrl()`.
3. Return `WorkflowToolEntry[]` (see §14).

The handler is AST-backed end-to-end — `toolIdRange` comes from the `StringASTNode` that holds the `tool_id` value, so `revealToolStep` can scroll the editor without re-parsing client-side.

### 7.4 Tool Search LSP Service

`server/packages/server-common/src/services/toolSearchService.ts` — `ToolSearchLspService` (extends `ServiceBase`). Two requests:

- **`SEARCH_TOOLS`** `{ query, pageSize?, maxResults? }` → `{ hits: ToolSearchHit[], truncated }`. Delegates to `ToolSearchService.searchTools()`, fetches `maxResults + 1` to set the `truncated` flag, then flattens each upstream `NormalizedToolHit` into the wire-shape `ToolSearchHit` (keeping `toolshedUrl`, `trsToolId`, `fullToolId`, `version`, `changesetRevision`, display fields).
- **`GET_STEP_SKELETON`** `{ toolshedUrl, trsToolId, version?, format, stepIndex?, label? }` → `{ step, error? }`. If `version` is omitted, calls `ToolSearchService.getLatestVersionForToolId()`. Reconstructs the `<host>/repos/<owner>/<repo>/<toolId>/<version>` Galaxy tool id from the TRS-style id, calls `populateCache()` to guarantee the tool is in cache, then `getToolInfo()` + `buildStep({ tool, format, stepIndex, label })` from `@galaxy-tool-util/schema`. Errors are returned as `{ step: null, error }` strings rather than thrown.

Both handlers are format-agnostic — the `format: "native" | "format2"` flag on `GET_STEP_SKELETON` is the only place the output shape diverges (dict-of-dicts vs. array-of-objects step; JSON vs. YAML is handled client-side by the insert helpers).

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

### 8.8 Tool-Id Hover

`server/packages/server-common/src/providers/hover/toolIdHover.ts` — `buildToolIdHover()`

Triggered when the cursor is on a `tool_id` property (key or value) inside any `steps` context. Flow:

1. Navigate up from the cursor node to find the enclosing `tool_id` `PropertyASTNode`; require the property's path to contain `"steps"`.
2. Read `tool_version` from the sibling step property.
3. Degraded states first:
   - `hasResolutionFailed()` → markdown headline `TOOL_RESOLUTION_FAILED_HEADLINE` + the tool id in code.
   - Not cached → `TOOL_NOT_CACHED_HEADLINE` + `TOOL_NOT_CACHED_HINT` (mentions the `Populate Tool Cache` command by name, via the shared presentation atoms).
4. Cached → `buildToolInfoMarkdown(parsedTool)` which emits: bold name, `id@version` code span, description as a blockquote, a bullet list of license / EDAM operations / EDAM topics / xrefs (with deep links for `bio.tools` and `bioconductor`) / citation count / `[Open in ToolShed](url)`, then a truncated help excerpt (default 500 chars).

Both format-specific hover services call this before falling back to tool-state / schema hovers. Unit tests in `server-common/tests/unit/toolIdHover.test.ts` + `toolInfoMarkdown.test.ts` cover the rendering; integration tests in each server's `tests/integration/{native,format2}ToolIdHover.test.ts` cover the wiring end-to-end.

### 8.9 Tool-Id CodeLens

`server/packages/server-common/src/providers/toolIdCodeLens.ts` — `buildToolIdCodeLenses()`

Emits one CodeLens anchored at each step's `tool_id` value range. Title format is `$(icon) <name> <version> · <action>` where the icon/action pair varies by state:

| State | Icon | Title / command |
|---|---|---|
| `hasResolutionFailed` | `$(error)` | `… · Resolution failed — retry` → `galaxy-workflows.populateToolCacheForTool({ toolId, toolVersion })` |
| Not cached | `$(info)` | `… · Run Populate Tool Cache` → `galaxy-workflows.populateToolCache` (batch) |
| Cached, ToolShed id | `$(check)` | `… · Open in ToolShed` → `galaxy-workflows.openToolInToolShed({ toolId, toolVersion, toolshedUrl })` |
| Cached, built-in tool | `$(check)` | Title only, empty `command: ""` — VS Code renders it as plain non-clickable text so the icon + name/version still show |

For cached tools, the display name and version come from the fetched `ParsedTool` (falls back to raw `toolId`/`toolVersion` when unavailable). Both language services expose `doCodeLens()` that delegates here; `CodeLensHandler` dispatches `textDocument/codeLens` to the service matching the document's language.

The per-tool retry (`populateToolCacheForTool`) is a separate command + LSP request (`POPULATE_TOOL_CACHE_FOR_TOOL`) precisely so the CodeLens can target a single tool rather than re-fetching every tool in the document. Successful single-tool retries clear the `_resolutionFailed` flag (see §7.1), so the lens flips to `Open in ToolShed` / cached state on the next render.

### 8.10 Shared Presentation Atoms

`shared/src/toolStatePresentation.ts`

A small module used by hover, CodeLens, and the tree view to keep wording and iconography in lockstep:

- `ToolState = "cached" | "uncached" | "failed"` with `TOOL_STATE_ICON_NAME` mapping (`check` / `info` / `error`).
- `toolStateIconMarkup(state)` — returns `$(name)` for server-side Markdown/CodeLens titles.
- `POPULATE_TOOL_CACHE_COMMAND_NAME`, `OPEN_IN_TOOLSHED_ACTION`, `RETRY_ACTION`, `RUN_POPULATE_TOOL_CACHE_ACTION` — action labels.
- `TOOL_NOT_CACHED_HEADLINE`, `TOOL_RESOLUTION_FAILED_HEADLINE`, `TOOL_NOT_CACHED_HINT` — headlines/hints for degraded hovers and tooltips.

Client code imports these (via the `../../shared/src/...` relative path, as with `requestsDefinitions.ts`) to build its `ThemeIcon`s and `MarkdownString` tooltips, so changes to icon choice or action wording propagate to all three surfaces at once.

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

### 10.3 RenderDiagramService

`server/packages/server-common/src/services/renderDiagramService.ts`

Handles `RENDER_WORKFLOW_DIAGRAM` requests. Detects the source format via `ServiceBase.detectLanguageId()` and delegates to `languageService.renderDiagram(text, format, options?)`. The format-specific implementations parse the workflow (JSON for native, YAML for format2) and dispatch on `format`:

- `"mermaid"` → `workflowToMermaid(dict, options)` from `@galaxy-tool-util/schema`. The function accepts a native dict, a format2 dict, or a pre-normalized `NormalizedFormat2Workflow`; it normalizes internally via `ensureFormat2()`.
- `"cytoscape"` → throws `"not yet implemented"`. The dispatch case is in place so the second renderer ships as a server-only patch + a sibling webview bundle.

Errors are returned as typed results (`{ contents: "", error }`) so the client/webview can show them inline rather than as a toast. The `LanguageServiceBase` default implementation throws `"not implemented"`, mirroring `convertWorkflowText`.

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

**Diagram rendering** (`renderDiagram()`): `JSON.parse` then dispatch on the requested `DiagramFormat` — `"mermaid"` calls `workflowToMermaid()` from `@galaxy-tool-util/schema`; `"cytoscape"` throws pending upstream support.

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

**Diagram rendering** (`renderDiagram()`): YAML-parses the document then dispatches on the requested `DiagramFormat` (mermaid implemented; cytoscape stubbed). Same dispatch shape as the native service.

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
| `getWorkflowTools` | `{ uri }` | `{ tools: WorkflowToolEntry[] }` |
| `populateToolCache` | `{ tools: ToolRef[] }` | `{ fetched, alreadyCached, failed[] }` |
| `populateToolCacheForTool` | `{ toolId, toolVersion? }` | `{ fetched, alreadyCached, failed[] }` (same shape; single-element list) |
| `getToolCacheStatus` | -- | `{ cacheSize }` |
| `convertWorkflowContents` | `{ contents, targetFormat, clean? }` | `{ contents, error? }` |
| `renderWorkflowDiagram` | `{ contents, format: DiagramFormat, options?: Record<string, unknown> }` | `{ contents, error? }` |
| `searchTools` | `{ query, pageSize?, maxResults? }` | `{ hits: ToolSearchHit[], truncated }` |
| `getStepSkeleton` | `{ toolshedUrl, trsToolId, version?, format, stepIndex?, label? }` | `{ step, error? }` |

**Notifications (server -> client):**

| Identifier | Params |
|---|---|
| `toolResolutionFailed` | `{ failures: Array<{ toolId, error }> }` |

**Shared types:**

- `WorkflowInput { name, type: WorkflowDataType, doc?, default?, optional? }` (re-exported from `@galaxy-tool-util/schema`)
- `WorkflowOutput { name, uuid?, doc?, type? }` (re-exported from `@galaxy-tool-util/schema`)
- `ToolRef { toolId, toolVersion? }`
- `WorkflowToolEntry { stepId, stepLabel?, toolId, toolVersion?, cached, resolutionFailed, name?, description?, toolshedUrl?, range: LSPRange }` (one per workflow step; feeds the Workflow Tools tree view)
- `ToolSearchHit { toolshedUrl, toolId, toolName, toolDescription, repoName, repoOwnerUsername, score, version?, changesetRevision?, trsToolId, fullToolId }` — structurally mirrors `NormalizedToolHit` from `@galaxy-tool-util/search`; `trsToolId` (`<owner>~<repo>~<toolId>`) feeds `GET_STEP_SKELETON`
- `LSPRange { start: { line, character }, end: { line, character } }` — inlined subset of the LSP `Range` type so `shared/` stays free of `vscode-languageserver-types` (the client doesn't depend on it)
- `WorkflowDataType` -- union `"boolean" | "collection" | "color" | "data" | "double" | "File" | "float" | "int" | "integer" | "long" | "null" | "string" | "text"` widened with `(string & {})` to stay structurally compatible with the upstream schema package (which accepts custom datatype strings). The known union still drives autocomplete; `isCompatibleType()` is also re-exported from the schema package.
- `DiagramFormat` -- union `"mermaid" | "cytoscape"`. The wire shape carries a `string` payload regardless of renderer (mermaid emits its own DSL string; cytoscape will emit `JSON.stringify(elements)` once upstream lands), so the protocol stays uniform across renderers. `RENDER_WORKFLOW_DIAGRAM` is a contents-based request (raw text rather than URI) for the same reason as `CONVERT_WORKFLOW_CONTENTS` — the client previews unsaved edits.

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

The diagram preview feature spans all three test layers: server unit + integration tests cover `RenderDiagramService` and each language service's `renderDiagram()` (mermaid output and the cytoscape stub branch); client jest tests cover the standalone `RenderScheduler` debouncer with fake timers; client E2E (`diagramPreview.e2e.ts`) sends `RENDER_WORKFLOW_DIAGRAM` through the real LSP transport for both formats and exercises the `exportMermaid` command end-to-end. Webview-DOM assertions (asserting actual SVG is drawn inside the panel) are intentionally out of scope for the existing harness — tracked under [davelopez#86](https://github.com/davelopez/galaxy-workflows-vscode/issues/86) for an opt-in `wdio-vscode-service` target.

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

## 21. Changelog vs. Original (2026-04-12 → 2026-04-23)

### Tool-discovery surfaces (2026-04-21 → 2026-04-23)

A cluster of commits added richer tool interactions on top of the existing cache infrastructure — all three surfaces (hover, CodeLens, tree view) share the same `ToolRegistryService` and the presentation atoms in `shared/src/toolStatePresentation.ts`.

- **`997bc95`** — Tool-info hover on `tool_id` for `.ga` and `.gxwf.yml`. New helpers in `server-common/src/providers/hover/`: `toolIdHover.ts`, `toolInfoMarkdown.ts`, `toolShedUrl.ts`. Both format-specific hover services call `buildToolIdHover()` before falling back to tool-state / schema hovers. `ToolRegistryService.getToolInfo()` added.
- **`1284d92`** — Workflow Tools Explorer tree view. New `GET_WORKFLOW_TOOLS` request (payload `WorkflowToolEntry[]`), new `WorkflowToolsTreeProvider` client-side, new commands `refreshToolsView`/`revealToolStep`/`openToolInToolShed`, new view contribution `galaxyWorkflows.toolsView`.
- **`595397e`** — CodeLens on `tool_id` with per-tool retry. New `CodeLensHandler`, `buildToolIdCodeLenses()`, `doCodeLens()` added to both language services, new capability `codeLensProvider`. New command `populateToolCacheForTool` + LSP request `POPULATE_TOOL_CACHE_FOR_TOOL`.
- **`55ac53b`** — `populateCache()` clears the `_resolutionFailed` flag for every successfully-fetched tool, so a per-tool retry (or a batch populate) flips the CodeLens back to the cached state without a server restart.
- **`1c3e471`** — Consolidated native and format2 step walkers into a shared `getStepNodes()` helper used by both `GET_WORKFLOW_TOOLS` and the CodeLens builder; the previous duplicate walkers in `toolCacheService` were collapsed.
- **`c8ff43b`** — Hoisted presentation atoms into `shared/src/toolStatePresentation.ts`; hover, CodeLens, and tree view now pull icons + wording from the same module.
- **`64b5132`** — E2E tests for the Workflow Tools view and `tool_id` CodeLens (`toolsView.e2e.ts`, `codeLens.e2e.ts`).
- **`c749823`** — Subscribe both clients to `TOOL_RESOLUTION_FAILED` (previously native-only). Either server's auto-resolution flow can emit the notification depending on which one owns the document.
- **`e5029ea`** — Extracted the new workflow-tools commands into `CustomCommand` subclasses (`openToolInToolShed.ts`, `refreshToolsView.ts`, `revealToolStep.ts`), pulling wiring out of `common/index.ts`.
- **`1284d92` + `595397e` + `4591ec3`** — `shared/src/requestsDefinitions.ts` grew `LSPRange`, `WorkflowToolEntry`, `PopulateToolCacheForToolParams`, `ToolSearchHit`, `SearchToolsParams/Result`, `GetStepSkeletonParams/Result`.
- **`4591ec3`** — Insert Tool Step command. New client command `insertToolStep` with input-box → `SEARCH_TOOLS` → QuickPick → `GET_STEP_SKELETON` → `WorkspaceEdit` pipeline. New server service `ToolSearchLspService`. New upstream dep `@galaxy-tool-util/search` (adds `ToolSearchService.searchTools()` + `getLatestVersionForToolId()`). `buildStep()` from `@galaxy-tool-util/schema` is the skeleton builder. Live-ToolShed E2E test verifies the full flow.

### Earlier (2026-04-12 → 2026-04-21)

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
