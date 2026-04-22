# Phase 6: Enhanced Cleaning + Workspace Features

## Overview

Phase 6 is three largely independent work streams:
- **6A–B: Cleaning upgrades** — schema-aware stale key removal + workspace-scoped clean
- **6C–D: Workspace features** — activation-time discovery + subworkflow navigation
- **6E: Conversion commands** — Format1 ↔ Format2 (most complex, separate effort)

Proposed PR structure: PR1 (6A+B), PR2 (6C+D), PR3 (6E).

---

## 6A: Schema-Aware Tool State Cleaning

**Goal:** When cleaning a Format2 workflow, also remove `state:`/`tool_state:` keys that don't exist in the tool's parameter definition.

**Problem:** `CleanWorkflowService` in `server/packages/server-common/src/services/cleanWorkflow.ts` currently only uses a static set of property names (`cleanableProperties`). It has no access to `ToolRegistryService` and no understanding of step tool state structure.

**Design:** Extend the `LanguageService` interface with a new async method `getStaleStateNodes(doc)`. The Format2 implementation uses the already-injected `ToolRegistryService`; the native implementation returns `[]`. `CleanWorkflowService` calls it alongside the existing `getNonEssentialNodes()`.

### Prerequisites ✅ DONE (commit d562c3e)

Two shared helpers extracted to `toolStateTypes.ts`:
- **`collectStepsWithState(nodeManager): StepStateContext[]`** — the step-iteration loop formerly inline in `ToolStateValidationService.doValidation()`. Yields `{ toolId, toolVersion, toolIdNode, stateKey, stateValueNode, stepNode }` for every step that has `tool_id` + a structured state block.
- **`dotPathToYamlProperty(stateNode, dotPath): PropertyASTNode | null`** — navigates a dot-path through YAML AST (including numeric array-index intermediate segments) and returns the `PropertyASTNode` at the final segment. Cleaning uses this to turn a stale-key dot-path into a removable YAML node.

`ToolStateValidationService` refactored to use both; `dotPathToYamlRange` now delegates to `dotPathToYamlProperty` for the common case.

### Steps

**6A-1: Add `getStaleStateNodes()` to `LanguageService` interface**
- File: `server/packages/server-common/src/languageTypes.ts`
- Add: `getStaleStateNodes(document: WorkflowDocument): Promise<PropertyASTNode[]>`
- Default implementation in `LanguageServiceBase` returns `Promise.resolve([])`

**6A-2: Implement `getStaleStateNodes()` in `GxFormat2WorkflowLanguageServiceImpl`**
- File: `server/gx-workflow-ls-format2/src/languageService.ts`
- Use `collectStepsWithState(nodeManager)` for iteration (already extracted)
- For each step: skip if not cached; call `toolRegistryService.getToolParameters()`; call `validateFormat2StepStateStrict(params, stateDict)` (same as validation); filter for `"is unexpected"` diagnostics; convert each stale-key dot-path to a `PropertyASTNode` via `dotPathToYamlProperty(stateValueNode, path)` (already extracted)
- Return all collected stale property nodes

**6A-3: Make `CleanWorkflowService` call `getStaleStateNodes()`**
- File: `server/packages/server-common/src/services/cleanWorkflow.ts`
- `getTextEditsToCleanWorkflow()` becomes async
- After computing `getNonEssentialNodes()`, also call `workflowLanguageService.getStaleStateNodes(workflowDocument)` and union the results
- Get `workflowLanguageService` via `this.server.getLanguageServiceById(workflowDocument.languageId)` (already available in both request handlers)
- Both `onCleanWorkflowContentsRequest` and `onCleanWorkflowDocumentRequest` are already async — no signature change

**6A-4: Tests**
- New file: `server/gx-workflow-ls-format2/tests/integration/workflowCleaning.test.ts`
- Test: stale key removed from `state:`
- Test: valid key preserved
- Test: section key preserved if in params, removed if not
- Test: standard `cleanableProperties` still work alongside tool-state cleaning
- Test: tool not in cache → stale-key removal skipped (no error, state unchanged)

---

## 6B: "Clean All Workflows" Workspace Command

**Goal:** New command to clean every workflow in the workspace in one operation, without requiring each file to be open in the editor.

**Key insight:** `CLEAN_WORKFLOW_DOCUMENT` requires the document to be in the server's `documentsCache` (i.e., open in editor). For workspace-wide cleaning, use `CLEAN_WORKFLOW_CONTENTS` instead — the client reads the file from disk, sends contents, gets cleaned contents back, writes the file if changed.

