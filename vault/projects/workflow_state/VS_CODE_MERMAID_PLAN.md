# VS Code — Workflow Diagram Preview (Mermaid + Cytoscape)

**Date:** 2026-04-27
**Branch (target):** new branch off `main`, e.g. `wf_diagram_preview`
**Scope of first pass:** Mermaid only. Architecture must accommodate Cytoscape as a drop-in second renderer with no protocol changes.

Cross-references: see `VS_CODE_ARCHITECTURE.md` §4.5 (virtual doc providers), §4.4 (commands), §5.5 (custom LSP services), §10 (CleanWorkflowService / ConvertWorkflowService — closest existing analogues), §14 (custom LSP protocol).

---

## 1. Goal

Add a "Preview Workflow Diagram" command to the editor that opens a webview rendering the active workflow as an interactive graph. First pass renders **Mermaid**; the same plumbing must support a future **Cytoscape** renderer by changing only one enum value and one webview module.

Behavior:

- Works for both `.ga` (native) and `.gxwf.yml` (Format2) — upstream `workflowToMermaid()` already handles both via `ensureFormat2()`.
- Re-renders when the source document changes (debounced).
- One panel per workflow URI; re-invoking focuses the existing panel.
- Browser build (`vscode.dev`) supported — webview content is local assets, no network.
- Future: `previewCytoscapeDiagram` command using the same panel infrastructure.

In scope (first pass):
- Mermaid preview command + webview, both formats.
- Live re-render on edit (400ms debounce).
- Export-to-file companion: `galaxy-workflows.exportMermaid` writes `<workflow-name>.mmd` alongside the source. (Cheap once the LSP request exists; this PR is already a substantial overhaul, so bundle it.)
- `comments: true` always passed to `workflowToMermaid` — no toggle UI.

