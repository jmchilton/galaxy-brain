---
type: research
subtype: pr
tags:
  - research/pr
  - galaxy/workflows
  - galaxy/client
status: draft
created: 2026-02-11
revised: 2026-02-11
revision: 1
ai_generated: true
github_pr: 17413
github_repo: galaxyproject/galaxy
---
# PR #17413 Research: Visualizing workflow runs with an invocation graph view

## PR Metadata

| Field | Value |
|-------|-------|
| **Title** | Visualizing workflow runs with an invocation graph view |
| **Author** | Ahmed Hamid Awan (@ahmedhamidawan) |
| **Created** | 2024-02-01 |
| **Merged** | 2024-04-30 |
| **State** | MERGED |
| **Base Branch** | dev |
| **Head Branch** | graph_view_invocations |
| **Labels** | area/UI-UX, kind/feature, highlight |
| **Additions** | 1802 |
| **Deletions** | 397 |
| **Commits** | 39 |

## Summary

This PR adds a **graph view** to the workflow invocation summary page. It reuses the existing workflow editor canvas in read-only mode, overlaying job state information (running, ok, error, paused, queued, skipped, etc.) onto each workflow step node. Clicking a step expands its details in a side panel, and clicking a job within a step shows full job info below the graph.

### Key Motivations
- Users previously had no visual representation of workflow execution progress
- The invocation summary was purely text/tabular; now it reuses the familiar workflow editor DAG layout
- Enables at-a-glance understanding of which steps succeeded, failed, are running, etc.

## Detailed Changes

### New Files Created

1. **`client/src/components/Workflow/Invocation/Graph/InvocationGraph.vue`** (349 lines at PR time; now ~311 lines)
   - Main component rendering the invocation graph view
   - Loads workflow graph via `useInvocationGraph` composable
   - Polls invocation state until terminal
   - **[CHANGED]** Originally had side-by-side layout with `FlexPanel`; now shows graph with step detail card below (no FlexPanel, no side panel)
   - **[CHANGED]** Hide/show graph toggle removed (the `hide_invocation_graph` selector no longer exists)
   - Now uses `WorkflowInvocationStep` and `WorkflowInvocationStepHeader` directly below the graph card

2. **`client/src/components/Workflow/Invocation/Graph/WorkflowInvocationSteps.vue`** (131 lines at PR time; now ~102 lines)
   - Lists invocation steps in a list view
   - Groups input steps separately from tool/subworkflow steps
   - **[CHANGED]** No longer used inside `InvocationGraph.vue`; now used directly by `WorkflowInvocationState.vue` as the "Steps" tab content
   - Uses `useInvocationGraph` composable with `loadOntoEditor=false` to get graph steps without rendering the editor canvas
   - Uses `useWorkflowInstance` composable instead of direct store access

3. **`client/src/components/Workflow/Editor/NodeInvocationText.vue`** (39 lines at PR time; now ~73 lines)
   - Renders job state summary text inside graph nodes
   - Shows counts per state (e.g., "2 jobs successful", "1 job failed")
   - Handles input steps and subworkflow steps differently
   - **[CHANGED]** Now uses `InvocationStepStateDisplay` component for job state rendering, added color input display for color-type inputs, boolean checkbox display

4. **`client/src/composables/useInvocationGraph.ts`** (267 lines at PR time; now ~367 lines)
   - Core composable that creates a readonly invocation graph
   - Fetches original workflow structure (at the correct version that was run)
   - **[CHANGED]** No longer fetches step job summaries internally via `stepJobsSummaryFetcher` (which no longer exists); instead receives `stepsJobsSummary` as a Ref parameter
   - Maps job states to visual states for each graph step
   - Defines `GraphStep` interface extending `Step` with state/jobs/headerClass/headerIcon/headerIconSpin/nodeText
   - Defines `iconClasses` mapping states to FontAwesome icons
   - Also exports `statePlaceholders` and `getHeaderClass` (not mentioned in original PR)
   - Uses `fromSimple` to load graph into scoped workflow editor stores
   - Composable function exports: `storeId`, `steps`, `loadInvocationGraph`, `loading`

