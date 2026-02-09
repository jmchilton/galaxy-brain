---
type: research
subtype: component
tags:
  - research/component
  - galaxy/workflows
  - galaxy/client
status: draft
created: 2026-02-09
revised: 2026-02-09
revision: 1
ai_generated: true
galaxy_areas:
  - workflows
  - client
---

# Workflow Editor Terminals Module - Architecture Research Report

## Overview

The terminals module (`client/src/components/Workflow/Editor/modules/terminals.ts`) is the core connection logic engine for the Galaxy workflow editor. It models the typed endpoints (inputs and outputs) of workflow steps as class instances that encapsulate:

- Connection compatibility checking (datatype matching, collection mapping)
- Connection lifecycle management (connect, disconnect, undo/redo)
- Collection "map over" state propagation across the workflow graph
- Invalid connection detection and cleanup

The module is **not reactive** -- terminal objects are plain class instances rebuilt by Vue watchers whenever upstream state changes. This is the deliberate architecture: the Pinia stores are the source of truth, and terminals are ephemeral logic objects constructed on demand.

---

## File Map

| File | Role |
|------|------|
| `client/src/components/Workflow/Editor/modules/terminals.ts` | Terminal classes + factory |
| `client/src/components/Workflow/Editor/modules/collectionTypeDescription.ts` | Collection type algebra |
| `client/src/stores/workflowStepStore.ts` | Step data, map-over state, terminal source types |
| `client/src/stores/workflowConnectionStore.ts` | Connection list, terminal-to-connection indexes |
| `client/src/stores/workflowStoreTypes.ts` | Connection/Terminal plain-data interfaces |
| `client/src/stores/workflowEditorStateStore.ts` | UI state: terminal positions, dragging terminal |
| `client/src/composables/workflowStores.ts` | Store bundle, DI via Vue provide/inject |
| `client/src/components/Workflow/Editor/composables/useTerminal.ts` | Vue composable: terminal construction + reactivity bridge |
| `client/src/components/Workflow/Editor/NodeInput.vue` | Input terminal Vue component |
| `client/src/components/Workflow/Editor/NodeOutput.vue` | Output terminal Vue component |
| `client/src/components/Workflow/Editor/ConnectionMenu.vue` | Keyboard-accessible connection picker |
| `client/src/components/Workflow/Editor/WorkflowEdges.vue` | SVG edge rendering, uses OutputTerminals type |
| `client/src/components/Workflow/Editor/WorkflowGraph.vue` | Top-level graph, passes OutputTerminals for dragging |
| `client/src/components/Workflow/Editor/modules/linting.ts` | Workflow linter, uses terminalFactory |
| `client/src/components/Datatypes/model.ts` | DatatypesMapperModel for subtype checking |
| `client/src/stores/undoRedoStore/index.ts` | Undo/redo action stack |
| `client/src/components/Workflow/Editor/modules/terminals.test.ts` | Comprehensive unit tests |

---

## Class Hierarchy

```
EventEmitter (from "events"; browser-polyfilled in Vite)
  |
  Terminal                          (base class; 194 lines)
  |-- BaseInputTerminal             (shared input logic; lines 196-430)
  |   |-- InvalidInputTerminal      (placeholder for broken inputs)
  |   |-- InputTerminal             (dataset inputs, multiple=true support)
  |   |-- InputParameterTerminal    (parameter inputs: text, integer, etc.)
  |   |-- InputCollectionTerminal   (dataset_collection inputs)
  |
  |-- BaseOutputTerminal            (shared output logic; lines 680-754)
      |-- OutputTerminal            (plain dataset outputs; empty subclass)
      |-- OutputCollectionTerminal  (collection outputs with collection_type/collection_type_source)
      |-- OutputParameterTerminal   (parameter outputs: text, integer, etc.)
      |-- InvalidOutputTerminal     (placeholder for broken outputs)
```

### Type Aliases

