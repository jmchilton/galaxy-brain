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
github_pr: 20390
github_repo: galaxyproject/galaxy
---
# PR #20390 Research: Workflow Graph Search

## Metadata

| Field | Value |
|-------|-------|
| **Title** | Workflow Graph Search |
| **Author** | Laila Los (`ElectronicBlueberry`) |
| **Status** | Merged |
| **Merged** | 2025-06-10T17:52:02Z |
| **Merged By** | Marius van den Beek (`mvdbeek`) |
| **Base Branch** | `dev` |
| **Head Branch** | `workflow-search` |
| **Additions** | 568 |
| **Deletions** | 3 |
| **Labels** | `area/UI-UX`, `kind/feature`, `highlight` |
| **Closes** | #20341 (Search workflow graph) |
| **Commits** | 16 |

## High-Level Summary

Adds a **search activity panel** to the Galaxy workflow editor that lets users search across all elements in the workflow graph (steps, inputs, outputs, comments). Search results are displayed in a side panel list; clicking a result pans the canvas to center on that element and highlights it with a blinking green border animation.

Motivated by issue #20341: users with large workflows (25+ steps) had no way to locate specific steps/outputs by name.

## Architecture Overview

1. **Activity registration** -- new "Search" activity added to the workflow editor activity bar
2. **Scoped Pinia store** (`workflowSearchStore`) -- collects searchable data from steps/comments, performs fuzzy multi-keyword search with weighted scoring
3. **Side panel component** (`SearchPanel.vue`) -- wraps `DelayedInput` + result list inside `ActivityPanel`
4. **Canvas highlight component** (`AreaHighlight.vue`) -- positioned absolutely in the workflow graph, uses CSS blink animation
5. **Coordinate transform** -- converts screen-space DOM bounding rects to workflow-space coordinates using the `Transform` class from the geometry module

### Data Flow

```
User types query -> SearchPanel -> workflowSearchStore.searchWorkflow(query)
  -> collectSearchDataCached() -> iterates stepStore.steps + commentStore.comments
  -> DOM queries for bounding rects -> inverse canvas transform -> SearchData[]
  -> multi-keyword fuzzy match with weighted scoring -> sorted SearchResult[]

User clicks result -> emit('result-clicked', searchData)
  -> Index.vue.onSearchResultClicked -> WorkflowGraph.moveToAndHighlightRegion(bounds)
  -> d3Zoom.moveTo(center) + AreaHighlight.show(bounds)
```

## Detailed File-by-File Breakdown

### New Files (4)

#### 1. `client/src/stores/workflowSearchStore.ts` (267 lines)
Core search logic. A scoped Pinia store (`defineScopedStore`) keyed by workflow ID.

**Key exports:**
- `SearchData` -- discriminated union type with variants: `step`, `input`, `output`, `comment`
- `SearchResult` -- wraps `SearchData` with `matchedKeys`, `score`, `weightedScore`
- `useWorkflowSearchStore(workflowId)` -- factory function

**Search algorithm:**
- Splits query into space-separated lowercase parts
- Two match modes: **soft match** (substring `includes`) for `name`, `label`, `annotation`, `text`; **exact match** (`===`) for other fields like `type`, `stepType`, etc.
- Results must match ALL query parts (score >= queryParts.length)
- Weighted scoring: `toolId` = 10, `type` = 5, `name` = 2, others default to occurrence count or 1
- Caches collected search data keyed by `undoRedoStore.changeId`

**Coordinate transform:**
- Uses `getInverseCanvasTransform()` to convert DOM `getBoundingClientRect()` positions to workflow canvas coordinates
- Depends on `stateStore.position` and `stateStore.scale`

#### 2. `client/src/components/Panels/SearchPanel.vue` (112 lines)
UI panel for the search activity. Uses `DelayedInput` with 200ms delay, `ActivityPanel` wrapper, `FontAwesomeIcon` for result type icons, `GButton` for each result. Watches both `currentQuery` and `undoRedoStore.changeId` to re-run search on workflow changes. Emits `result-clicked` with `SearchData` payload.

**Keyword filtering:** Supports keywords `step`, `input`, `output`, `comment` to narrow results.

