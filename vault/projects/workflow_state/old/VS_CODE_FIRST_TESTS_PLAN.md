# VS Code E2E / Integration Testing Plan

**Branch:** `wf_tool_state`
**Covers:** Phase 5 (conditional branch filtering + connection source completions) and Phase 6 (tool cache concerns on workflow load, schema-aware cleaning)

---

## Infrastructure Overview

Before writing tests, key constraints:

| Layer | What works | What doesn't |
|-------|-----------|--------------|
| **E2E** (VS Code host) | `getDiagnostics`, `executeCompletionItemProvider`, `executeCommand` | Any feature requiring a real Galaxy server / populated tool cache |
| **Integration** (Vitest, mocked registry) | Tool-state completions, hover, validation with controlled tool defs | VS Code APIs |

**Rule of thumb:** Source completions (pure AST, no tool registry) and diagnostic smoke tests are suitable for E2E. Everything involving `ToolRegistryService` is better at the integration layer (already done for Phase 5).

**VSCode completion API:**
```typescript
const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
  "vscode.executeCompletionItemProvider",
  docUri,
  new vscode.Position(line, char)
);
```

---

## Part 1: Phase 5 — Conditional Branch Filtering (5A)

### Why integration, not E2E

Full branch-filtering tests need a tool definition with a `gx_conditional` block. Without a real/mock tool in the VS Code host's tool cache, the extension returns an info diagnostic ("tool not cached") and skips conditional logic entirely. Mocking the registry inside an E2E host process is impractical.

**Decision:** Phase 5A is integration-tested only (already done in `toolStateCompletion.test.ts`, `toolStateValidation.test.ts`, `toolStateHover.test.ts`). The E2E coverage is a single smoke test.

### 5A-E2E-1: Tool-state info diagnostic on workflow load

**What it tests:** The validation pipeline for tool state is wired in production (VS Code host). If a step's `tool_id` is not in the cache, the extension emits an Information diagnostic. This proves `ToolStateValidationService` runs end-to-end.

**Fixture needed:** `test-data/yaml/tool-state/test_ts_smoke.gxwf.yml`
```yaml
class: GalaxyWorkflow
inputs:
  input_data:
    type: data
outputs: {}
steps:
  wc_step:
    tool_id: wc_gnu
    tool_version: "1.0.0"
    in:
      input1: input_data
    state:
      include_header: "true"
```

**Test location:** `client/tests/e2e/suite/extension.gxformat2.e2e.ts` — new suite "Tool State Validation"

```typescript
test("uncached tool emits info diagnostic", async () => {
  const docUri = getDocUri(path.join("yaml", "tool-state", "test_ts_smoke.gxwf.yml"));
  await activateAndOpenInEditor(docUri);
  await waitForDiagnostics(docUri);
  const diags = vscode.languages.getDiagnostics(docUri);
  const infoDiag = diags.find(
    d => d.severity === vscode.DiagnosticSeverity.Information
      && d.message.toLowerCase().includes("cache")
  );
  assert.ok(infoDiag, "Expected info diagnostic for uncached tool");
});
```

**Difficulty:** Low. No tool registry needed. Validates the wiring.

---

## Part 2: Phase 5 — Connection Source Completions (5B)

These are purely AST-based (no tool registry), which makes them ideal E2E candidates.

### Fixture needed

`test-data/yaml/completions/test_source_completions.gxwf.yml` — a two-step workflow where:
- step 1 (`wc_step`) has output `out_file1`
- step 2 (`grep_step`) has a `source:` field at a known line/column

```yaml
class: GalaxyWorkflow
inputs:
  input_data:
    type: data
  filter_pattern:
    type: text
outputs: {}
steps:
  wc_step:
    tool_id: wc_gnu
    in:
      input1: input_data
    out:
      - out_file1
  grep_step:
    tool_id: grep
    in:
      - id: input
        source: 
      - id: pattern
        source: 
```

The `source:` lines are at known positions — record exact line numbers after writing the fixture.

### 5B-E2E-1: Workflow inputs appear in source completions

**Position:** cursor on blank `source:` in `grep_step` → column after the space