5. **`client/src/components/WorkflowInvocationState/WorkflowInvocationInputOutputTabs.vue`** (55 lines)
   - Extracted from deleted `WorkflowInvocationDetails.vue`
   - Renders Parameters, Inputs, Outputs, Output Collections as individual `<BTab>` components
   - Used directly inside `WorkflowInvocationState.vue`'s tab bar

### Deleted Files

1. **`client/src/components/WorkflowInvocationState/WorkflowInvocationDetails.vue`** (71 lines)
   - Replaced by `WorkflowInvocationInputOutputTabs.vue` + the new graph view
   - Previously contained a self-contained `<b-tabs>` with Parameters/Inputs/Outputs/Steps tabs

### Renamed Files

1. **`WorkflowInvocationSummary.vue` -> `WorkflowInvocationOverview.vue`**
   - Significant rework: now includes the `InvocationGraph` component
   - Added `isFullPage`, `isSubworkflow` props
   - Removed "View Report" button (report now a tab)
   - Added inline progress bars and invocation messages
   - Shows subworkflow link when `isSubworkflow` is true

2. **`WorkflowInvocationSummary.test.js` -> `WorkflowInvocationOverview.test.js`**
   - Updated to match renamed component
   - Added `jobStatesSummary` to props, `createTestingPinia`

3. **`client/src/components/Workflow/constants.js` -> `constants.ts`**
   - Converted to TypeScript with typed parameters

### Significantly Modified Files

4. **`client/src/components/WorkflowInvocationState/WorkflowInvocationState.vue`** (262 additions, 128 deletions)
   - **Rewritten from Options API to Composition API (`<script setup>`)**
   - Added full-page header with workflow name, history link, edit/run/rerun buttons
   - Added tabbed interface: Overview, Steps, Inputs, Outputs, Report, Export, Metrics, Debug (originally was: Overview, Parameters/Inputs/Outputs, Report, Export)
   - Report tab is lazy-loaded and disabled until invocation is successful
   - Added `isFullPage`, `isSubworkflow` props
   - Polling logic preserved but rewritten with composition API refs/watchers

5. **`client/src/components/WorkflowInvocationState/WorkflowInvocationState.test.ts`** (135 additions, 32 deletions)
   - Rewrote tests to mock invocation store directly (instead of computed overrides)
   - Added tests for terminal/non-terminal states, Report tab disabled state
   - Added assertions for fetch call counts

6. **`client/src/components/Workflow/Editor/Node.vue`** (45 additions, 5 deletions)
   - Added `isInvocation` prop
   - Added `invocationStep` computed (casts step to `GraphStep`)
   - Dynamic `headerClass` computed (state-based colors for invocation mode)
   - Shows `NodeInvocationText` inside node body when in invocation mode
   - Hides rule divider, makes inputs/outputs "blank" (invisible labels) in invocation mode
   - Shows header icon (spinner for running, check for ok, etc.)

7. **`client/src/components/Workflow/Editor/WorkflowGraph.vue`** (14 additions, 2 deletions)
   - Added `isInvocation` prop, passes it to `Node`
   - **[CHANGED]** Canvas height now controlled by `fixedHeight` prop (number in vh units) instead of hardcoded `60vh` conditional on `isInvocation`

8. **`client/src/components/Panels/FlexPanel.vue`** (47 additions, 18 deletions)
   - Converted props from Options API to TypeScript interface
   - Made `minWidth`, `maxWidth`, `defaultWidth` configurable via props (were hardcoded constants)
   - Added watchers to clamp panel width when min/max change

9. **`client/src/components/WorkflowInvocationState/WorkflowInvocationStep.vue`** (66 additions, 10 deletions)
   - Added `graphStep`, `expanded`, `showingJobId`, `inGraphView` props
   - `computedExpanded`: supports both local state and external control (v-model pattern)
   - Shows graph step header icon and state-based header class
   - Auto-opens output details and job details in graph view
   - Emits `show-job` event for job selection

10. **`client/src/components/WorkflowInvocationState/JobStep.vue`** (69 additions, 4 deletions)
    - Added `invocationGraph` and `showingJobId` props
    - In graph mode: row click emits `row-clicked` instead of toggling inline details
    - Added eye icon column to indicate which job is being viewed
    - Added hover/selected row styling

