---
type: research
subtype: component
tags:
  - research/component
  - galaxy/workflows
  - galaxy/client
  - galaxy/testing
status: draft
created: 2026-02-09
revised: 2026-02-09
revision: 1
ai_generated: true
galaxy_areas:
  - workflows
  - client
  - testing
related_notes:
  - "[[Component - Workflow Editor Terminals]]"
---

# Workflow Editor Terminal Tests: Comprehensive Research Report

## Overview

`client/src/components/Workflow/Editor/modules/terminals.test.ts` is a unit test suite for the Galaxy workflow editor's terminal connection logic. Terminals represent the input/output ports on workflow steps -- the connectable endpoints users drag wires between. The test file validates the rules governing which outputs can connect to which inputs, including collection type mapping ("map over"), datatype compatibility, and parameter type matching.

The file is ~928 lines, organized into 4 `describe` blocks containing ~50 individual test cases. It exercises the core `terminalFactory` function and 6 of the 8 concrete terminal classes it can produce: `InputTerminal`, `InputCollectionTerminal`, `InputParameterTerminal`, `OutputTerminal`, `OutputCollectionTerminal`, and `OutputParameterTerminal`. (`InvalidInputTerminal` and `InvalidOutputTerminal` are not directly constructed by the factory test, though `InvalidOutputTerminal` is exercised indirectly via corrupted connections.)

## File Locations

| File | Purpose |
|------|---------|
| `client/src/components/Workflow/Editor/modules/terminals.test.ts` | Test file under analysis |
| `client/src/components/Workflow/Editor/modules/terminals.ts` | Production code (1038 lines) |
| `client/src/components/Workflow/Editor/modules/collectionTypeDescription.ts` | Collection type algebra (canMatch, canMapOver, effectiveMapOver, etc.) |
| `client/src/components/Workflow/Editor/test-data/parameter_steps.json` | "Advanced" fixture: 29 workflow steps (ids 0-28) |
| `client/src/components/Workflow/Editor/test-data/simple_steps.json` | "Simple" fixture: 2 steps with a pre-existing connection |
| `client/src/components/Datatypes/test_fixtures.ts` | Shared `testDatatypesMapper` from real Galaxy datatype JSON |
| `client/src/components/Datatypes/model.ts` | `DatatypesMapperModel` class for subtype checking |
| `client/src/stores/workflowStepStore.ts` | Pinia store for step data, mapOver state |
| `client/src/stores/workflowConnectionStore.ts` | Pinia store for connections between steps |
| `client/src/composables/workflowStores.ts` | Composable bundling all workflow stores |
| `client/vitest.config.mts` | Vitest configuration |
| `client/tests/vitest/setup.ts` | Global test setup (Pinia mocks, console fail-on-error) |

## Test Structure and Organization

### Describe Block 1: `terminalFactory` (lines 108-150)

**Setup**: `beforeEach` creates a fresh Pinia, calls `setupAdvanced()` to build terminals from all 29 advanced steps.

**Tests (2)**:
- **"constructs correct class instances"** -- Verifies `terminalFactory` returns the right subclass for each step's inputs/outputs. Covers 6 concrete classes: `OutputTerminal`, `InputTerminal`, `OutputCollectionTerminal` (including filter_failed's `collection_type_source` variant), `InputCollectionTerminal`, `OutputParameterTerminal`, and `InputParameterTerminal`. Does not exercise `InvalidInputTerminal` or `InvalidOutputTerminal` construction.
- **"throws error on invalid terminalSource"** -- Confirms passing `{}` throws an error.

### Describe Block 2: `canAccept` (lines 152-840)

The largest block (~690 lines, ~42 test cases). This is the heart of the test suite.

**Setup**: `beforeEach` creates a fresh Pinia, builds terminals, AND adds all advanced steps to the step store. This is critical because `canAccept` and `connect`/`disconnect` need actual step state to track connections, map-over, and constraints.

**Test categories within this block**:

#### Basic data connections (lines 166-204)
- Simple data output -> data input (connect, reject when filled, disconnect)
- Collection (list) output -> data input (map over set/cleared)
- Paired collection -> data input (map over set/cleared)

#### Mapped-over data connections (lines 205-211)
- Second input on same step accepts a mapped-over output after first input already mapped

