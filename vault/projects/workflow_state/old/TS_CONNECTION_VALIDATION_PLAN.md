# TS Connection Validation Plan

Port Galaxy's connection-validation system to `galaxy-tool-util-ts` so the 26 synced workflow fixtures + 19 sidecars at `packages/core/test/fixtures/connection_workflows/` actually drive a TS validator. Truth-table algebra parity (91 cases via `packages/workflow-graph/test/connection-type-cases.test.ts`) already passes — this plan covers the workflow-graph-level validator that consumes ParsedTool definitions + a gxformat2 workflow and produces a report matching the sidecar `target/value` expectations.

> Research-driven plan. Module/function names are authoritative; cited line numbers are research-pass approximations and not load-bearing.

**Decisions locked**:
- New package `@galaxy-tool-util/connection-validation`.
- Report keys are **snake_case** — Python parity is essential; `dictVerifyEach` walks the report directly with no key translation.
- `gxwf` CLI mirrors Python: connection validation is **opt-in** via `--connections` (default off). Python's `validate.py` and `lint_stateful.py` both gate the call on `connections=False` by default; the same flag exists on `workflow_validate.py`, `workflow_lint_stateful.py`, and the tree variants.
- Unresolved-tool-id parity stays programmatic on the Galaxy side; no TS fixture needed.

---

## 1. Galaxy-side Architecture

### Module Layout and Entry Points

The Galaxy connection validator lives at `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/tool_util/workflow_state/` with these key modules:

- **connection_validation.py** — main validator. Contains:
  - `validate_connections(workflow_dict, get_tool_info) -> WorkflowConnectionResult` (~l. 102-109)
  - `validate_connections_report(workflow_dict, get_tool_info) -> ConnectionValidationReport` (~l. 112-119) — returns Pydantic model
  - `validate_connection_graph(graph, seed_output_types) -> (WorkflowConnectionResult, StepOutputTypeMap)` (~l. 122-197) — core logic
  - Inner functions: `_validate_single_connection()`, `_resolve_step_map_over()`, `_resolve_output_types()`, `_resolve_subworkflow_outputs()`, `_resolve_collection_output_type()`, `_resolve_collection_type_source()`

- **connection_graph.py** — workflow graph builder that extracts typed I/O. Defines:
  - `@dataclass ConnectionRef`: source_step, output_name, input_subworkflow_step_id (~l. 50-55)
  - `@dataclass ResolvedInput`: name, state_path, type (data/collection/text/etc), collection_type, multiple, optional, extensions (~l. 59-69)
  - `@dataclass ResolvedOutput`: name, type, collection_type, collection_type_source, collection_type_from_rules, structured_like, format, format_source (~l. 72-82)
  - `@dataclass ResolvedStep`: step_id, tool_id, step_type, inputs, outputs, connections, inner_graph (subworkflows), subworkflow_output_map (~l. 86-98)
  - `@dataclass WorkflowGraph`: steps dict, sorted_step_ids list (~l. 101-105)
  - `build_workflow_graph(workflow, get_tool_info) -> WorkflowGraph` (~l. 108-136) — entry point

- **connection_types.py** — collection-type algebra adapter (already mirrored in TS workflow-graph algebra). Defines:
  - Sentinels: `NULL_COLLECTION_TYPE`, `ANY_COLLECTION_TYPE`
  - Free functions: `can_match`, `can_map_over`, `compatible`, `effective_map_over`, `is_list_like`, `collection_type_rank`
  - All wrap `CollectionTypeDescription` methods with sentinel dispatch

- **_report_models.py** — Pydantic models for structured reports:
  - `ConnectionStatus = Literal["ok", "invalid", "skip"]`
  - `ConnectionResult`: source_step, source_output, target_step, target_input, status, mapping (collection type being mapped), errors
  - `ResolvedOutputType`: name, collection_type
  - `ConnectionStepResult`: step, tool_id, step_type, map_over, connections[], resolved_outputs[], errors[]
  - `ConnectionValidationReport`: valid, step_results[], summary dict

