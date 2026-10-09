# Workflow toolbar store review — iteration 04

Selected originator: `client/src/stores/workflowEditorToolbarStore.test.ts`.

Read the loop instructions and client testing guidance, then inspected the scoped toolbar store and searched client tests for its input-catcher event API.

The original one case and five assertions remain. Its name now describes event delivery to matching listeners in emission order. Repeated registration callbacks become a short loop over the same four explicit event types. A descriptive `event` parameter replaces `e`. Store initialization reuses `setupTestPinia()` from the existing store test utilities rather than duplicating Pinia creation.

The action sequence is unchanged: pointerdown at `[100, 200]`, then pointermove, pointerup, and temporarilyDisabled at `[0, 0]`. The first-event count stays asserted before later emissions. All four event assertions now compare the complete event object: the original first position and later event types remain checked, with the first type and later positions checked as well. Keeping this sequence together retains its event ordering and listener-routing evidence instead of treating stateful deliveries as unrelated input/output cases.

Reuse search: `setupTestPinia()` already serves other store suites. No other client unit test uses `emitInputCatcherEvent()` or `InputCatcherEvent`; a new shared event-bus arrangement has no concrete second consumer and would hide this small setup.

Validation: the selected toolbar case passes; the final ZIP/toolbar run passes both suites and all 10 cases. Scoped ESLint and Prettier pass. Root handles full type-check and combined iteration checks.

Guidance: no addition. Existing helper reuse and scenario guidance suffice. Full event equality is a direct assertion improvement, not a new principle worth adding to the README. No unresolved reuse opportunity is deferred.
