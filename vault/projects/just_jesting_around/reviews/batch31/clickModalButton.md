# clickModalButton

`client/src/components/BaseComponents/test-utils.ts` (already home to `createMemoryRouter`, next to `GModal.test.ts`) gains `clickModalButton(wrapper, text)`. It finds the GModal confirm-footer button (`.g-modal-confirm-buttons button`) whose text is `text`, clicks it and flushes promises. It throws if no button or more than one matches, and if the match is `aria-disabled`, so a "does not submit" case can't pass because GButton swallowed the click. `wrapper` is typed `Pick<BaseWrapper<Node>, "findAll">`, so the root wrapper, a `findComponent(GModal)` result or a `getComponent` result all work; scope to the modal wrapper when a page holds more than one confirm modal. `text` is a plain string because consumers use custom labels ("Rename", "Send Request", "Permanently delete", ...).

Why: GModal emits `ok`/`cancel` from the native dialog's `close` handler (or `ok` directly when `closeOnOk` is false). `vm.$emit("cancel")` skips the close, so when the parent then hides the still-open dialog GModal emits `cancel` a second time. A probe on WorkflowMissingToolsRequest showed GModal's `cancel` emissions as `[[],[]]` after `vm.$emit("cancel")` and `[[]]` after clicking Cancel. With the default `closeOnOk`, `vm.$emit("ok")` also leaves the dialog open where a click closes it.

Consumers:
- `Sharing/UserSharing.test.ts` (supporting): its local `clickModalButton` and `MODAL_BUTTON` selector are replaced by the shared helper. 6 → 6 tests.
- `User/DiskUsage/Management/Cleanup/ReviewCleanupDialog.test.ts` (supporting): the confirmation modal's `vm.$emit("ok")` + flush becomes `clickModalButton(confirmationModal, "Permanently delete")`. The exact `toEqual([[EXPECTED_ITEMS]])` emission check is unchanged. 5 → 5 tests.
- `Tool/ToolInstallationRequestForm.test.ts` (supporting): nine `vm.$emit("ok")` + flush pairs become `clickModalButton(wrapper, "Submit Request")`. Its OK button stays enabled in the validation-failure cases (`formValid()` only checks non-empty name and description), so those cases still reach `submit()`. 9 → 9 tests.
- Originators in this batch: RenameModal, UserDeletion, WorkflowMissingToolsRequest, WorkflowInvocationShare.

Not applicable: `History/HistoryOptions.test.ts`, `History/Modals/CopyModal.test.ts` and `Workflow/Editor/Index.test.ts` `shallowMount`, so GModal is an auto-stub with no footer or dialog; `vm.$emit` on the stub is the right technique there. `Markdown/Editor/Configurations/ConfigureVitessce.test.js` emits on ConfigureHeader, not GModal.

Validation, from `client/`: UserSharing, ReviewCleanupDialog, ToolInstallationRequestForm and the existing `test-utils.ts` consumers GButton, GLink and GToast (63 tests) pass shuffled (seed `310101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and `vue-tsc --noEmit` pass.