11. **`client/src/components/Workflow/InvocationsList.vue`** -- **[FILE REMOVED]** (70 additions, 14 deletions at PR time)
    - This file no longer exists in the codebase
    - Replaced by: `client/src/components/Panels/InvocationsPanel.vue`, `client/src/components/Workflow/Invocation/InvocationScrollList.vue`, `client/src/components/Workflow/StoredWorkflowInvocations.vue`, `client/src/components/Workflow/HistoryInvocations.vue`

12. **`client/src/components/Workflow/Run/WorkflowRunSuccess.vue`** (17 additions, 7 deletions)
    - Changed links from `<a>` to `<router-link>` to prevent page reload
    - Replaced `href`-based history switch with `setCurrentHistory` store action
    - Added link to Invocations List
    - Passes `full-page` prop to `WorkflowInvocationState`

### Backend Changes

13. **`lib/galaxy/model/__init__.py`** (1 addition)
    - Added `implicit_collection_jobs_id` to invocation step `to_dict()` output

14. **`lib/galaxy/schema/invocation.py`** (15 additions)
    - Added `implicit_collection_jobs_id` field to `InvocationStep` model
    - Fixed `id` field descriptions in `InvocationStepJobsResponseJobModel` and `InvocationStepJobsResponseCollectionJobsModel` (were incorrectly saying "workflow invocation" instead of "job"/"collection job")

### API / Type Changes

15. **`client/src/api/invocations.ts`** - Added `StepJobSummary` union type. **[CHANGED]** `stepJobsSummaryFetcher` no longer exists in this file or anywhere in the codebase.
16. **`client/src/api/schema/schema.ts`** - Added `implicit_collection_jobs_id` to schema, fixed ID descriptions
17. **`client/src/api/workflows.ts`** - Added `StoredWorkflowDetailed` type export
18. **`client/src/stores/workflowStore.ts`** - **[CHANGED]** No `Workflow` interface exists in this file. The store now uses `StoredWorkflowDetailed` from `@/api/workflows` directly. Version handling is done via `getFullWorkflowCached(workflowId, version?)` and `uniqueIdAndVersionKey` pattern.

### Minor Changes

19. **`client/src/components/Common/Heading.vue`** - Added `truncate` prop, icon imports, default for `size`/`icon`
20. **`client/src/components/History/SwitchToHistoryLink.vue`** - Moved tooltip to `<BLink>`, made noninteractive
21. **`client/src/components/Workflow/Editor/NodeInput.vue`** - Added `blank` prop to hide label text
22. **`client/src/components/Workflow/Editor/NodeOutput.vue`** - Added `blank` prop to hide output details/tooltips
23. **`client/src/components/Workflow/workflows.services.ts`** - `getWorkflowFull` now accepts optional `version` param
24. **`client/src/style/scss/base.scss`** - Added `.node-header-invocation` styles with state-based background colors
25. **`client/src/utils/navigation/navigation.yml`** - Added `hide_invocation_graph` selector **[REMOVED]** -- this selector no longer exists; `invocation_tab` uses CSS selector `.nav-item[title="${label}"] > a.nav-link`; `invocation_details_tab` still uses XPath
26. **`client/src/utils/navigation/schema.ts`** - Added `hide_invocation_graph` to schema type **[REMOVED]** -- no longer present in schema
27. **`client/src/entry/analysis/router.js`** - Route for `/workflows/invocations/:invocationId` now passes `isFullPage: true`

### Selenium Test

28. **`lib/galaxy_test/selenium/test_workflow_invocation_details.py`** - Updated to new tab structure. **[CHANGED]** Now uses `invocation_tab(label="Steps")` and `invocation_tab(label="Inputs")` directly (not "Overview + hide graph"). Added second test `test_invocation_step_jobs_with_failed_jobs` covering Debug tab. Now 142 lines.

## Cross-Reference: PR Paths vs Current Codebase

