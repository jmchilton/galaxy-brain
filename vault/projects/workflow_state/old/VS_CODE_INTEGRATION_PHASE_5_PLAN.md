# Phase 5: Conditional Branch Filtering + Connection Source Completions

**Branch:** `wf_tool_state`  
**Working dir:** `/Users/jxc755/projects/worktrees/galaxy-workflows-vscode/branch/wf_tool_state`  
**Upstream:** `vs_code_branch` worktree at `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/vs_code_branch`

---

## Overview

Phase 5 has two independent functional deliverables:

- **5A — Conditional branch filtering:** When completing/validating/hovering inside a `gx_conditional` parameter block in `state:`, read the discriminator value currently set in the AST and show only the matching branch's parameters.
- **5B — Connection source completions:** When completing the `source:` field inside a step's `in:` block, suggest `step_label/output_name` from upstream steps and `input_name` from workflow-level inputs.

But before implementing either, two upstream PRs are required to prevent building logic in the extension that should live upstream:

- **Pre-A — `findParamAtPath` upstream:** Extract the parameter tree walker into `@galaxy-tool-util/schema`, including conditional branch filtering via `selectWhichWhen`. Replaces both `navigateParams` (completion) and the extension's `findParamAtPath` (hover) with calls to the upstream utility.
- **Pre-B — `ToolStateValidator` strict mode upstream:** Add unknown-key detection to `ToolStateValidator`. Replaces `ToolStateValidationService`'s recursive AST traversal with a thin shim that calls the upstream validator and maps dot-paths to YAML ranges.

Pre-A and Pre-B share a common bridge needed in the extension: converting a YAML `ObjectASTNode` to a plain `Record<string, unknown>`. That bridge is where the extension's AST-specific work is concentrated; everything else moves upstream.

---

## Prior work completed

**Upstream commit `6fb2ffe` on `vs_code_branch`:**
- `src/schema/type-guards.ts` — `isSelectLikeParam`, `isBooleanParam`, `isSectionParam`, `isRepeatParam`, `isConditionalParam`
- `src/index.ts` — exports all `ToolParameterModel` subtypes + type guards

**Extension commit `c30f68d` on `wf_tool_state`:**
- `toolStateTypes.ts` refactored to a shim re-exporting from `@galaxy-tool-util/schema`
- `ConditionalParam` aliases upstream `ConditionalParameterModel`, which already has `discriminator: string | boolean` and `is_default_when: boolean` on `whens` — **Step A1 is already done**
- Symlink now points to `vs_code_branch`

**Upstream commits `aa8ebc5` + `aeaab8e` on `vs_code_branch`:** ✅ DONE
- `src/workflow/param-navigation.ts` — `findParamAtPath`, `ParamNavigationResult` (Pre-A)
  - `state === undefined` → show all branches (discriminator not yet set)
  - `state !== undefined` → resolve active branch via `selectWhichWhen`
- `src/workflow/stateful-validate.ts` — `validateFormat2StepStateStrict`, `ToolStateDiagnostic` (Pre-B)
  - `ToolStateDiagnostic` moved here as canonical definition; re-exported from `tool-state-validator.ts`
- `src/tool-state-validator.ts` — `validateFormat2StepStrict` method (Pre-B)
- Exports wired in `src/workflow/index.ts` and `src/index.ts`
- Tests: `test/param-navigation.test.ts` (19 cases), 5 new cases in `test/tool-state-validator.test.ts`

---

## ~~Pre-A~~ ✅ DONE — Upstream `findParamAtPath` utility

### What was added to `@galaxy-tool-util/schema`

```typescript
export interface ParamNavigationResult {
  /** The param at the final path segment (undefined if path doesn't resolve). */
  param: ToolParameterModel | undefined;
  /** All params available at the final level — used for name completions. */
  availableParams: ToolParameterModel[];
}

export function findParamAtPath(
  params: ToolParameterModel[],
  path: (string | number)[],
  state?: Record<string, unknown>
): ParamNavigationResult
```

Key behavioral detail: when `state === undefined`, conditional branches are ALL merged (discriminator not set → show all params). When `state !== undefined` (even `{}`), `selectWhichWhen` is used to pick the active branch.

