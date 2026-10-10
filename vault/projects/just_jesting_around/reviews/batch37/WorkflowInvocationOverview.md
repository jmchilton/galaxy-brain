# WorkflowInvocationOverview

Selected originator: `client/src/components/WorkflowInvocationState/WorkflowInvocationOverview.test.js`. Baseline and final: **3 tests**.

The file-level `vi.mock("@/stores/workflowStore")` is gone. It spread a real store into a plain object and swapped in two mocks keyed on magic workflow IDs (`unowned-workflow`, `nonexistant-workflow`). Now `mountOverview({ storedWorkflow, fetchError })` builds a `createTestingPinia` and seeds `workflowsByInstanceId` through `initialState` under the fixture invocation's real `workflow_id`. Store actions stay stubbed, which is the same boundary as before: the old mock never ran the real fetch either. The not-found case falls out of the stubbed fetch, which loads nothing. The inaccessible case makes that spy reject once with the original message. The `withPlugins(localVue, pinia)` pattern follows `WorkflowInvocationShare.test.ts`. Two undeclared props, `invocationSchedulingTerminal` and `jobStatesSummary`, are dropped, and the misspelled "nonexistant" is gone with the magic IDs.

Preserved:
- The valid case shows the `workflow invocation graph`. The `data-description` is still asserted, now on `findComponent(InvocationGraph)`.
- Both alert cases hide the graph and contain their original messages. `findComponent(GAlert)` replaces the `g-alert-stub` tag selector.

Added:
- The graph receives the stored workflow, there's no alert, and nothing is fetched.
- The alert cases check their variant (`danger` or `info`) and that the fetch was requested for the invocation's `workflow_id`.

Reuse: `createTestingPinia` `initialState` (store id `workflowStore`), `withPlugins`, and the existing `Workflow/test/json/invocation.json`. `WorkflowInvocationState.test.ts` and `WorkflowInvocationShare.test.ts` belong to later lanes, and `WorkflowInvocationInputOutputTabs`/`WorkflowAnnotation` still use the spread-mock pattern. No shared helper: the seeding is two lines through `initialState`.

Validation: 3 tests pass, shuffled (seed `370101`). ESLint, Prettier and full client `vue-tsc --noEmit` pass.

Guidance: none.