| PR Path | Status in Current Codebase | Notes |
|---------|---------------------------|-------|
| `client/src/api/invocations.ts` | EXISTS | `StepJobSummary` still present; **`stepJobsSummaryFetcher` NO LONGER EXISTS** |
| `client/src/api/schema/schema.ts` | EXISTS | Auto-generated; `implicit_collection_jobs_id` present |
| `client/src/api/workflows.ts` | EXISTS | `StoredWorkflowDetailed` present, now also exports more types |
| `client/src/components/Common/Heading.vue` | EXISTS | |
| `client/src/components/History/SwitchToHistoryLink.vue` | EXISTS | |
| `client/src/components/Panels/FlexPanel.vue` | EXISTS | |
| `client/src/components/Workflow/Editor/Node.vue` | EXISTS | |
| `client/src/components/Workflow/Editor/NodeInput.vue` | EXISTS | |
| `client/src/components/Workflow/Editor/NodeInvocationText.vue` | EXISTS | Now ~73 lines (was 39). Added `InvocationStepStateDisplay`, color input, boolean checkbox display. |
| `client/src/components/Workflow/Editor/NodeOutput.vue` | EXISTS | |
| `client/src/components/Workflow/Editor/WorkflowGraph.vue` | EXISTS | |
| `client/src/components/Workflow/Invocation/Graph/InvocationGraph.vue` | EXISTS | Significantly refactored: no longer uses FlexPanel or WorkflowInvocationSteps; step details shown in card below graph |
| `client/src/components/Workflow/Invocation/Graph/WorkflowInvocationSteps.vue` | EXISTS | No longer used by InvocationGraph.vue; now used directly by WorkflowInvocationState.vue as "Steps" tab content |
| `client/src/components/Workflow/InvocationsList.vue` | **REMOVED** | Replaced by `client/src/components/Panels/InvocationsPanel.vue`, `client/src/components/Workflow/Invocation/InvocationScrollList.vue`, `client/src/components/Workflow/StoredWorkflowInvocations.vue`, `client/src/components/Workflow/HistoryInvocations.vue`. |
| `client/src/components/Workflow/Run/WorkflowRunSuccess.vue` | EXISTS | |
| `client/src/components/Workflow/constants.ts` | EXISTS | `isWorkflowInput` still present |
| `client/src/components/Workflow/workflows.services.ts` | EXISTS | `getWorkflowFull(id, version?)` signature preserved |
| `client/src/components/WorkflowInvocationState/JobStep.test.js` | **RENAMED** to `JobStep.test.ts` | Converted from JS to TS |
| `client/src/components/WorkflowInvocationState/JobStep.vue` | EXISTS | |
| `client/src/components/WorkflowInvocationState/WorkflowInvocationDetails.vue` | **DELETED** (as intended) | Was deleted in this PR, remains deleted |
| `client/src/components/WorkflowInvocationState/WorkflowInvocationInputOutputTabs.vue` | EXISTS | |
| `client/src/components/WorkflowInvocationState/WorkflowInvocationOverview.test.js` | EXISTS | |
| `client/src/components/WorkflowInvocationState/WorkflowInvocationOverview.vue` | EXISTS | Still contains `InvocationGraph`, `isFullPage`, `isSubworkflow`. Now also uses `useWorkflowInstance` composable, `SubworkflowAlert`, `WorkflowInvocationError`. |
| `client/src/components/WorkflowInvocationState/WorkflowInvocationState.test.ts` | EXISTS | |
| `client/src/components/WorkflowInvocationState/WorkflowInvocationState.vue` | EXISTS | Composition API preserved; uses `BNav` pills. Tabs now: Overview, Steps, Inputs, Outputs, Report, Export, Metrics, Debug (expanded from original 4). |
| `client/src/components/WorkflowInvocationState/WorkflowInvocationStep.vue` | EXISTS | |
| `client/src/composables/useInvocationGraph.ts` | EXISTS | `GraphStep`, `iconClasses`, `useInvocationGraph`, `statePlaceholders`, `getHeaderClass` exported. Now ~367 lines. Receives `stepsJobsSummary` as param instead of fetching internally. |
| `client/src/entry/analysis/router.js` | EXISTS | Invocation routes restructured; now has `/workflows/invocations/:invocationId/:tab?` |
| `client/src/stores/workflowStore.ts` | EXISTS | No `Workflow` interface; uses `StoredWorkflowDetailed` from `@/api/workflows`. Version handling via `getFullWorkflowCached(workflowId, version?)` and `uniqueIdAndVersionKey`. |
| `client/src/style/scss/base.scss` | EXISTS | `.node-header-invocation` styles still present |
| `client/src/utils/navigation/navigation.yml` | EXISTS | `hide_invocation_graph` selector **REMOVED** in later changes; invocation selectors significantly restructured |
| `client/src/utils/navigation/schema.ts` | EXISTS | `hide_invocation_graph` **REMOVED** from schema type |
| `lib/galaxy/model/__init__.py` | EXISTS | `implicit_collection_jobs_id` still included in `to_dict` |
| `lib/galaxy/schema/invocation.py` | EXISTS | `implicit_collection_jobs_id` field still present on `InvocationStep` |
| `lib/galaxy_test/selenium/test_workflow_invocation_details.py` | EXISTS | **Partially reverted**: uses `label="Steps"` instead of `label="Overview"` + hide graph; test now 142 lines (was ~50 in PR). Significantly expanded since PR merge. |