### Steps

**6B-1: New client command `CleanAllWorkflowsCommand`**
- File: `client/src/commands/cleanAllWorkflows.ts`
- Pattern: same `CustomCommand` subclass as `CleanWorkflowCommand`
- Logic:
  1. `vscode.workspace.findFiles('**/*.{ga,gxwf.yml}', '**/node_modules/**')`
  2. Show progress notification (reuse pattern from `PopulateToolCacheCommand`)
  3. For each URI: `vscode.workspace.fs.readFile(uri)` → send `CLEAN_WORKFLOW_CONTENTS` → if contents changed, `vscode.workspace.fs.writeFile(uri)`
  4. Summary notification: "Cleaned N workflows (M unchanged)"

**6B-2: Register in `package.json` and `setup.ts`**
- `package.json`: add `galaxy-workflows.cleanAllWorkflows` command under `contributes.commands`
- `client/src/commands/setup.ts`: add `new CleanAllWorkflowsCommand(client).register()`

**6B-3: Tests**
- Unit test: mock the LSP client, verify `CLEAN_WORKFLOW_CONTENTS` is called per file, verify write-back only happens when contents differ

---

## 6C: Workspace Auto-Discovery + Cache Offer

**Goal:** On activation, if workflows are found in the workspace and the tool cache is empty, offer to populate it.

### Steps

**6C-1: Post-activation workflow discovery**
- File: `client/src/common/index.ts` (`initExtension`) or new `client/src/workspaceInit.ts`
- After both language clients start: `vscode.workspace.findFiles('**/*.{ga,gxwf.yml}', '**/node_modules/**', 100)`
- Send `GET_TOOL_CACHE_STATUS` to check `cacheSize`
- If workflows found and `cacheSize === 0`: `vscode.window.showInformationMessage('Found N workflows. Populate tool cache for completions?', 'Populate', 'Not now')`
- On 'Populate': execute `galaxy-workflows.populateToolCache` command

**6C-2: No new LSP requests needed** — uses existing `GET_TOOL_CACHE_STATUS` and `galaxy-workflows.populateToolCache` command

**6C-3: Tests**
- Unit test: mock workspace findFiles + cache status responses, verify notification shown/not shown in various states

---

## 6D: Subworkflow `run:` Navigation

**Goal:** Ctrl+Click on `run: ./subwf.gxwf.yml` in a Format2 step navigates to the referenced file.

**Format2 subworkflow pattern:**
```yaml
steps:
  embed_step:
    run: ./helper.gxwf.yml
```

### Steps

**6D-1: Add `doDefinition()` to `LanguageService` interface**
- File: `server/packages/server-common/src/languageTypes.ts`
- Add: `doDefinition(document: WorkflowDocument, position: Position): Promise<LocationLink[] | null>`
- Default in `LanguageServiceBase` returns `Promise.resolve(null)`

**6D-2: Format2 `doDefinition()` implementation**
- File: `server/gx-workflow-ls-format2/src/languageService.ts`
- Get node at position → walk path → check for `run:` property value in step context (path: `["steps", stepName, "run"]`)
- Extract string value → resolve relative to `documentContext.textDocument.uri`
- Return `[LocationLink.create(targetUri, fullRange, fullRange)]`
- Return null gracefully if file doesn't exist or path not recognized

**6D-3: Register `textDocument/definition` in Format2 server**
- File: `server/gx-workflow-ls-format2/src/gxFormat2Server.ts`
- Add `definitionProvider: true` to server capabilities
- Add `connection.onDefinition(...)` handler that delegates to `languageService.doDefinition()`

**6D-4: Tests**
- Integration test: document with `run: ./other.gxwf.yml`, cursor on value → verify returned URI matches resolved path
- Test: cursor not on `run:` value → returns null
- Test: `run:` at workflow root level (not in a step) → returns null

---

## 6E: Conversion Commands

**Goal:** "Convert to Format2" / "Convert to Native" commands with diff preview.

**Status: Unblocked — conversion logic already exists in `@galaxy-tool-util/schema`.**

**Finding (Phase 6 planning session):** The TypeScript conversion is already implemented. `@galaxy-tool-util/schema` exports `toFormat2Stateful()` and `toNativeStateful()`, and the gxwf-web server exposes working `/to-format2` and `/to-native` endpoints. No Python subprocess, no reimplementation needed. The original options 1 and 3 are obsolete.

**Approach:** Add `convertWorkflowText(targetFormat)` to the `LanguageService` interface (same pattern as `cleanWorkflowText`). Each language service implements conversion using the library functions directly. The client command calls a new `CONVERT_WORKFLOW_FORMAT` LSP request and opens the result in a diff editor.