#### Collection type variations (lines 212-266)
- `list:list` -> data (rank 2 map over)
- `paired_or_unpaired` -> data (rank 1 map over)
- `list:paired_or_unpaired` -> data (rank 2 map over)
- `list:paired_or_unpaired` -> `list:paired_or_unpaired` collection input (direct match)
- `paired_or_unpaired` -> `paired_or_unpaired` collection input (direct match, no map over)

#### Collection-to-collection connections (lines 267-386)
- `list:paired` -> `paired` collection input (maps over as list)
- `list:paired` -> `paired_or_unpaired` collection input (maps over as list)
- `list` -> `paired_or_unpaired` collection input (maps over as list)
- `list:list:paired` -> `paired_or_unpaired` collection input (maps over as list:list)
- `list:list:paired` -> `list:paired_or_unpaired` collection input (maps over as list)
- `list:list` -> `paired_or_unpaired` collection input (maps over as list:list)
- `list:list` -> `list:paired_or_unpaired` collection input (maps over as list)
- `paired` -> `paired_or_unpaired` (direct match, no map over)
- `paired` -> `paired` (direct match)
- `list` -> `list` (direct match)
- `list:paired` -> `list:paired` (direct match)
- Rejection: `paired:paired` -> `list:paired` (incompatible)
- Rejection: `paired:paired` -> `list:paired_or_unpaired` (incompatible)

#### Rejection of `paired_or_unpaired` outputs to strict `paired` inputs (lines 387-410)
- `paired_or_unpaired` -> `paired` rejected with helpful message about "Split Paired and Unpaired" tool
- `list:paired_or_unpaired` -> `paired` rejected similarly
- `list:paired_or_unpaired` -> `list` rejected

#### Multi-data input behavior (lines 411-494)
- List collection treated as direct match (no map over on multi-data)
- Multiple simple data outputs connect to same multi-data input (tracks `input_connections` array)
- Removing a connected step cleans up `input_connections`
- Separate `list:list` inputs on separate multi-data inputs of same tool
- Rejection: paired on multi-data
- Rejection: paired_or_unpaired on multi-data
- Rejection: list:paired on multi-data
- Rejection: list:paired_or_unpaired on multi-data
- Rejection: collection on multi-data after non-collection already connected

#### Map-over with list:list on multi-data (lines 505-521)
- `list:list` maps over multi-data as list
- Rejects attaching second collection to same multi-data input

#### Cross-type rejections (lines 522-573)
- data -> collection input rejected
- optional data -> required data rejected
- parameter -> data rejected
- integer parameter -> integer parameter accepted (regression test for #15417)
- text parameter -> integer parameter rejected
- optional integer parameter -> required integer parameter rejected
- data -> integer parameter rejected
- Same-step connection rejected

#### Map-over constraint propagation (lines 574-662)
- Increasing map over rejected if output already connected to data input
- Increasing map over from list to list:list rejected if constrained by output
- Non-collection output rejected on mapped-over input; rebuild terminal clears stale mapOver
- Dataset accepted on non-mapped-over input of mapped-over step
- Deeper nesting rejected on second input of mapped-over step

#### Map-over reset and maintenance (lines 663-731)
- Map over resets when output constraint is lifted (disconnect)
- Step map over state maintained when disconnecting output (filter_failed test)
- Collection input acceptance when other input has map-over
- Rejection of mapping collection input when outputs constrain to incompatible type

#### Transitive map-over (lines 732-796)
- Tracks map over through intermediate steps (list:list -> simple data -> multi data)
- Tracks map over through collection inputs (list:list -> list collection -> another list collection)
- Rejects connections to input collection constrained by output connection
- Rejects connections to input collection constrained by other input

#### Connection validation (lines 797-839)
- `destroyInvalidConnections` on output terminal (changes output datatype, verifies disconnection)
- `destroyInvalidConnections` on input terminal (changes input datatype, verifies disconnection)
- `resolves collection type source` -- filter_failed output collection type resolves from connected input

### Describe Block 3: `Input terminal` (lines 842-907)

**Setup**: Uses `simpleSteps` fixture (2 steps with pre-existing connection via `input_connections`). Adds steps to store to materialize connections.

**Tests (4)**:
- **"has step"** -- Basic sanity: step store contains the step
- **"infers correct state"** -- Comprehensive check of terminal properties: `connections.length`, `mapOver`, `isMappedOver()`, `hasConnectedMappedInputTerminals()`, `hasMappedOverInputTerminals()`, `hasConnectedOutputTerminals()`, `canAccept`, `attachable`, `connected()`, `_collectionAttached()`, `_producesAcceptableDatatype()`
- **"can accept new connection"** -- Disconnect existing, verify canAccept flips, reconnect, verify flips back. Also tests `validInputTerminals()` on the output terminal.
- **"will maintain invalid connections"** -- Corrupts a connection's output name, verifies `getConnectedTerminals()` returns an `InvalidOutputTerminal`

### Describe Block 4: `producesAcceptableDatatype` (lines 909-927)

Tests the standalone exported function directly.

**Tests (3)**:
- Input type "input" accepts everything
- Unknown output datatype produces specific error message
- Incompatible datatypes produce specific error message

## Mocking and Fixture Strategies

### Pinia Store Isolation
Every `describe` block uses `beforeEach` with `setActivePinia(createPinia())` to ensure complete store isolation between tests. No test leaks state to another.

### Real Stores, No Mocking
The tests use **real Pinia stores** -- `useWorkflowStepStore`, `useConnectionStore`, etc. -- with a scoped workflow ID `"mock-workflow"`. This means the tests exercise actual store logic (adding connections, tracking mapOver state, removing steps, etc.) rather than mocking it. This is an integration-test-like approach within a unit test framework.

### `useStores` Helper (lines 42-61)
A local helper mirrors the production `useWorkflowStores` composable but without Vue's `inject`/`provide` (since there's no component tree). It instantiates all 7 stores with the same `"mock-workflow"` ID.

