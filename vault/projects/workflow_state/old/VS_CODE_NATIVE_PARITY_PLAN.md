# Native Format Hover + Completion Parity Plan

**Branch:** `wf_tool_state`  
**Working dir:** `/Users/jxc755/projects/worktrees/galaxy-workflows-vscode/branch/wf_tool_state`  
**Date:** 2026-04-10  
**Addresses:** B3 (native has no hover/completion) + R3 (push shared logic upstream)

---

## Step 0 — Research findings (complete)

### Finding 1 — `tool_state` is always string-form in native today

Every real-world `.ga` workflow (including all IWC workflows) stores `tool_state` as a
JSON-encoded string, not an object. The object-form (Pass A in the validation service) exists for
correctness. This is intentional: the plan is to clean all IWC workflows and update Galaxy to use
object-form `tool_state`. We are not implementing hover/completion inside a JSON-in-string value.
Hover/completion targets **Pass A (object-form) only**.

### Finding 2 — Connections live in `input_connections`, not `tool_state`

`tool_state` contains `{"__class__": "ConnectedValue"}` placeholders — boilerplate sentinels, not
user-meaningful. The actual connection metadata (which step, which output) lives in the sibling
`input_connections` field, which IS user-edited. This is the native analogue of format2's
`source:` field. The earlier conclusion "no connection service needed" was wrong; it is needed but
targets a different structure than format2.

### Finding 3 — `input_connections` structure

```json
"input_connections": {
  "fastq_input|fastq_input1": { "id": 8, "output_name": "output_paired_coll" },
  "reference_source|ref_file":  { "id": 1, "output_name": "output" }
}
```

- **Keys**: tool parameter paths, using `|` as separator for nested sections/conditionals
- **`id`**: integer step ID (the `id` field on the step object, not its string key in `steps`)
- **`output_name`**: tool-specific output name; not always `"output"` (e.g. `output_paired_coll`,
  `xsetRData`, `bam_output`)
- Step outputs are listed in the step's `outputs` array in the workflow JSON — available directly
  in the AST without hitting the tool registry

### Finding 4 — `TextBuffer` word boundaries

`getCurrentWord`/`getCurrentWordRange` stop at `' \t\n\r\v":{[,]}'`. The `"` is a boundary so
quotes are never included in the returned word. This logic can be trivially replicated in
server-common without importing `@gxwf/yaml-language-service`.

---

## Step 1 — Promote AST step-navigation helpers to server-common

**File:** `server/packages/server-common/src/providers/validation/toolStateAstHelpers.ts`

Add the following (all currently in format2 — all format-agnostic):

- `getStringPropertyFromStep(root, stepPath, propertyName)` — from `toolStateTypes.ts`
- `getObjectNodeFromStep(root, stepPath, propertyName)` — from `toolStateTypes.ts`
- `buildParamHoverMarkdown(param: ToolParam): string` — from `hoverService.ts`

Update format2's `toolStateTypes.ts` to remove definitions and import from server-common.  
Update format2's `hoverService.ts` to import `buildParamHoverMarkdown` from server-common.

---

## Step 2 — Promote completion helpers to server-common

**New file:** `server/packages/server-common/src/providers/toolStateCompletion.ts`

Move from `toolStateCompletionService.ts` (format2):
- `StateInPath` interface
- `findStateInPath()` function
- `ToolStateCompletionService` class

### Resolve `TextBuffer` dependency

Replace the `TextBuffer` parameter in `doComplete()` with a shared context interface:

```typescript
export interface CompletionTextContext {
  afterColon: boolean;
  currentWord: string;
  overwriteRange: Range;
}
```

New `doComplete` signature:
```typescript
doComplete(
  root: ASTNode | undefined,
  nodePath: NodePath,
  stateInfo: StateInPath,
  textCtx: CompletionTextContext,
  existingKeys: Set<string>
): Promise<CompletionItem[]>
```

Add a shared helper `getCompletionTextContext(doc: TextDocument, offset: number): CompletionTextContext`
using the same boundary chars as `TextBuffer` (`' \t\n\r\v":{[,]}'`). Both format2 and native
callers use this helper — no `TextBuffer` import needed in server-common or native.

Update format2's `GxFormat2CompletionService` to call the helper and pass `CompletionTextContext`.
Re-export `StateInPath`, `findStateInPath`, `ToolStateCompletionService` from
`toolStateCompletionService.ts` for backwards compat with existing imports.

---

## Step 3 — Write failing tests (red)

### Infrastructure