### Extension shim after Pre-A

The extension needs a bridge function (add to `toolStateTypes.ts` alongside `getStringPropertyFromStep`):

```typescript
/** Convert a YAML ObjectASTNode to a nested plain dict for upstream param navigation. */
export function yamlObjectNodeToRecord(node: ObjectASTNode): Record<string, unknown> {
  const dict: Record<string, unknown> = {};
  for (const prop of node.properties) {
    const key = String(prop.keyNode.value);
    const val = prop.valueNode;
    if (!val) continue;
    if (val.type === "string")  dict[key] = String(val.value);
    if (val.type === "boolean") dict[key] = Boolean(val.value);  // preserve native bool for selectWhichWhen
    if (val.type === "number")  dict[key] = Number(val.value);
    if (val.type === "object")  dict[key] = yamlObjectNodeToRecord(val as ObjectASTNode);
    // arrays (repeats) left empty — selectWhichWhen only needs scalar values
  }
  return dict;
}
```

Then:
- **`toolStateCompletionService.ts`** — `navigateParams` (~100 lines) replaced by: get state dict, call `findParamAtPath(params, innerPath, stateDict)`, build completion items from `ParamNavigationResult`
- **`hoverService.ts`** — local `findParamAtPath` (~30 lines) replaced by: same upstream call, build hover markdown from result

The LSP-specific logic (name-vs-value mode detection, `afterColon` check, completion item builders, hover markdown) stays in the extension; only the tree-walking moves upstream.

---

## ~~Pre-B~~ ✅ DONE — Upstream `ToolStateValidator` strict mode

### What was added to `@galaxy-tool-util/schema`

`validateFormat2StepStateStrict` in `stateful-validate.ts` (uses `onExcessProperty: "error"`), wrapped by `ToolStateValidator.validateFormat2StepStrict`. `ToolStateDiagnostic` consolidated as the canonical type in `stateful-validate.ts`.

```typescript
class ToolStateValidator {
  // existing: ignores unknown keys (used for conversion validation)
  async validateFormat2Step(toolId, toolVersion, state): Promise<ToolStateDiagnostic[]>

  // NEW: reports unknown keys as errors (for LSP diagnostics)
  async validateFormat2StepStrict(
    toolId: string,
    toolVersion: string | null,
    format2State: Record<string, unknown>
  ): Promise<ToolStateDiagnostic[]>
}
```

`ToolStateDiagnostic` has `path: string` (dot-separated), `message: string`, `severity: "error" | "warning"`.

### Extension shim after Pre-B

`ToolStateValidationService` becomes:

```typescript
export class ToolStateValidationService {
  private readonly validator: ToolStateValidator;

  constructor(toolRegistryService: ToolRegistryService) {
    // ToolRegistryServiceImpl wraps ToolInfoService; expose it via an accessor
    this.validator = new ToolStateValidator(toolRegistryService.getToolInfo());
  }

  async doValidation(documentContext: GxFormat2WorkflowDocument): Promise<Diagnostic[]> {
    const result: Diagnostic[] = [];
    const nodeManager = documentContext.nodeManager;

    for (const stepNode of nodeManager.getStepNodes()) {
      const toolId = /* extract as before */;
      const toolVersion = /* extract as before */;
      const stateProperty = /* find state or tool_state property */;
      if (!stateProperty?.valueNode || stateProperty.valueNode.type !== "object") continue;

      if (!this.toolRegistryService.hasCached(toolId, toolVersion)) {
        // Information diagnostic stays in extension (cache UX, not validation)
        result.push(/* existing info diagnostic */);
        continue;
      }

      const stateDict = yamlObjectNodeToRecord(stateProperty.valueNode as ObjectASTNode);
      const diags = await this.validator.validateFormat2StepStrict(toolId, toolVersion, stateDict);

      for (const diag of diags) {
        const range = dotPathToYamlRange(stateProperty.valueNode as ObjectASTNode, diag.path, nodeManager);
        result.push({
          message: diag.message,
          severity: diag.severity === "error" ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
          range,
        });
      }
    }
    return result;
  }
}
```