### `setupAdvanced` Helper (lines 74-92)
Iterates all steps in `parameter_steps.json`, builds terminals for every input/output using `terminalFactory`. Steps are keyed by their `label` for readable test access like `terminals["list input"]["output"]`.

**Important distinction**: In the `terminalFactory` block, steps are NOT added to the store (only terminals are built). In the `canAccept` block, steps ARE added to the store, which is necessary for connection tracking.

### `rebuildTerminal` Helper (lines 94-106)
Re-creates a terminal from the current store state. This simulates what happens in the production `useTerminal.ts` composable when a terminal is rebuilt after state changes. Used to test that stale mapOver state is cleared when constraints change.

### Console Debug Suppression (lines 66-72)
A `vi.spyOn(console, "debug")` mock suppresses the `NO_COLLECTION_TYPE_INFORMATION_MESSAGE` debug log that fires for steps without `collection_type` or `collection_type_source`. Other debug messages pass through.

### `testDatatypesMapper`
From `client/src/components/Datatypes/test_fixtures.ts`. Loads real Galaxy datatype JSON (`datatypes.json` and `datatypes.mapping.json` from `tests/test-data/json/`) and constructs a real `DatatypesMapperModel`. This ensures `isSubType` checks work against the actual type hierarchy.

### Test Data Fixtures

**`parameter_steps.json` (advanced)**: 29 steps (ids 0-28) representing a comprehensive set of workflow inputs and tools:
- Data inputs: regular (`id:0`), optional (`id:9`)
- Collection inputs: list (`id:2`), list:list (`id:3`), paired (`id:4`), list:paired (`id:18`), list:list:list (`id:16`), list:list:paired (`id:26`), paired:paired (`id:28`), paired_or_unpaired (`id:21`), list:paired_or_unpaired (`id:22`)
- Parameter inputs: integer (`id:5`), text (`id:10`), optional text (`id:19`), optional integer (`id:20`)
- Tools: simple Cut tool (`id:1`, `id:6`), multi_data_param (`id:15`), Apply Rules / any collection (`id:7`), Extract dataset / list or paired (`id:8`), count_list / list collection (`id:11`, `id:13`), two_list_inputs (`id:12`), concatenate / multiple simple data (`id:14`), filter_failed with collection_type_source (`id:17`), paired_or_unpaired collection input (`id:23`), list:paired_or_unpaired collection input (`id:24`), paired collection input (`id:25`), list:paired collection input (`id:27`)

**`simple_steps.json` (simple)**: 2 steps -- a data input (id:0) connected to a Cut tool (id:1) via `input_connections`. This fixture tests the pre-existing connection state path.

## Key Production Code Under Test

### Class Hierarchy (`terminals.ts`)

