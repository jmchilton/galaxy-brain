# Component - Workflow Graph Canvas and Layout

Document the shared workflow canvas used by the editor and the invocation graph: `client/src/components/Workflow/Editor/WorkflowGraph.vue` (absolutely positioned DOM nodes under one CSS transform, scoped stores via `useWorkflowStores`), how node positions are stored (`workflowStepStore`, `stepPositions`) and how node size is measured from the DOM (`useNodePosition`), the ELK-based `autoLayout` in `Editor/modules/layout.ts` (inputs, spacing constants, what it overwrites, comments/frames handling), `fitWorkflow` and the d3 zoom/pan wiring (`useD3Zoom`, `useViewportBoundingBox`, `ZoomControl`), the minimap (`WorkflowMinimap`, `canvasDraw.ts`), connection rendering (`SVGConnection`, `connectionPath.ts`) and how all of these respond to variable node sizes and to extra, non-step canvas content. Note the readonly/invocation-mode differences and the existing tests (`layout.test.ts`, `canvasDraw.test.ts`, E2E editor tests that depend on positions).

Leave out terminal/connection compatibility rules (see [[Component - Workflow Editor Terminals]]), comments data model (see [[Component - Workflow Comments]]) and the generic ELK `components/Graph/` history graph (see [[PR 21932 - History Graph API]]), except for a short comparison of the two layout paths.

## Why

Putting large embedded output nodes into the invocation graph needs a local, order-preserving nudge instead of the full auto-layout, and a refit and minimap story for non-step content. No vault note covers the editor canvas, node sizing or `autoLayout`; the invocation graph note only touches them in passing.

## Requested by

- vault/repositories/galaxy/branches/active/invocation_graph_embedded_workflow_outputs/index.md: needed how node size/position are measured and stored, what `autoLayout` does and why it must not run, and how fit/minimap handle extra canvas content.
