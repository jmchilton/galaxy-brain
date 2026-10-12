# NotificationForm — batch 61 author review

Originator: `client/src/components/admin/Notifications/NotificationForm.test.ts`.

The original single case and all three assertions remain unchanged: submit presence, aria-disabled, and required-fields tooltip text. Both existing helpers and asynchronous waits remain. This is a submit-button smoke contract; it does not assert empty-field values or the successful submission flow. Existing mocked filter and server fallback behavior are retained.

Native inferred mount removes the object cast. withPlugins supplies the explicitly created testing Pinia through the supported global boundary; disposal is registered for test completion after wrapper cleanup. FontAwesomeIcon stubbing moves from ignored top-level options into global.stubs while retaining existing shared stubs. Auto-unmount makes cleanup failure-safe without modifying production code.

Validation: shuffled seed 610101 passes one case. Default V8 comparison retains all 1,447 covered statement/function/branch-arm locations across 345 files and adds three GCard unmount cleanup locations (its onBeforeUnmount handler and cancellation path). Separate pristine/final comparison explicitly includes the real shared GButton/GAlert implementations: two files/119 covered locations match exactly, zero added/lost. Baseline actual-UI coverage uses the unchanged notification test in the sibling schema worktree, so the final file is never temporarily restored. File ESLint/Prettier and explicit absolute-config repository hooks pass; integrated full types are owned by the driver. Evidence is `/private/tmp/readability61-notification-*`.

No shared helper, supporting test, dependency, README, or marginal-advice change. Existing guidance already covers native mounting and owned cleanup; no evidenced new guidance gap proposed.
