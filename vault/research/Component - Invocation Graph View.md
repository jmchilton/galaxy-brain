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
revised: 2026-10-14
revision: 4
ai_generated: true
summary: "Readonly workflow-editor canvas overlaying live job state on invocation steps, plus its step card, search, polling and the generic GraphView alternative"
related_notes:
  - "[[Component - Invocation Report to Pages]]"
  - "[[Component - Workflow Editor Terminals]]"
  - "[[PR 17413 - Invocation Graph View]]"
  - "[[PR 21932 - History Graph API]]"
related_prs:
  - 17413
  - 20719
  - 20912
  - 22105
  - 22142
  - 22144
  - 22159
  - 22335
  - 22476
  - 21932
  - 22769
  - 23436
  - 23791
  - 23844
  - 23861
---

# Component Architecture: Invocation Graph View

Verified against Galaxy `origin/dev` @ `c63ffc2c` (2026-10-14). Line numbers are at that SHA.

## Overview

The invocation graph renders a workflow invocation as a DAG by reusing the workflow editor canvas (`WorkflowGraph.vue`) readonly with `isInvocation=true`. Step headers are colored by a state derived from job summaries; clicking a node opens a tabbed step card (Jobs / Outputs / Step Config) below the graph. Since revision 3 the view gained: lineage focus mode, a "Show Connections" toggle, a readonly step form, state-colored minimap, graph + steps search, and a schema-derived `GraphStepState` type.

**Scope**: the Overview-tab graph and what it shares with the Steps/Debug tabs and run-form graph. Out of scope: invocation report/Pages ([[Component - Invocation Report to Pages]]), export plugins, metrics charts.

