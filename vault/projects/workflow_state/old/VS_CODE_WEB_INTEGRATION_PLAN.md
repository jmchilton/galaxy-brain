# VS Code Web / gxwf-web Integration Plan

**Date:** 2026-04-10  
**Assumes complete:** All items in VS_CODE_ASSESSMENT.md (N1–N8, R1–R7), including native hover/completion parity and refactored server-common helpers.  
**Goal:** Full functionality on `vscode.dev` (web extension) backed by a remote `gxwf-web` server, plus a graceful degraded mode for Node desktop when gxwf-web is configured.

**No schema pack.** Tool state features in web mode require a running `tool-cache-proxy`. When [jmchilton/galaxy-tool-util-ts#44](https://github.com/jmchilton/galaxy-tool-util-ts/issues/44) lands (IndexedDB-backed `ToolInfoService`), a proxy will no longer be required for individual users — but the proxy path stays as the preferred option for team setups.

---

## Background: Why This Is Non-Trivial

The current extension works entirely in Node mode. The browser extension entry point already exists (`client/src/browser/extension.ts`, language server web worker builds), but tool operations are completely absent there because they all depend on `@galaxy-tool-util/core`'s `ToolInfoService`, which uses `node:fs`.

`gxwf-web` is a Node.js HTTP server that exposes:
- Workflow operations (validate, lint, clean, convert, roundtrip) via `GET /workflows/{path}/...`
- File management via `POST/PUT/GET/DELETE /api/contents/...` (Jupyter Contents API)
- Structural JSON Schema via `GET /api/schemas/structural`

`tool-cache-proxy` is a Node.js HTTP proxy that exposes:
- Tool metadata via `GET /api/tools/{trs_id}/versions/{version}`
- Tool JSON Schema via `GET /api/tools/{trs_id}/versions/{version}/schema`

The web extension's language servers run as **Web Workers** — they can `fetch()` but cannot use `node:fs`, `node:crypto`, or any Node built-in. The current `ToolRegistryService` must be replaced with an HTTP-based equivalent for web mode.

---

## Upstream Projects

| Project | Location |
|---|---|
| gxwf-web + gxwf-client + tool-cache-proxy | `/Users/jxc755/projects/worktrees/galaxy-tool-util` (branch `gxwf-web`) |
| VS Code extension | `/Users/jxc755/projects/worktrees/galaxy-workflows-vscode` (branch `wf_tool_state` or successor) |
| Galaxy Brain (plans) | `/Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/` |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│  VS Code (web or desktop)                                 │
│                                                           │
│  Client (extension host)                                  │
│  ├─ Commands                                              │
│  │   └─ WorkflowBackend (interface)                       │
│  │       ├─ NodeBackend  (desktop, wraps galaxy-tool-util)│
│  │       └─ GxwfWebBackend (web, uses gxwf-client)        │
│  │                                                        │
│  ├─ Native LSP server (web worker or Node)               │
│  │   └─ ToolRegistryService                              │
│  │       ├─ NodeToolRegistry  (ToolInfoService + fs)     │
│  │       └─ HttpToolRegistry  (fetch → tool-cache-proxy) │
│  │                                                        │
│  └─ Format2 LSP server (web worker or Node)              │
│      └─ ToolRegistryService (same split)                 │
│                                                           │
└──────────────────────┬───────────────────────────────────┘
                       │  HTTP
          ┌────────────┴────────────┐
          │  gxwf-web  (Node.js)    │
          │  /workflows/*           │
          │  /api/contents/*        │
          │  /api/schemas/*         │
          └────────────┬────────────┘
                       │
          ┌────────────┴────────────┐
          │  tool-cache-proxy       │
          │  /api/tools/*           │
          └─────────────────────────┘
```

Both servers may be the same process (gxwf-web can embed tool-cache-proxy) or run separately. The extension treats them as independent settings.

---

## Phase 7A: Settings, Detection, and Backend Abstraction

**Goal:** Define the seam that the rest of the phases fill in. No user-visible functionality changes yet; desktop behavior unchanged.

### 7A.1 — New VS Code Settings

Add to `package.json` `contributes.configuration`:

```json
"galaxyWorkflows.gxwfWeb.url": {
  "type": "string",
  "default": "",
  "description": "URL of a running gxwf-web server (e.g. http://localhost:8000). Required for web extension; optional on desktop."
},
"galaxyWorkflows.gxwfWeb.enabled": {
  "type": "boolean",
  "default": false,
  "description": "Use gxwf-web for workflow operations instead of local galaxy-tool-util."
},
"galaxyWorkflows.toolCacheProxy.url": {
  "type": "string",
  "default": "",
  "description": "URL of a running tool-cache-proxy server (from @galaxy-tool-util). Required for tool state completions, hover, and diagnostics in the web extension. Optional on desktop (local tool cache is used instead)."
}
```

`gxwfWeb.enabled` defaults to `false` on desktop (backward compatible) and is forced `true` on web (enforced at activation).

### 7A.2 — Environment Detection Utility

Create `client/src/common/environment.ts`:

```typescript
import * as vscode from "vscode";

export function isWebExtension(): boolean {
  return typeof process === "undefined" || process.versions?.node === undefined;
}

export function requiresRemoteBackend(): boolean {
  if (isWebExtension()) return true;
  return vscode.workspace.getConfiguration("galaxyWorkflows").get("gxwfWeb.enabled", false);
}
```

This is the single decision point used everywhere else.

### 7A.3 — IWorkflowBackend Interface

Create `client/src/backend/types.ts`:

```typescript
export interface CleanResult { before: string; after: string; removedKeyCount: number; }
export interface ConvertResult { content: string; format: "native" | "format2"; }
export interface ValidateResult { errors: DiagnosticItem[]; warnings: DiagnosticItem[]; }

export interface IWorkflowBackend {
  cleanWorkflow(uri: vscode.Uri): Promise<CleanResult>;
  convertToFormat2(uri: vscode.Uri): Promise<ConvertResult>;
  convertToNative(uri: vscode.Uri): Promise<ConvertResult>;
  populateToolCache(toolIds: string[]): Promise<{ cached: number; failed: number }>;
  getToolCacheStatus(toolIds: string[]): Promise<{ cached: number; total: number }>;
}
```

### 7A.4 — NodeBackend Implementation

Create `client/src/backend/nodeBackend.ts`. Wraps the existing LSP custom request approach (current commands talk to servers via `sendRequest(CLEAN_WORKFLOW, ...)` etc.). **No behavior change** — just moves existing command implementations behind the interface.

### 7A.5 — Wire Selection in Activation

In `client/src/common/index.ts`:

```typescript
const backend: IWorkflowBackend = requiresRemoteBackend()
  ? new GxwfWebBackend(getGxwfWebUrl())
  : new NodeBackend(nativeClient, gxFormat2Client);
```

Pass `backend` to all command registrations. Commands no longer care which implementation they're using.

**Tests:**
- Unit test `isWebExtension()` and `requiresRemoteBackend()` with mocked `process`
- Unit test that `NodeBackend` still delegates to correct LSP requests

---

## Phase 7B: GxwfWebBackend — Command Delegation

**Goal:** Implement `GxwfWebBackend` so that all existing commands work against a gxwf-web server. Desktop users who opt in (`gxwfWeb.enabled: true`) get this path; web users always use it.

### 7B.1 — Add gxwf-client Dependency

```
cd client && npm install @galaxy-tool-util/gxwf-client
```

Note: `gxwf-client` uses `openapi-fetch` which is browser-compatible (uses `fetch`). It has no Node dependencies.

### 7B.2 — Implement GxwfWebBackend

Create `client/src/backend/gxwfWebBackend.ts`:

```typescript
import { createGxwfClient, GxwfClient } from "@galaxy-tool-util/gxwf-client";

export class GxwfWebBackend implements IWorkflowBackend {
  private client: GxwfClient;
  private workflowDir: string;

  constructor(baseUrl: string, workflowDir: string) {
    this.client = createGxwfClient(baseUrl);
    this.workflowDir = workflowDir;
  }

  async cleanWorkflow(uri: vscode.Uri): Promise<CleanResult> {
    const relPath = this.toRelPath(uri);
    const { data, error } = await this.client.GET("/workflows/{workflow_path}/clean", {
      params: { path: { workflow_path: relPath } },
    });
    if (error) throw new Error(error.detail);
    return { before: data.before_content, after: data.after_content, removedKeyCount: data.total_removed };
  }

  async convertToFormat2(uri: vscode.Uri): Promise<ConvertResult> { ... }
  async convertToNative(uri: vscode.Uri): Promise<ConvertResult> { ... }
  async populateToolCache(toolIds: string[]): Promise<...> { ... /* POST /workflows/refresh */ }
}
```

**Relative path resolution:** The gxwf-web server is scoped to a directory. The extension must resolve workspace-relative paths when calling the API. Add a `resolveWorkflowDir()` helper that picks the first workspace folder containing the document.

**Error surfaces:** Map `{ detail: string }` HTTP errors to VS Code notifications (not thrown exceptions).

### 7B.3 — gxwf-web URL Validation

On activation (when `requiresRemoteBackend()` is true), validate the configured URL:

```typescript
async function pingGxwfWeb(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/workflows`);
    return res.ok;
  } catch { return false; }
}
```

If the ping fails in web mode: show an error notification with a "Configure" button that opens settings. Offer a "Start gxwf-web" button if on desktop and Node is available (out of scope for this plan, but stub the button).

### 7B.4 — Update Clean + Convert Commands to Use Backend

`client/src/commands/cleanWorkflow.ts` and `convertWorkflow.ts`: replace direct LSP custom requests with `backend.cleanWorkflow()` / `backend.convertToFormat2()` etc. The **diff preview** and **output document** logic is unchanged; only the data source changes.

**Tests:**
- Unit test `GxwfWebBackend` with a mock `fetch` that returns fixture responses
- E2E test (Node): spin up a real gxwf-web server against `test-data/` and test clean + convert commands end-to-end
- E2E test fixture: reuse existing test workflow files already in `test-data/`

---

## Phase 7C: HTTP-Based ToolRegistryService

**Goal:** Make tool state completions, hover, and validation work in web workers using `tool-cache-proxy` as the backend.

`ToolInfoService` in `@galaxy-tool-util/core` is tightly coupled to `node:fs` and cannot run in a web worker. The proxy solves this: it runs server-side (Node.js) and exposes a plain HTTP API that web workers can `fetch()`.

**Relationship to issue #44:** [jmchilton/galaxy-tool-util-ts#44](https://github.com/jmchilton/galaxy-tool-util-ts/issues/44) proposes making `ToolInfoService` itself browser-compatible via a `CacheStorage` abstraction (IndexedDB backend). When that lands, individual web users will no longer need a proxy — the extension can use `ToolInfoService` directly with `IndexedDBCacheStorage`. The `HttpToolRegistryServiceImpl` built here remains useful for team/shared-server setups. The two paths coexist; the extension picks based on what's configured.

### 7C.1 — Add HttpToolInfoService to @galaxy-tool-util/core (Upstream)

In the `galaxy-tool-util` repo, add `src/httpToolInfoService.ts`:

```typescript
export class HttpToolInfoService {
  constructor(private proxyUrl: string) {}

  async hasCached(toolId: string, version?: string): Promise<boolean> {
    const res = await fetch(`${this.proxyUrl}/api/tools/${encodeTrsId(toolId)}/versions/${version ?? "latest"}`);
    return res.ok;
  }

  async getToolParams(toolId: string, version?: string): Promise<ParsedTool | null> {
    const res = await fetch(`${this.proxyUrl}/api/tools/${encodeTrsId(toolId)}/versions/${version ?? "latest"}`);
    if (!res.ok) return null;
    return res.json();
  }

  async listCached(): Promise<ToolCoordinates[]> {
    const res = await fetch(`${this.proxyUrl}/api/tools`);
    if (!res.ok) return [];
    return res.json();
  }
}
```

Uses only `fetch` — works in both Node and browser/web worker environments.

**Export from `@galaxy-tool-util/core` index.ts** alongside `ToolInfoService`.

`tool-cache-proxy` already exposes the required routes (`GET /api/tools`, `GET /api/tools/{trs_id}/versions/{version}`). No server-side changes needed.

### 7C.2 — HttpToolRegistryService in server-common

Create `server/packages/server-common/src/providers/httpToolRegistry.ts`:

```typescript
import { HttpToolInfoService } from "@galaxy-tool-util/core";

export class HttpToolRegistryServiceImpl implements ToolRegistryService {
  private service: HttpToolInfoService;

  constructor(proxyUrl: string) {
    this.service = new HttpToolInfoService(proxyUrl);
  }

  async hasCached(toolId: string, version?: string) { ... }
  async getToolParams(toolId: string, version?: string) { ... }
  async validateNativeStep(...) { ... }  // same as current, but params come from HTTP
  async validateFormat2StepState(...) { ... }
}
```

### 7C.3 — Inversify Binding Selection in Browser Servers

In each server's browser entry point (`browser/server.ts`), detect whether a proxy URL was passed (via initialization options from client) and bind accordingly:

```typescript
// browser/server.ts
const connection = createConnection(messageReader, messageWriter);
connection.onInitialize((params) => {
  const proxyUrl = (params.initializationOptions as any)?.toolCacheProxyUrl;
  if (proxyUrl) {
    container.bind(TYPES.ToolRegistryService).to(HttpToolRegistryServiceImpl)
      .withConstructor(proxyUrl);
  } else {
    container.bind(TYPES.ToolRegistryService).to(NullToolRegistryServiceImpl);  // no-op, graceful degradation
  }
});
```

### 7C.4 — Pass Proxy URL from Client to Language Servers

In `client/src/browser/extension.ts`, read `galaxyWorkflows.toolCacheProxy.url` from settings and pass it as `initializationOptions` when creating both language clients.

### 7C.5 — NullToolRegistryService (Graceful Degradation)

If no proxy URL is configured, bind `NullToolRegistryServiceImpl` which:
- Returns `hasCached: false` for all tools
- Returns empty diagnostics (no tool state errors — better than crashing)
- Shows a one-time info notification: "Tool state features require a tool-cache-proxy. Configure `galaxyWorkflows.toolCacheProxy.url`."

**Tests:**
- Unit test `HttpToolRegistryServiceImpl` with a mocked `fetch`
- Unit test `NullToolRegistryServiceImpl` returns empty results without throwing
- Integration test: run `tool-cache-proxy` against the real test cache and verify completions + validation work via HTTP

---

## Phase 7D: Diagnostic Delegation to gxwf-web (Hybrid Validation)

**Goal:** In web mode, supplement LSP diagnostics with server-side validation from gxwf-web's `/validate` endpoint. This handles cases where tool-cache-proxy is not configured but gxwf-web is.

This is a **hybrid** approach: the LSP server continues to provide structural (schema) diagnostics and syntax errors from its local parse. For tool state diagnostics, it falls back to gxwf-web validation results when `HttpToolRegistryService` is unavailable.

### 7D.1 — GxwfWebValidationService in server-common

Create `server/packages/server-common/src/services/gxwfWebValidationService.ts`:

```typescript
export class GxwfWebValidationService {
  constructor(private gxwfWebUrl: string, private workflowRelPath: string) {}

  async validate(documentText: string): Promise<Diagnostic[]> {
    // gxwf-web validates by file path, not by content upload
    // So this only works if the file is on disk and within the gxwf-web directory
    const url = `${this.gxwfWebUrl}/workflows/${encodeURIComponent(this.workflowRelPath)}/validate`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const report: SingleValidationReport = await res.json();
    return mapValidationReportToDiagnostics(report);
  }
}
```

**Limitation:** gxwf-web validates the file on disk, not the in-editor buffer. This means diagnostics lag behind edits until save. Document this clearly.

**Mapping `SingleValidationReport` → `Diagnostic[]`:** The report gives step-level error counts and structure errors. Range information is not available from gxwf-web — map to document-level or step-level ranges using existing AST lookup (find the step's range by step_id/name).

### 7D.2 — Integrate into Validation Pipeline

In each server's `doValidation()`:

```typescript
const diagnostics = await languageService.doValidation(document);

if (this.gxwfWebValidationService && !this.toolRegistry.isAvailable()) {
  const remoteDiagnostics = await this.gxwfWebValidationService.validate(document.textDocument.getText());
  diagnostics.push(...remoteDiagnostics);
}
```

The condition ensures remote validation only runs when local tool validation is unavailable, preventing duplication.

### 7D.3 — Debounce

Remote validation HTTP calls must be debounced (at least 500ms after last edit). Add a debounce wrapper around `gxwfWebValidationService.validate()` calls. The LSP framework's existing debounce handles local validation; remote calls need their own timer.

**Tests:**
- Unit test `mapValidationReportToDiagnostics()` with fixture reports from `@galaxy-tool-util/schema`'s test helpers
- Integration test with live gxwf-web: edit a workflow file with a known bad parameter, save, verify diagnostic appears

---

## Phase 7E: Browser Extension — Full Assembly

**Goal:** Wire all the above pieces into the browser extension entry point so web users get a complete experience.

### 7E.1 — Browser Extension Activation (`client/src/browser/extension.ts`)

Full activation sequence:

```typescript
export async function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("galaxyWorkflows");
  const gxwfWebUrl = config.get<string>("gxwfWeb.url", "");
  const proxyUrl = config.get<string>("toolCacheProxy.url", "");

  // Validate server connectivity
  if (!gxwfWebUrl) {
    vscode.window.showWarningMessage(
      "Galaxy Workflows: gxwf-web URL not configured. Tool operations unavailable.",
      "Configure"
    ).then(action => { if (action === "Configure") vscode.commands.executeCommand("workbench.action.openSettings", "galaxyWorkflows.gxwfWeb.url"); });
  }

  // Create typed backend
  const backend: IWorkflowBackend = gxwfWebUrl
    ? new GxwfWebBackend(gxwfWebUrl, getWorkflowDirectory())
    : new NoOpBackend();  // commands show "requires gxwf-web" messages

  // Start language servers (web workers)
  const nativeClient = createWebNativeClient(context, { toolCacheProxyUrl: proxyUrl, gxwfWebUrl });
  const gxFormat2Client = createWebFormat2Client(context, { toolCacheProxyUrl: proxyUrl, gxwfWebUrl });

  // Common init (same as Node)
  initExtension(context, nativeClient, gxFormat2Client, backend);
}
```

### 7E.2 — LanguageClient Factory for Web

Extract a `createWebLanguageClient()` factory that configures the correct web worker transport and passes initialization options. Refactor `createNodeLanguageClient()` similarly. The `initExtension()` function accepts pre-built clients.

### 7E.3 — Browser Build Verification

Add a `build:browser-check` script that:
1. Builds the browser extension bundle
2. Runs it through a Node + `vm` sandbox that simulates absence of Node built-ins
3. Asserts no `require('fs')` or `require('crypto')` appears in the web bundle output

This prevents Node-only code from accidentally re-entering the browser bundle.

### 7E.4 — vscode.dev Testing

Set up a `test:web` target using VS Code's `@vscode/test-web` package:

```json
"test:web": "vscode-test-web --extensionDevelopmentPath=. --extensionTestsPath=dist/web/test/suite --browserType chromium"
```

Test scenarios:
1. Extension activates without crash when no gxwf-web URL configured
2. Extension activates with gxwf-web URL, commands appear enabled
3. Diagnostics appear (schema errors) without any server
4. Tool state diagnostics appear (with gxwf-web + proxy configured)

**Tests:**
- All above + smoke test for completion in web worker (via `@vscode/test-web`)

---

## Phase 7F: Contents API Integration (Optional / Stretch)

**Goal:** Allow the extension to open and manage workflow files directly through gxwf-web's Jupyter Contents API. This enables a fully remote workflow editing experience with no local checkout.

### 7F.1 — Virtual Filesystem Provider

Implement a `GxwfWebFileSystemProvider` using `vscode.FileSystemProvider`:

```typescript
export class GxwfWebFileSystemProvider implements vscode.FileSystemProvider {
  constructor(private client: GxwfClient, private scheme: string) {}

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const { data } = await this.client.GET("/api/contents/{path}", {
      params: { path: { path: uri.path }, query: { content: "1", format: "text" } },
    });
    return new TextEncoder().encode(data.content as string);
  }

  async writeFile(uri: vscode.Uri, content: Uint8Array, ...): Promise<void> {
    await this.client.PUT("/api/contents/{path}", {
      params: { path: { path: uri.path } },
      body: { type: "file", format: "text", content: new TextDecoder().decode(content) },
    });
  }

  async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> { ... }
  async createDirectory(uri: vscode.Uri): Promise<void> { ... }
  async delete(uri: vscode.Uri, ...): Promise<void> { ... }
  async rename(oldUri: vscode.Uri, newUri: vscode.Uri, ...): Promise<void> { ... }
}
```

Register with scheme `gxwf` (`vscode.workspace.registerFileSystemProvider("gxwf", provider)`).

### 7F.2 — "Open gxwf-web Workspace" Command

Add `galaxyWorkflows.openRemoteWorkspace` command:

1. Prompt for gxwf-web URL if not configured
2. `vscode.workspace.updateWorkspaceFolders(0, 0, { uri: vscode.Uri.parse("gxwf:/workflows"), name: "gxwf-web Workflows" })`
3. Explorer shows remote workflow files via the FileSystemProvider

### 7F.3 — Checkpoint UI

Add `galaxyWorkflows.createCheckpoint` and `galaxyWorkflows.restoreCheckpoint` commands that call the Contents API checkpoint endpoints. Expose in the workflow file's context menu.

**Note:** Phase 7F is fully optional. The core web integration (7A–7E) does not depend on it. It enables a truly server-side-only workflow editing experience but is a significant scope increase.

---

## Migration and Compatibility

### Desktop Users (No gxwf-web)

- `gxwfWeb.enabled: false` (default) — **zero behavior change**. All existing commands and features work as before via local `galaxy-tool-util`.

### Desktop Users (gxwf-web opt-in)

- Set `gxwfWeb.enabled: true` and `gxwfWeb.url`
- Commands delegate to gxwf-web; tool cache managed by server
- Useful for teams sharing a workflow development server

### Web Extension Users (vscode.dev)

- Forced into gxwf-web mode
- Must configure `gxwfWeb.url` to get workflow commands (clean, convert, etc.)
- Must configure `toolCacheProxy.url` to get tool state completions/hover/diagnostics
- Without either: structural schema validation and syntax errors still work (no server needed)
- After [#44](https://github.com/jmchilton/galaxy-tool-util-ts/issues/44) lands: `toolCacheProxy.url` will become optional for individual users (IndexedDB-backed cache replaces it)

---

## Dependency Summary

| New Dependency | Where | Justification |
|---|---|---|
| `@galaxy-tool-util/gxwf-client` | `client/` | Typed HTTP client, browser-compatible |
| `@vscode/test-web` | dev | Web extension test runner |
| `process/browser`, `buffer/` | already present in tsup config | Shims for browser bundle |

**Upstream changes needed:**
- `@galaxy-tool-util/core`: Add `HttpToolInfoService` (fetch-based, no Node deps) — Phase 7C.1
- `@galaxy-tool-util/core`: `CacheStorage` abstraction + `IndexedDBCacheStorage` — tracked in [#44](https://github.com/jmchilton/galaxy-tool-util-ts/issues/44), not required to ship Phase 7C but unlocks proxy-free web usage afterward

`gxwf-web` and `tool-cache-proxy` are used as-is; no server-side changes needed.

---

## Open Questions

1. Should `tool-cache-proxy` and `gxwf-web` be combined into a single server process for simpler user setup? (Currently two separate servers = two separate settings = friction.)
2. How should the extension handle gxwf-web serving a *different* directory than the open workspace? Should it auto-configure based on the workspace folder, or always require explicit URL+path config?
3. Does gxwf-web need authentication support (e.g., Bearer token) for team server scenarios? Currently it's open with `*` CORS.
4. For Phase 7F (Contents API): does the extension need to handle conflict detection (mtime-based) in the file system provider? VS Code's workspace API doesn't directly expose `If-Unmodified-Since` headers.
5. Is the `gxwf-web` server expected to run locally (localhost) or potentially remotely (behind a tunnel or SSH forward)? This affects UX copy and setup guides.
6. After [#44](https://github.com/jmchilton/galaxy-tool-util-ts/issues/44) lands: should the extension auto-detect the best registry (IndexedDB vs proxy vs null) based on what's configured, or always require explicit opt-in?
