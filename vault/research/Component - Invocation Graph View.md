---
type: research
subtype: component
tags:
  - research/component
  - galaxy/client
  - galaxy/workflows
component: Invocation Graph View
status: draft
created: 2026-02-11
revised: 2026-02-11
revision: 1
ai_generated: true
---

# Component Architecture: Invocation Graph View

## Overview

The invocation graph view renders a visual DAG (directed acyclic graph) of a workflow invocation, reusing the workflow editor canvas in readonly mode. Each node displays real-time job state information (running, ok, error, paused, queued, skipped, etc.) with color-coded headers and state icons. Clicking a node expands step details in a card below the graph.

The feature spans ~25 files across components, composables, stores, styles, and tests.

## Component Hierarchy

```
WorkflowInvocationState (top-level, route-mounted)
  +-- WorkflowNavigationTitle (header bar w/ workflow name, actions)
  +-- WorkflowAnnotation (annotation, progress bars)
  +-- BNav pills (tab navigation via router: Overview|Steps|Inputs|Outputs|Report|Export|Metrics|Debug)
  |
  +-- [Overview tab] WorkflowInvocationOverview
  |     +-- SubworkflowAlert (if subworkflow)
  |     +-- WorkflowInvocationError (per invocation message)
  |     +-- InvocationGraph
  |           +-- WorkflowGraph (readonly editor canvas)
  |           |     +-- Node (per step, with isInvocation=true)
  |           |           +-- NodeInvocationText (job state counts / input preview)
  |           |           +-- NodeInput (blank=true, invisible labels)
  |           |           +-- NodeOutput (blank=true, invisible labels)
  |           +-- [step detail card below graph]
  |                 +-- WorkflowInvocationStepHeader
  |                 +-- WorkflowInvocationStep (expanded, inGraphView=true)
  |
  +-- [Steps tab] WorkflowInvocationSteps
  |     +-- WorkflowInvocationStep (per step, collapsible)
  |           +-- WorkflowInvocationStepHeader
  |           +-- JobStep / ParameterStep / GenericHistoryItem / SubworkflowAlert
  |
  +-- [Inputs/Outputs tab] WorkflowInvocationInputOutputTabs
  +-- [Report tab] InvocationReport
  +-- [Export tab] WorkflowInvocationExportOptions
  +-- [Metrics tab] WorkflowInvocationMetrics (Vega charts)
  +-- [Debug tab] WorkflowInvocationFeedback
```

## Routing

Single consolidated route in `client/src/entry/analysis/router.js`:
```
path: "workflows/invocations/:invocationId/:tab?"
props: { invocationId, tab, isFullPage: true, success }
component: WorkflowInvocationState
```

Tab navigation uses `BNav` pills with `<router-link>` (`:to`) -- each tab is a sub-path (e.g., `/workflows/invocations/{id}/steps`). The Overview tab is the default (when `:tab` is absent).

## Core Composable: `useInvocationGraph`

**File:** `client/src/composables/useInvocationGraph.ts` (366 lines)

Central logic for creating a readonly invocation graph. Takes four Ref params:
- `invocation` -- the full invocation element view
- `stepsJobsSummary` -- per-step job summaries (provided by parent, not fetched internally)
- `workflowId`, `workflowVersion` -- for fetching the correct workflow version

### Key exports

| Export | Type | Description |
|--------|------|-------------|
| `GraphStep` | interface | Extends `Step` with `state`, `jobs`, `headerClass`, `headerIcon`, `headerIconSpin`, `nodeText` |
| `iconClasses` | Record | Maps states to FontAwesome icons (ok->check, error->triangle, running->spinner, etc.) |
| `statePlaceholders` | Record | Human-readable state labels ("ok"->"successful", "error"->"failed") |
| `getHeaderClass` | function | Returns CSS class object `{ "node-header-invocation": true, "header-{state}": true }` |
| `useInvocationGraph()` | composable | Returns `{ storeId, steps, loadInvocationGraph, loading }` |