**Dependency:** A `ToolInputsResolver` is needed for stateful conversion (same pre-fetch pattern already implemented in `cleanWorkflowText` for format2). No new infrastructure required.

### Steps

**6E-1: Add `convertWorkflowText(targetFormat)` to `LanguageService` interface**
- File: `server/packages/server-common/src/languageTypes.ts`
- Signature: `convertWorkflowText(text: string, targetFormat: "format2" | "native"): Promise<string>`
- Default in `LanguageServiceBase`: throw "unsupported" (conversion is format-specific)

**6E-2: Implement in format2 language service**
- File: `server/gx-workflow-ls-format2/src/languageService.ts`
- `targetFormat === "native"`: `YAML.parse(text)` → `toNativeStateful(dict, resolver)` → `JSON.stringify(result, null, 4) + "\n"`
- Reuse `buildToolInputsResolver()` already present from cleaning

**6E-3: Implement in native language service**
- File: `server/gx-workflow-ls-native/src/languageService.ts`
- `targetFormat === "format2"`: `JSON.parse(text)` → `toFormat2Stateful(dict, resolver)` → `YAML.stringify(result)`
- Native server needs `ToolRegistryService` injected (currently absent) for stateful conversion, or fall back to non-stateful `toFormat2()`/`toNative()` if no resolver available

**6E-4: New request `CONVERT_WORKFLOW_FORMAT`**
- `shared/src/requestsDefinitions.ts`: add request + params (`contents: string, targetFormat: "format2" | "native"`)
- Server handler in `server-common`: delegate to `languageService.convertWorkflowText()`

**6E-5: Client command `ConvertWorkflowCommand`**
- Determine source format from active document language ID
- Send `CONVERT_WORKFLOW_FORMAT` request with document contents
- On success: open result in diff editor via `vscode.commands.executeCommand('vscode.diff', original, converted)`
- Offer "Save as" to write result alongside original

**6E-6: Register in `package.json`**
- Commands: `galaxy-workflows.convertToFormat2`, `galaxy-workflows.convertToNative`
- `when` clauses: activate only for appropriate language IDs

**6E-7: Tests**
- Mock library calls; test format detection; test diff editor invocation

---

## Implementation Order

| Step | Effort | Dependencies |
|------|--------|-------------|
| 6D (subworkflow nav) | Small-Medium | none |
| ~~6A (schema-aware clean)~~ | ~~Medium~~ | ~~Phase 3/4 (done)~~ |
| 6B (clean all) | Small | none (cleaning now in library) |
| 6C (auto-discover) | Small | Phase 2 (done) |
| 6E (conversion) | Small-Medium | `@galaxy-tool-util/schema` (done) |

**Note on 6A:** Superseded. Schema-aware stale state cleaning is now handled by `cleanWorkflow()` in `@galaxy-tool-util/schema` via the `toolInputsResolver` option, implemented as part of the `cleanWorkflowText()` delegation refactor. The `LanguageService.getStaleStateNodes()` approach was not needed.

Recommended sequence: 6D → 6B → 6C in one PR batch, then 6E as a separate PR.

---

## Unresolved Questions

1. ~~**6A shared walking logic:** Extract shared helpers before implementing cleaning.~~ **Resolved (d562c3e).**
2. ~~**6A YAML node removal:** Does `getTextEditsToCleanWorkflow()` handle YAML key-value removal correctly?~~ **Resolved:** Cleaning now delegates to `cleanWorkflow()` in `@galaxy-tool-util/schema` via `cleanWorkflowText()`; no AST node removal in the plugin.
3. **6B open-editor conflict:** `vscode.workspace.fs.writeFile` on a file currently open in an editor — does VSCode handle the resulting file-change event cleanly, or does it cause a buffer conflict?
4. ~~**6E Python availability:** Is `python` (with `gxformat2`) reliably available?~~ **Resolved:** Conversion uses `toFormat2Stateful()`/`toNativeStateful()` from `@galaxy-tool-util/schema`; no Python required.
5. **6D path forms:** `run:` values can be relative paths, absolute paths, or possibly tool-shed-style references. Should the definition provider handle only file paths for now, or also attempt tool-shed resolution?
6. **6E native ToolRegistryService:** The native language service does not currently have `ToolRegistryService` injected. For stateful format2 conversion from native, should we inject it (mirroring format2 server), or fall back to non-stateful `toFormat2()` and note state accuracy limitations?