```typescript
test("source: completions include workflow inputs", async () => {
  const docUri = getDocUri(path.join("yaml", "completions", "test_source_completions.gxwf.yml"));
  await activateAndOpenInEditor(docUri);
  // line/col where `source: ` is followed by nothing (first in block)
  const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
    "vscode.executeCompletionItemProvider",
    docUri,
    new vscode.Position(SOURCE_LINE_1, SOURCE_COL_1)
  );
  const labels = completions?.items.map(i =>
    typeof i.label === "string" ? i.label : i.label.label
  ) ?? [];
  assert.ok(labels.includes("input_data"), `Expected 'input_data' in ${JSON.stringify(labels)}`);
  assert.ok(labels.includes("filter_pattern"), `Expected 'filter_pattern' in ${JSON.stringify(labels)}`);
});
```

### 5B-E2E-2: Upstream step outputs appear in source completions

```typescript
test("source: completions include upstream step outputs", async () => {
  // same docUri, same position
  assert.ok(labels.includes("wc_step/out_file1"),
    `Expected 'wc_step/out_file1' in ${JSON.stringify(labels)}`);
});
```

This can be collapsed into the previous test to avoid opening the document twice.

### 5B-E2E-3: Forward references absent from completions

**Position:** cursor on `source:` in `wc_step` (step 1, which comes before `grep_step`)

```typescript
test("source: completions do not include forward step outputs", async () => {
  const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
    "vscode.executeCompletionItemProvider",
    docUri,
    new vscode.Position(WC_SOURCE_LINE, WC_SOURCE_COL)
  );
  const labels = ...;
  assert.ok(!labels.some(l => l.startsWith("grep_step/")),
    "grep_step outputs should not appear as completions for wc_step");
});
```

### 5B-E2E-4: Map shorthand `in:` also triggers source completions

Add a second fixture or extend the first with a shorthand step:
```yaml
  grep_step_2:
    tool_id: grep
    in:
      input: 
```
Trigger completions at the blank value position. Assert workflow inputs and `wc_step/out_file1` appear.

**New file:** `client/tests/e2e/suite/extension.gxformat2.e2e.ts` — new suite "Connection Source Completions"

---

## Part 3: Phase 6 — Tool Cache Concerns on Workflow Load (`6d0cb15`)

### What the commit likely does

"Handle tool cache concerns on workflow load" — when a Format2 workflow document is opened, the extension now properly handles the case where:
- Tools referenced by workflow steps are not yet in the cache
- The tool cache is fetched/checked on document open (eager prefetch or deferred check)
- Info diagnostics are cleared once the cache is populated

This is distinct from completions — it's about the lifecycle of diagnostics as the cache state changes.

### 6-E2E-1: Info diagnostics resolve after cache population (lifecycle test)

**Scenario:** Open workflow with uncached tool → info diagnostic appears → populate cache → info diagnostic clears, real validation runs.

**Challenge:** Populating the tool cache in a test environment requires either:
- A real Galaxy server (not practical in CI without a running server)
- A command that populates a mock/local cache

**Workaround strategy:** Use `updateSettings` to point to a Galaxy instance if available, or test only the "uncached" half (test 5A-E2E-1 already covers that). Full lifecycle test is aspirational.

**Recommended approach for now:** Write the test structure with a `this.skip()` guard that skips if no Galaxy URL is configured:

```typescript
test("info diagnostic clears after cache is populated", async function () {
  const galaxyUrl = vscode.workspace.getConfiguration("galaxyWorkflows")
    .get<string>("galaxyApiUrl");
  if (!galaxyUrl) this.skip();
  // ... full lifecycle test
});
```

### 6-E2E-2: Clean workflow removes stale bookkeeping keys from Format2

The `cleanWorkflow` command now runs `cleanWorkflow()` from `@galaxy-tool-util/schema`, which also strips `__page__`, `__rerun_remap_job_id__`, etc. from tool state.

**Fixture needed:** `test-data/yaml/clean/test_wf_dirty.gxwf.yml` — Format2 workflow with stale keys in `state:`

```yaml
class: GalaxyWorkflow
inputs:
  input_data:
    type: data
outputs: {}
steps:
  wc_step:
    tool_id: wc_gnu
    state:
      include_header: "true"
      __page__: null
      __rerun_remap_job_id__: null
      input1:
        __class__: RuntimeValue
```