`dotPathToYamlRange` is extension-specific (~20 lines): split the dot-path on `"."`, navigate the YAML `ObjectASTNode` property by property, return the range of the final key node (or value node for value errors).

**Note:** `ToolRegistryServiceImpl` currently doesn't expose the underlying `ToolInfoService`. This accessor needs to be added to the `ToolRegistryService` interface or handled by constructing `ToolStateValidator` inside `ToolRegistryServiceImpl`.

---

## Part A: Conditional Branch Filtering (after Pre-A)

### What remains after Pre-A

With `findParamAtPath` upstream (including `selectWhichWhen` integration), the extension changes are:

#### ~~Step A1~~ ✅ DONE — Type updated

#### Step A2 — Add `yamlObjectNodeToRecord` bridge (shared with Pre-B)

Already described in Pre-A. Lives in `toolStateTypes.ts`.

#### Step A3 — Replace `navigateParams` in completion

`toolStateCompletionService.ts`:
- Delete `navigateParams` function (~100 lines)
- Call upstream `findParamAtPath(params, innerPath, stateDict)` instead
- The extension keeps: `afterColon` detection, completion item builders, `findStateInPath`

The completion context (name vs. value mode) is derived from `ParamNavigationResult`:
- `result.param && afterColon` → value completion for `result.param`
- otherwise → name completions from `result.availableParams`

#### Step A4 — Replace local `findParamAtPath` in hover

`hoverService.ts`:
- Delete local `findParamAtPath` (~30 lines)
- Call upstream `findParamAtPath` instead
- Extension keeps: hover markdown builder, `findStateInPath`

#### Step A4 validation — Replace `validateStateNode` in validation

`toolStateValidationService.ts`:
- Delete recursive `validateStateNode`
- Call `validateFormat2StepStrict` + `dotPathToYamlRange` shim

#### Step A5 — Tests

Same as before — split the existing conditional test and add branch-filtered cases:

1. `toolStateCompletion.test.ts` — split existing test into 3 (`fast`, `sensitive`, no value set)
2. `toolStateValidation.test.ts` — 2 new tests (stale branch param warns, active branch is clean)
3. `toolStateHover.test.ts` — 1 new test (hover in correct branch)

**Test count: +6**

---

## Part B: Connection Source Completions

*(Unchanged from previous revision — no upstream prerequisites needed for this part.)*

### Format2 `source:` conventions

- **Workflow input:** `source: my_input`
- **Step output:** `source: step_label/output_name`

### Detection

```typescript
export interface SourceInPath { stepName: string; }

export function findSourceInPath(path: NodePath): SourceInPath | undefined {
  const n = path.length;
  // Explicit: ["steps", stepName, "in", index, "source"]
  if (n >= 5 && path[n-1] === "source" && typeof path[n-2] === "number"
      && path[n-3] === "in" && path[n-5] === "steps")
    return { stepName: String(path[n-4]) };
  // Map shorthand: ["steps", stepName, "in", inputName] — value IS the source
  if (n >= 4 && typeof path[n-1] === "string" && path[n-1] !== "in"
      && path[n-2] === "in" && path[n-4] === "steps")
    return { stepName: String(path[n-3]) };
  return undefined;
}
```

Map shorthand path shape needs integration test confirmation before finalizing.

### Steps B1–B3

Same as previous revision:
- **B1:** New `workflowConnectionService.ts` — `getAvailableSources`, `findSourceInPath`
- **B2:** Wire into `completionService.ts`
- **B3:** ~7 integration tests

---

## File Impact Summary

### Upstream (`@galaxy-tool-util/schema`, `vs_code_branch`)

| File | Change |
|------|--------|
| `src/workflow/param-navigation.ts` | **NEW** ✅ — `findParamAtPath`, `ParamNavigationResult` |
| `src/workflow/stateful-validate.ts` | **MODIFIED** ✅ — `validateFormat2StepStateStrict`, `ToolStateDiagnostic` (canonical def) |
| `src/tool-state-validator.ts` | **MODIFIED** ✅ — `validateFormat2StepStrict`, re-exports `ToolStateDiagnostic` |
| `src/workflow/index.ts` | **MODIFIED** ✅ — exports above |
| `src/index.ts` | **MODIFIED** ✅ — exports above |

