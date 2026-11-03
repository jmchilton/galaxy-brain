# Component - Invocation Graph View

Update the existing note `vault/research/Component - Invocation Graph View.md` (revised 2026-10-30), which says no Selenium/Playwright test touches the Overview graph canvas and that `navigation.yml` has no invocation-graph selectors beyond `workflow_editor.node.by_id`. Both are out of date: `lib/galaxy_test/selenium/test_workflow_invocation_graph.py` (class `TestWorkflowInvocationGraph`) exists and `client/src/utils/navigation/navigation.yml` has `invocations.graph_node_state`, `step_card*` and related selectors. Document that test file, its helpers (`_open_two_branches_invocation`, `_click_node`, `_wait_for_polling_to_stop`), the screenshots it takes, and the selectors, and correct the Test Coverage, E2E and Known Issues sections.

Also add: how step outputs reach the client (which `invocation` payload fields are populated for workflow inputs/outputs vs per-step `outputs`, and when `fetchInvocationStepById` is needed), and the node hover/popover surfaces already on `Node.vue` in invocation mode.

## Why

Output-preview work on the invocation graph needs to add E2E coverage and relied on this note, which would have sent an implementer to write a first-ever graph E2E test and new selectors from scratch.

## Requested by

- vault/repositories/galaxy/branches/active/invocation_graph_output_previews/index.md: needed accurate E2E test and selector coverage for the invocation graph, and the invocation-payload-versus-step-outputs data flow.
- vault/repositories/galaxy/branches/active/invocation_graph_embedded_workflow_outputs/index.md: stage 2 embeds workflow-output cards in the graph, so it also needs the `node-area` slot, `fitWorkflow(extraRectangles)` and the (non-)cooperation of the minimap, plus the new `InvocationEmbeddedOutputs` / `useEmbeddedOutputs` / `embeddedOutputLayout` surfaces once merged.