#### 3. `client/src/components/Workflow/Editor/AreaHighlight.vue` (83 lines)
Visual highlight overlay. CSS `@keyframes blink` animation (1s, step-end), green border. `show(area: Rectangle)` method exposed via `defineExpose`. Resets blink state with 100ms wait to retrigger animation on repeated clicks.

#### 4. `client/src/components/Workflow/Editor/modules/itemIcons.ts` (43 lines)
Icon mapping for search result types. Maps step subtypes (tool, data_input, etc.), input/output, and comment subtypes to FontAwesome 6 icons.

### Modified Files (8)

#### 5. `client/src/components/Workflow/Editor/Index.vue` (+8 lines)
- Imports/registers `SearchPanel`, adds to template via `isActiveSideBar('workflow-editor-search')`
- Adds `onSearchResultClicked` handler calling `workflowGraph.value.moveToAndHighlightRegion()`

#### 6. `client/src/components/Workflow/Editor/WorkflowGraph.vue` (+20/-1 lines)
- Imports `AreaHighlight` and `Rectangle` type
- Adds `watch` on `transform` to sync position to `stateStore.position`
- Adds `<AreaHighlight ref="areaHighlight" />` inside canvas div
- Exposes `moveToAndHighlightRegion(bounds: Rectangle)`

#### 7. `client/src/components/Workflow/Editor/modules/activities.ts` (+10/-1 lines)
- Adds search activity: `{ id: "workflow-editor-search", title: "Search", icon: faSearch, panel: true, visible: true }`

#### 8. `client/src/composables/workflowStores.ts` (+7 lines)
- Instantiates `searchStore` in both `provideScopedWorkflowStores()` and `useWorkflowStores()`

#### 9. `client/src/stores/undoRedoStore/index.ts` (+9/-1 lines)
- Adds `changeId` ref (monotonic counter for cache invalidation)

#### 10. `client/src/stores/workflowEditorStateStore.ts` (+3 lines)
- Adds `position` ref (`[number, number]`), synced from WorkflowGraph transform watcher

#### 11. `client/src/stores/workflowStepStore.ts` (+1 line)
- Adds optional `type?: "data"` to `DataOutput` interface

#### 12. `client/src/components/Workflow/Editor/modules/terminals.test.ts` (+3 lines)
- Adds `searchStore` to `useStores()` helper (required by updated composable)

## Cross-Reference to Current Codebase

All 12 files exist at original paths. **No files moved, renamed, or deleted.**

| PR File Path | Current Status | Post-PR Changes |
|---|---|---|
| `client/src/stores/workflowSearchStore.ts` | EXISTS, unchanged | Only original PR commit |
| `client/src/components/Panels/SearchPanel.vue` | EXISTS, minor formatting | Prettier reformatting |
| `client/src/components/Workflow/Editor/AreaHighlight.vue` | EXISTS, debug log removed | `1af60a25c0` removed `console.log` |
| `client/src/components/Workflow/Editor/modules/itemIcons.ts` | EXISTS, unchanged | Only original PR commits |
| `client/src/components/Workflow/Editor/Index.vue` | EXISTS, additional changes | Import standardization, SCSS fixes, type annotations |
| `client/src/components/Workflow/Editor/WorkflowGraph.vue` | EXISTS, additional changes | Running step animations (added then reverted), prettier |
| `client/src/components/Workflow/Editor/modules/activities.ts` | EXISTS | Unchanged from PR |
| `client/src/composables/workflowStores.ts` | EXISTS, additional changes | Store ref-counting disposal, prettier, auto-layout |
| `client/src/stores/undoRedoStore/index.ts` | EXISTS, minor changes | Prettier, best practice panel |
| `client/src/stores/workflowEditorStateStore.ts` | EXISTS | Unchanged from PR additions |
| `client/src/stores/workflowStepStore.ts` | EXISTS | Unchanged from PR addition |
| `client/src/components/Workflow/Editor/modules/terminals.test.ts` | EXISTS | Unchanged from PR addition |

### Key Dependencies (all present)

| Module | Path | Role |
|---|---|---|
| `defineScopedStore` | `client/src/stores/scopedStore.ts` | Store factory for workflow-scoped Pinia stores |
| `Transform` / `Rectangle` | `client/src/components/Workflow/Editor/modules/geometry.ts` | Coordinate math for canvas transform |
| `ActivityPanel` | `client/src/components/Panels/ActivityPanel.vue` | Side panel wrapper |
| `DelayedInput` | `client/src/components/Common/DelayedInput.vue` | Debounced text input |
| `GButton` | `client/src/components/BaseComponents/GButton.vue` | Button component |
| `useD3Zoom` | `client/src/components/Workflow/Editor/composables/d3Zoom.ts` | Canvas zoom/pan (provides `moveTo`) |