- **_types.py** — type protocols:
  - `GetToolInfo` protocol with `get_tool_info(tool_id, tool_version) -> ParsedTool | None`
  - Implementations: `FunctionalGetToolInfo` (in tests)

### Result Type Hierarchy

```
WorkflowConnectionResult (dataclass) [connection_validation.py]
├─ step_results: List[StepConnectionResult]
│  └─ step_id, tool_id, step_type, map_over, connections[], errors[]
│     └─ connections: List[ConnectionValidationResult]
│        └─ source_step, source_output, target_step, target_input
│           status: "ok" / "invalid" / "skip"
│           mapping: collection_type or None
│           errors[]

ConnectionValidationReport (Pydantic) [_report_models.py]
├─ valid: bool
├─ step_results: List[ConnectionStepResult]   [adds resolved_outputs[]]
├─ summary: Dict[str, int]                    {ok: N, invalid: N, skip: N}
├─ has_details: computed property
```

### Validator Core Loop (`validate_connection_graph`, ~l. 122-197)

1. Build workflow graph (topological sort via `connection_graph.build_workflow_graph()`)
2. Initialize `resolved_output_types` from tool defs (~l. 138-141)
3. Seed with externally-provided types for subworkflow input propagation (~l. 144-147)
4. For each step in topological order (~l. 151):
   - Validate each connection (~l. 168-176):
     - Resolve source output type from `resolved_output_types`
     - Resolve target input type from `ResolvedInput`
     - Call `_validate_single_connection()` which applies, in order:
       - Direct match via `can_match(source, target)` → `"ok"`
       - Map-over via `effective_map_over(source, target)` → `"ok"` + mapping
       - Multi-data reduction (list-like → `multiple=True`) → special case
       - Otherwise → `"invalid"`
   - Aggregate map-over contributions from all connection mappings (~l. 178-182)
   - Resolve step map-over via `_resolve_step_map_over()` (~l. 185-187):
     - Collect non-None mapping contributions
     - Verify pairwise compatibility via symmetric `compatible()`
     - Pick highest-rank compatible type
   - Resolve output types (~l. 189-193):
     - If subworkflow: recursively validate inner graph with seeded types (~l. 380)
     - Otherwise: apply map-over to outputs via `_resolve_output_types()` (~l. 328-357)

### Tool-Info Interface

**Protocol** `GetToolInfo` (~l. 32-35 in `_types.py`):
```python
class GetToolInfo(Protocol):
    def get_tool_info(self, tool_id: str, tool_version: Optional[str]) -> Optional[ParsedTool]: ...
```

**ParsedTool shape** (from `galaxy.tool_util_models`):
- `inputs: List[ToolParameterT]` — parameter tree
- `outputs: list[ToolOutput*]` — output definitions
  - `ToolOutputDataset` (format, format_source)
  - `ToolOutputCollection` (collection_type, collection_type_source, collection_type_from_rules, structured_like)
  - Text, Integer, Float, Boolean output types

**Graph building** calls `get_tool_info.get_tool_info()` (~l. 192 in `connection_graph.py`):
- Returns `None` → inputs/outputs remain empty, tool resolution skipped
- Returns `ParsedTool` → walks inputs recursively via `_collect_inputs()` (~l. 318-394), outputs via `_collect_outputs()` (~l. 397-425)

**Input collection** handles parameter tree traversal:
- `gx_data` → `ResolvedInput(type="data", multiple, optional, extensions)`
- `gx_data_collection` → `ResolvedInput(type="collection", collection_type)`
- `gx_text/integer/float/boolean` → `ResolvedInput(type=param_type)`
- Conditionals, repeats, sections → recursive descent with `state_path` indexing

**Output collection**:
- Dataset outputs → `ResolvedOutput(type="data")`
- Collection outputs → `ResolvedOutput` with `collection_type`, `collection_type_source`, `structured_like`
- Resolves `collection_type_from_rules` via `RuleSet`

