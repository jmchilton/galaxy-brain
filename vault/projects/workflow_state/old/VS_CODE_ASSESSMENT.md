# VS Code Galaxy Workflows Extension — Assessment

**Date:** 2026-04-10  
**Branch:** `wf_tool_state`  
**Working dir:** `/Users/jxc755/projects/worktrees/galaxy-workflows-vscode/branch/wf_tool_state`

---

## Plan Progress

Original plan phases:

| Phase | Status |
|---|---|
| Phase 1: JSON Schema structural validation (from Effect/galaxy-tool-util) | ✅ Complete |
| Phase 2: Tool Registry Service + populate-cache command | ✅ Complete |
| Phase 3: Tool state completions (format2) | ✅ Complete |
| Phase 4: Tool state validation + hover (format2) | ✅ Complete |
| Phase 5: Conditional filtering + connection completions | ✅ Mostly done (connection completion implemented; object-form `out:` deferred) |
| Phase 6: Enhanced cleaning + workspace features | ✅ Conversion commands done; cleaning still basic |
| Phase 7: Web platform + gxwf-web integration | ❌ Not started |

The project has significantly exceeded the original plan, especially with:
- Auto tool cache handling on workflow load
- Dual-pass native tool state validation (Pass A: object state, Pass B: legacy JSON-string)
- Roundtrip validation commands
- Full format2 ↔ native conversion commands

---

## Bugs

### B1 — `yamlObjectNodeToRecord()` in format2 is dead code (or orphaned copy) ✅ Fixed

**Location:** `server/gx-workflow-ls-format2/src/services/toolStateTypes.ts`

There is an `astObjectNodeToRecord()` in `server/packages/server-common/src/providers/validation/toolStateAstHelpers.ts` and a near-identical `yamlObjectNodeToRecord()` in `toolStateTypes.ts`. If the format2 validation code was switched to use the shared helper, this older copy may have been left behind but not removed, creating a maintenance hazard — any fix to one won't propagate to the other.

**Fix:** `hoverService.ts` and `toolStateCompletionService.ts` updated to import `astObjectNodeToRecord` from server-common. `yamlObjectNodeToRecord` removed from `toolStateTypes.ts`.

**Risk:** Medium — divergence over time; confusing to contributors.

### B2 — `collectStepsWithState()` vs `collectStepsWithObjectState()` mismatch ✅ Fixed

**Location:** `server/gx-workflow-ls-format2/src/services/toolStateTypes.ts` vs `server/packages/server-common/src/providers/validation/toolStateAstHelpers.ts`

Two near-identical step iteration functions with different return types (`StepStateContext` vs anonymous). The format2-specific variant may not be using the shared one, causing separate code paths that could diverge.

**Fix:** `collectStepsWithState` and `StepStateContext` were dead code (no callers). Both removed from `toolStateTypes.ts`. The `stateKey` field on `StepStateContext` was never read by any caller, so `StepWithToolState` in server-common is a safe replacement.

**Risk:** Medium — logic divergence as validation evolves.

### B3 — Native format has no hover or completion support ✅ Fixed

**Location:** `server/gx-workflow-ls-native/`

Format2 provides schema-based hover, tool state parameter hover, schema-based completions, tool state completions, and connection completions. Native provides none of these. This is a significant feature gap for `.ga` file users — they get diagnostics but no hints or completions.

**Fix:** `NativeHoverService`, `NativeToolStateCompletionService`, and `NativeWorkflowConnectionService` implemented and wired into `NativeWorkflowLanguageServiceImpl`. Shared logic promoted to server-common (see R3).

**Risk:** High UX impact. Native format is still common in IWC.

### B4 — Connection completion doesn't validate object-form `out:`

**Location:** `server/gx-workflow-ls-format2/src/services/workflowConnectionService.ts:82`

When step outputs are declared using the object form (`out: {my_output: {type: ...}}`), the connection completion service skips them and only handles array form. A comment in the file acknowledges this. Users with object-form outputs get no source completions.

**Risk:** Low-medium — affects completions only, not validation.

### B5 — JSON-string `tool_state` in native: range reporting degrades to whole-node ✅ Mitigated

**Location:** `server/gx-workflow-ls-native/src/services/nativeToolStateValidationService.ts`

Pass B (legacy JSON-string `tool_state`) validates tool state but cannot map errors to specific sub-ranges because the state is a single string token. All errors are reported on the whole `tool_state` string. There's no way to point to the specific parameter inside the string.