Reuse `server/gx-workflow-ls-native/tests/testHelpers.ts` (`createNativeWorkflowDocument`,
`toJsonDocument`) directly. Define `makeMockRegistry()` in each native test file matching the
format2 pattern exactly. Use the same `TOOL_PARAMS` fixture (select, boolean, section, repeat,
conditional). Workflow fixtures must use **object-form** `tool_state` to exercise Pass A.

### New file: `server/gx-workflow-ls-native/tests/integration/nativeToolStateHover.test.ts`

Mirrors `server/gx-workflow-ls-format2/tests/integration/toolStateHover.test.ts`.
Inline JSON strings with `$` cursor marker via `parseTemplate()`. Cases:

- Hover on param key → markdown with name + type
- Hover on select param → options listed
- Hover on boolean param → `true | false`
- Hover inside conditional branch (correct branch params only)
- Hover outside `tool_state` → falls back to `jsonLanguageService.doHover`
- Tool not cached → returns null

### New file: `server/gx-workflow-ls-native/tests/integration/nativeToolStateCompletion.test.ts`

Mirrors `server/gx-workflow-ls-format2/tests/integration/toolStateCompletion.test.ts`. Cases:

- Name completions at root of `tool_state` object
- Value completions for `gx_select`
- Value completions for `gx_boolean`
- Conditional branch filtering
- Section children
- Repeat children
- Hidden params filtered
- Already-declared keys excluded
- Outside `tool_state` → falls back to JSON schema completions

### New file: `server/gx-workflow-ls-native/tests/integration/nativeConnectionCompletion.test.ts`

Cases covering all three completion modes in `input_connections`:

- **Key completion** (`["steps","2","input_connections"]`): suggests available parameter names for
  the step's tool
- **ID completion** (`["steps","2","input_connections","input1","id"]`): suggests step IDs for all
  steps with a lower `id` than the current step
- **`output_name` completion** (`["steps","2","input_connections","input1","output_name"]`):
  suggests output names from the step named in the sibling `id` field
- No forward references (steps with `id` ≥ current step are excluded from ID suggestions)
- Workflow-level inputs (type `data_input` etc.) always offer `"output"` as the output name

---

## Step 4 — Implement `NativeHoverService`

**New file:** `server/gx-workflow-ls-native/src/services/nativeHoverService.ts`

```typescript
export class NativeHoverService {
  constructor(
    private readonly toolRegistryService: ToolRegistryService,
    private readonly jsonLanguageService: JSONLanguageService
  ) {}

  async doHover(doc: NativeWorkflowDocument, position: Position): Promise<Hover | null> {
    // 1. Get node + path (same preamble as format2 hoverService)
    // 2. findStateInPath(location) — if match and state node is object-form,
    //    call getToolStateHover()
    // 3. Fallback: jsonLanguageService.doHover(doc.textDocument, position, doc.jsonDocument)
  }

  private async getToolStateHover(...): Promise<Hover | null> {
    // Identical logic to format2's getToolStateHover:
    //   getStringPropertyFromStep → getObjectNodeFromStep → astObjectNodeToRecord
    //   → findParamAtPath → buildParamHoverMarkdown
    // All imported from server-common
  }
}
```

---

## Step 5 — Implement `NativeToolStateCompletionService`

**New file:** `server/gx-workflow-ls-native/src/services/nativeToolStateCompletionService.ts`

Thin wrapper — acquires `CompletionTextContext` from the shared helper and delegates to the
shared `ToolStateCompletionService` from server-common.

```typescript
export class NativeToolStateCompletionService {
  private readonly toolStateService: ToolStateCompletionService;

  constructor(toolRegistryService: ToolRegistryService) {
    this.toolStateService = new ToolStateCompletionService(toolRegistryService);
  }

  async doComplete(
    doc: NativeWorkflowDocument,
    nodePath: NodePath,
    stateInfo: StateInPath,
    offset: number
  ): Promise<CompletionItem[]> {
    const textCtx = getCompletionTextContext(doc.textDocument, offset);
    const existing = doc.nodeManager.getDeclaredPropertyNames(/* node at offset */);
    return this.toolStateService.doComplete(
      doc.nodeManager.root, nodePath, stateInfo, textCtx, existing
    );
  }
}
```

---

## Step 6 — Implement `NativeWorkflowConnectionService`

**New file:** `server/gx-workflow-ls-native/src/services/nativeWorkflowConnectionService.ts`

### 6a. Path detection