## Key Architectural Decisions

1. **Scoped store pattern** -- `defineScopedStore` keyed by workflow ID, ensuring search data isolation per workflow. A store scoping bug was fixed during review.

2. **DOM-based bounding rect collection** -- Bounds computed from live DOM via `getBoundingClientRect()` + inverse canvas transform. Pragmatic but couples search to rendered state.

3. **`changeId` for cache invalidation** -- Monotonic counter in undo/redo store avoids expensive DOM queries on every keystroke.

4. **Multi-keyword AND search** -- Query split on spaces; results must match ALL parts. Type keywords (`step`, `input`, `output`, `comment`) act as filters.

5. **Weighted scoring** -- `toolId: 10`, `type: 5`, `name: 2`. Results sorted by `weightedScore` desc.

6. **Separation of highlight from search** -- `AreaHighlight` is standalone in WorkflowGraph, reusable by other features.

## Review Discussion Summary

- **mvdbeek** noted original issue was about searching the invocation graph (job results), not just editor. Author proposed merging editor search first, then adapting for invocation view.
- **mvdbeek** found a **store scoping bug**: opening a second workflow showed results from the first. Fixed via `changeId` cache invalidation.
- PR merged without `kind/` label initially (bot flagged), later corrected to `kind/feature`.

## Tests

Minimal: only `terminals.test.ts` updated to include `searchStore` in `useStores()` helper. No dedicated unit tests for search algorithm or search store. PR marked for manual testing.

## Verification

**Date:** 2026-02-11
**Branch:** `fix_package_tests` (based on current `master`)
**Verified by:** Cross-reference audit of all file paths, exports, APIs, and data flow.

**Result: All references verified.** No substantive discrepancies found.

- All 12 PR file paths exist at their original locations.
- All 6 key dependency modules exist and serve the described roles (`defineScopedStore`, `Transform`/`Rectangle`, `ActivityPanel`, `DelayedInput`, `GButton`, `useD3Zoom` with `moveTo`).
- Line counts for the 4 new files match exactly: `workflowSearchStore.ts` (267), `SearchPanel.vue` (112), `AreaHighlight.vue` (83), `itemIcons.ts` (43).
- All described exports confirmed: `SearchData` (discriminated union with `step`/`input`/`output`/`comment` variants), `SearchResult` (with `matchedKeys`/`score`/`weightedScore`/`searchData`), `useWorkflowSearchStore`, `iconForType`, `getIconForSearchData`.
- Scoped store pattern via `defineScopedStore` confirmed. Weighted scoring (`toolId: 10`, `type: 5`, `name: 2`) confirmed. `changeId` cache invalidation confirmed.
- `searchStore` present in both `provideScopedWorkflowStores()` and `useWorkflowStores()` in `workflowStores.ts`, with post-PR addition of `useTimeoutStoreDispose` for disposal.
- `changeId` ref (monotonic counter via `watch` on undo stack length) confirmed in `undoRedoStore/index.ts`.
- `position` ref as `[number, number]` confirmed in `workflowEditorStateStore.ts`.
- `DataOutput.type?: "data"` confirmed in `workflowStepStore.ts`.
- Search activity registration confirmed in `activities.ts` with `id: "workflow-editor-search"`, `icon: faSearch`.
- `SearchPanel` integration in `Index.vue` confirmed: `isActiveSideBar('workflow-editor-search')`, `onSearchResultClicked` handler.
- `AreaHighlight` integration in `WorkflowGraph.vue` confirmed: `<AreaHighlight ref="areaHighlight" />`, `moveToAndHighlightRegion(bounds)` exposed.
- Data flow diagram verified end-to-end through code tracing.
- `terminals.test.ts` includes `searchStore` via `useWorkflowSearchStore` as described.

**Minor notes (no correction needed):**
- The `workflowStores.ts` post-PR changes now include `useTimeoutStoreDispose` and `onScopeDispose` cleanup logic (store lifetime management), accurately noted in the cross-reference table as "Store ref-counting disposal".
