# VS Code Tool Info Hover + Workflow Tools Tree + CodeLens — Plan

**Date:** 2026-04-21
**Branch base:** `wf_tool_state`
**Worktree:** `/Users/jxc755/projects/worktrees/galaxy-workflows-vscode/branch/wf_tool_state`
**Companion doc:** `VS_CODE_ARCHITECTURE.md` (same folder) — read first for the lay of the land.

## Progress

- **Step 1 — Tool info hover on `tool_id`** ✅ committed as `997bc95` (2026-04-21). 35 new tests (4 suites). Full suite: 401 pass + 3 pre-existing unrelated fails in `workflow-tests` hover.
- **Step 2 — Workflow Tools tree view** ✅ committed as `1284d92` (2026-04-21). 7 new tests (server integration × 2, client Jest × 4). Full suites: server 404 pass + same 3 pre-existing fails, client 47 pass. **E2E (`toolsView.e2e.ts`) deferred — server integration + client unit cover the logic; the E2E can land as a follow-up.**
- **Step 3 — CodeLens on `tool_id` + per-tool retry** ✅ committed as `595397e` (2026-04-21). Unit: 6 codelens builder + 3 populateForTool handler. Integration: 3 native + 3 format2 language-service doCodeLens. Full server suite: 419 pass + same 3 pre-existing workflow-tests hover failures. **E2E (`codeLens.e2e.ts`) deferred — unit + integration cover the logic, same pattern as Step 2's deferred tree E2E.**

### Discoveries worth noting for Step 3

- The format2 YAML AST returns the *property node* (not the string value node) from `getNodeFromOffset` when the cursor is on a plain-scalar value. `buildToolIdHover` handles both shapes; `buildToolIdCodeLenses` iterating via `nodeManager.getStepNodes()` won't hit that quirk, but any cursor-position code must.
- `getStepNodes(false)` only handles the native-style dict `steps` layout. `extractStepSummariesFromDocument` was written to handle both dict and array forms; Step 3's CodeLens builder should prefer that extractor (or add the same shape handling) if we ever accept array-form steps.
- The shared `Range` type in `shared/src/requestsDefinitions.ts` is inlined as `LSPRange` to avoid a `vscode-languageserver-types` dependency on the client. Step 3's `POPULATE_TOOL_CACHE_FOR_TOOL` request types don't need ranges, so no change here — just don't reintroduce the import.
- Every `ToolRegistryService` implementation in tests must grow `getToolInfo` + `getToolShedBaseUrl` stubs. Step 3 adding any new service will follow the same pattern.

## Goal

Expose already-cached parsed tool metadata (from `@galaxy-tool-util/core`) to the workflow author through three surfaces:

1. **Tool info hover/peek on `tool_id`** — hover the `tool_id` value (both `.ga` and `.gxwf.yml`) shows tool name, description, version, license, EDAM ops/topics, xrefs, citations count, ToolShed link, truncated help.
2. **"Workflow Tools" tree view** — VS Code `TreeDataProvider` in the Explorer listing steps of the active workflow with their tool metadata; click to reveal step, actions to open in ToolShed, flag stale/mismatched versions.
3. **CodeLens on `tool_id`** — always-visible inline clickable annotation above each step's `tool_id` line showing status + primary action (Open in ToolShed / Populate Tool Cache / retry).

Scope does **not** include ToolShed search or adding new steps — that is item 4, handled separately. Scope is **only** the two workflow formats (`.ga`, `.gxwf.yml`, `.gxwf.yaml`) — workflow-test files (`-test.yml` / `-tests.yml`) are excluded from all three surfaces.

## Verified upstream facts

- `@galaxy-tool-util/core@0.3.0` exports `ParsedTool`, `HelpContent`, `XrefDict`, `Citation`.
- `ParsedTool` fields: `id, version (nullable), name, description, inputs[], outputs[], citations[], license, profile, edam_operations[], edam_topics[], xrefs[], help?`. **No `requirements` field** — omit from hover/tree/lens.
- `ToolInfoService.getToolInfo(toolId, toolVersion | null)` is the underlying accessor already used by `ToolRegistryServiceImpl` for `getToolParameters`.
- `ToolRegistryService` is async throughout (`hasCached` returns `Promise<boolean>`, etc.) — new signatures must be async too.
- No `WorkflowDocument.getToolIds()`; tool enumeration lives in `extractToolRefsFromDocument(doc)` in `server-common/src/services/toolCacheService.ts` — reuse it.
- `ParsedTool.version` is nullable — when null, render `name (id)` instead of `name (id@version)`.
- `ParsedTool.description` passes through an Effect transform that may coerce empty to null — handle null defensively.