```typescript
export type ConnectionField = "key" | "id" | "output_name";

export interface ConnectionInPath {
  stepKey: string;       // e.g. "11"
  paramName?: string;    // e.g. "fastq_input|fastq_input1" (absent when field === "key")
  field: ConnectionField;
}

export function findConnectionInPath(path: NodePath): ConnectionInPath | undefined
```

Patterns that match:
- `["steps", stepKey, "input_connections"]`
  → `{ stepKey, field: "key" }` — completing a new parameter name key
- `["steps", stepKey, "input_connections", paramName]`
  → `{ stepKey, paramName, field: "key" }` — cursor at the parameter name itself
- `["steps", stepKey, "input_connections", paramName, "id"]`
  → `{ stepKey, paramName, field: "id" }`
- `["steps", stepKey, "input_connections", paramName, "output_name"]`
  → `{ stepKey, paramName, field: "output_name" }`

### 6b. Available upstream step IDs

```typescript
export function getAvailableStepIds(doc: NativeWorkflowDocument, currentStepKey: string): number[]
```

Iterate `nodeManager.getStepNodes()` in definition order. For each step node, extract the integer
`id` field. Return IDs that are strictly less than the `id` of the current step (no forward
references). Workflow-level input steps (type `data_input`, `data_collection_input`,
`parameter_input`) are included — they always offer `"output"` as their output name.

### 6c. Available output names

```typescript
export function getStepOutputNames(doc: NativeWorkflowDocument, sourceStepId: number): string[]
```

Walk `getStepNodes()` to find the step whose `id` field equals `sourceStepId`. Read its `outputs`
array (present in the AST) and collect `name` values. This is AST-only — no tool registry call
needed. Falls back to `["output"]` if the `outputs` array is absent (covers input-type steps and
any step where the array is missing).

### 6d. Available parameter names (for key completion)

```typescript
export async function getConnectableParamNames(
  doc: NativeWorkflowDocument,
  stepKey: string,
  toolRegistryService: ToolRegistryService
): Promise<string[]>
```

Get `tool_id` and `tool_version` from the step via AST navigation. Call
`toolRegistryService.getToolParameters()`. Return the flat list of input parameter names,
converting nested section/conditional nesting to `|`-delimited paths matching Galaxy's convention.
If the tool is not cached, return empty (same graceful degradation as validation).

---

## Step 7 — Wire into `NativeWorkflowLanguageServiceImpl`

**File:** `server/gx-workflow-ls-native/src/languageService.ts`

Add fields (all constructed directly in constructor — same pattern as format2, no Inversify changes):

```typescript
private _hoverService: NativeHoverService;
private _toolStateCompletionService: NativeToolStateCompletionService;
private _connectionService: NativeWorkflowConnectionService;
```

Update `doHover()`:
```typescript
public override doHover(...) {
  return this._hoverService.doHover(workflowDocument, position);
  // NativeHoverService handles JSON schema fallback internally
}
```

Update `doComplete()`:
```typescript
public override async doComplete(...) {
  const result = await this.tryToolStateCompletion(workflowDocument, position);
  if (result) return result;

  const connResult = await this.tryConnectionCompletion(workflowDocument, position);
  if (connResult) return connResult;

  // Fallback: JSON schema completions
  return this._jsonLanguageService.doComplete(...);
}
```

---

## Key invariants

- **Step paths in native**: `steps` is a JSON object keyed by string-encoded integers (`"0"`, `"1"`).
  `stepPath = ["steps", "0"]` — same shape as format2 `["steps", "step_name"]`.
  `getStringPropertyFromStep` handles both without changes.
- **`findStateInPath`**: already handles both `"tool_state"` (native) and `"state"` (format2).
- **String-form `tool_state`**: hover/completion are skipped (state node is not an object).
  This matches validation Pass B behavior. Clean the workflow to get the full experience.
- **Step ID vs step key**: the `steps` object key is a string (`"8"`); the step's `id` field is
  an integer (`8`). `input_connections` `id` values refer to the integer field, not the string key
  (though they are equal in value).

---

## Unresolved questions

1. Does `toNativeStateful()` from `@galaxy-tool-util/schema` produce object-form or string-form
   `tool_state`? Determines whether format2→native converted workflows immediately benefit from
   Pass A hover/completion.
2. Parameter name flattening for key completion (Step 6d): Galaxy uses `|` for section nesting in
   `input_connections` keys. Does `getToolParameters()` return names in this flattened form, or
   does it return a tree that needs flattening? Needs a quick test against a real tool.