### Extension (`wf_tool_state`)

| File | Change |
|------|--------|
| `src/services/toolStateTypes.ts` | **MODIFIED** ✅ — Add `ToolParamBase`, `getObjectNodeFromStep`, `yamlObjectNodeToRecord`; `dotPathToYamlRange` deferred to A4-val |
| `src/services/toolStateCompletionService.ts` | **MODIFIED** ✅ — Delete `navigateParams`; call upstream `findParamAtPath` with YAML state dict |
| `src/services/toolStateValidationService.ts` | Delete recursive `validateStateNode`; call `validateFormat2StepStrict`, map paths to ranges |
| `src/services/hoverService.ts` | **MODIFIED** ✅ — Delete local `findParamAtPath`; call upstream with YAML state dict |
| `src/services/workflowConnectionService.ts` | **NEW** ✅ — `getAvailableSources`, `findSourceInPath` |
| `src/services/completionService.ts` | **MODIFIED** ✅ — Add `findSourceInPath` check |
| `tests/integration/toolStateCompletion.test.ts` | **MODIFIED** ✅ — Split conditional test into 3 (no discriminator / fast / sensitive); +2 new tests |
| `tests/integration/toolStateValidation.test.ts` | +2 tests |
| `tests/integration/toolStateHover.test.ts` | **MODIFIED** ✅ — +2 conditional hover tests (active / inactive branch) |
| `tests/integration/workflowSourceCompletion.test.ts` | **NEW** ✅ — 7 tests |

---

## Implementation Order

1. ~~A1: ConditionalParam type~~ ✅ DONE
2. ~~**Pre-A upstream:** Add `findParamAtPath` to `@galaxy-tool-util/schema`; rebuild; tests~~ ✅ DONE (`aa8ebc5`, refined in `0b073a7`)
3. ~~**Pre-B upstream:** Add `validateFormat2StepStrict` to `ToolStateValidator`; rebuild~~ ✅ DONE (`aa8ebc5`, `aeaab8e`)
4. ~~**Extension bridge:** Add `yamlObjectNodeToRecord` + `getObjectNodeFromStep` to `toolStateTypes.ts`~~ ✅ DONE (`483bb12`)
5. ~~**A3:** Replace `navigateParams` with upstream `findParamAtPath` call~~ ✅ DONE (`483bb12`)
6. ~~**A4:** Replace hover's local `findParamAtPath` with upstream call~~ ✅ DONE (`483bb12`)
7. ~~**A4 validation:** Replace `validateStateNode` recursion with `validateFormat2StepStrict` shim + `dotPathToYamlRange`~~ ✅ DONE (`5ea7143`)
8. ~~**A5:** +2 validation tests (stale branch param, active branch clean)~~ ✅ DONE (`5ea7143`)
9. ~~**B1:** `workflowConnectionService.ts`~~ ✅ DONE
10. ~~**B2:** Wire into `completionService.ts`~~ ✅ DONE
11. ~~**B3:** Tests (red-to-green)~~ ✅ DONE

---

## Unresolved Questions

1. ~~**`ToolStateValidator` severity mapping:**~~ RESOLVED: detect "is unexpected" in extension, remap to Warning + custom message; merge per-union-member value errors into one "Invalid value" Error.
2. ~~**`ToolRegistryServiceImpl` wiring:**~~ RESOLVED: call `validateFormat2StepStateStrict(rawParams, stateDict)` directly — rawParams already available from `getToolParameters`.
3. ~~**`dotPathToYamlRange` edge cases:**~~ RESOLVED: works for flat, section, conditional; repeat paths not tested (not exercised by current tests).
4. ~~**Map shorthand `in:` path shape:**~~ RESOLVED: integration test confirms `["steps", "step", "in", "key"]` — completions work for shorthand form.
5. ~~**Validation: warn on stale branch params?**~~ RESOLVED: stale branch params flagged as Warning via "is unexpected" detection.
6. **`out:` on subworkflow steps:** Skip for now — only handle plain `out:` array form.