## Architecture & Design Decisions

### 1. Reuse of Workflow Editor Canvas
The invocation graph reuses the existing `WorkflowGraph.vue` component in readonly mode. Node components (`Node.vue`, `NodeInput.vue`, `NodeOutput.vue`) received `isInvocation`/`blank` props to conditionally hide editor-specific UI (labels, drag handles, tooltips) and show invocation-specific UI (state colors, job counts, state icons).

### 2. Scoped Workflow Stores
Each invocation graph gets its own scoped store via `provideScopedWorkflowStores(storeId)` where `storeId = "invocation-{invocationId}"`. This prevents conflicts between the graph view and any open workflow editor.

### 3. Polling Architecture
The graph polls `step_jobs_summary` API every 3 seconds until the invocation reaches a terminal state. The component handles `onUnmounted` cleanup of poll timeouts.

### 4. State Derivation Logic
Job states are mapped to graph step states using priority logic:
- **Single-instance states** (error, running, paused): If any job is in this state, the step gets this state
- **All-instance states** (deleted, skipped, new, queued): All jobs must be in this state for the step to get it
- Falls back to `populated_state` from the invocation step summary

### 5. Version-Aware Workflow Loading
The graph loads the specific workflow version that was run (not the latest), ensuring the graph matches the actual execution topology.

### 6. Component Restructuring
- `WorkflowInvocationState.vue` was rewritten from Options API to Composition API
- `WorkflowInvocationDetails.vue` was split: its tab content became `WorkflowInvocationInputOutputTabs.vue`, and its steps view was replaced by the graph
- "Summary" tab renamed to "Overview"
- "Report" became a top-level tab (lazy-loaded, disabled until success)

## Review Discussion

### @davelopez (Review Comment)
Recommended importing API models from `@/api` modules (e.g., `@/api/invocations`) instead of using `components["schemas"]` directly. Benefits: better readability, single point of update if backend model names change. **Resolved**: Author updated imports.

### @ElectronicBlueberry (Review Comment + Approval)
Suggested using `Record<string, boolean>` for `headerClass` computed property instead of string concatenation. This simplifies the conditional class logic significantly. **Resolved**: Author adopted the suggestion (with correction from `Record<string, number>` to `Record<string, boolean>`).

### @ElectronicBlueberry (Approval)
Approved the PR.

### @dannon (Approval + Merge)
Approved and merged. Also contributed a commit fixing `Heading` component imports and default props.

### @mvdbeek (Approval)
Enthusiastic approval: "This is so cool, I've been wanting something like this ever since I ran my first workflow on Galaxy!"

## Post-Merge Evolution

Since merge, several aspects have changed:

1. **InvocationsList.vue was removed entirely** -- replaced by `client/src/components/Panels/InvocationsPanel.vue`, `client/src/components/Workflow/Invocation/InvocationScrollList.vue`, `client/src/components/Workflow/StoredWorkflowInvocations.vue`, `client/src/components/Workflow/HistoryInvocations.vue`
2. **Selenium navigation selectors restructured** -- `hide_invocation_graph` removed; `invocation_tab` uses CSS selector; `invocation_details_tab` still uses XPath
3. **Selenium test significantly expanded** -- from ~50 lines to 142 lines; tabs accessed directly (Steps, Inputs, Debug), not via "Overview + hide graph"
4. **WorkflowInvocationState.vue further evolved** -- now uses `BNav` pills for full-page view instead of `BTabs`; routing supports tab parameter (`/workflows/invocations/:invocationId/:tab?`); expanded from 4 tabs to 8 tabs (Overview, Steps, Inputs, Outputs, Report, Export, Metrics, Debug)
5. **JobStep.test.js renamed to .ts** -- converted to TypeScript
6. **Workflow interface removed from workflowStore.ts** -- store now uses `StoredWorkflowDetailed` from `@/api/workflows` directly; version handling via `getFullWorkflowCached(workflowId, version?)` and `uniqueIdAndVersionKey` pattern
7. **`stepJobsSummaryFetcher` removed** -- `useInvocationGraph` composable no longer fetches job summaries internally; receives `stepsJobsSummary` as a Ref parameter from the parent component
8. **InvocationGraph.vue significantly refactored** -- FlexPanel side panel layout removed; WorkflowInvocationSteps no longer used within InvocationGraph; step details now shown in a card below the graph
9. **WorkflowInvocationSteps.vue moved to separate tab** -- now used by WorkflowInvocationState.vue as the "Steps" tab content, not inside InvocationGraph
10. **Many new components added** to `WorkflowInvocationState/` directory: `InvocationStepStateDisplay.vue`, `JobStepJobs.vue`, `SubworkflowAlert.vue`, `TabsDisabledAlert.vue`, `WorkflowInvocationError.vue`, `WorkflowInvocationFeedback.vue`, `WorkflowInvocationExportOptions.vue`, `WorkflowInvocationInputs.vue`, `WorkflowInvocationOutputs.vue`, `WorkflowInvocationMetrics.vue`, `WorkflowInvocationShare.vue`, `WorkflowInvocationStepHeader.vue`, `WorkflowStepIcon.vue`, `WorkflowStepTitle.vue`
11. **`useWorkflowInstance` composable added** -- used by `WorkflowInvocationOverview.vue` and `WorkflowInvocationSteps.vue` for workflow fetching (at `client/src/composables/useWorkflowInstance.ts`)

## Unresolved Questions / Areas Needing Attention

- ~~The `Workflow` interface originally in `workflowStore.ts` may have been restructured -- where does the canonical `version` field live now?~~ **RESOLVED**: No `Workflow` interface. Store uses `StoredWorkflowDetailed` from `@/api/workflows` which includes `version`. Version-aware caching via `getFullWorkflowCached(workflowId, version?)`.
- ~~`InvocationsList.vue` was completely replaced~~ **RESOLVED**: Replaced by `InvocationsPanel.vue`, `InvocationScrollList.vue`, `StoredWorkflowInvocations.vue`, `HistoryInvocations.vue`.
- ~~The selenium test was partially reverted to use `label="Steps"` -- is the "Steps" tab now separate from the "Overview" tab again, or is this a different iteration?~~ **RESOLVED**: Yes, "Steps" is now a separate top-level tab in `WorkflowInvocationState.vue`'s `BNav` pills. The tab structure expanded from 4 to 8 tabs. Steps tab renders `WorkflowInvocationSteps.vue` directly.
- The PR contained several TODO comments in `useInvocationGraph.ts` (subworkflow state derivation, layout graph, input step states) -- **STILL UNRESOLVED**: 5 TODOs remain at lines 172, 227, 250, 323, 328.
- ~~The `hide_invocation_graph` navigation selector was removed -- does the hide/show graph feature still exist in the UI, just with different test selectors?~~ **RESOLVED**: The hide/show graph toggle feature was removed entirely. The graph is always visible on the Overview tab (for non-subworkflow invocations).

## Verification Notes

*Verified 2026-02-11 against codebase at `/Users/jxc755/projects/worktrees/galaxy/branch/uv_lock` (branch: `fix_package_tests`)*

### File Path Verification (All paths from document)