**Key fact for new work**: Galaxy now has **two DAG renderers** — the editor-derived `WorkflowGraph` (used here) and the generic ELK-laid-out `components/Graph/GraphView` from [[PR 21932 - History Graph API]]. See [Two Graph Renderers](#two-graph-renderers).

## Component Hierarchy

```
WorkflowInvocationState                 (route-mounted full page, OR embedded: GridInvocation, WorkflowRunSuccess)
  +-- WorkflowNavigationTitle           (isFullPage only; actions slot: Cancel + WorkflowInvocationShare)
  |     +-- #collapsible: WorkflowAnnotation (progress bars in middle-content slot)
  |         header collapse persisted via usePersistentToggle("invocation-header-collapsed")
  +-- BNav pills (isFullPage only): Overview|Steps|Inputs|Outputs|Report|Export|Metrics|Debug
  |     right side: WorkflowInvocationSearch (Overview only), polling spinner badge, Cancel Workflow
  |
  +-- [Overview]  WorkflowInvocationOverview
  |     +-- SubworkflowAlert (if subworkflow)
  |     +-- WorkflowInvocationError (per message, gets store-id)
  |     +-- InvocationGraph               (hidden when isSubworkflow)
  |           +-- WorkflowGraph (readonly, is-invocation)
  |           |     +-- Node (per step) -> NodeInvocationText / NodeInput blank / NodeOutput blank
  |           +-- "Show Connections" toggle (only when a node is active)
  |           +-- step card: WorkflowInvocationStepHeader + WorkflowInvocationStep(expanded, in-graph-view)
  +-- [Steps]     WorkflowInvocationSteps  ("not available" for subworkflow invocations)
  +-- [Inputs/Outputs] WorkflowInvocationInputOutputTabs -> WorkflowInvocationInputs/Outputs
  +-- [Report]    InvocationReport, or HistoryPageView for notebook reports (reports?id=)
  +-- [Export]    WorkflowInvocationExportOptions
  +-- [Metrics]   WorkflowInvocationMetrics (Vega)
  +-- [Debug]     WorkflowInvocationFeedback (only if canSubmitFeedback && stepsJobsSummary)
```

Report and Export are disabled until terminal (or `success`), showing `TabsDisabledAlert` (`WorkflowInvocationState.vue:410-425`). Invalid `:tab` falls back to Overview.

## Routing

`client/src/entry/analysis/router.js:829-836`:

```
path: "workflows/invocations/:invocationId/:tab?"
props: { invocationId, tab, isFullPage: true, success }
component: WorkflowInvocationState
```

Tabs are `<router-link>` sub-paths (`/workflows/invocations/{id}/steps`). Title + BNav render only when `isFullPage` (`WorkflowInvocationState.vue:317,388`), so the embedded uses (invocation grid row expansion, post-run success page) show content without tabs.

## Core Composable: `useInvocationGraph`

**File**: `client/src/composables/useInvocationGraph.ts` (399 lines)

Signature: `useInvocationGraph(invocation, stepsJobsSummary, workflowId, workflowVersion)` — all Refs. Returns `{ storeId, steps, loadInvocationGraph, loading }`.

| Export | Description |
|--------|-------------|
| `GraphStepState` | `JobState \| DatasetState \| InvocationStepState \| "uninitialized"` from the OpenAPI schema (`:35-39`) |
| `GraphStep` | `Step` + `state`, `jobs`, `headerClass`, `headerIcon`, `headerIconSpin`, `nodeText` |
| `iconClasses` | `Record<GraphStepState, {icon, spin?, class?}>` — exhaustive over all states incl. `finishing`, `deferred`, `stop`, `uninitialized` (`:54-88`) |
| `statePlaceholders` | human labels (`ok`→"successful", `error`→"failed", …) |
| `getHeaderClass(state)` | `{ "node-header-invocation": true, "header-{state}": !!state }` (`:394-399`) |

### State derivation (`updateStep`, `:241-314`)

1. Workflow step with no invocation step → `queued`.
2. Subworkflow step → `populated_state = invocationStep.state` (no job-based state; TODO `:259`).
3. Other steps with a matching job summary (matched by `implicit_collection_jobs_id` or `job_id`):
   - **single-instance** (`error`, `running`, `paused`, `deleting`): any job in it wins; `deleting` → `deleted`.
   - **all-instances** (`deleted`, `skipped`, `new`, `queued`): every job must be in it.
4. No summary for the step's job → `waiting` (TODO `:282`).
5. Still undetermined → `populated_state` mapping: `scheduled`/`ready`→`queued`, `resubmitted`→`new`, `failed`→`error`, `deleting`→`deleted`; any other value except `stop`/`stopped` passes through.
6. Still undetermined → keep previous state (`:309`). New steps start `uninitialized` (`:195`).

Covered by `client/src/composables/useInvocationGraph.test.ts` (162 lines, one case per branch above).

### Loading

`loadInvocationGraph(loadOntoEditor = true)`:
1. First call: `workflowStore.getFullWorkflowCached(workflowId, version)`; builds `invocationGraph = {...workflow, id: storeId, steps: null}`.
2. `updateSteps(stepsJobsSummary)` — recomputes non-input steps only if the summary's `JSON.stringify` changed (`:206-208`, evaluated **inside the per-step loop**).
3. First call with `loadOntoEditor`: `fromSimple(storeId, invocationGraph)` loads steps into the scoped editor stores.

### Input steps (`initializeGraphInput`, `:350-373`)

- HDA → `fetchDatasetDetails`; HDCA → `fetchCollectionSummary`. State from `getContentItemState`; `nodeText = "{hid}: <b>{name}</b>"`.
- Parameter inputs: boolean → raw boolean; anything else → `"<b>{value}</b>"`.

## Scoped Workflow Stores

`client/src/composables/workflowStores.ts` — `provideScopedWorkflowStores(storeId)` provides 7 scoped Pinia stores (connection, state, step, comment, toolbar, undo/redo, search). Disposal is ref-counted with a 1 s timeout (`client/src/composables/timeoutStoreDispose.ts:11-30`).

Four providers all use the same id `invocation-{invocationId}`, so they **share** one set of stores; only the `steps` ref is per-`useInvocationGraph` instance, and only `InvocationGraph` calls `fromSimple`:

| Provider | Purpose |
|----------|---------|
| `InvocationGraph.vue:72` | canvas |
| `WorkflowInvocationSteps.vue:79-88` | step states for list (`loadOntoEditor=false`) |
| `WorkflowInvocationFeedback.vue:28` | Debug tab |
| `WorkflowInvocationSearch.vue:20` | search store, `pendingHighlight`, `activeNodeId` |

`activeNodeId` in the state store drives the step card and is set by search results. TODO at `WorkflowInvocationOverview.vue:32` still wants one storeId owner.

## Data Flow & Polling

```
invocationStore (Pinia)
  fetchInvocationById / fetchInvocationJobsSummaryForId / fetchInvocationStepJobsSummaryForId
        |
WorkflowInvocationState  -- polls invocation (3s) until scheduling terminal
        |                -- polls job summaries (3s) until all jobs terminal
        |                -- provides invocation, stepsJobsSummary, isTerminal
WorkflowInvocationOverview  -- useWorkflowInstance() -> StoredWorkflowDetailed
        |
InvocationGraph  -- re-runs loadInvocationGraph() every 3s until isTerminal
        |
WorkflowInvocationStep (each mounted) -- polls fetchInvocationStepById every 3s until step terminal
```

Four polling levels, all `setTimeout` chains cleared on unmount:
1. Invocation until scheduling terminal (`WorkflowInvocationState.vue:122-142`).
2. Job summaries until jobs terminal (`:285-294`); restarts if scheduling flips back to non-terminal (`:251-259`).
3. `InvocationGraph` reprocessing the already-polled `stepsJobsSummary` (`InvocationGraph.vue:155-163`) — redundant fetch-free loop.
4. Per-step `fetchInvocationStepById` in every mounted `WorkflowInvocationStep` (`WorkflowInvocationStep.vue:112-137`) — on the Steps tab that is every step (perf TODO `WorkflowInvocationSteps.vue:147-152`).

Metrics use stale-while-revalidate keyed on terminal job counts (`invocationStore.ts:153-250`).

## Editor Canvas Reuse

### Props passed to `WorkflowGraph` (`InvocationGraph.vue:204-217`)

`steps`, `datatypes-mapper`, `initial-position` (`{x: -initialX*zoom, y: -initialY*zoom}`, defaults `initialX/Y=-40`, `zoom=0.75`), `scroll-to-id=activeNodeId`, `show-minimap` (default true), `show-zoom-controls`, `detailed-view`, `fixed-height=60` (vh), `is-invocation`, `readonly`, `@stepClicked`.

On mount, after loading: `fitWorkflow(0.25, 1.0, 20.0)` — max zoom capped at 100% (#22105). Vertical scroll is prevented (#22769).

### Node.vue in invocation mode

- **Header**: `invocationStep.headerClass` merged in; `node-header` only when no headerClass; `cursor-move` only when `!readonly && !isInvocation` (`Node.vue:297-304`). State icon from `headerIcon`/`headerIconSpin`.
- **Body**: `NodeInvocationText`; inputs `position-absolute` + `blank` (connection points kept); outputs `blank`; rule hidden (`:126-141`).
- **Error steps** still render terminals/connections (`:118`, #23861).
- The same invocation styling applies to populated **run-form** inputs via `isPopulatedInput` (`:99,142-150,273-279`).
- Click → `onActivate` → `stateStore.activeNodeId` (`WorkflowGraph.vue:175-180`). Clean background click deselects (`:205-223`).

### Features added in 26.x

| Feature | Mechanism | PR |
|---------|-----------|----|
| Focus / isolate mode | `useFocusedNodes` (now `components/Graph/composables/`) dims nodes outside active node's upstream+downstream lineage; separate directional traversals exclude sibling branches (`WorkflowGraph.vue:63-82,310`, `Node.vue:287`) | #22142 |
| Show Connections | `detailedView` renders the **active** node with `isInvocation=false`, i.e. full editor terminals (`WorkflowGraph.vue:308`) | #22159 |
| Minimap state colors | `getStepColor` in `modules/canvasDraw.ts:26-48` reads `--state-color-*` CSS vars derived from the node's `headerClass` | #22335 |
| Graph search | `WorkflowInvocationSearch` reuses editor `GraphSearch`, sets `pendingHighlight`/`activeNodeId` | #22476 |

### NodeInvocationText

- Steps with `jobs`: one `InvocationStepStateDisplay` per state ("2 jobs successful").
- Inputs: boolean → checkbox icon; `isColor` (`^#[0-9a-f]{6}$`) → swatch; else `purify.sanitize(v, {ALLOWED_TAGS: ["b"]})` via `v-sanitize-html` (#23791).
- Fallbacks: "This is an input", "This is a subworkflow.", "This step has no jobs as of yet."

## Step Detail Card

Shown when `activeNodeId !== null` (`InvocationGraph.vue:243-292`):
- Sticky header colored by `headerClass`: `WorkflowInvocationStepHeader` + Scroll-to, Prev/Next (by step index), Hide.
- Body: `WorkflowInvocationStep` keyed by `activeNodeId`, `expanded`, `in-graph-view`.

`WorkflowInvocationStep.vue` is a `GTabs` (`:273-338`):
- Step annotation above tabs (`:222-227`).
- **Jobs** (tool steps) — `JobStep` with state-filter navbar + paginated `JobStepJobs`.
- **Outputs** (if any).
- **Step Config** (lazy) — readonly `FormTool`/`FormDefault` in a disabled fieldset, falling back to `POST api/workflows/build_module` (`:154-189,319-337`; #22144).
- Data inputs → `GenericHistoryItem`; parameters → `ParameterStep`; subworkflows → `SubworkflowAlert` link; unscheduled subworkflow steps list upstream steps (`:253-268`).

## Steps Tab

`client/src/components/Workflow/Invocation/Graph/WorkflowInvocationSteps.vue` (184 lines):
- `useInvocationGraph(...).loadInvocationGraph(false)` — states only, no canvas (`:105`).
- Inputs grouped in a collapsible portlet only with 2+ inputs (`:75-76`); auto-expanded while searching.
- `DelayedInput` step search via `getStepTitle` (#22476).
- Load-error `GAlert` (#23844).
- Each `WorkflowInvocationStep` gets `:expanded="undefined"` → manages its own expansion.

## Sibling: Workflow Run Graph

`client/src/composables/useWorkflowRunGraph.ts` (227 lines) — same canvas for the run form:
- Fetches via `getWorkflowFull` (not the store); `fromSimple(workflowId, …)` scoped to the raw workflow id (provided by `WorkflowRunFormSimple.vue:79`).
- Imports `getHeaderClass`: `ok` when populated, `paused` when unpopulated/invalid, none when optional (`:195`).
- Passes raw hex for color params (`:165-167`), so the swatch branch of `NodeInvocationText` fires here.

## Two Graph Renderers

| | `Workflow/Editor/WorkflowGraph.vue` (this view) | `components/Graph/GraphView.vue` (#21932) |
|---|---|---|
| Consumers | editor (`Index.vue`), invocation graph, run form (`WorkflowRunGraph.vue`), published workflow (`WorkflowPublished.vue`) | history graph (`histories/:historyId/graph/:tab?`) |
| Layout | stored step `position` from workflow JSON | ELK layered, left→right; measure-then-layout (`layoutGraph.ts`) |
| Data model | `Step`/`GraphStep` in scoped Pinia stores via `fromSimple` | plain `GraphNode<TData>[]` / `GraphEdge[]` props (`types.ts`) |
| Nodes | `Node.vue` with editor terminals, `isInvocation`/`blank` switches | `GraphNode.vue` + single merged connector (`single`/`multiple`) |
| Coloring | `headerClass` → `.node-header-invocation.header-{state}` | `nodeColor(node)` callback prop |
| Minimap | `WorkflowMinimap` (canvas) | `GraphMinimap` |
| Shared | `useD3Zoom`, `useViewportBoundingBox`, `useFocusedNodes`, `Graph/ZoomControl.vue` (editor's `ZoomControl.vue` is a re-export) | same |

Implication: features that only need nodes + edges + color (cardinality badges, subworkflow expansion, collapsed views) are cheaper on `GraphView`; features that need step terminals, the tool form or editor parity (Show Connections, Step Config) need `WorkflowGraph`.

## Styling

`client/src/style/scss/base.scss`:
- `$galaxy-state-bg` (`:145-168`) now includes `paused`, `skipped`, `uninitialized`, `finishing`, `resubmitted`, `failed`, `deleting`, `stop`, `stopped` — the old per-class `header-paused`/`header-skipped` overrides are gone.
- `:root` exposes each as `--state-color-{state}` (`:182-186`) for canvas rendering.
- `.node-header-invocation` (`:225-232`) loops the map into `&.header-{state}`.

Scoped: `InvocationGraph.vue` has `.graph-scroll-overlay`, `.invocation-graph` (z-index for minimap/zoom), `.invocation-step-card` (min-height 500px), `.detailed-view-button`, sticky `.invocation-step-header`.

## API Dependencies

| Store method | Endpoint |
|--------------|----------|
| `fetchInvocationById` | `GET /api/invocations/{id}` |
| `fetchInvocationJobsSummaryForId` | `GET /api/invocations/{id}/jobs_summary` |
| `fetchInvocationStepJobsSummaryForId` | `GET /api/invocations/{id}/step_jobs_summary` |
| `fetchInvocationStepById` | `GET /api/invocations/steps/{step_id}` |
| `cancelWorkflowScheduling` | `DELETE /api/invocations/{id}` (`invocationStore.ts:103`) |
| (Feedback tab) | `POST /api/invocations/{id}/error` |
| (Step Config fallback) | `POST /api/workflows/build_module` |

Types in `client/src/api/invocations.ts:6-23`: `WorkflowInvocationElementView`, `StepJobSummary`, `InvocationJobsSummary`, `InvocationStep`. Workflow store: `getFullWorkflowCached`, `getStoredWorkflowByInstanceId`, `fetchWorkflowForInstanceId` (`workflowStore.ts:197,227,266`).

## Test Coverage

### Unit (vitest)

| File | Covers |
|------|--------|
| `composables/useInvocationGraph.test.ts` | state derivation, every branch |
| `Workflow/Editor/modules/canvasDraw.test.ts` | minimap color from headerClass |
| `Workflow/Editor/NodeInvocationText.test.ts` | sanitized rendering |
| `Workflow/Editor/Node.test.ts` | error-step terminals |
| `Graph/composables/useFocusedNodes.test.ts` | lineage traversal |
| `Workflow/Invocation/Graph/WorkflowInvocationSteps.test.ts` | load error |
| `WorkflowInvocationState/WorkflowInvocationState.test.ts` | tabs, terminal states, fetch counts |
| `WorkflowInvocationState/WorkflowInvocationOverview.test.js` | overview |
| `WorkflowInvocationState/WorkflowInvocationFeedback.test.ts` | load error |
| `WorkflowInvocationState/WorkflowInvocationStepHeader.test.ts` | popover |
| `WorkflowInvocationState/WorkflowStepIcon.test.ts`, `util.test.ts` | icons, `getStepTitle`, terminal counts |
| `JobStep.test.ts`, `JobStepJobs.test.ts`, `WorkflowInvocationInputOutputTabs.test.ts`, `WorkflowInvocationShare.test.ts` | step jobs, tabs, share |
| `stores/invocationStore.test.ts` | store caching |

### E2E

`lib/galaxy_test/selenium/test_workflow_invocation_details.py` (142 lines): `test_job_details`, `test_invocation_step_jobs_with_failed_jobs` — both go through the Steps tab. **No selenium/Playwright test touches the Overview graph canvas**; `navigation.yml` has no invocation-graph selectors beyond generic `workflow_editor.node.by_id` (`:1060`). Graph features (focus, Show Connections, Step Config, minimap colors, search) are unit-tested at best.

## Recent Activity

| PR | Merged | Change |
|----|--------|--------|
| #20719 | 2025-08 | Routable tabs; Steps tab uses `useInvocationGraph` |
| #20870 | 2025-09 | Lazy tabs; HDCA collection-summary fetch |
| #20912 | 2025-09 | Step `GTabs`; JobStep state filter; `InvocationStepProvider` removed |
| #21115 | 2025-10 | `TabsDisabledAlert`; invalid tab → Overview |
| #21514 | 2026-01 | Subworkflow scheduling errors (`InvocationMessage`) |
| #22105 | 2026-03 | Zoom-to-fit capped at 100% |
| #22142 | 2026-03 | Focus/isolate mode; background-click deselect |
| #22159 | 2026-03 | "Show Connections" toggle |
| #22144 | 2026-04 | Step Config tab, step annotation, sticky header |
| #22425 | 2026-04 | Collapsible invocation header |
| #22335 | 2026-04 | Minimap state colors; schema-derived `GraphStepState`; `uninitialized` |
| #22476 | 2026-04 | Graph + Steps search |
| #21932 | 2026-05 | Generic `components/Graph/` (history graph); shared zoom utilities |
| #22769 / #23194 | 2026-06/07 | Vertical scroll fix; node CSS fixes |
| #22873 | 2026-06 | Notebook reports in Report tab |
| #23436 | 2026-09 | `finishing` state color + icon |
| #23791 | 2026-09 | `v-sanitize-html` for node text |
| #23844 | 2026-10 | Steps/Debug graph load-failure handling |
| #23861 | 2026-10 | Error steps keep terminals/connections (fixes #7141) |
| #20787 | 2026-10 | Vue 3 migration (explicit WorkflowGraph event forwarding, `v-model:`, VTU2) |

Umbrella issue #21086 ("More improvements to Invocation View Step Displays") is closed — its four items landed as #22142/#22144/#22159/#22335.

## Open Issues / Development Hooks

| Issue | Ask | Where it lands |
|-------|-----|----------------|
| #22745 | Graph freezes on large workflows (171 steps on EU, 26.0 + 26.1) | polling + `updateSteps`; see Known Issues |
| #21989 | Expose subworkflow info in parent graph and step card | `updateStep` subworkflow branch (`:255-264`), `WorkflowInvocationStep` subworkflow tab |
| #22075 | Show collection cardinality on edges; highlight scheduling-failed steps | edges are editor `WorkflowEdges`; mvdbeek: expensive, show the real error instead |
| #20864 | Perf of Inputs/Outputs + Steps tabs (open dev items: paginate ICJ jobs, double-fetch of inputs, `GenericItem` refactor) | `WorkflowInvocationSteps`, `GenericHistoryItem` |

## Known Issues & Limitations

From code (TODOs in `useInvocationGraph.ts`):
1. `:204` — state changes outside `stepsJobsSummary` (subworkflows) are not detected.
2. `:259` — subworkflow steps sit at `scheduled` regardless of child outcome.
3. `:282` — step with no matching job summary → `waiting`, meaning unclear.
4. `:356`, `:361` — HDA/HDCA state cast to `GraphStep["state"]`.

Found during verification (inferred from reading, not run):
- **Color param swatch is dead in invocation mode.** `initializeGraphInput` wraps every non-boolean value as `<b>{value}</b>` (`:369`), so `NodeInvocationText.isColor` never matches; swatch only works in the run graph.
- **Steps/Debug tab states likely freeze while running.** `WorkflowInvocationSteps` calls `loadInvocationGraph(false)` only on `workflowId` change (`:100-113`) and the composable has no watcher on `stepsJobsSummary`, so header colors stay at first-load values; only the Overview re-polls.
- **Quadratic per-poll work.** `JSON.stringify(stepsJobsSummary)` is evaluated once per step inside the `updateSteps` loop (`:206-208`), every 3 s — O(steps × summary size). Together with redundant level-3 polling and per-step level-4 polling, a plausible contributor to #22745.
- **Redundant polling.** `InvocationGraph` re-polls data its parent already polls.
- **`fromSimple` overhead.** Invocation mode loads the editor's full store model; comments/undo/toolbar stores are unused.
- **Feedback duplicates lookup.** `WorkflowInvocationFeedback.vue:56-70` re-implements the step→summary match from `useInvocationGraph.ts:213-219`.
- **No E2E coverage of the canvas** (see Tests).

## Where to Change What

| Goal | Start at |
|------|----------|
| New step state / color | `$galaxy-state-bg` in `base.scss`, `iconClasses`, `updateStep` |
| Subworkflow state (#21989) | `updateStep` subworkflow branch; needs child invocation data — no API on summary today |
| Per-node extra text/badges | `NodeInvocationText.vue`, `GraphStep.nodeText` |
| Edge annotations (#22075) | editor `WorkflowEdges` — or prototype on `GraphView` |
| Perf (#22745) | hoist the stringify out of the loop; drop level-3 polling in favor of a watcher on `stepsJobsSummary` (would also fix Steps-tab freezing) |
| Step card content | `WorkflowInvocationStep.vue` `GTabs` |
| E2E tests | add `navigation.yml` selectors for graph node headers / step card; extend `test_workflow_invocation_details.py` |

## File Inventory

### Graph core
| File | Lines | Role |
|------|-------|------|
| `composables/useInvocationGraph.ts` | 399 | state derivation, canvas load |
| `composables/useWorkflowRunGraph.ts` | 227 | run-form sibling |
| `composables/useWorkflowInstance.ts` | 31 | workflow fetch helper |
| `composables/workflowStores.ts` | 103 | scoped store provisioning |
| `composables/timeoutStoreDispose.ts` | — | ref-counted delayed dispose |
| `components/Workflow/Invocation/Graph/InvocationGraph.vue` | 354 | canvas + step card |
| `components/Workflow/Invocation/Graph/WorkflowInvocationSteps.vue` | 184 | Steps tab |
| `components/Graph/composables/useFocusedNodes.ts` | 55 | lineage focus (shared) |
| `components/Workflow/Editor/modules/canvasDraw.ts` | — | minimap colors |

### Editor components adapted for invocation
`Workflow/Editor/WorkflowGraph.vue`, `Node.vue`, `NodeInvocationText.vue`, `NodeInput.vue`, `NodeOutput.vue`, `WorkflowMinimap.vue`, `Workflow/GraphSearch.vue`.

### `components/WorkflowInvocationState/`
`WorkflowInvocationState.vue` (page, polling, tabs), `WorkflowInvocationOverview.vue`, `WorkflowInvocationStep.vue`, `WorkflowInvocationStepHeader.vue`, `WorkflowInvocationError.vue`, `InvocationMessage.vue` (289), `InvocationStepStateDisplay.vue`, `JobStep.vue`, `JobStepJobs.vue`, `ParameterStep.vue` (79), `SubworkflowAlert.vue`, `TabsDisabledAlert.vue` (18), `WorkflowInvocationInputOutputTabs.vue`, `WorkflowInvocationInputs.vue` (26), `WorkflowInvocationOutputs.vue` (28), `WorkflowInvocationSearch.vue` (125), `WorkflowInvocationShare.vue` (154), `WorkflowInvocationExportOptions.vue` (33), `WorkflowInvocationMetrics.vue`, `WorkflowInvocationFeedback.vue`, `WorkflowStepIcon.vue`, `WorkflowStepTitle.vue`, `util.ts`.

### Stores
`stores/invocationStore.ts` (caching, polling targets, metrics SWR), `stores/workflowStore.ts` (version-aware cache), `stores/workflowEditorStateStore.ts` (`activeNodeId`, scale, `pendingHighlight`).