## Context the implementer needs

### What's already wired (don't rebuild)
- `ToolRegistryService` (`server/packages/server-common/src/providers/toolRegistry.ts`) wraps `ToolInfoService` from `@galaxy-tool-util/core`. It exposes `getToolParameters()` which digs into the parsed tool and returns `inputs[]`. The underlying `ToolInfoService.getToolInfo(toolId, version)` returns the full `ParsedTool` — currently unsurfaced.
- Auto-resolution on open + `Populate Tool Cache` command already populate the cache. Hover/tree/lens can be read-only consumers that show an "unresolved" state on cache misses.
- Hover dispatch exists (`server-common/src/providers/hover/hoverHandler.ts` → format-specific `doHover`). Tool-state hover already uses `findStateInPath`; we need a sibling path that fires when the cursor is on the `tool_id` value.
- `extractToolRefsFromDocument(doc)` enumerates `{ toolId, toolVersion }[]` per document — the tree view and CodeLens can reuse it.
- Custom LSP request plumbing: `shared/src/requestsDefinitions.ts`, routed client-side via `client/src/requests/gxworkflows.ts`.

### Cross-cutting shared work (foundation for all three steps)

- **Registry accessor.** Add `getToolInfo(toolId, toolVersion?): Promise<ParsedTool | null>` on `ToolRegistryService`; implement as a thin wrapper over `this.toolInfo.getToolInfo(...)` gated by `hasCached` to preserve the "no network" semantics. Re-export `ParsedTool` from `server-common/src/languageTypes.ts`.
- **Markdown builder.** New `server-common/src/providers/hover/toolInfoMarkdown.ts` exporting `buildToolInfoMarkdown(tool: ParsedTool, opts: { toolShedBaseUrl?: string; helpExcerptChars?: number }): string`. Sections: header `**name** (id@version)`, description blockquote, license line, EDAM ops/topics (comma-joined), xrefs as `[type:value](link)` where derivable (bio.tools, bioconductor), citations count, ToolShed repo link parsed from `id`, truncated help (`helpExcerptChars`, default 500).
- **ToolShed URL parser.** New `server-common/src/providers/hover/toolShedUrl.ts` exporting `parseToolShedRepoUrl(toolId): string | null`. For ids of the form `<host>/repos/<owner>/<repo>/<tool>/<version>` returns `https://<host>/view/<owner>/<repo>`. For short ids returns `null`.
- **ToolShed base URL.** `ToolRegistryService` stores the `toolShedUrl` it was configured with and exposes `getToolShedBaseUrl(): string` so hover/lens builders can reach it without additional plumbing.

### Graceful degradation phrasing

Match §19 of the architecture doc — same "run Populate Tool Cache" / "Could not resolve from ToolShed" phrasing reused across hover, tree tooltip, and CodeLens so the three surfaces read as one feature.

## Step 1 — Tool info hover on `tool_id` ✅ DONE (commit `997bc95`)

### Server changes
1. Shared helper `server-common/src/providers/hover/toolIdHover.ts` exporting `buildToolIdHover(args: { nodeManager, offset, registry, toolShedBaseUrl? }): Promise<Hover | null>`.
   - Detect cursor on a `tool_id` value: deepest node is a `StringASTNode` whose parent property key === `"tool_id"` AND path contains a `"steps"` segment. Works identically for `.ga` (step-dict) and `.gxwf.yml` (step-array) since `ASTNodeManager` is format-agnostic.
   - Walk up to the enclosing step `ObjectASTNode` and read sibling `tool_version`.
   - Call `registry.getToolInfo(id, version)`; build markdown via `buildToolInfoMarkdown`.
   - Cache miss → "Tool not cached — run **Populate Tool Cache**".
   - Resolution failed → "Could not resolve from ToolShed" with tool id.
   - Returns the hover with `range` = the `tool_id` string value range.