| File Path | Exists? | Notes |
|-----------|---------|-------|
| `client/src/api/invocations.ts` | YES | `StepJobSummary` export confirmed; `stepJobsSummaryFetcher` **no longer exists** |
| `client/src/api/schema/schema.ts` | YES | |
| `client/src/api/workflows.ts` | YES | `StoredWorkflowDetailed` confirmed, plus `WorkflowStepTyped`, `AnyWorkflow`, etc. |
| `client/src/components/Common/Heading.vue` | YES | |
| `client/src/components/History/SwitchToHistoryLink.vue` | YES | |
| `client/src/components/Panels/FlexPanel.vue` | YES | |
| `client/src/components/Workflow/Editor/Node.vue` | YES | `isInvocation` prop confirmed |
| `client/src/components/Workflow/Editor/NodeInput.vue` | YES | `blank` prop confirmed |
| `client/src/components/Workflow/Editor/NodeInvocationText.vue` | YES | Now 73 lines (was 39) |
| `client/src/components/Workflow/Editor/NodeOutput.vue` | YES | `blank` prop confirmed |
| `client/src/components/Workflow/Editor/WorkflowGraph.vue` | YES | `isInvocation` and `fixedHeight` props confirmed |
| `client/src/components/Workflow/Invocation/Graph/InvocationGraph.vue` | YES | Now 311 lines (was 349). No FlexPanel, no WorkflowInvocationSteps import. |
| `client/src/components/Workflow/Invocation/Graph/WorkflowInvocationSteps.vue` | YES | Now 102 lines (was 131) |
| `client/src/components/Workflow/InvocationsList.vue` | **NO** | File removed |
| `client/src/components/Workflow/Run/WorkflowRunSuccess.vue` | YES | |
| `client/src/components/Workflow/constants.ts` | YES | `isWorkflowInput` confirmed |
| `client/src/components/Workflow/workflows.services.ts` | YES | `getWorkflowFull(id, version?)` confirmed |
| `client/src/components/WorkflowInvocationState/JobStep.test.js` | **NO** | Renamed to `JobStep.test.ts` |
| `client/src/components/WorkflowInvocationState/JobStep.test.ts` | YES | |
| `client/src/components/WorkflowInvocationState/JobStep.vue` | YES | |
| `client/src/components/WorkflowInvocationState/WorkflowInvocationDetails.vue` | **NO** | Deleted as intended by PR |
| `client/src/components/WorkflowInvocationState/WorkflowInvocationInputOutputTabs.vue` | YES | |
| `client/src/components/WorkflowInvocationState/WorkflowInvocationOverview.test.js` | YES | |
| `client/src/components/WorkflowInvocationState/WorkflowInvocationOverview.vue` | YES | |
| `client/src/components/WorkflowInvocationState/WorkflowInvocationState.test.ts` | YES | |
| `client/src/components/WorkflowInvocationState/WorkflowInvocationState.vue` | YES | |
| `client/src/components/WorkflowInvocationState/WorkflowInvocationStep.vue` | YES | |
| `client/src/composables/useInvocationGraph.ts` | YES | Now 367 lines (was 267) |
| `client/src/entry/analysis/router.js` | YES | Route `/workflows/invocations/:invocationId/:tab?` confirmed with `isFullPage: true` |
| `client/src/stores/workflowStore.ts` | YES | No `Workflow` interface; uses `StoredWorkflowDetailed` |
| `client/src/style/scss/base.scss` | YES | `.node-header-invocation` at line 195 confirmed |
| `client/src/utils/navigation/navigation.yml` | YES | `hide_invocation_graph` NOT present |
| `client/src/utils/navigation/schema.ts` | YES | `hide_invocation_graph` NOT present |
| `lib/galaxy/model/__init__.py` | YES | `implicit_collection_jobs_id` in `to_dict` at line 9813 |
| `lib/galaxy/schema/invocation.py` | YES | `implicit_collection_jobs_id` field at line 428 |
| `lib/galaxy_test/selenium/test_workflow_invocation_details.py` | YES | 142 lines. Uses `label="Steps"`, `label="Inputs"`, `label="Debug"` |

### Component/Composable Verification

