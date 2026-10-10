# WorkflowInvocationInputOutputTabs

Selected originator: `client/src/components/WorkflowInvocationState/WorkflowInvocationInputOutputTabs.test.ts`. Baseline and final: **3 tests**.

The file-level `vi.mock("@/stores/workflowStore")` is gone. It spread a real store into a plain object and replaced the `getStoredWorkflowByInstanceId` getter and the `getFullWorkflowCached` action with mocks. Now `mountTabs(invocation, { tab, terminal, storedWorkflow })` seeds `workflowsByInstanceId` through `createTestingPinia` `initialState` under the fixture's real `workflow_id`, so the real getter runs. Only the non-terminal case reads the workflow store. It passes the stored workflow and serves `/api/workflows/workflow-id/download` with the full workflow, so the real `getFullWorkflowCached` and `getWorkflowFull` run too. Actions stay unstubbed, as before. Mounting uses `withPlugins(localVue, pinia)`, like WorkflowInvocationOverview.

The `/api/datasets/{id}` and `/api/dataset_collections/{id}` handlers and the `ContentItem` stub are removed. A probe showed the handlers never run: `GenericItem` mounts its providers only after IntersectionObserver reports it visible, which happy-dom never does. The coverage compare shows no loss.

Preserved:
- Inputs: the table exists, has one row per data input and parameter, each row's first cell is the label, and the parameter's value is in the second cell. The data input's `data-label` element is still asserted. The expected rows are named fixture entries (`DATA_INPUT`, `PARAMETER_INPUT`), not a loop over a re-spread object.
- Outputs, terminal and non-terminal: the section count, each label in order, the history item present only when terminal, and the loading alert present only when not terminal. `expectOutputSections` replaces `testOutputsDisplayed`.

Strengthened: the data input's `data-label` must be in the first row, not just somewhere in the wrapper.

Reuse: `createTestingPinia` `initialState` (store id `workflowStore`), `withPlugins`, `nth`, `http.untyped` for the untyped download endpoint (as in `WorkflowDisplay.test.js`), and the existing `Workflow/test/json/invocation.json`. No shared helper: the seeding is one `initialState` entry, and WorkflowAnnotation and WorkflowInvocationOverview need different stores and action stubbing.

Validation: 3 tests pass, shuffled (seed `380101`). ESLint, Prettier and full client `vue-tsc --noEmit` pass. Per-file coverage against the baseline: no lines or branches lost; `workflowStore.ts` and `workflows.services.ts` gain lines.

Guidance: none.
