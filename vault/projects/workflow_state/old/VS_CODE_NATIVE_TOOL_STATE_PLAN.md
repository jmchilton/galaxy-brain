# Plan: Native Workflow Tool State Validation Parity

## Context & Key Constraints

The format2 service validates `state:` (YAML object) using `validateFormat2StepStateStrict()` — producing fine-grained per-parameter diagnostics with exact source ranges. The native service has `toolRegistryService` already injected but does nothing with it for validation.

### Native `tool_state` comes in two forms

After `cleanWorkflow()` the `tool_state` for a tool step is decoded from a JSON-encoded string into an actual JSON object tree:

**Pre-clean (legacy string encoding):**
```json
"tool_state": "{\"include_header\": \"true\", \"input1\": {\"__class__\": \"RuntimeValue\"}}"
```

**Post-clean (object tree):**
```json
"tool_state": {
  "include_header": "true",
  "input1": { "__class__": "RuntimeValue" }
}
```

Both are valid in the wild. The service must handle both.

### Validator function gap

`@galaxy-tool-util/schema` exports `validateFormat2StepStateStrict()` (returns `ToolStateDiagnostic[]`, flags unknown keys) but no equivalent strict variant for native. The higher-level `ToolStateValidator.validateNativeStep()` returns `ToolStateDiagnostic[]` and handles input connections correctly, but uses `onExcessProperty: "ignore"` — unknown/misspelled parameter names are not flagged. A `validateNativeStepStrict` upstream addition would close this gap.

---

## Implementation Steps

### P1 — Extend `ToolRegistryService` to expose native validation

**Files:**
- `server/packages/server-common/src/languageTypes.ts`
- `server/packages/server-common/src/providers/toolRegistry.ts`

Add to the `ToolRegistryService` interface:

```typescript
validateNativeStep(
  toolId: string,
  toolVersion: string | undefined,
  toolState: Record<string, unknown>,
  inputConnections?: Record<string, unknown>
): Promise<ToolStateDiagnostic[]>;
```

Implement in `ToolRegistryServiceImpl` by holding a `ToolStateValidator` instance (from `@galaxy-tool-util/schema`) that shares the same `toolInfo`. Recreate the validator instance inside `configure()` when `toolInfo` is replaced.

This keeps all tool-data interaction behind one interface and avoids both services importing `@galaxy-tool-util/schema` directly via different low-level paths.

---

### P2 — Extract shared diagnostic helpers to `server-common`

**New file:** `server/packages/server-common/src/providers/validation/toolStateDiagnostics.ts`

Extract two things currently private to the format2 service:

**`buildCacheMissDiagnostic(toolId, hasFailed, range)`** → `Diagnostic`
Creates the Info ("not cached — run Populate Tool Cache") or Warning ("resolution failed") diagnostic. Both services emit identical messages; extracting removes the duplication.

**`mapToolStateDiagnosticsToLSP(rawDiags, resolveRange)`** → `Diagnostic[]`
Accepts `ToolStateDiagnostic[]` and a `resolveRange: (path: string, target: "key" | "value") => Range` callback. Contains the grouping, union-merge, and message formatting currently in the private `mapDiagnostics()` in `toolStateValidationService.ts`.

- Format2 provides a YAML AST-walking resolver (existing `dotPathToYamlRange`).
- Native object pass provides the same resolver (works identically on JSON `ObjectASTNode`).
- Native string pass provides a flat resolver returning the string node range for all paths.

Add unit tests in `server-common` test suite for both helpers.

---

### P3 — Refactor format2 `ToolStateValidationService` onto shared helpers

**File:** `server/gx-workflow-ls-format2/src/services/toolStateValidationService.ts`

- Replace the private `mapDiagnostics()` with `mapToolStateDiagnosticsToLSP()` + the existing `dotPathToYamlRange` as the resolver.
- Replace the inline cache-miss `if/else` block with `buildCacheMissDiagnostic()`.
- No behavior change. All existing `toolStateValidation.test.ts` tests must pass green.

---

### P4 — Create `NativeToolStateValidationService`

**New file:** `server/gx-workflow-ls-native/src/services/nativeToolStateValidationService.ts`

The service runs two passes over the document's steps and merges results.

#### Pass A — object-valued `tool_state` (post-clean)

Call `collectStepsWithState(nodeManager)` directly — this helper already exists in `toolStateTypes.ts` and already handles object-valued `state`/`tool_state` nodes. It skips string-valued nodes by design, so it produces exactly the set of steps for this pass.

`dotPathToYamlProperty` and `dotPathToYamlRange` operate on `ObjectASTNode` regardless of whether the underlying document is YAML or JSON — the names are misleading, they're format-agnostic AST walkers. The full fine-grained range mapping path from format2 is therefore reusable as-is.