| Name | Status | Location |
|------|--------|----------|
| `useInvocationGraph` | EXISTS | `client/src/composables/useInvocationGraph.ts` -- signature changed: now takes `stepsJobsSummary` as Ref param |
| `GraphStep` interface | EXISTS | `client/src/composables/useInvocationGraph.ts` line 26 |
| `iconClasses` | EXISTS | `client/src/composables/useInvocationGraph.ts` line 51 |
| `statePlaceholders` | EXISTS | `client/src/composables/useInvocationGraph.ts` line 63 (not in original PR description) |
| `getHeaderClass` | EXISTS | `client/src/composables/useInvocationGraph.ts` line 361 (not in original PR description) |
| `provideScopedWorkflowStores` | EXISTS | `client/src/composables/workflowStores.ts` |
| `fromSimple` | EXISTS | `client/src/components/Workflow/Editor/modules/model` (imported by useInvocationGraph) |
| `InvocationGraph` component | EXISTS | `client/src/components/Workflow/Invocation/Graph/InvocationGraph.vue` |
| `WorkflowInvocationSteps` component | EXISTS | `client/src/components/Workflow/Invocation/Graph/WorkflowInvocationSteps.vue` |
| `NodeInvocationText` component | EXISTS | `client/src/components/Workflow/Editor/NodeInvocationText.vue` |
| `WorkflowInvocationState` component | EXISTS | `client/src/components/WorkflowInvocationState/WorkflowInvocationState.vue` |
| `WorkflowInvocationOverview` component | EXISTS | `client/src/components/WorkflowInvocationState/WorkflowInvocationOverview.vue` |
| `WorkflowInvocationStep` component | EXISTS | `client/src/components/WorkflowInvocationState/WorkflowInvocationStep.vue` |
| `WorkflowInvocationInputOutputTabs` component | EXISTS | `client/src/components/WorkflowInvocationState/WorkflowInvocationInputOutputTabs.vue` |
| `JobStep` component | EXISTS | `client/src/components/WorkflowInvocationState/JobStep.vue` |
| `stepJobsSummaryFetcher` | **REMOVED** | No longer exists anywhere in codebase |
| `StepJobSummary` type | EXISTS | `client/src/api/invocations.ts` line 16 |
| `useWorkflowInstance` composable | EXISTS | `client/src/composables/useWorkflowInstance.ts` (new since PR, used by Overview and Steps) |

### Store Verification

| Store | Status | Location |
|-------|--------|----------|
| `workflowStore` | EXISTS | `client/src/stores/workflowStore.ts` -- no `Workflow` interface; uses `StoredWorkflowDetailed` |
| `invocationStore` | EXISTS | `client/src/stores/invocationStore.ts` |
| `workflowEditorStateStore` | EXISTS | Used via `useWorkflowStateStore(storeId)` in InvocationGraph.vue |

### Route Verification

| Route | Status |
|-------|--------|
| `/workflows/invocations/:invocationId/:tab?` | EXISTS -- `router.js` line 802, passes `isFullPage: true`, `tab`, `success` |
| `/workflows/:storedWorkflowId/invocations` | EXISTS -- line 879, uses `StoredWorkflowInvocations` |
| `/histories/:historyId/invocations` | EXISTS -- line 420, uses `HistoryInvocations` |

### Discrepancies Found and Corrected

1. **`stepJobsSummaryFetcher`**: Document stated it "still exists" in `api/invocations.ts` -- it does NOT. The composable now receives job summaries as a parameter.
2. **InvocationGraph.vue layout**: Document described "side-by-side layout with FlexPanel" -- FlexPanel is no longer used by InvocationGraph; step details shown in card below graph.
3. **WorkflowInvocationSteps.vue usage**: Document described it as listing steps "in the side panel" -- it's now a standalone Steps tab, not part of InvocationGraph.
4. **Hide/show graph toggle**: Document mentioned this feature -- it has been completely removed.
5. **Tab structure**: Document listed 4 tabs (Overview, Parameters/Inputs/Outputs, Report, Export) -- now 8 tabs (Overview, Steps, Inputs, Outputs, Report, Export, Metrics, Debug).
6. **`Workflow` interface in workflowStore**: Document said "Added `version` field to `Workflow` interface" -- no `Workflow` interface exists; store uses `StoredWorkflowDetailed` directly.
7. **NodeInvocationText.vue size**: Document said 39 lines -- now 73 lines with significant additions.
8. **useInvocationGraph.ts exports**: Document listed 3 exports (`storeId`, `steps`, `loadInvocationGraph`) -- actually exports 4 (`storeId`, `steps`, `loadInvocationGraph`, `loading`). Module also exports `statePlaceholders`, `getHeaderClass`, `iconClasses`, `GraphStep`.
9. **Selenium test**: Document said "Steps accessed via Overview tab + hide graph" -- test now accesses Steps directly via `invocation_tab(label="Steps")`.
10. **New components not in document**: 14+ new files added to `WorkflowInvocationState/` directory since the PR (see Post-Merge Evolution item 10).
