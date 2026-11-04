# Component - Workflow Editor Step Store, Undo Actions and Save Payload

Document how the workflow editor client holds and persists step metadata: `client/src/stores/workflowStepStore.ts` (`Step`/`NewStep` types, `getStep`, `updateStep`, `addStep`, how a step from the server's editor dict is normalized), the undo/redo stack (`undoRedoStore`, `Editor/Actions/stepActions.ts` with `UpdateStepAction`, `SetDataAction` and its partial-diff `fromPartial`/`toPartial` contract, `workflowActions.ts`), the node components that trigger step edits (`Node.vue`, `NodeOutput.vue`, `NodeInspector`, `Forms/`), and how the store becomes the save payload (`Editor/Index.vue` save path, `modules/` serialization, `workflowStores`/`useWorkflowStores` scoping, change tracking and the "unsaved changes" state). Cover which step keys are persisted by the save payload, which are dropped on the way, how read-only/invocation mode suppresses editing, and how the editor tests and navigation selectors (`workflow_editor.node.*`, `Node.test.ts`, `NodeOutput.test.ts`) exercise them. Compare briefly with the persisted-refactor plan in `vault/projects/wf_refactor_persistence/`.

Leave out terminal compatibility rules (see [[Component - Workflow Editor Terminals]]), comments (see [[Component - Workflow Comments]]) and canvas/layout (see the pending `workflow_graph_canvas_and_layout` request).

## Why

Adding an editor toggle that stores a new step key needed the `UpdateStepAction` contract, `NewStep` typing and the save payload path; the only vault coverage of `UpdateStepAction` is a single table row in `wf_refactor_persistence`, and the terminals note covers `NodeOutput.vue` only as a terminal.

## Requested by

- vault/repositories/galaxy/branches/active/invocation_graph_embedded_outputs/brain_research.md: needed how a step edit flows from a `NodeOutput.vue` toggle through `UpdateStepAction` and the step store into the saved workflow.