Validator: `toolRegistryService.validateNativeStep()` (P1).

#### Pass B — string-valued `tool_state` (pre-clean / legacy)

New helper `collectNativeStepsWithStringState(nodeManager)`:
- Finds steps where `tool_state` is a `StringASTNode`
- Skips steps with null/missing `tool_id`
- Parses the JSON string (`JSON.parse`) — skip step silently if parse throws
- Extracts `input_connections` from the step node as `Record<string, unknown>`
- Returns `{ toolId, toolVersion, toolIdNode, toolStateStringNode, toolStateParsed, inputConnections }`

Diagnostic mapping: `mapToolStateDiagnosticsToLSP()` with a flat resolver that returns `nodeManager.getNodeRange(toolStateStringNode)` for every path. All diagnostics for the step point at the whole JSON string — coarse but correct.

Validator: same `toolRegistryService.validateNativeStep()`.

#### Cache-miss handling (both passes)

Both passes use `buildCacheMissDiagnostic()` (P2) pointing at `toolIdNode` before attempting validation.

---

### P5 — Wire up in native language service

**File:** `server/gx-workflow-ls-native/src/languageService.ts`

Instantiate `NativeToolStateValidationService` in the constructor (same pattern as format2). In `doValidation()`, await its result and merge with the JSON schema diagnostics, tagging with `source = "Tool State"`.

---

### P6 — Tests (red-green)

**P6a** — Unit tests for `NativeToolStateValidationService`
File: `server/gx-workflow-ls-native/tests/unit/nativeToolStateValidation.test.ts`
Mock `ToolRegistryService`. Cover:
- Tool not cached → Info diagnostic at `tool_id` node
- Resolution failed → Warning diagnostic at `tool_id` node
- Object `tool_state`, valid → no diagnostics
- Object `tool_state`, invalid value → Error at specific parameter node
- String `tool_state`, invalid value → Error pointing at string node
- String `tool_state`, malformed JSON → silently skipped

**P6b** — Integration test
File: `server/gx-workflow-ls-native/tests/integration/nativeToolStateValidation.test.ts`
Fixture `.ga` with known bad `tool_state` value (both string and object forms). Verify diagnostic messages and ranges match expectations.

**P6c** — Format2 regression
After P3, run existing `toolStateValidation.test.ts` to confirm no behavior change.

---

### P7 — Verify auto-resolution covers native documents

`ToolCacheService` handles the `GET_WORKFLOW_TOOL_IDS` request for background auto-resolution. Trace whether it calls into native documents to extract `tool_id` values or only handles format2. If native is not covered, extend the handler to walk native step nodes via `nodeManager.getStepNodes()` and extract string-valued `tool_id` properties.

This is required for the "auto-populate cache on open" UX to work for `.ga` files.

---

## Files Changed

| File | Change |
|------|--------|
| `server-common/src/languageTypes.ts` | Add `validateNativeStep` to `ToolRegistryService` interface |
| `server-common/src/providers/toolRegistry.ts` | Implement via `ToolStateValidator`; recreate on `configure()` |
| `server-common/src/providers/validation/toolStateDiagnostics.ts` | New — `buildCacheMissDiagnostic`, `mapToolStateDiagnosticsToLSP` |
| `gx-workflow-ls-format2/src/services/toolStateValidationService.ts` | Refactor onto shared helpers (P3) |
| `gx-workflow-ls-native/src/services/nativeToolStateValidationService.ts` | New |
| `gx-workflow-ls-native/src/languageService.ts` | Wire up in `doValidation()` |
| `server-common/tests/unit/toolStateDiagnostics.test.ts` | New — unit tests for shared helpers |
| `gx-workflow-ls-native/tests/unit/nativeToolStateValidation.test.ts` | New |
| `gx-workflow-ls-native/tests/integration/nativeToolStateValidation.test.ts` | New |

---

## Unresolved Questions

1. **Strict mode gap**: `validateNativeStepStrict` doesn't exist upstream — unknown/misspelled parameter names won't be flagged for native (either pass). Acceptable for initial parity, or add to `@galaxy-tool-util/schema` first?
2. **Auto-resolution coverage (P7)**: Does `ToolCacheService` already extract tool IDs from native documents? Needs tracing before P7 to know scope.
3. **Fine-grained ranges for string pass**: All diagnostics for string-encoded `tool_state` point at the whole JSON string. Worth investing in JSON-string offset mapping in this pass, or defer?
4. **`ToolStateValidator` lifecycle**: When `configure()` recreates `toolInfo`, the `ToolStateValidator` must be recreated too. Confirm this is handled cleanly in P1.