**Fix:** Pass B now always emits a `Hint` diagnostic (`code: "legacy-tool-state"`) on the `tool_state` string node. A new `CodeActionHandler` (server-common) offers a **"Clean workflow (convert tool_state to object form)"** quick fix (lightbulb / `Ctrl+.`) for any diagnostic with that code. One click cleans the whole document via `WorkspaceEdit`, enabling Pass A validation with precise ranges. All Pass B diagnostics also carry the code so any squiggle can trigger the fix.

**Risk:** Low — this is a known limitation of the legacy encoding, and the right fix is to clean the workflow. Could add a hint pointing to the clean command.

---

## Refactor Opportunities

### R1 — Consolidate `astObjectNodeToRecord()` / `yamlObjectNodeToRecord()` ✅ Done (via B1)

The format2 services contain `yamlObjectNodeToRecord()` which is functionally identical to `astObjectNodeToRecord()` in `server-common`. Since both native and format2 use the same unified `ASTNode` type, there is no technical reason for the split. The format2 version should be deleted and replaced with an import from `server-common`.

**Files:**
- `server/packages/server-common/src/providers/validation/toolStateAstHelpers.ts` (canonical)
- `server/gx-workflow-ls-format2/src/services/toolStateTypes.ts` (remove duplicate)

**Effort:** Small.

### R2 — Consolidate step collection helpers ✅ Done (via B2)

`collectStepsWithState()` (format2) and `collectStepsWithObjectState()` (server-common) should be unified in server-common with a single type. The `StepStateContext` type from format2 is more information-rich and is the better interface — adopt it in server-common and delete the format2 version.

**Effort:** Small-medium.

### R3 — Push native hover/completion services upstream from format2 ✅ Done

The format2 hover and completion logic is already well-abstracted via `findParamAtPath()` from `@galaxy-tool-util/schema`. The same logic applies to native `.ga` workflows. The key lift is:
- Wire a `NativeHoverService` that shares `getToolStateHover()` logic
- Wire a `NativeCompletionService` that shares `ToolStateCompletionService`
- Schema-based completions for native already work (JSON language service provides them); tool state and connection completions are the gap

**Result:** `ToolStateCompletionService` and AST helpers promoted to server-common. `CompletionTextContext` interface introduced to decouple from `TextBuffer`. Native services are thin wrappers over shared logic. Integration tests added for all three native services.

**Effort:** Medium. Most logic already exists; mainly need Inversify wiring and native-specific AST path detection.

### R4 — Unify `dotPathToAstRange()` / `dotPathToYamlProperty()` implementations ✅ Done

Two similar dot-path AST navigation functions exist — one for native in server-common and one historically for format2. If they're both handling the same `ASTNode` type, they should be one function in server-common.

**Fix:** `dotPathToYamlProperty` was dead code (no callers). Removed from `toolStateTypes.ts`. Canonical `dotPathToAstProperty` in server-common is the sole implementation.

**Effort:** Small.

### R5 — Tool state validation services: extract shared validator loop ✅ Done

Both `nativeToolStateValidationService.ts` and `toolStateValidationService.ts` (format2) share the same outer loop pattern: collect steps → check cache → validate → map diagnostics. Only the inner validator call differs (`validateNativeStep` vs `validateFormat2StepStateStrict`). This pattern could be extracted to a shared function in server-common that accepts a format-specific validator callback.

**Fix:** `runObjectStateValidationLoop()` and `StepStateValidator` type added to new `server-common/src/providers/validation/toolStateValidation.ts`. Format2 `doValidation` reduced to a `runObjectStateValidationLoop` call with a 4-line callback. Native Pass A likewise; Pass B string-state handling stays native-only (unchanged). 372 tests pass.

**Effort:** Medium. Would reduce ~100 lines of near-duplicate code.

### R6 — Consider using `lintWorkflow()` / `lintFormat2()` from galaxy-tool-util for diagnostic generation

`@galaxy-tool-util/schema` already exposes `lintNative()`, `lintFormat2()`, and `lintWorkflow()` with structured `LintResult` models. The extension currently reimplements some of this lint logic (especially for structural checks). Running upstream lint and mapping `LintResult` errors to LSP diagnostics may eliminate custom rule code.

**Caveat:** The upstream lint APIs return whole-document results, not AST-located ranges. Mapping `LintResult` → specific LSP ranges would require additional work. Only worthwhile if upstream adds range info.

**Effort:** Medium-high. Needs investigation of whether upstream lint covers the same cases.

### R7 — `toolStateTypes.ts` in format2 is overloaded ✅ Done (via R1, R2, R4)