**Expected clean output** (`test-data/yaml/clean/test_wf_clean.gxwf.yml`):
```yaml
class: GalaxyWorkflow
inputs:
  input_data:
    type: data
outputs: {}
steps:
  wc_step:
    tool_id: wc_gnu
    state:
      include_header: "true"
      input1:
        __class__: RuntimeValue
```

**Test location:** `client/tests/e2e/suite/extension.gxformat2.e2e.ts` — new suite "Commands Tests"

```typescript
test("Clean workflow command removes stale tool_state keys from Format2", async () => {
  const docUri = getDocUri(path.join("yaml", "clean", "test_wf_dirty.gxwf.yml"));
  const { document } = await activateAndOpenInEditor(docUri);
  await vscode.commands.executeCommand("galaxy-workflows.cleanWorkflow");
  await sleep(500); // wait for edit to apply
  const cleanedText = document.getText();
  assert.ok(!cleanedText.includes("__page__"), "stale key __page__ should be removed");
  assert.ok(!cleanedText.includes("__rerun_remap_job_id__"), "stale key __rerun_remap_job_id__ should be removed");
  assert.ok(cleanedText.includes("include_header"), "valid key include_header should be preserved");
});
```

**Difficulty:** Medium. Relies on the document being mutated in place by the clean command. The pattern mirrors the existing native JSON clean test.

---

## Summary Table

| Test ID | Layer | Feature | Requires Tool Cache | Fixture |
|---------|-------|---------|-------------------|---------|
| 5A-E2E-1 | E2E | Info diag for uncached tool | No | `yaml/tool-state/test_ts_smoke.gxwf.yml` |
| 5B-E2E-1 | E2E | Source completions: workflow inputs | No | `yaml/completions/test_source_completions.gxwf.yml` |
| 5B-E2E-2 | E2E | Source completions: upstream step outputs | No | same |
| 5B-E2E-3 | E2E | Source completions: no forward refs | No | same |
| 5B-E2E-4 | E2E | Source completions: map shorthand form | No | extended fixture or inline |
| 6-E2E-1 | E2E | Diag lifecycle: clears after cache fill | Yes (Galaxy server) | `yaml/tool-state/test_ts_smoke.gxwf.yml` |
| 6-E2E-2 | E2E | Clean Format2: removes stale `__page__` etc. | No | `yaml/clean/test_wf_dirty.gxwf.yml` |

**Not in E2E (covered by integration):**
- Conditional branch filtering (active vs. stale branch params) — integration only
- Section/repeat parameter navigation — integration only
- Hover contents — integration only
- Schema-aware stale key removal (tool-defined params stripped) — integration + manual

---

## Implementation Order

1. **Write fixtures** (`test_ts_smoke.gxwf.yml`, `test_source_completions.gxwf.yml`, dirty/clean YAML pair)
2. **5A-E2E-1** (info diagnostic smoke) — validates pipeline wiring, low effort
3. **6-E2E-2** (Format2 clean stale keys) — close analog to existing native clean test
4. **5B-E2E-1 + 5B-E2E-2 + 5B-E2E-3** (source completions) — batch in one file open
5. **5B-E2E-4** (shorthand form) — extend fixture, add test
6. **6-E2E-1** (lifecycle) — write with `this.skip()` guard, enable when Galaxy server is available in CI

---

## Unresolved Questions

1. Does `vscode.executeCompletionItemProvider` reliably return extension-contributed completions in the test runner, or does it only return language-server completions? (Should be fine since the extension registers via LSP — verify with a quick spike.)
2. For 5B, do we need to `await waitForDiagnostics` before triggering completions, or is the language client ready by the time `activateAndOpenInEditor` returns?
3. For 6-E2E-2, does the Format2 `cleanWorkflowText()` currently strip `__page__` etc. from `state:` (not just native `tool_state:`)? Verify against `cleanWorkflow()` library behavior for format2 steps.
4. For 6-E2E-1, what CI environment will this run in — is there a mock Galaxy server available, or should this remain a skip-guarded local-only test indefinitely?