```typescript
type OutputTerminals = OutputTerminal | OutputCollectionTerminal | OutputParameterTerminal;
type InputTerminals  = InputTerminal | InputCollectionTerminal | InputParameterTerminal;
type InputTerminalsAndInvalid = InputTerminals | InvalidInputTerminal;
```

---

## Terminal Base Class

`Terminal` extends `EventEmitter` from the `"events"` package (browser-polyfilled by Vite; not actual Node.js at runtime). Event emission is not actively used in the current codebase -- it's legacy scaffolding. Key properties:

| Property | Source | Purpose |
|----------|--------|---------|
| `stores` | Constructor arg | Bundle of Pinia stores (connection, step, undoRedo, etc.) |
| `stepId` | Constructor arg | Which workflow step this terminal belongs to |
| `name` | Constructor arg | The input/output name within the step |
| `terminalType` | `"input"` or `"output"` | Discriminator for ID generation |
| `datatypesMapper` | Constructor arg | Galaxy datatype hierarchy for subtype checks |
| `multiple` | Default `false` | Whether input accepts multiple connections |
| `localMapOver` | Initially `NULL_COLLECTION_TYPE_DESCRIPTION` | Per-input map-over tracking |

### ID Scheme

Terminal IDs follow the pattern `node-{stepId}-{input|output}-{name}` and are used as keys in the connection store's lookup indexes.

### Connection Accessors

```typescript
get id()          // "node-{stepId}-{terminalType}-{name}"
get connections() // delegates to connectionStore.getConnectionsForTerminal(this.id)
get mapOver()     // delegates to stepStore.stepMapOver[this.stepId]
```

---

## Connection Lifecycle

### Connect

```
Terminal.connect(other)
  -> undoRedoStore.action()
       .onRun(makeConnection)     // adds to connectionStore
       .onUndo(dropConnection)    // removes from connectionStore
       .apply()
```

`BaseInputTerminal.connect()` additionally calls `setDefaultMapOver(other)` after the undo/redo action to propagate collection mapping.

### Disconnect

```
Terminal.disconnect(other)
  -> undoRedoStore.action()
       .onRun(dropConnection)
       .onUndo(makeConnection)
       .apply()
```

`dropConnection` also calls `resetMappingIfNeeded(connection)` which clears the step's map-over state if no output terminals are still relying on it.

### Connection Building

`buildConnection(other)` normalizes either a Terminal instance or a raw Connection object into a `Connection` shape:

```typescript
{
  input:  { stepId, name, connectorType: "input" },
  output: { stepId, name, connectorType: "output" }
}
```

---

## Input Terminal Logic

### BaseInputTerminal

Adds input-specific state:
- `datatypes: string[]` -- accepted file extensions
- `optional: boolean` -- whether the input is required
- `localMapOver` -- restored from `stepStore.stepInputMapOver[stepId][name]` on construction

Key methods:

| Method | Purpose |
|--------|---------|
| `canAccept(output)` | Pre-flight check: same step? input filled? Then delegates to `attachable()` |
| `attachable(output)` | Subclass-specific compatibility logic (abstract in base) |
| `getStepMapOver()` | Iterates connected output terminals and calls `setDefaultMapOver` for each |
| `_inputFilled()` | Checks if input already has a connection (respects `multiple`) |
| `_collectionAttached()` | Checks if any connected output is a collection |
| `_otherCollectionType(other)` | Computes the effective collection type of an output, including its step's map-over |
| `_producesAcceptableDatatype(other)` | Datatype compatibility check via `DatatypesMapperModel.isSubType` |
| `_producesAcceptableDatatypeAndOptionalness(other)` | Datatype + optional-to-required check |
| `_mappingConstraints()` | Returns collection types constraining this terminal's mapping |
| `getConnectedTerminals()` | Builds output terminal objects for all connections to this input |
| `getInvalidConnectedTerminals()` | Filters connected terminals through `attachable()`, marks invalid ones |
| `destroyInvalidConnections()` | Disconnects all invalid connections |
| `resetMapping(connection?)` | Clears map-over state and propagates reset to connected output steps |