### Subworkflow Handling (`connection_graph.py` ~l. 216-243; `connection_validation.py` ~l. 360-387)

**Resolution** (graph build):
1. `_resolve_subworkflow_step()` recursively builds inner graph
2. Parses connections to inner input steps via `input_subworkflow_step_id` (`ConnectionRef`)
3. Synthesizes `ResolvedInputs` from inner workflow input steps (~l. 246-258)
4. Builds `output_map` from inner `workflow_outputs` declarations (~l. 280-293)

**Validation** (during walk):
1. Seeds inner graph with outer resolved types (~l. 369-377):
   - Maps outer source output types into inner input step outputs
   - Keyed by `input_subworkflow_step_id` → propagates outer types inward
2. Recursively calls `validate_connection_graph(inner_graph, seed)` (~l. 380)
3. Propagates inner resolved outputs outward via `subworkflow_output_map` (~l. 384-387)

### Slotting Into Broader Galaxy Validation

The connection validator is invoked from:
- `test_connection_workflows.py` — fixture-driven tests (this is the contract our TS port mirrors)
- `test_connection_validation.py` — programmatic Python-only tests (the 13 we are NOT porting; they synthesize `TextParameterModel`/`ToolOutputInteger` shapes that fixtures don't model)

It is *not* tightly coupled to broader workflow lint today — it's a standalone module consumed primarily by tests, though `lint_stateful.py` and `validate.py` are nearby and may compose it later. On the TS side, we have analogous freedom to ship as a new package.

---

## 2. Sidecar Contract (Exhaustive Target Paths)

`dict_verify_each(actual, [{ target: [path...], value: X }, ...])` — strict equality at the `target` path. The TS port (`packages/core/test/helpers/dict-verify-each.ts`) already mirrors this. Across all 19 sidecars, the asserted paths are:

**Top-level**:
- `[valid]` → boolean

**Summary counts**:
- `[summary, ok]` → number
- `[summary, invalid]` → number
- (`skip` not currently asserted but present in `ConnectionValidationReport`)

**Per-step (`step_results[N]`)**:
- `[step_results, N, map_over]` → string (collection type) or absent/null
- `[step_results, N, step_type]` → not asserted directly

**Per-connection (`step_results[N].connections[M]`)**:
- `[step_results, N, connections, M, status]` → `"ok" | "invalid" | "skip"`
- `[step_results, N, connections, M, mapping]` → collection type string or null/absent
- `[step_results, N, connections, M, source_step]` / `source_output` / `target_step` / `target_input` → present, not asserted in fixtures
- `[step_results, N, connections, M, errors]` → list of strings (empty when status="ok")

**Resolved outputs (`step_results[N].resolved_outputs[K]`)**:
- `[step_results, N, resolved_outputs, K, name]` → output name
- `[step_results, N, resolved_outputs, K, collection_type]` → collection type string or null

**Step-level errors**:
- `[step_results, N, errors]` → list of error strings (e.g., incompatible map-over types)

This set is the validator's external API in TS terms — every field above must be reachable in the report object.

---

## 3. TS-side Current State

### What Exists

**Algebra (`packages/workflow-graph/src/`)**:
- ✅ `CollectionTypeDescription` class with `accepts()`, `compatible()`, `canMapOver()`, `effectiveMapOver()`
- ✅ `NULL_COLLECTION_TYPE_DESCRIPTION`, `ANY_COLLECTION_TYPE_DESCRIPTION` sentinels
- ✅ `CollectionTypeDescriptor` interface
- ✅ Collection type rank (depth)
- ✅ 91 truth-table cases passing at `packages/workflow-graph/test/connection-type-cases.test.ts`

**Helper utilities** (`packages/core/test/helpers/`):
- ✅ `dictVerifyEach` — mirrors `dict_verify_each`
- ✅ `loadConnectionFixtures` — loads fixtures + sidecars
- ✅ `loadParsedToolCache` — decodes `ParsedTool` via Effect Schema

**Test fixtures**:
- ✅ All 26 `.gxwf.yml` synced
- ✅ All 19 expected sidecars synced
- ✅ ParsedTool JSON cached for all referenced tools

**Schema support**:
- ✅ `ParsedTool` Effect Schema (in `packages/schema`)
- ✅ gxformat2 workflow parsing

**CLI surface**:
- ✅ `gxwf lint` calls stateful validation
- ✅ `lintWorkflow()` in `packages/schema`
- ✅ `ToolCache` interface in `packages/core`

### What's Missing

**Core validator module**:
- ❌ `validateConnections()` — main entry point
- ❌ `validateConnectionsReport()` — Pydantic-equivalent report export
- ❌ `validateConnectionGraph()` — graph validation with topological iteration
- ❌ Connection validation result types
- ❌ Single-connection validator logic (`_validate_single_connection`)
- ❌ Map-over resolution (`_resolve_step_map_over`)
- ❌ Output type resolution (`_resolve_output_types`, `_resolve_collection_output_type`, `_resolve_collection_type_source`)
- ❌ Subworkflow recursion (`_resolve_subworkflow_outputs`)

**Graph builder module**:
- ❌ `buildWorkflowGraph()` — gxformat2 → typed step graph
- ❌ `ResolvedInput`, `ResolvedOutput`, `ResolvedStep`, `WorkflowGraph` types
- ❌ Step type resolution (tool, subworkflow, data_input, etc.)
- ❌ Input/output collection via `ParsedTool` introspection
- ❌ Topological sort
- ❌ Subworkflow inner graph recursion

**Free-function wrappers** (currently algebra is class methods only):
- ❌ `canMatch`, `canMapOver`, `compatible`, `effectiveMapOver`, `isListLike`, `collectionTypeRank`

**CLI integration**:
- ❌ `gxwf validate-connections` subcommand (or fold into `gxwf lint`)
- ❌ Connection report wiring

---

## 4. Proposed TS Module Layout

### Package: New `@galaxy-tool-util/connection-validation`

**Rationale**:
- Orthogonal to `workflow-graph` (which is pure algebra)
- Needs core validation + CLI integration surface
- Clear separation from `schema` (stateful conversion)
- Mirrors Galaxy's `lib/galaxy/tool_util/workflow_state/connection_validation.py`
- Versionable independently

**Layout**:
```
packages/connection-validation/
├─ src/
│  ├─ index.ts                     # public API
│  ├─ types.ts                     # ResolvedInput/Output/Step, WorkflowGraph, result types
│  ├─ graph-builder.ts             # buildWorkflowGraph()
│  ├─ connection-validator.ts      # validateConnectionGraph(), validateConnections()
│  ├─ connection-resolver.ts       # _validateSingleConnection, _resolveStepMapOver
│  ├─ output-resolver.ts           # _resolveOutputTypes, collection_type_source
│  ├─ subworkflow-validator.ts     # _resolveSubworkflowOutputs, recursion
│  ├─ collection-type-functions.ts # canMatch, canMapOver, compatible, ... wrappers
│  └─ report-builder.ts            # toConnectionValidationReport (dataclass → Pydantic)
├─ test/
│  └─ connection-validator.test.ts # fixture-driven
├─ package.json
├─ tsconfig.json
└─ README.md
```

**Public API** (`index.ts`):
```typescript
export {
  validateConnections,
  validateConnectionsReport,
} from "./connection-validator.js";
export type {
  ResolvedStep,
  ResolvedInput,
  ResolvedOutput,
  WorkflowGraph,
  ConnectionValidationResult,
  StepConnectionResult,
  WorkflowConnectionResult,
} from "./types.js";
export type { ConnectionValidationReport } from "@galaxy-tool-util/schema";
```

### Type Definitions (TS Equivalents)

```typescript
// src/types.ts

export interface ConnectionRef {
  sourceStep: string;
  outputName: string;
  inputSubworkflowStepId?: string;
}

export interface ResolvedInput {
  name: string;
  statePath: string;
  type: "data" | "collection" | "text" | "integer" | "float" | "boolean" | "color";
  collectionType?: string;
  multiple?: boolean;
  optional?: boolean;
  extensions?: string[];
}

export interface ResolvedOutput {
  name: string;
  type: "data" | "collection" | "text" | "integer" | "float" | "boolean";
  collectionType?: string;
  collectionTypeSource?: string;
  collectionTypeFromRules?: string;
  structuredLike?: string;
  format?: string;
  formatSource?: string;
}

export interface ResolvedStep {
  stepId: string;
  toolId?: string;
  stepType: string; // "tool" | "subworkflow" | "data_input" | "data_collection_input" | "parameter_input" | "pause"
  inputs: Record<string, ResolvedInput>;
  outputs: Record<string, ResolvedOutput>;
  connections: Record<string, ConnectionRef[]>;
  declaredCollectionType?: string;            // for input steps
  innerGraph?: WorkflowGraph;
  subworkflowOutputMap: Record<string, [string, string]>; // external -> [innerStepId, innerOutput]
}

export interface WorkflowGraph {
  steps: Record<string, ResolvedStep>;
  sortedStepIds: string[];
}

export type ConnectionStatus = "ok" | "invalid" | "skip";

export interface ConnectionValidationResult {
  sourceStep: string;
  sourceOutput: string;
  targetStep: string;
  targetInput: string;
  status: ConnectionStatus;
  mapping?: string;
  errors: string[];
}

export interface StepConnectionResult {
  stepId: string;
  toolId?: string;
  stepType: string;
  mapOver?: string;
  connections: ConnectionValidationResult[];
  errors: string[];
}

export interface WorkflowConnectionResult {
  stepResults: StepConnectionResult[];
  valid: boolean;
  summary: Record<string, number>;
}

export type StepOutputTypeMap = Record<string, Record<string, CollectionTypeOrSentinel>>;
```

### Validator Signatures

```typescript
// src/connection-validator.ts

import type { ParsedTool } from "@galaxy-tool-util/schema";
import type {
  WorkflowConnectionResult,
  WorkflowGraph,
  StepOutputTypeMap,
} from "./types.js";
import type { ConnectionValidationReport } from "@galaxy-tool-util/schema";

export interface GetToolInfo {
  getToolInfo(toolId: string, toolVersion?: string): ParsedTool | undefined;
}

export function validateConnections(
  workflowDict: Record<string, unknown>,
  getToolInfo: GetToolInfo,
): WorkflowConnectionResult;

export function validateConnectionsReport(
  workflowDict: Record<string, unknown>,
  getToolInfo: GetToolInfo,
): ConnectionValidationReport;

export function validateConnectionGraph(
  graph: WorkflowGraph,
  seedOutputTypes?: StepOutputTypeMap,
): [WorkflowConnectionResult, StepOutputTypeMap];
```

---

## 5. Implementation Phases

### Phase 1 — Foundation: Result Types & Graph Builder

**Scope**: Data structures and graph builder, no validation logic.

**Tasks**:
1. Scaffold `packages/connection-validation/` (package.json, tsconfig, vitest wiring, changeset).
2. `src/types.ts` — all dataclass equivalents (above).
3. `src/graph-builder.ts`:
   - `buildWorkflowGraph(workflow, getToolInfo)` entry
   - Step type dispatch via gxformat2 step types
   - Input collection from `ParsedTool` via `_collectInputs()` (handle `gx_data`, `gx_data_collection`, conditionals, repeats with `state_path`)
   - Output collection via `_collectOutputs()`
   - Topological sort
4. Connection parsing from gxformat2 `step.input_connections`.
5. Subworkflow inner graph recursion + `output_map` building.
6. Unit tests: graph step types, I/O extraction, topological order.

**Test**: `pnpm --filter @galaxy-tool-util/connection-validation test` — graph-build tests pass.

**Fixtures unlocked**: none (graph build doesn't validate).

**LOC**: 400-600.

---

### Phase 2 — Collection-Type Free Functions

**Scope**: Wrap existing `CollectionTypeDescription` algebra into free functions matching Galaxy's `connection_types.py` interface.

**Tasks**:
1. `src/collection-type-functions.ts`:
   - `canMatch(output, input)` → `input.accepts(output)` with NULL/ANY sentinel handling
   - `canMapOver(output, input)` → `output.canMapOver(input)` with sentinel handling
   - `compatible(a, b)` → `a.compatible(b)` symmetric, with sentinel handling
   - `effectiveMapOver(output, input)` → `CollectionTypeDescriptor | null`
   - `isListLike(ctd)`, `collectionTypeRank(ctd)`
2. Reuse the sentinel handling already proven in `packages/workflow-graph/test/connection-type-cases.test.ts` (the test-side wrappers there are essentially the production version we want — promote them).
3. Spot-check tests against `connection_type_cases.yml`.

**Test**: package tests pass.

**LOC**: 80-150.

---

### Phase 3 — Simple Validator: Data-Only

**Scope**: Single-connection validation for data-only workflows (no collections, no map-over).

**Tasks**:
1. `src/connection-resolver.ts`:
   - `_validateSingleConnection(...)` — direct match path only
   - `_outputToType(output)`, `_inputToType(input)`, `_typeDescription(t)`
2. `src/connection-validator.ts`:
   - `validateConnectionGraph(graph)` main loop, no map-over yet
   - `validateConnections()` / `validateConnectionsReport()` entries
3. Fixture-driven test for `ok_simple_chain_dataset`.

**Test**: `ok_simple_chain_dataset` passes all sidecar assertions.

**Fixtures unlocked**: 1 (data-only).

**LOC**: 250-350.

---

### Phase 4 — Map-Over Resolution

**Scope**: Collection map-over and step-level map-over aggregation.

**Tasks**:
1. Extend `_validateSingleConnection()` to compute mapping via `effectiveMapOver(source, target)`.
2. Multi-data reduction case (list-like → `multiple=True`).
3. `_resolveStepMapOver(contributions, stepResult)`:
   - Pairwise `compatible()` check
   - Pick highest-rank compatible type
   - Append incompatibility error on conflict
4. Set `stepResult.mapOver`.
5. Fixture tests: `ok_list_to_dataset`, `ok_list_list_over_list_paired_or_unpaired`, `fail_incompatible_map_over`, `ok_two_list_inputs_map_over`.

**Test**: ~10 fixtures pass (all non-subworkflow, non-`structured_like`).

**LOC**: 150-200.

---

### Phase 5 — Output Type Resolution

**Scope**: Resolve outputs accounting for map-over, `collection_type_source`, `structured_like`.

**Tasks**:
1. `src/output-resolver.ts`:
   - `_resolveOutputTypes(step, mapOver, resolvedOutputTypes)`
   - `_resolveCollectionOutputType(step, output, resolvedOutputTypes, mapOver)`
   - `_resolveCollectionTypeSource(step, sourceParam, resolvedOutputTypes, mapOver)`:
     - Follow connection to upstream output
     - Strip map-over prefix if step is mapped
     - Return effective inner type
2. Wire into validator main loop.
3. Build `resolved_outputs` list for `StepConnectionResult`.
4. Fixture tests: `ok_collection_type_source`, `ok_structured_like`, `ok_collection_output_with_map_over`.

**Test**: `resolved_outputs` assertions pass.

**Fixtures unlocked**: ~7 more.

**LOC**: 200-300.

---

### Phase 6 — Subworkflow Validation

**Scope**: Recursively validate subworkflow inner graphs with type propagation.

**Tasks**:
1. `src/subworkflow-validator.ts`:
   - `_resolveSubworkflowOutputs(step, resolvedOutputTypes)`:
     - Extract seed types from outer connections (Galaxy ~l. 369-377)
     - Recursively call `validateConnectionGraph(innerGraph, seed)` (~l. 380)
     - Map inner output types back to outer via `subworkflow_output_map` (~l. 384-387)
2. Validator main loop: dispatch on `step.stepType === "subworkflow"`.
3. Fixture tests: `ok_subworkflow_passthrough`, `ok_subworkflow_list_propagation`, `ok_subworkflow_map_over`.

**Test**: 3 subworkflow fixtures pass.

**LOC**: 150-200.

---

### Phase 7 — Report Model & Sidecar Integration

**Scope**: Convert internal dataclass results to Pydantic-equivalent report; integrate `dictVerifyEach`.

**Tasks**:
1. `src/report-builder.ts`:
   - `toConnectionValidationReport(result, resolvedOutputTypes) -> ConnectionValidationReport`
   - Build `resolved_outputs` per step
   - Compute `has_details`
2. Export `ConnectionValidationReport` type from `@galaxy-tool-util/schema`.
3. Fixture-driven test loop in `packages/connection-validation/test/`:

```typescript
describe("connection_workflows fixture corpus", () => {
  const fixtures = loadConnectionFixtures(FIXTURES_DIR);
  const cache = loadParsedToolCache(PARSED_TOOLS_DIR);
  for (const f of fixtures) {
    it(f.stem, () => {
      const report = validateConnectionsReport(f.workflow, cacheAdapter(cache));
      if (f.stem.startsWith("ok_")) expect(report.valid).toBe(true);
      else if (f.stem.startsWith("fail_")) expect(report.valid).toBe(false);
      if (f.expected) dictVerifyEach(report, f.expected);
    });
  }
});
```

**Test**: All 19 sidecars pass; remaining 7 fixtures (no sidecar) just round-trip cleanly.

**Fixtures unlocked**: All 26.

**LOC**: 50-100 (report builder) + 100-150 (test suite).

---

### Phase 8 — CLI Integration

**Scope**: Mirror Python's `--connections` flag on the `gxwf validate` / `gxwf lint` surface — opt-in, default off.

Python reference:
- `validate_workflow_cli(..., connections: bool = False, ...)` (`validate.py:104`) returns `(step_results, precheck, connection_report)`; `connection_report` is None unless `connections=True`.
- CLI scripts `workflow_validate.py`, `workflow_lint_stateful.py`, and tree variants all expose `--connections` as `action="store_true"` (default False).

**Tasks**:
1. Extend the existing `gxwf validate` / `gxwf lint` commands with a `--connections` flag (default false). When set, call `validateConnectionsReport()` and attach to the output report under a `connection_report` field. When unset, do not call the validator (stay zero-cost for users who only want format/lint checks).
2. Update `packages/schema/src/workflow/lint.ts` (or the validate equivalent) so the report types include `connection_report?: ConnectionValidationReport` — matches Python's `SingleValidationReport` shape.
3. Output formatting: when `--connections` is set, append a connection-report section to JSON / Markdown / text outputs (mirror Python's `_format_tree_with_connections` in `validate.py`).
4. CLI tests: `gxwf validate --connections ok_simple_chain_dataset.gxwf.yml` exits 0; `--connections fail_incompatible_map_over.gxwf.yml` exits non-zero; without `--connections`, both exit 0 (connection validity isn't checked). JSON output schema parity with Python.

**Decision deferred**: whether to also add a standalone `gxwf validate-connections` subcommand. Python doesn't have one; the `--connections` flag is the canonical surface. Recommend skipping the standalone subcommand for parity.

**LOC**: 200-300.

---

## 6. Test Strategy

### Red-to-Green Order

1. **Simplest**: `ok_simple_chain_dataset` — no map-over, no collections, no subworkflows.
2. **Map-over**: `ok_list_to_dataset` → `ok_two_list_inputs_map_over` → `fail_incompatible_map_over`.
3. **Dynamic outputs**: `ok_collection_type_source` → `ok_structured_like`.
4. **Subworkflows**: `ok_subworkflow_passthrough` → `ok_subworkflow_list_propagation` → `ok_subworkflow_map_over`.
5. **Full sweep**: all 26 fixtures, all 19 sidecars.

### `dictVerifyEach` Integration

Already in place at `packages/core/test/helpers/dict-verify-each.ts`. The public `ConnectionValidationReport` uses snake_case keys verbatim (`step_results`, `map_over`, …) so `dictVerifyEach` walks the report directly with no translation. Phase 7's report builder converts internal camelCase results to the snake_case public shape — that is the only key-case bridge in the codebase.

---

## 7. Open Questions & Risks

### Parameter Connections (out of scope)

The Python validator does *not* validate parameter connections (`gx_text`, `gx_integer`, …). The 5 `TestParameterConnections.*` Python tests synthesize `TextParameterModel` / `ToolOutputInteger` shapes that fixtures don't model — they remain Python-only per the HARDEN_PLAN. TS port follows: parameter connections silently accepted. Document in module README.

### ParsedTool Serialization Edge Cases

If ToolShed-served `ParsedTool` JSON has fields the TS Effect Schema doesn't decode, fixture load fails loudly. Already exercised by `connection-fixtures.test.ts` decoding all cached tools. Add a regression test: any new tool added by a future fixture must decode cleanly.

### Unresolved Tool IDs

Both Python and TS path: `getToolInfo()` returns undefined → empty inputs/outputs → connections referencing that step skip with explanatory error → validation continues. Galaxy-side `test_unresolved_tool_skips` covers this programmatically and stays Python-only per HARDEN_PLAN; no new TS fixture needed.

### Nested Repeat / Conditional in Subworkflows

Python `_collect_inputs()` builds indexed `state_path` (`name_0|name_1`, …). TS port must mirror exactly — the `state_path` is the key into the workflow's tool-state dict during runtime validation, and divergence here will silently mismatch input lookups. Add a graph-builder test with a tool that uses a conditional input and verify the produced `state_path` strings.

### Key-case (decided: snake_case in report)

Internal `WorkflowConnectionResult` may use camelCase to match the rest of the TS codebase, but the public `ConnectionValidationReport` (the thing `dictVerifyEach` walks) is snake_case verbatim — Python parity is essential. Phase 7's report builder is the only place that bridges. Cement this in the report-builder docstring.

---

## Summary

Port Galaxy's ~800-line connection validator to TS across 8 phases, ~2000-2800 LOC, ~3-4 weeks calendar time:

| Phase | Scope                              | Fixtures unlocked | LOC      |
|-------|------------------------------------|-------------------|----------|
| 1     | Foundation: types + graph builder  | 0                 | 400-600  |
| 2     | Collection-type free functions     | 0                 | 80-150   |
| 3     | Simple validator (data-only)       | 1                 | 250-350  |
| 4     | Map-over resolution                | ~10               | 150-200  |
| 5     | Output type resolution             | ~7                | 200-300  |
| 6     | Subworkflow validation             | 3                 | 150-200  |
| 7     | Report model + sidecar integration | All 26 / 19       | 150-250  |
| 8     | CLI integration                    | (no new)          | 200-300  |

Risks: parameter connections (deferred), `state_path` indexing precision, key-case translation between internal and report shapes — each has a concrete mitigation above.

---

## Unresolved Questions

- Sidecar key-case → **snake_case** (decided).
- New package vs folding → **new package `@galaxy-tool-util/connection-validation`** (decided).
- Default-on vs opt-in for connection validation → **opt-in via `--connections`, mirroring Python** (decided).
- Add TS fixture for unresolved-tool-id path → **no, programmatic Python coverage is sufficient** (decided).
- Standalone `gxwf validate-connections` subcommand in addition to the `--connections` flag? Recommend skipping for Python parity, but flag here for explicit yes/no.
