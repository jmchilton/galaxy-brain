# WorkflowCardList

Selected originator: `client/src/components/Workflow/List/WorkflowCardList.test.ts`. Baseline and final: **2 tests**.

The two bare `{ id, name }` workflows (and their four id/name constants) become `FIRST_WORKFLOW` / `SECOND_WORKFLOW` built with the existing `getFakeWorkflowSummary` factory. The repeated `shallowMount(WorkflowCardList as object, …)` moves into `mountWorkflowCardList(workflows)`. The `as object` cast is gone, since a typed workflow list type-checks without it. `requestRename(wrapper, cardIndex, workflow)` replaces the emit-then-flush pairs. WorkflowCard and RenameModal stay stubbed by `shallowMount`, so the factory's extra fields are not rendered.

The second case used to emit the second workflow's `rename` from the *first* card. It now emits from the second card, so the scenario does what its name says.

Both cases and all their assertions are kept: the modal is absent before a rename, then present with the workflow's name; it is gone after close; and it shows the second name after reopening. The second case is strengthened in two ways. Closing the modal emits `refreshList` with `[true, true]`. Running the modal's `renameAction` calls the mocked `updateWorkflow` with the *second* workflow's id, the actual stale-state risk behind "does not retain"; asserting the first id fails. The `updateWorkflow` mock was previously unused.

Reuse: `getFakeWorkflowSummary` from `@tests/test-data/workflows`; no new helper.

Validation: 2 tests pass shuffled (seed `410101`, `NODE_OPTIONS=--no-webstorage`). ESLint, Prettier and full client vue-tsc pass. Per-file coverage: nothing lost; one more statement in `WorkflowCardList.vue` (the `renameAction` arrow).

Guidance: none.