### InputTerminal (dataset inputs)

The `attachable()` method implements the most complex connection logic:

1. Computes `otherCollectionType` from the output.
2. If the output is a collection:
   - **multiple input + already has non-collection**: reject ("Cannot attach collections to data parameters with individual data inputs already attached.")
   - **multiple input + paired-ending collection**: reject ("Cannot attach paired inputs to multiple data parameters, only lists may be treated this way.")
   - **mapOver matches**: accept (datatype check only)
   - **multiple + list prefix match**: accept (special case for list input -> multiple data)
   - **mapping constraints all match**: accept
   - **otherwise**: reject with contextual message about which constraints conflict
3. If the output is NOT a collection:
   - **localMapOver is a collection**: reject ("Cannot attach non-collection output to mapped over input")
4. Falls through to datatype + optionalness check.

### InputCollectionTerminal (dataset_collection inputs)

Additional properties:
- `collectionTypes: CollectionTypeDescriptor[]` -- the accepted collection types (e.g., `["list", "paired"]`)
- If no collection types specified, defaults to `[ANY_COLLECTION_TYPE_DESCRIPTION]`

Overrides `_effectiveMapOver()` to compute what the map-over would be if the terminal's accepted collection types don't directly match the output. For instance, connecting a `list:paired` output to a `paired` input produces a `list` map-over.

The `attachable()` method:
1. Computes effective collection types (each `collectionType` prepended with `localMapOver`)
2. If any effective type matches, accept
3. If already mapped over with incompatible type, reject
4. If could be mapped over (canMapOver), check mapping constraints
5. Special error for `paired_or_unpaired` -> `paired` mismatch

### InputParameterTerminal (parameter inputs)

Simpler logic:
- Normalizes parameter type names (`select` -> `text`, `data_column` -> `integer`)
- Checks type equality between input and output
- Rejects optional output -> required input
- Rejects multiple output -> single input

---

## Output Terminal Logic

### BaseOutputTerminal

Properties:
- `datatypes: string[]`
- `optional: boolean` -- also set to `true` if step has a `when` clause (conditional step)
- `isCollection?: boolean`
- `collectionType?: CollectionTypeDescriptor`
- `type?: string` (parameter type)

Key methods:

| Method | Purpose |
|--------|---------|
| `getConnectedTerminals()` | Builds input terminal objects for all connections from this output |
| `getInvalidConnectedTerminals()` | Filters via each input's `attachable()` |
| `destroyInvalidConnections()` | Disconnects invalid connected input terminals |
| `validInputTerminals()` | Scans all steps' inputs for any that `canAccept(this)` -- used by ConnectionMenu |

### OutputTerminal

Empty subclass of `BaseOutputTerminal`. Used for plain dataset outputs.

### OutputCollectionTerminal

Adds:
- `collectionTypeSource: string | null` -- when `collection_type` is not static, this names the input whose connected collection type determines this output's type
- `collectionType` -- either a `CollectionTypeDescription` from `collection_type`, or resolved dynamically via `getCollectionTypeFromInput()`
- `isCollection = true`

`getCollectionTypeFromInput()` is the dynamic collection type resolution logic:
1. Finds the connection to the input named by `collectionTypeSource`
2. Looks up the connected output step and its output terminal
3. Builds terminal objects for both sides
4. Computes `_otherCollectionType` to determine the effective type
5. Matches against the input's `collectionTypes` array
6. Returns the matching type (or `ANY_COLLECTION_TYPE_DESCRIPTION` if `any`)

This mechanism supports tools like `filter_failed` where the output collection type mirrors whatever was connected to a particular input.

### OutputParameterTerminal

Adds `type` and `multiple` from the parameter output definition. Passes empty `datatypes` array to base.

### InvalidOutputTerminal / InvalidInputTerminal

Sentinel classes for broken connections. `attachable()` always returns `ConnectionAcceptable(false, ...)`. Used when a connected step or terminal source can't be found (e.g., after step deletion before cleanup).

---

## Collection Type Description System

