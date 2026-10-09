# Workflow undo/redo actions — iteration 05

Selected originator: `client/src/components/Workflow/Editor/Actions/actions.test.ts`.

All 24 action cases remain. Their common helper still checks that applying an action changes the complete selected snapshot, undo restores the original snapshot, and redo restores the applied snapshot. This preserves 72 executed snapshot assertions plus the two direct checks (empty initial comments and the canvas callback count). All selected store keys, workflow state, action constructor inputs, selection setup, comment/step fixtures, and AddCommentAction's external insertion callback remain intact.

Case names now state each action's behavior; the outer suite supplies the undo/redo context. Each case gets fresh Pinia and fresh store references instead of retaining a suite-level Pinia and resetting reused stores. Teardown clears pending lazy work, disposes the five workflow stores, clears timers, and restores real timers. The multi-move scenario validates its existing fixture positions with `ensureDefined` instead of casting the step list to `any`.

Reuse search found `@/utils/toRawDeep`, already used by the production action modules, implements the same nested proxy unwrapping required by these plain-object/array snapshots. `toRawDeep` replaces the local handwritten recursive helper and its `any`; `cloneRaw` creates the final independent snapshot. No snapshot keys were removed. Existing `mockWorkflow`, `mockToolStep`, and comment factories remain shared through `Actions/mockData.ts`; `setupTestPinia` replaces another local setup implementation. Searches found no second consumer of this action-specific store-key snapshot, so it stays local. No supporting files or new abstractions were required.

Validation: 24 cases pass after the final snapshot change; all seven assigned suites pass together (77 cases), scoped ESLint and Prettier pass. No README addition: isolated Pinia, visible scenarios, and reuse of existing helpers are already documented.
