# WorkflowList

Selected originator: `client/src/components/Workflow/List/WorkflowList.test.ts`. Baseline and final: **4 tests**.

Test data is now deterministic. `serveWorkflows(count, overrides)` builds `getFakeWorkflowSummary` rows (`workflow-${i}`, `Workflow ${i}`, owned by the fake user) and serves them as the list's only page. This replaces `generateRandomWorkflowList`, which drew random ids, names, tags, annotations and `published`/`show_in_tool_panel` flags on every run. It also returned a local `Workflow` shape that only fit the `loadWorkflows` mock through an `as ReturnType<typeof vi.fn>` cast. `vi.mocked(loadWorkflows)` now types the mocked responses. `client/src/components/Workflow/testUtils.ts` had no other consumer, so it is deleted. Owner, counts and the all-deleted toggle input are unchanged. Only the random field values became fixed factory defaults, and no assertion reads them.

The mounts now share `mountWorkflowList(pinia)`, which mounts before any user has loaded and returns `{ wrapper, userStore }`. `mountWorkflowListForUser()` sets the user and flushes, as the old `mountWorkflowList` did. The "user loads after" case still passes its own default-`stubActions` testing Pinia and sets the user after the first flush. Both paths use `withPlugins(localVue, pinia, router)` instead of mixing `global:`/`localVue:` with `as object`. Other changes:

- `expectConfigurationRequest(http, {})` replaces the inline configuration handler.
- `SELECTORS` and `filterText(wrapper)` replace the repeated `as HTMLInputElement` value reads.
- Both clicks are now awaited `trigger`s instead of un-awaited ones followed by `wrapper.vm.$nextTick()`.
- `enableAutoUnmount(afterEach)` is added. The trailing `flushPromises()` had nothing after it, so it is dropped; no stderr is produced.
- Single-use user id/email constants are inlined, and test names now describe behavior.

All four scenarios and their assertions are kept: empty state, ten cards with no empty message (including the redundant non-deleted count), loading-then-cards when the user arrives late, and the "" → "is:deleted" → "" filter toggle.

Vacuous assertion replaced: the second `expect(showDeletedButton.exists()).toBe(true)` reused the wrapper found before the first click. A found DOMWrapper always "exists", so the check could never fail, and the second click went to that same captured element. Both now re-find `#show-deleted`. Red check: removing the button from the DOM after the first click still passes the original (the click reaches the detached element's listener) but fails the new test.

Reuse: `getFakeWorkflowSummary`, `getFakeRegisteredUser`, `expectConfigurationRequest`, `withPlugins`, `createTestRouter`.

Validation: 4 tests pass shuffled (seed `280101`, `NODE_OPTIONS=--no-webstorage`). Scoped ESLint and Prettier pass; full `vue-tsc --noEmit` passes after the deletion.

Guidance: none.