File: `client/src/components/Workflow/Editor/modules/collectionTypeDescription.ts`

### CollectionTypeDescriptor Interface

```typescript
interface CollectionTypeDescriptor {
    isCollection: boolean;
    collectionType: string | null;
    rank: number;                    // depth of nesting (e.g., "list:paired" = 2)
    canMatch(other): boolean;        // exact type match (with paired_or_unpaired flexibility)
    canMapOver(other): boolean;      // can this type be "mapped over" to produce `other`
    append(other): CollectionTypeDescriptor;  // nest types (e.g., "list".append("paired") = "list:paired")
    equal(other): boolean;
    effectiveMapOver(other): CollectionTypeDescriptor;  // compute the leftover after mapping
}
```

### Singleton Descriptors

| Name | isCollection | collectionType | Behavior |
|------|-------------|----------------|----------|
| `NULL_COLLECTION_TYPE_DESCRIPTION` | `false` | `null` | Non-collection. canMatch always false. append returns other. |
| `ANY_COLLECTION_TYPE_DESCRIPTION` | `true` | `"any"` | Matches any collection. canMapOver always false. append returns self. |

### CollectionTypeDescription Class

The main implementation. Collection types are colon-separated strings like `"list"`, `"paired"`, `"list:paired"`, `"list:list"`, etc.

Key algorithms:

**canMatch**: Checks if two collection types are compatible. Special cases:
- `paired` matches `paired_or_unpaired`
- `X:paired_or_unpaired` matches `X`, `X:paired`
- Otherwise strict string equality

**canMapOver**: Determines if `this` can be decomposed to produce `other` as inner elements. E.g., `list:paired` canMapOver `paired` because stripping the outer `list` yields `paired`. `paired_or_unpaired` has special handling: anything can be mapped over it since it can always act as a single dataset.

**effectiveMapOver**: Computes the "leftover" collection nesting after consuming the inner type. E.g., `list:list`.effectiveMapOver(`list`) = `list`. Complex handling for `paired_or_unpaired` suffixes.

**append**: Creates nested types: `list`.append(`paired`) = `list:paired`.

---

## Map-Over State Management

Map-over is Galaxy's mechanism for running a step once per element in a collection. The state is tracked in two places in `workflowStepStore`:

```typescript
stepMapOver: { [stepId: number]: CollectionTypeDescriptor }
stepInputMapOver: { [stepId: number]: { [inputName: string]: CollectionTypeDescriptor } }
```

### Flow

1. When an input terminal connects to a collection output, `BaseInputTerminal.setDefaultMapOver()` calls `this.setMapOver(otherCollectionType)`.
2. `Terminal.setMapOver()`:
   - Adjusts for `multiple` inputs (subtracts a `list` level)
   - Calls `_effectiveMapOver()` (overridden in `InputCollectionTerminal` to account for accepted collection types)
   - Updates `stepStore.changeStepInputMapOver(stepId, name, effectiveMapOver)` for the per-input tracking
   - Updates `stepStore.changeStepMapOver(stepId, effectiveMapOver)` for the step-level tracking
3. On disconnect, `resetMappingIfNeeded()` checks if any outputs of this step are still connected. If not, `resetMapping()` clears the step's map-over and propagates the reset to connected output steps by rebuilding their input terminals' map-over.

### Constraint Propagation

When a step is mapped over and its outputs are connected to downstream steps, the map-over state constrains what can be connected to the original step's other inputs. The `_mappingConstraints()` method collects these constraints from the current mapOver and from output steps' mapOvers. The `attachable()` methods check new connections against these constraints.

---

## The Terminal Factory

`terminalFactory()` is the single entry point for creating terminal instances. It uses type discriminators on `TerminalSource` to select the correct class:

```
Input side (has input_type field):
  valid === false       -> InvalidInputTerminal
  input_type "dataset"  -> InputTerminal
  input_type "dataset_collection" -> InputCollectionTerminal
  input_type "parameter" -> InputParameterTerminal

Output side (has name, no input_type):
  parameter === true    -> OutputParameterTerminal
  collection === true   -> OutputCollectionTerminal
  has extensions        -> OutputTerminal

Fallback:
  valid === false       -> InvalidOutputTerminal
  otherwise             -> throw Error
```