2. Wire into both language services:
   - `gx-workflow-ls-native/src/services/nativeHoverService.ts` — branch before the existing `findStateInPath` check: if `buildToolIdHover` returns a hover, return early.
   - `gx-workflow-ls-format2/src/services/hoverService.ts` — same, but placed **before** `schemaNodeResolver.resolveSchemaContext(location)` so schema docs for the `tool_id` field don't mask tool info.
3. Version fallback matches existing behavior: missing `tool_version` → pass `undefined` → registry uses latest-cached.

### Tests (red → green)
1. Unit tests for `parseToolShedRepoUrl` (toolshed id → view URL; short id → null; malformed → null). Red. Implement. Green.
2. Unit tests for `buildToolInfoMarkdown` (minimal tool, full tool, help truncation, missing optional fields, null description/version). Red. Implement. Green.
3. Unit tests for `ToolRegistryServiceImpl.getToolInfo`: cached → ParsedTool; uncached → null; `hasCached` miss short-circuits without invoking the network accessor. Red. Implement. Green.
4. Unit tests `server-common/tests/unit/toolIdHover.test.ts` — path detection: hover on `tool_id` value (native dict-of-steps, format2 array-of-steps), negative cases (key not value, unrelated strings, `tool_id` outside `steps`). Uses a mock registry. Red. Implement path detection. Green.
5. Integration tests `gx-workflow-ls-native/tests/integration/nativeToolIdHover.test.ts` — mirrors `nativeToolStateHover.test.ts`. Mock registry returns ParsedTool with `name/description/license/edam_operations`. Assertions: cached → contains name, description, license; uncached → contains "Populate Tool Cache"; resolution-failed → contains "Could not resolve"; short tool id → no `/view/` link. Red. Wire hover service + markdown body. Green.
6. Integration tests `gx-workflow-ls-format2/tests/integration/format2ToolIdHover.test.ts` — same coverage plus a regression guard asserting the schema-fallback hover is **not** returned when the cursor is on `tool_id`. Red. Wire format2 hover service. Green.
7. Integration tests use **mock registries** (same pattern as existing `makeMockRegistry` in `nativeToolStateHover.test.ts`). No filesystem cache or new fixtures needed.
8. `npm run test` → commit: `Add tool-info hover on tool_id for .ga and .gxwf.yml.`

## Step 2 — Workflow Tools tree view ✅ DONE (commit `1284d92`)

### Shared types (new in `shared/src/requestsDefinitions.ts`)
```
LSRequestIdentifiers.GET_WORKFLOW_TOOLS = "galaxy-workflows-ls.getWorkflowTools"

interface GetWorkflowToolsParams { uri: string }
interface WorkflowToolEntry {
  stepId: string;          // native: numeric-string key; format2: step.id or array index
  stepLabel?: string;      // from step.label / annotation / doc
  toolId: string;
  toolVersion?: string;
  cached: boolean;
  resolutionFailed: boolean;
  name?: string;           // populated when cached
  description?: string | null;
  toolshedUrl?: string;    // via parseToolShedRepoUrl
  range: Range;            // tool_id value range — used by reveal command
}
interface GetWorkflowToolsResult { tools: WorkflowToolEntry[] }
```

### Server changes
1. Extend `server-common/src/services/toolCacheService.ts` with a handler for `GET_WORKFLOW_TOOLS`. Implement `extractStepSummariesFromDocument(doc): Array<{stepId, label?, toolId?, toolVersion?, range}>` (step ordering preserved, with AST range for the `tool_id` node). For each step with a `toolId`, enrich via `registry.getToolInfo` + `hasCached` + `hasResolutionFailed` + `parseToolShedRepoUrl`. Preferred over a new `WorkflowToolsService` class because this file already owns step/tool extraction + `ServiceBase` registration.
2. No changes to `server-common/src/server.ts`; `ToolCacheService.register` already wires all its requests.