The file contains: type guard utilities, ToolParam hierarchy types, `yamlObjectNodeToRecord()`, `collectStepsWithState()`, `dotPathToYamlProperty()`, and `getStringPropertyFromStep()`. It's serving as a grab-bag module. The types and guards should stay, but the AST utility functions should move to server-common (resolving R1, R2, R4 along the way).

**Result:** `toolStateTypes.ts` is now a clean types/guards/re-exports file. Only `getStringPropertyFromStep` and `getObjectNodeFromStep` remain as format2-specific step-navigation helpers alongside the schema type re-exports.

**Effort:** Small.

---

## Next Steps

### N1 — Port hover + completion to native format (Phase 3/4 for native) ✅ Done

This is the highest-value remaining user-facing work. Format2 users get a rich experience; native users get only diagnostics. The main tasks:
- Implement `NativeHoverService` mirroring the format2 hover service
- Implement `NativeCompletionService` mirroring format2's tool state + connection completions
- Wire via Inversify in `server/gx-workflow-ls-native/src/inversify.config.ts`

Native AST path detection works differently (JSON paths vs YAML paths), but the upstream `findParamAtPath()` is format-agnostic.

**Result:** Done via B3/R3. `NativeHoverService`, `NativeToolStateCompletionService`, `NativeWorkflowConnectionService` all implemented, wired directly in `NativeWorkflowLanguageServiceImpl` (no Inversify changes needed). Integration tests pass.

### N2 — Object-form `out:` support for connection completions

The format2 `workflowConnectionService.ts` currently only handles array-form step outputs. Extending `getAvailableSources()` to also enumerate object-form outputs would close B4 and make connection completions reliable.

### N3 — Connection type compatibility validation

Phase 5 planned type-compatibility validation for connections (warn when a `data` output feeds a `text` input). This was not implemented. Now that tool parameter types are available via the registry, this is feasible:
- For each `in: source:` value, resolve the source step output type
- For each `in:` block, resolve the current step input type
- Emit a warning if types are incompatible

**Upstream assist:** `@galaxy-tool-util/schema` has parameter type utilities that could power this.

### N4 — Enhanced cleaning: use galaxy-tool-util's `cleanWorkflow()` properly

The extension already calls `cleanWorkflow()` from upstream. The remaining gap is the **diff preview** (partially done via `previewCleanWorkflow` command) and **workspace-wide clean** ("Clean All Workflows"). The upstream `TreeCleanReport` type in `@galaxy-tool-util/schema` could power batch cleaning with structured results.

### N5 — gxwf-web integration (Phase 7)

The upstream `@galaxy-tool-util/gxwf-web` and `@galaxy-tool-util/gxwf-client` packages provide a full HTTP API for workflow operations. Integrating this would:
- Enable web extension support (`vscode.dev`)
- Allow delegating tool cache population to a remote server
- Enable the "schema pack" concept (pre-cached tool schemas bundled with extension)

This is the largest remaining work item and likely requires its own mini-plan.

### N6 — Roundtrip validation as a diagnostic source

The extension has roundtrip validation commands (`Format2 ↔ Native`). A logical next step is running roundtrip validation as a **diagnostic** (not just a command), flagging workflows that won't roundtrip cleanly. The upstream `roundtripValidate()` function and `RoundtripResult` types support this. Would be especially valuable for IWC where workflows are expected to be clean.

### N7 — Subworkflow `run:` reference navigation (Ctrl+Click)

Phase 6 planned Ctrl+Click navigation to `run: subworkflow.gxwf.yml` references. This is standard LSP `textDocument/definition` support and would greatly improve navigation in multi-file workflow projects.

### N8 — Clean up toolStateTypes.ts (quick win, enables R1-R4) ✅ Done

Before N1 (native hover/completion), do the refactor cleanup: move AST helpers to server-common, delete duplicates. This will make N1 easier and reduce the surface area of changes.

---

## Overall Assessment

The extension is in very good shape architecturally. The bet on `@galaxy-tool-util/schema` and `@galaxy-tool-util/core` as upstream dependencies paid off — validation, tool caching, and format conversion are all powered by a well-maintained upstream package with no custom reimplementation. The schema loading via Effect's `JSONSchema.make()` is clean and maintenance-free.

The main weaknesses are:
1. **Feature asymmetry between formats** — native users are second-class citizens
2. **Some duplicated AST utility code** between format2 and server-common (fixable quickly)
3. **Phase 7 (web/gxwf-web)** not started — limits vscode.dev usage

As a language server, this is above average. The tool-state-aware completions, hover, and diagnostics are non-trivial features that most domain-specific VSCode extensions don't have. The dual-server architecture (one per format) is clean and allows format-specific optimizations. The Inversify DI makes testing straightforward.