The factory also carries a conditional type `TerminalOf<T>` that maps source types to terminal class types at the TypeScript level, providing type-safe returns.

---

## Integration with Vue Components

### useTerminal Composable

`client/src/components/Workflow/Editor/composables/useTerminal.ts`

This is the reactivity bridge. It watches:
- The step object (from stepStore)
- The terminal source definition
- The datatypes mapper

On any change, it rebuilds the terminal via `terminalFactory()` and calls `getInvalidConnectedTerminals()` to mark/clear invalid connections. Returns:
- `terminal: Ref<ReturnType<typeof terminalFactory>>` -- the current terminal instance
- `isMappedOver: ComputedRef<boolean>` -- whether the step has a collection map-over

### NodeInput.vue

Uses `useTerminal()` to get an `InputTerminals` instance. Key behaviors:
- Renders the input connector (drop target for drag-and-drop connections)
- Computes `canAccept` against the currently dragged terminal (`stateStore.draggingTerminal`)
- Shows accept/reject visual indicators and tooltip messages
- On drop: deserializes drag data, creates an output terminal via `terminalFactory`, calls `terminal.canAccept()` then `terminal.connect()`
- On remove button click: disconnects all connections via `terminal.disconnect()`
- Reports position to `stateStore.setInputTerminalPosition()` for edge rendering

### NodeOutput.vue

Uses `useTerminal()` to get an `OutputTerminals` instance. Key behaviors:
- Renders the output connector (draggable source)
- Wraps in `DraggableWrapper` for drag initiation
- Emits `onDragConnector` with position and terminal reference during drag
- Computes and displays output details (collection type description, mapped-over status)
- Contains `ConnectionMenu` for keyboard-accessible connection picking
- Reports position to `stateStore.setOutputTerminalPosition()` for edge rendering

### ConnectionMenu.vue

Takes an `OutputTerminals` prop. Uses:
- `terminal.validInputTerminals()` to list all compatible inputs in the workflow
- `terminal.getConnectedTerminals()` to list currently connected inputs
- `terminalFactory()` to rebuild input terminals for toggle operations
- `inputTerminal.connect()/disconnect()` for connection management

### WorkflowEdges.vue

Uses the `OutputTerminals` type for the `draggingTerminal` prop. Creates a temporary `Connection` object from the dragging terminal for rendering the in-progress edge.

### WorkflowGraph.vue

Uses `OutputTerminals` type for tracking the currently dragged terminal across the graph.

### Node.vue

Imports `OutputTerminals` type for event handling when a connector drag starts.

---

## Store Dependencies

The `stores` parameter passed to every terminal is the return type of `useWorkflowStores()`:

```typescript
{
  connectionStore,  // Connection list, terminal indexes, invalid connection tracking
  stateStore,       // UI: positions, dragging state, scale
  stepStore,        // Step definitions, map-over state, step CRUD
  commentStore,     // Workflow comments (not used by terminals)
  toolbarStore,     // Toolbar state (not used by terminals)
  undoRedoStore,    // Undo/redo action stack
  searchStore,      // Search state (not used by terminals)
}
```

Terminals directly use:
- **connectionStore**: `addConnection`, `removeConnection`, `getConnectionsForTerminal`, `getConnectionsForStep`, `getOutputTerminalsForInputTerminal`, `markInvalidConnection`, `dropFromInvalidConnections`, `connections`
- **stepStore**: `getStep`, `getStepExtraInputs`, `stepMapOver`, `stepInputMapOver`, `changeStepMapOver`, `changeStepInputMapOver`, `resetStepInputMapOver`, `steps`
- **undoRedoStore**: `action()` (for undo/redo wrapping of connect/disconnect)

---

## Linting Integration

`client/src/components/Workflow/Editor/modules/linting.ts`