```
EventEmitter (from "events"; browser-polyfilled in Vite)
  |
  Terminal                          (base: stores, stepId, name, mapOver, connect/disconnect)
  |-- BaseInputTerminal             (datatypes, optional, multiple, canAccept, _inputFilled, etc.)
  |   |-- InvalidInputTerminal      (placeholder for broken inputs; always rejects)
  |   |-- InputTerminal             (dataset inputs, multiple=true support)
  |   |-- InputParameterTerminal    (parameter inputs: text, integer, etc.)
  |   |-- InputCollectionTerminal   (dataset_collection inputs)
  |
  |-- BaseOutputTerminal            (datatypes, optional, validInputTerminals, destroyInvalidConnections)
      |-- OutputTerminal            (plain dataset outputs; empty subclass)
      |-- OutputCollectionTerminal  (collection outputs with collection_type/collection_type_source)
      |-- OutputParameterTerminal   (parameter outputs: text, integer, etc.)
      |-- InvalidOutputTerminal     (placeholder for broken outputs; always rejects)
```

### `terminalFactory` Function
Dispatches on `terminalSource` shape:
- Has `input_type` -> input terminal (dataset / dataset_collection / parameter)
- Has `name` + `extensions` -> output terminal
- Has `name` + `collection` -> output collection terminal
- Has `name` + `parameter` -> output parameter terminal
- Has `valid: false` -> invalid terminal

### `producesAcceptableDatatype` Function
Standalone function checking datatype compatibility via the `DatatypesMapperModel.isSubType` method. Handles special "input" and "_sniff_" wildcards.

### `ConnectionAcceptable` Class
Simple value object with `{canAccept: boolean, reason: string | null}` returned by all acceptance checks.

## Coverage Analysis

### Well-Covered Areas

1. **`terminalFactory` dispatch logic**: All 7 terminal classes are tested for correct construction. Invalid input throws.

2. **`canAccept` / `attachable` on `InputTerminal`**: Extensively tested across:
   - Simple data connections
   - Collection -> data mapping (all collection type combinations)
   - Multi-data (multiple=true) inputs
   - Optional/required checking
   - Same-step rejection
   - Map-over constraint propagation and rejection

3. **`canAccept` / `attachable` on `InputCollectionTerminal`**: Extensively tested:
   - Direct collection matches (list->list, paired->paired, etc.)
   - Map-over through collections (list:list->list, etc.)
   - Incompatible collection types (paired->list, list->paired)
   - `paired_or_unpaired` matching semantics
   - Constraint propagation via outputs

4. **`canAccept` / `attachable` on `InputParameterTerminal`**: Tested for:
   - Type matching (integer -> integer)
   - Type rejection (text -> integer)
   - Optional -> required rejection
   - Data -> parameter rejection

5. **`connect` / `disconnect` state management**: Many tests verify that connecting and disconnecting properly updates mapOver, localMapOver, and input_connections.

6. **`destroyInvalidConnections`**: Tested from both input and output terminal sides.

7. **`getConnectedTerminals` with invalid state**: Tested via corrupted connection name.

8. **`validInputTerminals`**: Tested (returns all inputs across all steps that can accept this output).

9. **`producesAcceptableDatatype`**: Standalone tests for wildcard, unknown, and incompatible types.

10. **`OutputCollectionTerminal.getCollectionTypeFromInput`**: Tested indirectly via `resolves collection type source` (filter_failed with `collection_type_source`).

### Gaps and Uncovered Areas

1. **`InvalidInputTerminal.attachable`**: Not directly tested (always returns rejection). Covered only through `getConnectedTerminals` returning `InvalidOutputTerminal`.

2. **`InvalidOutputTerminal.canAccept` and `validInputTerminals`**: Not tested.

3. **`InputParameterTerminal.effectiveType`**: The `select` -> `text` and `data_column` -> `integer` mappings are not tested. Only `integer` and `text` types appear in fixtures.

4. **`OutputParameterTerminal.multiple` rejection**: The `InputParameterTerminal.attachable` check for `!this.multiple && other.multiple` (single value input rejecting multi-value output) is not tested. No fixture has `multiple: true` on a parameter output.

5. **`BaseOutputTerminal.optional` from `when`**: The conditional `this.optional = attr.optional || Boolean(this.stores.stepStore.getStep(this.stepId)?.when)` -- in the test fixtures, only `filter_failed` has a `when` field (set to `null`); no fixture step has a truthy `when` value.

6. **`getInvalidConnectedTerminals`**: Tested indirectly through `destroyInvalidConnections` but not directly asserted.

7. **`BaseOutputTerminal.getConnectedTerminals` with `ChangeDatatypeAction` post_job_actions**: The production code checks for `ChangeDatatypeAction` to override output extensions. No test exercises this path.