### State derivation logic

The composable derives a single visual state per step from job states using priority:
1. **Single-instance states** (`error`, `running`, `paused`, `deleting`): if *any* job has this state, the step gets it
2. **All-instances states** (`deleted`, `skipped`, `new`, `queued`): *all* jobs must be in this state
3. Falls back to `populated_state` from the invocation step summary, with mapping: `scheduled`/`ready` -> `queued`, `resubmitted` -> `new`, `failed` -> `error`, `deleting` -> `deleted`
4. If no invocation step exists for a workflow step, defaults to `queued`

### Workflow loading

On first call to `loadInvocationGraph()`:
1. Fetches the specific workflow version via `workflowStore.getFullWorkflowCached(workflowId, version)`
2. Creates an `invocationGraph` ref (workflow structure with `id = "invocation-{invocationId}"`)
3. Initializes `GraphStep` objects from workflow steps + invocation step data
4. Calls `fromSimple(storeId, invocationGraph)` to load into scoped editor stores
5. On subsequent calls, only updates step states (doesn't reload the editor)

### Input step handling

Input steps (data_input, data_collection_input, parameter_input) are handled separately:
- Dataset inputs: fetches HDA/HDCA details, displays `{hid}: {name}` as `nodeText`
- Parameter inputs: displays the parameter value directly
- Boolean inputs: displayed as checkbox icon
- Color inputs: displayed with a color swatch

## Scoped Workflow Stores

**File:** `client/src/composables/workflowStores.ts`

Each invocation graph gets isolated Pinia stores via `provideScopedWorkflowStores(storeId)` where `storeId = "invocation-{invocationId}"`. This creates scoped instances of:
- `useConnectionStore` -- graph connections/edges
- `useWorkflowStateStore` -- active node, scale, dragging state
- `useWorkflowStepStore` -- step data
- `useWorkflowCommentStore` -- (unused in invocation mode)
- `useWorkflowEditorToolbarStore` -- (unused in invocation mode)
- `useUndoRedoStore` -- (unused in invocation mode)
- `useWorkflowSearchStore` -- (unused in invocation mode)

All stores are auto-disposed via `useTimeoutStoreDispose` on scope disposal. This scoping prevents conflicts between the invocation graph view and any concurrently open workflow editor.

The `activeNodeId` from the state store drives which step's detail card is displayed below the graph.

## Data Flow & Polling Architecture

```
invocationStore (Pinia)
  |
  |-- fetchInvocationById()          --> invocation data
  |-- fetchInvocationJobsSummaryForId()  --> aggregate job summary
  |-- fetchInvocationStepJobsSummaryForId()  --> per-step job summaries
  |
  v
WorkflowInvocationState (orchestrator)
  |-- polls invocation until scheduling terminal (3s interval)
  |-- polls job summaries until all jobs terminal (3s interval)
  |-- provides: invocation, stepsJobsSummary, invocationAndJobTerminal
  |
  v
WorkflowInvocationOverview
  |-- useWorkflowInstance() --> fetches StoredWorkflowDetailed
  |
  v
InvocationGraph
  |-- useInvocationGraph(invocation, stepsJobsSummary, workflowId, workflowVersion)
  |-- polls loadInvocationGraph() every 3s until terminal (redundant w/ parent)
  |-- renders WorkflowGraph with GraphStep objects
```

### Three levels of polling

1. **WorkflowInvocationState** polls `invocationStore.fetchInvocationById` until `invocationSchedulingTerminal` (state is scheduled/cancelled/failed/completed)
2. **WorkflowInvocationState** polls `invocationStore.fetchInvocationJobsSummaryForId` + `fetchInvocationStepJobsSummaryForId` until all jobs are terminal
3. **InvocationGraph** polls `loadInvocationGraph()` every 3s until `isTerminal` prop is true -- this re-processes the `stepsJobsSummary` (already being polled by parent) to update step visual states

All polling uses `setTimeout` chains (not `setInterval`) and cleans up via `onUnmounted` / `clearTimeout`.

## Editor Canvas Reuse

The invocation graph reuses `WorkflowGraph.vue` in readonly mode with `isInvocation=true`:

### Props passed to WorkflowGraph
- `steps`: GraphStep objects (with state/jobs/headerClass/nodeText)
- `readonly`: true
- `isInvocation`: true
- `fixedHeight`: 60 (vh units)
- `showMinimap`: depends on `isFullPage`
- `showZoomControls`: true
- `initialPosition`: `{ x: -40 * zoom, y: -40 * zoom }`

### How Node.vue adapts for invocation mode

When `isInvocation=true`:
- **Header**: uses `invocationStep.headerClass` (state-colored) instead of default `node-header`; cursor is `pointer` not `move`
- **Header icon**: shows state icon (spinner for running, check for ok, etc.)
- **Body**: shows `NodeInvocationText` instead of normal step content
- **Inputs**: rendered with `position-absolute` and `blank=true` (invisible labels, but connection points preserved for edge rendering)
- **Outputs**: rendered with `blank=true`, positioned absolutely to overlay
- **Rule divider**: hidden
- **Click behavior**: `onActivate` emits to set `activeNodeId` in state store

### NodeInvocationText rendering

For tool/subworkflow steps with jobs:
- Renders `InvocationStepStateDisplay` per job state (e.g., "2 jobs successful", "1 job failed")

For input steps:
- Boolean: checkbox icon + value
- Color: hex string + color swatch input
- Other: sanitized HTML (e.g., `{hid}: <b>{name}</b>`)

## Step Detail Card (below graph)

When a node is clicked (`activeNodeId !== null`):
1. A `BCard` appears below the graph with:
   - **Header**: `WorkflowInvocationStepHeader` (step title, state badge, icon) + navigation (Prev/Next/Close buttons)
   - **Body**: `WorkflowInvocationStep` with `expanded=true` and `inGraphView=true`
2. Navigation: Prev/Next buttons increment/decrement `activeNodeId`
3. Scroll-to-view: clicking a step scrolls the card header into view; a "scroll to step" button also exists

`WorkflowInvocationStep` handles different step types:
- **Tool steps**: Shows `JobStep` (job list with state filtering, pagination) + Outputs tab
- **Subworkflow steps**: Shows `SubworkflowAlert` with link to subworkflow invocation
- **Data input steps**: Shows `GenericHistoryItem`
- **Parameter input steps**: Shows `ParameterStep`

## Steps Tab (separate from graph)

`WorkflowInvocationSteps.vue` (in `Workflow/Invocation/Graph/`) renders all steps in a list view:
- Uses `useInvocationGraph` with `loadOntoEditor=false` (just computes GraphStep objects, doesn't load onto canvas)
- Groups input steps in a collapsible "Workflow Inputs" section
- Each step is a `WorkflowInvocationStep` with externally-managed expansion state
- Uses `useWorkflowInstance` to fetch the workflow

## Sibling: Workflow Run Graph

`useWorkflowRunGraph.ts` (223 lines) is a sibling composable that reuses the same graph infrastructure for the workflow **run form** (before invocation). It:
- Imports `getHeaderClass` from `useInvocationGraph`
- Shows input state on the graph as users fill in the run form (populated/unpopulated/error)
- Uses the same `fromSimple` pattern to load onto scoped editor stores
- Does NOT show job states (no invocation exists yet)

This establishes a pattern where the editor canvas is a reusable visualization layer, with composables providing different data overlays (invocation states vs. run-form states).

## Styling

### State-colored headers (`base.scss:195`)

```scss
.node-header-invocation {
    color: $text-color;
    @each $state in map-keys($galaxy-state-bg) {
        &.header-#{$state} {
            background-color: map-get($galaxy-state-bg, $state) !important;
        }
    }
    &.header-paused { background-color: $state-info-bg !important; }
    &.header-skipped { background-color: map-get($galaxy-state-bg, "hidden") !important; }
}
```

Uses the `$galaxy-state-bg` SCSS map (defined in theme) to derive colors for each state. The `getHeaderClass` function returns `{ "node-header-invocation": true, "header-{state}": true }`.

### Component-scoped styles

- **InvocationGraph.vue**: `.graph-scroll-overlay` (semi-transparent edge overlays when step selected), `.invocation-graph` (z-index for minimap/zoom), `.invocation-step-card` (min-height 500px)
- **Node.vue**: `.invocation-node-output` (absolutely positioned outputs), `.node-header` variants
- **NodeInvocationText.vue**: `.truncate` (overflow handling), `.color-input` (color swatch sizing)

## API Dependencies

### Invocation Store endpoints

| Method | Endpoint | Used for |
|--------|----------|----------|
| `fetchInvocationById` | `GET /api/invocations/{invocation_id}` | Full invocation data |
| `fetchInvocationJobsSummaryForId` | `GET /api/invocations/{invocation_id}/jobs_summary` | Aggregate job states |
| `fetchInvocationStepJobsSummaryForId` | `GET /api/invocations/{invocation_id}/step_jobs_summary` | Per-step job summaries |
| `fetchInvocationStepById` | `GET /api/invocations/steps/{step_id}` | Individual step details |
| `cancelWorkflowScheduling` | `DELETE /api/invocations/{invocation_id}` | Cancel invocation |

### Key API Types (`client/src/api/invocations.ts`)

- `WorkflowInvocationElementView` -- full invocation with steps, inputs, outputs
- `StepJobSummary` -- union of `InvocationStepJobsResponseStepModel | ...JobModel | ...CollectionJobsModel`
- `InvocationJobsSummary` -- aggregate job state counts
- `InvocationStep` -- individual step with `job_id`, `implicit_collection_jobs_id`, `state`

### Workflow Store

- `getFullWorkflowCached(workflowId, version)` -- fetches and caches the specific workflow version
- `getStoredWorkflowByInstanceId(workflowId)` -- gets stored workflow metadata
- `fetchWorkflowForInstanceId(workflowId)` -- fetches workflow if not cached

## Test Coverage

### Unit Tests

| File | What it tests |
|------|---------------|
| `WorkflowInvocationState.test.ts` | Tab rendering, terminal/non-terminal states, fetch call counts |
| `WorkflowInvocationOverview.test.js` | Overview rendering with invocation graph |
| `JobStep.test.ts` | Job listing, state filtering |
| `JobStepJobs.test.ts` | Job pagination, sorting |
| `WorkflowInvocationInputOutputTabs.test.ts` | Input/output tab rendering |
| `WorkflowInvocationShare.test.ts` | Share functionality |

### Selenium Test

`lib/galaxy_test/selenium/test_workflow_invocation_details.py` (143 lines, 2 tests):
1. `test_job_details` -- Verifies progress bars, inputs tab, steps tab, job details, outputs tab
2. `test_invocation_step_jobs_with_failed_jobs` -- Verifies mixed ok/error job state counters, error filtering, Debug tab

## File Inventory (27 files)

### Core graph components
| File | Lines | Role |
|------|-------|------|
| `composables/useInvocationGraph.ts` | 366 | Core graph state logic |
| `composables/useWorkflowRunGraph.ts` | 223 | Sibling: run-form graph |
| `composables/useWorkflowInstance.ts` | 31 | Workflow fetch helper |
| `composables/workflowStores.ts` | 103 | Scoped store provisioning |
| `Workflow/Invocation/Graph/InvocationGraph.vue` | 310 | Graph + step detail card |
| `Workflow/Invocation/Graph/WorkflowInvocationSteps.vue` | 101 | Steps list view |

### Editor components (adapted for invocation)
| File | Role |
|------|------|
| `Workflow/Editor/WorkflowGraph.vue` | Canvas container |
| `Workflow/Editor/Node.vue` | Node rendering w/ `isInvocation` prop |
| `Workflow/Editor/NodeInvocationText.vue` | In-node job state display |
| `Workflow/Editor/NodeInput.vue` | Input terminals w/ `blank` prop |
| `Workflow/Editor/NodeOutput.vue` | Output terminals w/ `blank` prop |

### Invocation state components
| File | Role |
|------|------|
| `WorkflowInvocationState/WorkflowInvocationState.vue` | Top-level page, polling, tabs |
| `WorkflowInvocationState/WorkflowInvocationOverview.vue` | Overview tab, hosts InvocationGraph |
| `WorkflowInvocationState/WorkflowInvocationStep.vue` | Expandable step detail |
| `WorkflowInvocationState/WorkflowInvocationStepHeader.vue` | Step header w/ state badge |
| `WorkflowInvocationState/WorkflowInvocationError.vue` | Error cards w/ step navigation |
| `WorkflowInvocationState/InvocationStepStateDisplay.vue` | Job state counter (icon + count) |
| `WorkflowInvocationState/JobStep.vue` | Job list w/ state filtering |
| `WorkflowInvocationState/JobStepJobs.vue` | Paginated job table |
| `WorkflowInvocationState/WorkflowInvocationInputOutputTabs.vue` | Inputs/Outputs tabs |
| `WorkflowInvocationState/WorkflowInvocationMetrics.vue` | Vega metric charts |
| `WorkflowInvocationState/WorkflowInvocationFeedback.vue` | Debug tab |
| `WorkflowInvocationState/SubworkflowAlert.vue` | Subworkflow link |
| `WorkflowInvocationState/WorkflowStepIcon.vue` | Step type icon |
| `WorkflowInvocationState/WorkflowStepTitle.vue` | Step title display |
| `WorkflowInvocationState/util.ts` | Job state counting helpers |

### Stores
| File | Role |
|------|------|
| `stores/invocationStore.ts` | Invocation data caching + API calls |
| `stores/workflowStore.ts` | Workflow data + version-aware caching |
| `stores/workflowEditorStateStore.ts` | Per-graph state (activeNodeId, scale) |

## Known TODOs / Limitations

5 TODOs remain in `useInvocationGraph.ts`:
1. **L172**: "What if the state of something not in the stepsJobsSummary has changed? (e.g.: subworkflows...)"
2. **L227**: Subworkflow steps are often `scheduled` regardless of actual output success -- could derive state from subworkflow outputs
3. **L250**: "There is no summary for this step's `job_id`; what does this mean?" -- falls back to `waiting`
4. **L323**: Type mismatch between HDA state and `GraphStep["state"]`
5. **L328**: Same type mismatch for HDCA state

Additional architectural concerns:
- **Redundant polling**: InvocationGraph polls independently at 3s even though WorkflowInvocationState already polls the same data. The `stepsJobsSummary` is passed down as a prop, so the InvocationGraph poll just reprocesses already-updated data.
- **Multiple `useInvocationGraph` instances**: The composable is called independently by InvocationGraph (Overview tab), WorkflowInvocationSteps (Steps tab), and WorkflowInvocationFeedback (Debug tab). Each creates its own scoped stores and step state. A TODO in WorkflowInvocationOverview notes: "Refactor so that `storeId` is only defined here, and then used in all children components/composables."
- **Subworkflow state is not fully represented**: The graph shows subworkflow steps as "scheduled" even when their child invocation has completed or failed. The only way to see subworkflow details is via the SubworkflowAlert link.
- **`fromSimple` side effect**: Loading graph data into scoped stores uses `fromSimple`, which is the same function used by the editor to deserialize workflows. In invocation mode most of the store data (connections, comments, undo/redo) goes unused.
