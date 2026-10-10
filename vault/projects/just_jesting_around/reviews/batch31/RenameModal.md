# RenameModal

Selected originator: `client/src/components/Common/RenameModal.test.ts`. Baseline **3 tests** → final **4 tests** (one case split).

It drives a real, mounted GModal (`confirm`, `show`, `:close-on-ok="false"`). With `closeOnOk` false GModal's Ok button calls `emit("ok")` directly, the same as the old `vm.$emit("ok")`, so the double `cancel` doesn't arise here and the exact `close` checks pass either way. The tests now click the "Rename" footer button through the shared `clickModalButton`, which also means the confirm path is gated by `okDisabled` (the helper refuses a disabled button), as for a user.

What changed: `mount(RenameModal, { props, global })` replaces the `as object` cast and legacy `localVue`/`propsData`; the unused `name` parameter goes; `attachTo: document.body`, the `DOMWrapper(document.body)` lookups and the `document.body.innerHTML = ""` cleanup give way to `wrapper.find` plus `enableAutoUnmount`. A local `renameTo(wrapper, name)` types the new name and clicks Rename. The failed-update case is split: one case for the toast and `close`, one for the reopened modal starting from the original name.

Preserved and strengthened: `updateWorkflow` called with the workflow id and new name (now `toHaveBeenCalledExactlyOnceWith`); `close` emitted on success and failure (now exactly once, `toEqual([[]])`); `Toast.error` called on failure (now `raisedToasts()` equals one error toast with the server message, so no success toast fired); the success case also checks its one "Workflow renamed" toast; the reopen check (input value is the original name after unmount and remount); OK disabled when the name is unchanged (GModal `okDisabled` prop).

Not covered on purpose: a Cancel case. RenameModal maps both GModal `@close` and `@cancel` to `emit("close")`, and a real Cancel triggers both, so `close` reaches the parent twice. That's production behavior, harmless for its callers, and out of scope.

Reuse: `clickModalButton` (shared, `BaseComponents/test-utils.ts`), `raisedToasts` from the toast mock, `getLocalVue`.

Validation, from `client/`: 4 tests pass shuffled (seed `310101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and `vue-tsc --noEmit` pass.

Guidance: see `clickModalButton.md`; nothing RenameModal-specific.