Non-goals (first pass):
- Click-to-jump from a node to its step in the source editor — explicitly reserved as v2 follow-up; the protocol/webview leave room (see §6 #6).
- Cytoscape implementation — separate agent is adding `workflowToCytoscape` upstream; this PR only stubs the dispatch case.
- IWC-style theming, fullscreen, or zoom controls beyond what mermaid/cytoscape ship.
- Renderer toggle UI (one panel that swaps mermaid↔cytoscape). Per-format panels (separate commands) keep keying simple; revisit after cytoscape lands.

---

## 2. Upstream Status

- `@galaxy-tool-util/schema` exports `workflowToMermaid(workflow, { comments?: boolean }): string` and `MermaidOptions`. Source: `packages/schema/src/workflow/mermaid.ts`. Accepts native dict, Format2 dict, or pre-normalized form — calls `ensureFormat2()` internally.
- `@galaxy-tool-util/cli` has `gxwf mermaid` using the same function.
- **`workflowToCytoscape` is being added upstream by a separate agent.** Plan assumes a parallel signature: `workflowToCytoscape(workflow, opts?): CytoscapeElementsJson` (object). The LSP wire shape uses `string`, so cytoscape will return `JSON.stringify(elements)` — keeps the protocol uniform. This PR adds the dispatch case but throws until upstream lands; the cytoscape webview/command ships in a follow-up PR.

Versions in `package.json` are already on `^1.1.0` for `@galaxy-tool-util/{core,schema,search}`. Confirm `workflowToMermaid` is exported in the installed version (check `node_modules/@galaxy-tool-util/schema/dist/index.d.ts`); bump the floor if needed.

---

## 3. Architecture Overview

Three layers, mirroring `convertWorkflow` exactly on the server side, plus a webview on the client.

```
┌──────────────────────────────────────────────────────────────┐
│ Client                                                        │
│  Command: previewWorkflowDiagram (format = "mermaid")         │
│    ↓                                                          │
│  DiagramPreviewPanelManager                                   │
│    - one WebviewPanel per (uri, format)                       │
│    - subscribes onDidChangeTextDocument (debounced 400ms)     │
│    ↓                                                          │
│  LSP RENDER_WORKFLOW_DIAGRAM { contents, format }             │
│                          ↓                                    │
└──────────────────────────┼────────────────────────────────────┘
                           │
┌──────────────────────────┼────────────────────────────────────┐
│ Server (server-common)   ↓                                    │
│  RenderDiagramService (extends ServiceBase)                   │
│    - detectLanguageId(contents) → route to language service   │
│    - languageService.renderDiagram(text, format) → string     │
│  Native LS:  workflowToMermaid(JSON.parse(text))              │
│  Format2 LS: workflowToMermaid(yamlParse(text))               │
└───────────────────────────────────────────────────────────────┘
```

Webview holds the only renderer-specific logic: a single bundled JS module (`mermaid` for the first pass, swap to `cytoscape` later) that consumes the rendered string.

---

## 4. Server-Side Work

### 4.1 Shared protocol (`shared/src/requestsDefinitions.ts`)

Add:

```ts
export type DiagramFormat = "mermaid" | "cytoscape";

export interface RenderWorkflowDiagramParams {
  contents: string;
  format: DiagramFormat;
  /** Renderer-specific options; serialized as-is. Mermaid: { comments?: boolean }. */
  options?: Record<string, unknown>;
}

export interface RenderWorkflowDiagramResult {
  contents: string;     // mermaid → "graph LR ..."; cytoscape → JSON.stringify(elements)
  error?: string;
}
```

Add identifier:

```ts
LSRequestIdentifiers.RENDER_WORKFLOW_DIAGRAM = "galaxy-workflows-ls.renderWorkflowDiagram";
```

### 4.2 Language service interface (`server-common/src/languageTypes.ts`)

Extend `LanguageServiceBase` with an abstract-ish method (default throws, like `convertWorkflowText`):

```ts
public renderDiagram(_text: string, _format: DiagramFormat, _options?: object): Promise<string> {
  throw new Error("renderDiagram not implemented for this language service");
}
```

### 4.3 Native language service

`server/gx-workflow-ls-native/src/languageService.ts`:

```ts
import { workflowToMermaid } from "@galaxy-tool-util/schema";

public async renderDiagram(text: string, format: DiagramFormat, options?: MermaidOptions): Promise<string> {
  const wf = JSON.parse(text);
  switch (format) {
    case "mermaid":   return workflowToMermaid(wf, options ?? {});
    case "cytoscape": throw new Error("Cytoscape not yet implemented");
  }
}
```

### 4.4 Format2 language service

`server/gx-workflow-ls-format2/src/languageService.ts`: same body but parse via the YAML library already in use (`yaml.parse(text)` — check what `convertWorkflowText` uses and reuse). The upstream `workflowToMermaid` accepts the parsed Format2 dict directly.

### 4.5 RenderDiagramService

New file `server/packages/server-common/src/services/renderDiagramService.ts`, modeled exactly on `convertWorkflow.ts` (see §10.2 of architecture doc):

```ts
export class RenderDiagramService extends ServiceBase {
  public static register(server) { return new RenderDiagramService(server); }

  protected listenToRequests(): void {
    this.server.connection.onRequest(
      LSRequestIdentifiers.RENDER_WORKFLOW_DIAGRAM,
      (params) => this.onRender(params)
    );
  }

  private async onRender(params: RenderWorkflowDiagramParams): Promise<RenderWorkflowDiagramResult> {
    try {
      const languageId = this.detectLanguageId(params.contents);
      const ls = this.server.getLanguageServiceById(languageId);
      const contents = await ls.renderDiagram(params.contents, params.format, params.options);
      return { contents };
    } catch (error) {
      return { contents: "", error: String(error) };
    }
  }
}
```

Register it in `GalaxyWorkflowLanguageServerImpl.registerServices()` alongside `ConvertWorkflowService`.

### 4.6 Why send `contents` over the wire (not URI)?

Same rationale as `CONVERT_WORKFLOW_CONTENTS`: lets the client preview unsaved edits. The webview always sends the editor's current text, debounced.

---

## 5. Client-Side Work

### 5.1 Command classes

`client/src/commands/previewWorkflowDiagram.ts`:

```ts
export class PreviewMermaidDiagramCommand extends CustomCommand {
  readonly identifier = getCommandFullIdentifier("previewMermaidDiagram");
  constructor(
    private nativeClient: BaseLanguageClient,
    private format2Client: BaseLanguageClient,
    private panelManager: DiagramPreviewPanelManager,
  ) { super(nativeClient); }

  async execute(_args: unknown[]): Promise<void> {
    const editor = window.activeTextEditor;
    if (!editor) return;
    await this.panelManager.openOrFocus(editor.document, "mermaid");
  }
}
```

`client/src/commands/exportWorkflowDiagram.ts` — companion export command:

```ts
export class ExportMermaidDiagramCommand extends CustomCommand {
  readonly identifier = getCommandFullIdentifier("exportMermaid");
  // execute: pick the right client by languageId, sendRequest(RENDER_WORKFLOW_DIAGRAM,
  // { contents, format: "mermaid", options: { comments: true } }),
  // write result.contents to <workflow-stem>.mmd alongside the source via workspace.fs,
  // showInformationMessage with a "Reveal in Explorer" action on success,
  // showErrorMessage on { error }.
}
```

Cytoscape preview/export commands ship in the follow-up PR with the same shape — `format: "cytoscape"`, `.cyjs` extension, same panel manager.

### 5.2 Panel manager

`client/src/providers/diagramPreviewPanelManager.ts`. Single file, ~200 LOC. Responsibilities:

- Maintain `Map<key, WebviewPanel>` where `key = ${uri}::${format}`. Reuse on re-invocation; `panel.reveal()` if it exists.
- On panel creation:
  1. `window.createWebviewPanel("galaxyWorkflowDiagram", title, ViewColumn.Beside, { enableScripts: true, localResourceRoots: [extensionUri/media] })`.
  2. Set HTML from `media/diagram/<format>.html` template (read once, string-substitute for the `<script src>` URI via `webview.asWebviewUri`).
  3. Subscribe `webview.onDidReceiveMessage` for `{ type: "ready" }` (do initial render) and `{ type: "error", message }` (forward to OutputChannel).
  4. Subscribe `workspace.onDidChangeTextDocument` filtered to this URI, debounced **400ms** → re-render. (Starting value; tune if rendering on large IWC workflows feels laggy.)
  5. Subscribe `workspace.onDidCloseTextDocument` → dispose panel.
  6. `panel.onDidDispose` → cleanup map + dispose subscriptions.
- Render flow: pick the right `BaseLanguageClient` by `document.languageId` (native vs format2), `client.sendRequest(RENDER_WORKFLOW_DIAGRAM, { contents: doc.getText(), format, options: { comments: true } })`, `panel.webview.postMessage({ type: "render", format, payload: result.contents, error: result.error })`.

Routing logic mirrors `client/src/requests/gxworkflows.ts` — extract a small helper if not already shared.

### 5.3 Webview HTML + JS

Layout: `client/media/diagram/`

```
client/media/diagram/
├── mermaid.html          # template; <div id="root"></div> + <script src="{{mainJs}}"></script>
├── mermaid.js            # bundled client code: imports mermaid, listens for postMessage
├── cytoscape.html        # later
├── cytoscape.js          # later
└── shared.css            # minimal (background, container sizing)
```

`mermaid.js` (entry):

```js
import mermaid from "mermaid";
mermaid.initialize({ startOnLoad: false, theme: "default" });

const root = document.getElementById("root");
const vscode = acquireVsCodeApi();

window.addEventListener("message", async (ev) => {
  const msg = ev.data;
  if (msg.type === "render") {
    if (msg.error) { root.innerHTML = `<pre class="error">${msg.error}</pre>`; return; }
    try {
      const { svg } = await mermaid.render("diagram", msg.payload);
      root.innerHTML = svg;
    } catch (e) {
      root.innerHTML = `<pre class="error">${e}</pre>`;
      vscode.postMessage({ type: "error", message: String(e) });
    }
  }
});

vscode.postMessage({ type: "ready" });
```

Bundled with esbuild. Add to `client/tsup.config.ts` (or a sibling esbuild script in `package.json` scripts):

```ts
{
  entry: { "media/diagram/mermaid": "src/webview/diagram/mermaid.ts" },
  outDir: "dist",
  format: ["iife"],
  platform: "browser",
  external: [],
  bundle: true,
  sourcemap: true,
}
```

Source moves under `client/src/webview/diagram/mermaid.ts` so TypeScript checking covers it; the HTML template lives at `client/media/diagram/mermaid.html` (static, copied to dist or referenced directly via `extensionUri`).

CSP: webview HTML must include a Content-Security-Policy meta tag. Pattern:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none';
               style-src ${cspSource} 'unsafe-inline';
               script-src ${cspSource};
               font-src ${cspSource};
               img-src ${cspSource} data:;">
```

(`unsafe-inline` for styles is required because `mermaid` injects `<style>` tags during render. If we want to tighten this later, use a nonce.)

### 5.4 Wiring in `setupCommands()`

`client/src/commands/setup.ts`:

```ts
const diagramPanelManager = new DiagramPreviewPanelManager(context, nativeClient, gxFormat2Client);
context.subscriptions.push(diagramPanelManager);
context.subscriptions.push(new PreviewMermaidDiagramCommand(nativeClient, gxFormat2Client, diagramPanelManager).register());
context.subscriptions.push(new ExportMermaidDiagramCommand(nativeClient, gxFormat2Client).register());
```

### 5.5 `package.json` contributions

```json
"commands": [
  {
    "command": "galaxy-workflows.previewMermaidDiagram",
    "title": "Galaxy Workflows: Preview Diagram (Mermaid)",
    "icon": "$(graph)"
  },
  {
    "command": "galaxy-workflows.exportMermaid",
    "title": "Galaxy Workflows: Export as Mermaid (.mmd)"
  }
],
"menus": {
  "editor/title": [
    {
      "command": "galaxy-workflows.previewMermaidDiagram",
      "when": "resourceLangId == galaxyworkflow || resourceLangId == gxformat2",
      "group": "navigation"
    }
  ],
  "commandPalette": [
    {
      "command": "galaxy-workflows.previewMermaidDiagram",
      "when": "resourceLangId == galaxyworkflow || resourceLangId == gxformat2"
    },
    {
      "command": "galaxy-workflows.exportMermaid",
      "when": "resourceLangId == galaxyworkflow || resourceLangId == gxformat2"
    }
  ]
}
```

---

## 6. Cytoscape-Ready Design Notes

Concrete extension points so the second pass is mechanical:

1. **Wire shape** — `format: DiagramFormat` and `contents: string` already cover both. Cytoscape returns `JSON.stringify(elements)`; webview parses it.
2. **Server LS dispatch** — `renderDiagram(text, format, options)` already switches on `format`; cytoscape adds one case calling `workflowToCytoscape` (once upstream exists). Until then the case throws and the client surfaces the error gracefully.
3. **Webview** — separate `cytoscape.html` + bundled `cytoscape.js` entry point; the panel manager picks the file based on `format`. Mermaid bundle and Cytoscape bundle don't share weight.
4. **Panel keying** — `${uri}::${format}` already permits both panels open simultaneously for the same workflow.
5. **Live update** — debounced `onDidChangeTextDocument` is renderer-agnostic; cytoscape's `cy.json({ elements })` replaces the graph in place without recreating the instance — defer that optimization.
6. **Click-to-jump (committed v2 follow-up)** — webview → extension via `postMessage({ type: "selectStep", stepId })`. Extension uses the existing `revealToolStep` plumbing (`client/src/commands/revealToolStep.ts`) to scroll the editor. Both renderers emit the same message — cytoscape via `cy.on("tap", "node", …)`, mermaid via DOM click handlers on `[id^="flowchart-"]` nodes. To preserve room: server includes a `stepId` per node in mermaid output as a node-id suffix or via the existing label, and the cytoscape elements carry `data.stepId`. Track `getStepNodes()` ranges for the existing `revealToolStep` so mapping `stepId → Range` is one lookup. Not implemented this PR; structures must not preclude it.

---

## 7. Build Considerations

- **Bundle size** — `mermaid` is ~1MB minified. Acceptable as a separate webview bundle (loaded only when the panel opens, not at extension activation).
- **Browser build (`vscode.dev`)** — webview JS is identical Node/browser; the LSP server (Web Worker) needs `workflowToMermaid` available, which `@galaxy-tool-util/schema` exports universally (no Node-only deps in the function — verify by reading `mermaid.ts`: it's pure string manipulation + `ensureFormat2`, no fs).
- **Source layout** — webview code under `client/src/webview/diagram/` (TS-checked); compiled to `dist/media/diagram/*.js`; extension reads it via `Uri.joinPath(context.extensionUri, "dist/media/diagram/mermaid.js")`.
- **Reuse vs new bundle target** — extension bundle (Node, cjs) is wrong format for webview. Add a third `tsup` target with `format: "iife"`, `platform: "browser"`. Watch mode picks it up automatically.
- **Asset packaging** — `.vscodeignore` must NOT exclude `dist/media/`. Verify with `vsce ls`.

---

## 8. Testing Plan

Red-to-green for each layer.

### 8.1 Server unit tests (Vitest)

`server/packages/server-common/tests/unit/renderDiagramService.test.ts`:

- Mock `LanguageService.renderDiagram` to return `"graph LR\nA-->B"`; assert request handler returns `{ contents: "graph LR\nA-->B" }`.
- Throwing service → result `{ contents: "", error }`.
- Format dispatch: native vs format2 detection via `detectLanguageId`.

`server/gx-workflow-ls-native/tests/integration/renderMermaid.test.ts`:

- Load `test-data/*.ga` fixture, call `nativeLanguageService.renderDiagram(text, "mermaid")`, assert output starts with `"graph LR"` and contains expected node ids derived from step labels in the fixture.

`server/gx-workflow-ls-format2/tests/integration/renderMermaid.test.ts`: same with `.gxwf.yml` fixture.

### 8.2 Client unit tests (Jest)

`client/tests/unit/diagramPreviewPanelManager.test.ts`:

- Mock `BaseLanguageClient.sendRequest` and a fake `WebviewPanel`; verify:
  - `openOrFocus` creates panel on first call, reveals on second.
  - `onDidChangeTextDocument` for the panel's URI triggers a re-render after debounce.
  - URI scheme mismatch (different document) does NOT trigger.
  - Render error from server is forwarded to webview as `{ type: "render", error }`.

### 8.3 E2E test (VS Code Test API)

`client/tests/e2e/diagramPreview.e2e.ts`:

- Open a fixture `.ga`, run `commands.executeCommand("galaxy-workflows.previewMermaidDiagram")`.
- Wait for panel to appear (`window.tabGroups` check).
- Cannot directly inspect webview DOM in standard API → assert via a back-channel: panel manager exposes a `whenRendered(uri)` promise that resolves when webview posts `{ type: "ready" }` then receives the first render. Test awaits it.
- Edit the document, await second render notification, verify the panel's last-rendered string differs.

### 8.4 Manual checks

- Both formats render. Tested workflows: a multi-step IWC workflow, one with subworkflows, one with parameter inputs.
- Error path: corrupt the YAML mid-edit → webview shows `<pre class="error">…</pre>`, panel doesn't crash, fixing the error recovers.
- Run inside `vscode-test-web` (browser host) to confirm the webview renders without filesystem access.
- Theme: dark / light / high-contrast. Mermaid auto-theme via `theme: "dark"` when `document.body.classList.contains("vscode-dark")` — set this in `mermaid.js` before `initialize`.

---

## 9. Implementation Order (suggested commits)

Status as of 2026-04-27 (branch `wf_tool_state`):

1. ✅ **Protocol + server stub** (commit `492494d`) — `shared/` types + identifier, `RenderDiagramService`, `LanguageServiceBase.renderDiagram` default-throw, native + format2 implementations calling `workflowToMermaid`. Cytoscape case throws `"not yet implemented"`. 6 server unit tests + 5 integration tests passing; full server suite 440/440.
2. ✅ **Webview bundle target** (commit `a52ec96`) — third tsup entry (`iife`/`browser`), `client/src/webview/diagram/mermaid.ts`, `client/media/diagram/mermaid.html` + `shared.css`. Output is `dist/media/diagram/mermaid.global.js` (tsup IIFE convention adds `.global.js` — accepted, panel manager references that exact name). Mermaid `^11.14.0` added as a client dep.
3. ✅ **Panel manager + preview command** (commit `70cb06c`) — `DiagramPreviewPanelManager` with `Map<uri::format, PanelEntry>`, `PreviewMermaidDiagramCommand`, wired in `setupCommands`. `package.json` contributes the command + commandPalette + editor/title menu entries. HTML template loaded via `workspace.fs.readFile` (works in both Node and browser hosts).
4. ✅ **Live update** (commit `06881f9`) — debounced 400ms via extracted `RenderScheduler` (per-key, hooks-injectable for fake timers). Subscribes `onDidChangeTextDocument` filtered to entry URI; `onDidCloseTextDocument` disposes the panel. 7 jest unit tests; full client jest suite 58/58.
5. ⏭️ **Export command** — `ExportMermaidDiagramCommand` writes `.mmd` alongside source; manual check: file written, "Reveal in Explorer" works.
6. ⏭️ **Tests** — partially landed (server unit + integration in commit 1; LSP-wire E2E in commit `81accd2`; scheduler unit tests in commit 4). Outstanding: panel-manager / DOM-level coverage — deferred to upstream issue [davelopez#86](https://github.com/davelopez/galaxy-workflows-vscode/issues/86) (wdio-vscode-service harness, opt-in `npm run test:wdio` target).
7. ⏭️ **Docs** — README section + update `VS_CODE_ARCHITECTURE.md` with new service / provider entries.

Layer-1 LSP-wire E2E (commit `81accd2`, 4 tests in `client/tests/e2e/suite/diagramPreview.e2e.ts`) covers both formats, malformed input, and the cytoscape stub branch through the real LSP transport. Layer-2 (panel + render postMessage) was rejected in favour of the wdio follow-up to avoid leaking test-only message types into the webview script.

---

## 10. Files Touched (Summary)

**New (✅ landed unless marked ⏭️):**
- ✅ `server/packages/server-common/src/services/renderDiagramService.ts`
- ✅ `server/packages/server-common/tests/unit/renderDiagramService.test.ts`
- ✅ `server/gx-workflow-ls-native/tests/integration/renderMermaid.test.ts`
- ✅ `server/gx-workflow-ls-format2/tests/integration/renderMermaid.test.ts`
- ✅ `client/src/commands/previewWorkflowDiagram.ts`
- ⏭️ `client/src/commands/exportWorkflowDiagram.ts`
- ✅ `client/src/providers/diagramPreviewPanelManager.ts`
- ✅ `client/src/providers/renderScheduler.ts`
- ✅ `client/src/webview/diagram/mermaid.ts`
- ✅ `client/media/diagram/mermaid.html`
- ✅ `client/media/diagram/shared.css`
- ✅ `client/tests/e2e/suite/diagramPreview.e2e.ts`
- ✅ `client/tests/unit/renderScheduler.test.ts`

**Modified:**
- `shared/src/requestsDefinitions.ts` — add types + identifier.
- `server/packages/server-common/src/languageTypes.ts` — `renderDiagram` on `LanguageServiceBase`.
- `server/packages/server-common/src/server.ts` — register service.
- `server/gx-workflow-ls-native/src/languageService.ts` — implement.
- `server/gx-workflow-ls-format2/src/languageService.ts` — implement.
- `client/src/commands/setup.ts` — wire command + panel manager.
- `client/tsup.config.ts` — webview bundle target.
- `client/.vscodeignore` (if it excludes `dist/media`) — verify.
- `package.json` — command + menu contributions.

---

## 11. Decisions and Remaining Questions

**Locked in:**
- `comments: true` always passed to `workflowToMermaid`. No toggle UI.
- Cytoscape upstream owned by separate agent — this PR stubs the dispatch and ships mermaid only.
- Per-format panels (separate preview commands per renderer). No renderer-toggle UI.
- Click-to-jump (`selectStep`) — committed v2 follow-up; structures here must not preclude it (server emits `stepId` per node, panel manager reserves the message type).
- Export-to-file (`exportMermaid` → `.mmd` alongside source) bundled in this PR.
- Live-update debounce starts at 400ms.

**Still open (lower stakes):**
- Theming: dark/light via `document.body.classList` for v1 (✅ implemented in `mermaid.ts`); mapping VS Code theme tokens into mermaid CSS vars later.
- Error UX: in-panel `<pre>` only, or also one-shot `showErrorMessage`? Current behaviour: in-panel `<pre>` + console error log, no toast. Revisit if user feedback wants louder failures.
- 400ms debounce vs. lower (250ms) — tune empirically against IWC-sized workflows once panel works.
- Webview-DOM E2E coverage parked under [davelopez#86](https://github.com/davelopez/galaxy-workflows-vscode/issues/86) — pursue once that infrastructure lands or for the click-to-jump v2 milestone, whichever comes first.