8. **`Terminal.setMapOver` internal branching**: The multi-input tracking in `stepInputMapOver` is exercised indirectly but not unit-tested in isolation.

9. **`resetMapping` cascading through output steps**: The complex logic in `BaseInputTerminal.resetMapping` that iterates connected output steps, drops their mapping, and re-establishes via inputs is exercised implicitly but the cascading behavior could use more targeted coverage.

10. **`_collectionAttached` with `extensions.indexOf("input") > 0`**: This specific check (output extension containing "input" at non-zero index) is not tested.

11. **No tests for `collectionTypeDescription.ts`**: There is no separate test file for `CollectionTypeDescription`, `NULL_COLLECTION_TYPE_DESCRIPTION`, or `ANY_COLLECTION_TYPE_DESCRIPTION`. Their behavior is tested only indirectly through terminal tests.

## Patterns and Idioms

### Terminal Lookup by Label
Tests use `terminals["step label"]["terminal name"]` for readable access. The `setupAdvanced` function keys terminals by step labels like `"data input"`, `"simple data"`, `"list input"`, etc.

### Type Assertions for Terminal Subclasses
Tests consistently cast terminals to specific subclasses:
```typescript
const dataOut = terminals["data input"]!["output"] as OutputTerminal;
const dataIn = terminals["simple data"]!["input"] as InputTerminal;
```
This is necessary because `terminalFactory` returns a union type.

### Connect-Assert-Disconnect-Assert Pattern
Most `canAccept` tests follow this pattern:
1. Verify initial `canAccept` is true
2. `connect` the terminals
3. Verify `canAccept` becomes false (with expected reason)
4. `disconnect` the terminals
5. Verify `canAccept` returns to true
6. Verify `mapOver` returns to `NULL_COLLECTION_TYPE_DESCRIPTION`

### MapOver Assertions
Map-over state is verified via deep equality:
```typescript
expect(dataIn.mapOver).toEqual({ collectionType: "list", isCollection: true, rank: 1 });
```
And null state via identity:
```typescript
expect(dataIn.mapOver).toBe(NULL_COLLECTION_TYPE_DESCRIPTION);
```
Note the use of `toBe` (reference equality) for null and `toEqual` (deep equality) for collection types.

### Reason String Verification
Every rejection test verifies the specific `reason` string. This is important because these messages are displayed to users in the workflow editor UI. Examples:
- `"Cannot connect output to input of same step."`
- `"Input already filled with another connection, delete it before connecting another output."`
- `"Cannot attach paired inputs to multiple data parameters, only lists may be treated this way."`

### Non-Reactive Terminals with `rebuildTerminal`
A comment at line 628-630 notes that terminal objects are not reactive. When state changes externally (e.g., disconnecting a constraining connection), the terminal must be rebuilt to pick up new state. The `rebuildTerminal` helper simulates what `useTerminal.ts` does in production.

### Undo/Redo Integration
`connect()` and `disconnect()` on terminals go through `undoRedoStore.action()`, meaning the tests exercise the undo/redo action wrapping. However, no test actually invokes undo/redo.

## Vitest Configuration

- **Environment**: `happy-dom`
- **Globals**: `false` (explicit imports: `describe`, `it`, `expect`, `vi`, `beforeEach`)
- **Pool**: `threads`
- **Setup**: `tests/vitest/setup.ts` -- Pinia-compatible (no Pinia mock; tests create their own via `createPinia()`), `vitest-fail-on-console` enabled for errors and warnings
- **Path aliases**: `@` -> `client/src`, `@tests` -> `client/tests`

## Relationship to Other Test Files

This is the **only test file** in `client/src/components/Workflow/Editor/modules/`. There is no test for `collectionTypeDescription.ts` despite its complex matching logic. Other test files in the Editor directory (`actions.test.ts`, `Node.test.ts`, `Index.test.ts`, etc.) test higher-level components and may use the same `parameter_steps.json` fixture.

## Summary

This test file is a thorough unit/integration test of Galaxy's workflow connection logic. It covers the complex rules governing which workflow step outputs can connect to which inputs, with particular depth in collection type mapping ("map over") scenarios. The tests use real Pinia stores rather than mocks, giving high confidence that the store interactions work correctly. The main gap is coverage of edge cases in parameter type mapping, `ChangeDatatypeAction` post-job-action handling, and the absence of standalone tests for `CollectionTypeDescription`.
