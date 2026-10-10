# WorkflowInvocationShare

Selected originator: `client/src/components/WorkflowInvocationState/WorkflowInvocationShare.test.ts`. Baseline and final: **6 tests**.

It drives a real, mounted GModal (`v-model:show`, `confirm`, default `closeOnOk`), and the synthetic `vm.$emit("ok")` was unrealistic here. Clicking Ok closes the dialog, and GModal then emits `update:show(false)` and `ok`. The synthetic emit ran the share but left the modal open (`show` stayed `true`). The share case now clicks the "Share" footer button through the shared `clickModalButton` and also asserts the modal closes. Put back to `vm.$emit("ok")`, that new assertion fails (`expected true to be false`). There's no `cancel` path in this test, so no double emission.

What changed: the two `vi.mock` store overrides (`importActual` plus an `as any` spread that derived ownership and shareability from magic ids such as `SHARED_WORKFLOW_ID`, `UNOWNED_HISTORY_ID` and a `-importable` suffix) are gone. `mountWorkflowInvocationShare({ ownsWorkflow, ownsHistory, bothShareable })` takes an options object instead of three positional booleans. It seeds the real stores on its own Pinia: the current user (username decides workflow ownership), the workflow under its instance id with `owner`/`importable`, and a `getFakeHistorySummaryExtended` history with `user_id`/`importable`. It installs that Pinia with `withPlugins`. The legacy top-level `pinia` and `stubs` options go; Galaxy's VTU adapter used to translate them. The `FontAwesomeIcon` stub wasn't needed. The `as object` cast and the `{ wrapper }` return wrapper are gone, and auto-unmount is added. The PUT handlers are unchanged.

Preserved: the modal starts closed, opens on the share icon, and shows the workflow and history names. Share raises the success then clipboard toasts. The not-owned cases render no share icon and no GModal. When both are already shareable, the modal stays closed and only the clipboard toast fires. `toBeTruthy`/`toBeFalsy` became `toBe(true)`/`toBe(false)`. Strengthened: the modal closes after Share, and both copy cases check `navigator.clipboard.writeText` gets the invocation link (`…/workflows/invocations/invocation-id`) exactly once.

Changed scenario (flag): two of the three "renders nothing" cases had identical inputs at baseline. "Does not own the workflow" and "owns the history but not the workflow" were both `(ownsWorkflow=false, ownsHistory=true)`. The `it.each` keeps "owns the history but not the workflow" and "owns the workflow but not the history", and turns the duplicate into the missing "owns neither" combination. The case count stays at 6.

Reuse: `getFakeRegisteredUser`, `getFakeHistorySummaryExtended`, `getLocalVue`/`withPlugins`, `useServerMock`, `raisedToasts`, `clickModalButton`. There's no workflow-detail factory (`getFakeWorkflowSummary` is a different shape), so the stored workflow is a four-field `as StoredWorkflowDetailed` literal. That's as partial as the old mock's return, which the component only reads for `id`, `name`, `owner` and `importable`. The clipboard `defineProperty` stays local; batch 04 already judged it a standard Vitest spy.

Validation, from `client/`: 6 tests pass shuffled (seed `310101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and `vue-tsc --noEmit` pass.

Guidance: none beyond `clickModalButton.md`.