The linting module uses `terminalFactory` in `getDisconnectedInputs()` to:
1. Build an input terminal for each step input
2. Check if it's non-optional and has no connections
3. Report it as a lint warning

---

## Data Flow Summary

```
Step Definition (from server/API)
  |
  v
workflowStepStore.steps[id].inputs/outputs   (TerminalSource data)
  |
  v
terminalFactory(stepId, source, datatypesMapper, stores)
  |
  v
Terminal instance (InputTerminal, OutputCollectionTerminal, etc.)
  |
  +-- reads: connectionStore (connections for this terminal)
  +-- reads: stepStore (mapOver state, step definitions)
  +-- writes: connectionStore (addConnection, removeConnection)
  +-- writes: stepStore (changeStepMapOver, changeStepInputMapOver)
  +-- writes: undoRedoStore (wraps connect/disconnect in undo actions)
  |
  v
useTerminal composable (Vue watcher rebuilds terminal on state change)
  |
  v
NodeInput.vue / NodeOutput.vue (render, drag/drop, canAccept display)
  |
  v
stateStore (terminal positions for SVG edge rendering)
```

---

## Key Design Decisions

1. **Terminals are not reactive objects.** They are rebuilt by `useTerminal` whenever tracked dependencies (step, terminalSource, datatypesMapper) change. This avoids complex reactive class hierarchies but means terminal instances can become stale.

2. **Undo/redo wrapping at the terminal level.** `connect()` and `disconnect()` create undo/redo actions directly, so every connection change is undoable.

3. **Map-over state is stored in the step store, not on terminals.** Terminals read and write `stepMapOver` and `stepInputMapOver` but don't own the state. This allows the state to survive terminal reconstruction.

4. **The factory pattern centralizes construction.** All terminal creation goes through `terminalFactory`, making it the single point to modify for adding new terminal types.

5. **EventEmitter inheritance is vestigial.** The `emit` functionality is not actively used; the module communicates through store mutations instead.

6. **Invalid terminals are first-class.** `InvalidInputTerminal` and `InvalidOutputTerminal` represent broken states gracefully rather than throwing errors, allowing the UI to display and recover from inconsistencies.

---

## Collection Type Handling Summary

| Scenario | Example | Result |
|----------|---------|--------|
| Dataset output -> Dataset input | tabular -> txt (subtype) | Direct connection |
| List output -> Dataset input | list:tabular -> txt | Map over list, run per element |
| List output -> List input | list -> list | Direct match, no map over |
| List:paired output -> Paired input | list:paired -> paired | Map over list |
| List:paired output -> Dataset input | list:paired -> txt | Map over list:paired |
| List output -> Multiple data input | list -> multiple | Consumed as list (no map over) |
| List:list output -> Multiple data input | list:list -> multiple | Map over outer list |
| Paired_or_unpaired output -> Paired input | paired_or_unpaired -> paired | REJECTED (use Split tool) |
| Paired_or_unpaired output -> Dataset input | paired_or_unpaired -> txt | Map over paired_or_unpaired |
| Any collection output -> Any collection input | any -> any | Matches any collection |
| Dataset output -> Collection input | data -> collection | REJECTED |
| Parameter output -> Data input | integer -> txt | REJECTED |

---

## Test Coverage

`client/src/components/Workflow/Editor/modules/terminals.test.ts` (928 lines) covers:

- **terminalFactory**: Correct class instantiation for all terminal source types
- **canAccept**: ~42 scenarios including:
  - Simple data connections
  - Collection -> data mapping
  - Multi-data input list consumption
  - Map-over constraint propagation through output connections
  - Transitive map-over tracking
  - Parameter type matching/rejection
  - Optional -> required rejection
  - Collection type incompatibility
  - paired_or_unpaired special cases
  - Invalid connection detection and cleanup
  - Collection type source resolution (filter_failed pattern)
- **Input terminal state**: Connection state, map-over inference, validation
- **producesAcceptableDatatype**: Datatype hierarchy checks, unknown type handling