### Client changes
1. New provider `client/src/providers/workflowToolsTreeProvider.ts` implementing `vscode.TreeDataProvider<WorkflowToolItem>`. Holds last-fetched `WorkflowToolEntry[]` keyed by active URI. On `refresh()`: if the active editor is a workflow language (`galaxyworkflow` | `gxformat2`), send `GET_WORKFLOW_TOOLS`; fire `_onDidChangeTreeData`.
2. Tree item presentation: label = `name || toolId`; description = `toolVersion`; icon by state (`$(check)` cached, `$(error)` failed, `$(info)` uncached); tooltip = client-built markdown from entry fields (name + description + toolshed link) — no extra LSP round-trip.
3. `client/src/common/index.ts` — register the provider via `vscode.window.createTreeView("galaxyWorkflows.toolsView", { treeDataProvider })`. Refresh triggers: `onDidChangeActiveTextEditor`, `onDidSaveTextDocument`, `onDidChangeTextDocument` debounced 500 ms, and `TOOL_RESOLUTION_FAILED` notifications (piggyback the existing subscription).
4. New commands:
   - `galaxy-workflows.refreshToolsView`
   - `galaxy-workflows.revealToolStep(entry)` — uses `entry.range`: `editor.revealRange`, `editor.selection = new Selection(range.start, range.start)`.
   - `galaxy-workflows.openToolInToolShed(entry)` — `vscode.env.openExternal(entry.toolshedUrl)`.
5. `package.json` contributions:
   - `contributes.views.explorer`: `{ id: "galaxyWorkflows.toolsView", name: "Workflow Tools", when: "resourceExtname == .ga || resourceExtname == .gxwf.yml || resourceExtname == .gxwf.yaml" }`. Explorer placement (not a dedicated activity-bar container) — the view is inherently tied to the active workflow editor, so living next to the file tree matches how it's used.
   - `contributes.viewsWelcome`: "Open a Galaxy workflow to see its tools."
   - `contributes.commands`: three new commands with `Galaxy Workflows` category.
   - `contributes.menus.view/title`: refresh command with icon.
   - `contributes.menus.view/item/context`: reveal + open in ToolShed scoped by `viewItem == workflowTool`.

### Tests (red → green)
1. Add `GET_WORKFLOW_TOOLS` types + identifier. Compile checkpoint.
2. Server unit `server-common/tests/unit/toolCacheService.workflowTools.test.ts`: fixture workflow text → call handler → assert entries preserve step order and populate `cached`/`resolutionFailed`/`name`/`toolshedUrl`/`range`. Mock registry. Red. Implement extractor + handler. Green.
3. Server integration `gx-workflow-ls-native/tests/integration/workflowTools.test.ts` on `test-data/sample_workflow_1.ga` with a mock registry. Red. Green.
4. Server integration `gx-workflow-ls-format2/tests/integration/workflowTools.test.ts` on a format2 fixture in `test-data/yaml/`. Red. Green.
5. Client unit `client/tests/unit/workflowToolsTreeProvider.test.ts` (Jest): mocked LSP client returning entries → `getChildren` produces ordered items; icon selection logic. Red. Implement provider + tree-item class. Green.
6. Client E2E `client/tests/e2e/suite/toolsView.e2e.ts`: open workflow, wait for view, assert label text + count. Execute `galaxy-workflows.revealToolStep` and confirm active-editor selection moved. Uses existing `cacheHelpers.ts` + `populateTestCache.ts` to pre-seed a cached tool so `name` is populated; reuse a tool id already used by `extension.ga.e2e.ts`. Red. Wire contributions + refresh debounce + commands. Green.
7. `npm run test` → commit: `Add Workflow Tools tree view powered by GET_WORKFLOW_TOOLS.`

## Step 3 — CodeLens on `tool_id` 🔲 PENDING

Always-visible inline affordance. Uses the standard LSP `textDocument/codeLens` capability — no custom protocol.

### What it shows
One CodeLens per tool step, anchored to the `tool_id` line. Title composes a state icon + tool name (fallback `toolId`) + version + one primary action word:

