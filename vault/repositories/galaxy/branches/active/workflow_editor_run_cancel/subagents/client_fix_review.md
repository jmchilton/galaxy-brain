# Client fix review: "Don't mark a loading workflow as changed in the editor"

**Top line.** The fix is correct, small, and right for release_26.2. I acted on two test-side points. First, I added a Vitest that pins the case that should stay dirty: a workflow whose steps were upgraded on load. Second, I moved the load-window mount into a shared helper. The fix commit is now `9a5cda91bed` (was `f4fa8e20d84`). Index.vue is unchanged. The test wait in `82b94422d2d` (`canvas_loading` absent, then Save disabled) is sound, and I left it alone.

**Not acted on:**
- **Removing the `finally` reset in `loadEditorData`.** With the early reset in place, the `finally` now mostly clobbers genuine user edits made while versions are pending. That is a pre-existing bug, not a new one. Removing it would change reload behavior for Save and version switches, where `initialLoading` is false and async step-store writes could land in that window. That needs separate evidence and is out of scope for this branch.
- **Moving the fix into `initialLoading` or the undo-redo store.** `initialLoading` only covers the first mount, and the undo-redo store doesn't own `hasChanges`. Gating the watchers on `loadingWorkflow` broke 5 existing tests (see editor_unsaved_changes_flake.md). The one-tick reset is the least invasive option.
- **Re-running E2E under Playwright.** The only change was in Index.test.ts, so the runtime client code and the E2E test are byte-identical to what passed earlier (2 warm runs, 1 cold run, 1 Selenium run).
- **Stale PR text and screenshot debrief.** The coordinator owns these. They still say the branch is test-only.

<details>
<summary>Full review</summary>

### Correctness of the one-tick reset
- **Race with user edits right after load.** None. The reset comes after `await nextTick()`, which resolves in the microtask after Vue's watcher flush. DOM events are macrotasks, so no user edit can run between the assignments and the reset.
- **Edits while versions are pending.** These still mark the editor dirty. The pre-existing `finally { hasChanges = hasStateMessages }` then clears them once versions resolve. This commit doesn't change that behavior. See "Not acted on".
- **Edits during the `getWorkflowFull` fetch.** They were already cleared by `resetStores()` and the `finally`, so nothing changes here.
- **Upgrade on load.** `hasChanges = hasStateMessages` keeps the editor dirty when there are state-upgrade messages. This had no test, so I added "keeps a workflow upgraded on load marked as changed". A mutation check (changing the reset to `false`) turns it red.
- **New temp workflow.** `loadCurrent` returns early when `isNewTempWorkflow` is true, so this path doesn't apply.
- **Other entry points.** Opening a subworkflow changes `id`, and the id watcher calls `loadCurrent`. Version switches and the reload after Save also call `loadCurrent`. All of these go through `loadEditorData`, so the one fix covers every entry point a reviewer would expect.
- `onSave`'s `hasNewerChanges` path sets the flag dirty on purpose and doesn't reload, so the fix doesn't touch it.

### Abstraction
- `initialLoading` already gates step and comment store subscriptions on the first load. Attribute watchers can't use the same gate, because existing tests treat edits during mount as real edits. That leaves resetting the flag in `loadEditorData` as the natural place. It sits right next to the existing `finally` reset that uses the same `hasStateMessages` value.

### Vitest
- The original test duplicated mount boilerplate inline. I extracted it as `mountWithPendingVersions()`, which both tests now share, and asserted the loaded name there so it acts as the "load reached versions" precondition.
- The test uses real user-facing events (the activity bar's Exit) rather than poking internals, which matches client/README guidance. The `mockGetVersions` override is per-test, and the outer `beforeEach` resets it.

### Release suitability
- The change is 5 lines and only removes a spurious dirty window. Nothing it touches is API-visible. It's fine for release_26.2.

### E2E test-side wait (82b94422d2d)
- `canvas_loading` is `#workflow-canvas .galaxy-loading-shade`, bound to `loadingWorkflow || initialLoading`. Once the canvas is visible, waiting for the shade to be absent is a reliable "load finished" signal. The assertion that Save is disabled gives a clear failure message if the dirty-on-load bug comes back.

### Validation
- Vitest (node 22.20.0 via pnpm) on `src/components/Workflow/Editor/`: 33 files, 341 tests passed.
- The new upgrade test is red when the reset is mutated to `false`.
- `pnpm type-check` is clean. Prettier, eslint and pre-commit all passed.

</details>