- `$(check) bowtie2 2.4.4 · Open in ToolShed` — cached, toolshed id → `galaxy-workflows.openToolInToolShed(entry)`
- `$(check) Cut1 1.0` — cached, built-in → command-less CodeLens (plain text; no click). Cache-state icon carries the signal; hover covers tool details on demand.
- `$(info) bowtie2 2.4.4 · Run Populate Tool Cache` — uncached → `galaxy-workflows.populateToolCache` (batch; fills the whole document's misses in one shot, which is what the user wants on first open)
- `$(error) bowtie2 2.4.4 · Resolution failed — retry` — failed → `galaxy-workflows.populateToolCacheForTool({ toolId, toolVersion })` (per-tool retry — see "Per-tool retry" below)

One CodeLens per step — secondary "Reveal in Workflow Tools view" stays in the right-click context menu to avoid visual noise.

### Per-tool retry (`POPULATE_TOOL_CACHE_FOR_TOOL`)

The batch `populateToolCache` is the wrong hammer for a single flaky tool — it refetches every other tool in the document, which is noisy and slow when the user is reacting to one failed lens. Add a per-tool variant:

- New shared request in `shared/src/requestsDefinitions.ts`: `LSRequestIdentifiers.POPULATE_TOOL_CACHE_FOR_TOOL = "galaxy-workflows-ls.populateToolCacheForTool"`, params `{ toolId: string; toolVersion?: string }`, result reuses `PopulateToolCacheResult` (one-element `failed[]` or `fetched === 1`).
- Server handler in `server-common/src/services/toolCacheService.ts` alongside the existing batch handler — delegates to `registry.populateCache([{ toolId, toolVersion }])`. Clears any prior `markResolutionFailed` entry on success, same as the batch path does today.
- New client command `galaxy-workflows.populateToolCacheForTool({ toolId, toolVersion? })` registered in `client/src/commands/`. Sends the request, surfaces success/failure via the same notification UX as the batch command.

### Server changes
1. `server-common/src/languageTypes.ts` — add abstract `doCodeLens(doc): Promise<CodeLens[]>` on `LanguageServiceBase` with default `[]`; advertise `codeLensProvider: { resolveProvider: false }` in `initialize()` capabilities.
2. New `server-common/src/providers/codeLensHandler.ts` — `ServerEventHandler` subclass registering `connection.onCodeLens`. Looks up document context and delegates.
3. `server-common/src/server.ts` — register `CodeLensHandler` in `registerHandlers()`; add capability.
4. New shared builder `server-common/src/providers/toolIdCodeLens.ts` exporting `buildToolIdCodeLenses(nodeManager, registry, toolShedBaseUrl): Promise<CodeLens[]>`. Iterates `nodeManager.getStepNodes()`, extracts the `tool_id` string node + version, checks `hasCached` / `hasResolutionFailed` / `getToolInfo`, emits one CodeLens per step with range = tool_id value range, command chosen per state. Early-exit if no step has a `tool_id`.
5. Override `doCodeLens` in both language services (`gx-workflow-ls-native/src/languageService.ts`, `gx-workflow-ls-format2/src/languageService.ts`) to call `buildToolIdCodeLenses`.

### Client changes
Command ids referenced in the CodeLens must already be registered on the client:
- `galaxy-workflows.openToolInToolShed` — registered in Step 2.
- `galaxy-workflows.populateToolCache` — already exists (no-arg, batch).
- `galaxy-workflows.populateToolCacheForTool` — new, added above.

No tree-provider-specific wiring; CodeLens is stateless per file.

### Tests (red → green)
1. Unit `server-common/tests/unit/toolIdCodeLens.test.ts`: cached toolshed → "Open in ToolShed" with `openToolInToolShed`; cached built-in (short id) → command-less lens with plain title `$(check) name version`; uncached → "Populate Tool Cache" with batch command; failed → retry with `populateToolCacheForTool({toolId, toolVersion})` argument payload. Asserts range is the tool_id string value range. Red. Implement builder. Green.
2. Unit `server-common/tests/unit/toolCacheService.populateForTool.test.ts`: handler delegates to `registry.populateCache` with a one-element array; clears `markResolutionFailed` on success. Red. Implement handler. Green.
3. Integration `gx-workflow-ls-native/tests/integration/toolIdCodeLens.test.ts` + `gx-workflow-ls-format2/tests/integration/toolIdCodeLens.test.ts`: parse fixture workflow, call `languageService.doCodeLens`, assert one CodeLens per tool step with correct title + command (including command-less built-in case). Red. Wire `doCodeLens` override + `CodeLensHandler`. Green.
4. Client E2E `client/tests/e2e/suite/codeLens.e2e.ts`: open workflow, request `vscode.executeCodeLensProvider`, assert lens count + title contains tool name; cached-built-in lens has no `command`. Red. Advertise capability. Green.
5. `npm run test` + `npm run test:e2e` → commit: `Add CodeLens on tool_id with per-tool retry.`

Reuses Step 2 fixtures and mock registries; no new test data.

## Cross-cutting decisions

- **Markdown builder reuse.** Build the tool-info markdown once in `server-common` and reuse it from hover (full markdown) and the tree tooltip (lighter client-side composition from already-returned entry fields, to avoid a second round-trip).
- **ToolShed URL derivation.** Tool IDs of the form `toolshed.g2.bx.psu.edu/repos/owner/repo/tool/version` already encode shed host + repo path — parse via `parseToolShedRepoUrl`. For short tool ids (built-ins), skip the link.
- **No new network calls.** Hover, tree, and CodeLens only *read* the cache. Auto-resolution on open is already responsible for filling it. `getToolInfo` is behind a `hasCached` guard just like `getToolParameters`.
- **Graceful degradation** matches §19 of the architecture doc — same phrasing across all three surfaces.
- **Don't touch the Format2 schema hover fallback path** — `tool_id` hover must short-circuit before the schema node hover, otherwise schema docs for the `tool_id` field would mask tool info.
- **CodeLens re-fires on every edit.** Builder is pure cache reads so cheap — but keep it cheap: early-exit when no step has a `tool_id` and don't block the event loop on huge workflows.

## Commit sequencing
1. Step 1 — shared registry/markdown helpers + tool-info hover. One commit.
2. Step 2 — `GET_WORKFLOW_TOOLS` + tree view + commands + client contributions. One commit.
3. Step 3 — CodeLens on `tool_id`. One commit.

`npm run test` between each step. Don't skip tests, don't modify test data to make tests pass, and don't `git rebase`.

## Testing checklist (full plan)
- [ ] Unit tests for `ToolRegistryService.getToolInfo` (cached / miss / failed).
- [ ] Unit tests for `parseToolShedRepoUrl` and `buildToolInfoMarkdown`.
- [ ] Unit tests for `toolIdHover` path detection (native + format2).
- [ ] Integration tests for hover markdown content (native + format2 + schema-no-mask regression).
- [ ] Server unit test for `GET_WORKFLOW_TOOLS` response shape.
- [ ] Server integration tests for `GET_WORKFLOW_TOOLS` on real fixture workflows (native + format2).
- [ ] Client unit test for `WorkflowToolsTreeProvider`.
- [ ] Client E2E test for tree view population + reveal command.
- [ ] Unit tests for `buildToolIdCodeLenses` (cached toolshed / cached built-in command-less / uncached / failed → per-tool retry).
- [ ] Unit test for `POPULATE_TOOL_CACHE_FOR_TOOL` handler (one-element delegation + resolution-failed clearing).
- [ ] Integration tests for `doCodeLens` (native + format2).
- [ ] Client E2E test for CodeLens execution (lens count, titles, built-in lens has no `command`).
- [ ] Typecheck + full server + client suites pass (`npm run test`).

## Open questions (for the implementing agent to flag back, not resolve silently)

1. Regression-sanity check: hover on `tool_id` key while the step also has a `state:` block — confirm `findStateInPath` does not match since `tool_id` is a sibling of `state`, not inside it. (Verified by inspection; flagging.)
2. Tree tooltip: reuse server-side `buildToolInfoMarkdown` via an additional LSP request, or build a lighter client-side string from the already-returned entry fields? Recommend client-side (no second round-trip).
3. Reveal command scope: support only top-level `tool_id` for v1? Format2 subworkflow steps embed another workflow — defer.
4. Commit granularity: shared helpers + Step 1 in one commit, or split shared helpers into their own commit? Recommend bundled per step.
5. CodeLens title style: include state icon glyph (`$(check)` / `$(error)` / `$(info)`) or keep title plain text? VS Code renders `$(…)` as theme icons inline — recommend use them.
6. CodeLens perf on huge workflows: is early-exit + cache-only reads sufficient, or do we need an additional debounce in the server handler? Recommend start without extra debounce; measure if it becomes a problem.

## Out of scope (explicit)
- ToolShed search / "Insert Tool Step" command. Owned by a parallel effort.
- Editing tool versions from the tree (upgrade to latest, etc.). Follow-up.
- Any new ToolShed API calls beyond the `getToolInfo` path already in `@galaxy-tool-util/core`.
- Secondary CodeLens / inline actions beyond the one primary action per tool_id line.
