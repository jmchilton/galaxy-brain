# WorkflowAnnotation

Selected originator: `client/src/components/Workflow/WorkflowAnnotation.test.ts`. Baseline **4 tests**, final **8 tests**.

The file-level `vi.mock("@/stores/workflowStore")` is gone. It spread a real store into a plain object and replaced `getStoredWorkflowByInstanceId` with a mock keyed on the magic id `other-user-workflow-id`. Now `mountWorkflowAnnotation(view, { owned })` seeds `workflowsByInstanceId` through `createTestingPinia` `initialState` with either `OWN_WORKFLOW` or `PUBLISHED_WORKFLOW` (same owner, `published: true`), so the real getter runs. The current user is seeded through `initialState` too. It was assigned after mount; the user store lost no coverage. Mounting uses `withPlugins(localVue, pinia)` with `FontAwesomeIcon` still stubbed, instead of the legacy top-level `pinia`/`stubs` options. The `as object` cast is gone.

History seeding changed. The old test assigned `storedHistories` by hand and called `setCurrentHistoryId` after mount, while the history link's own fetch of that history (served by the existing `/api/histories/{history_id}` handler) was in flight. Now `setCurrentHistoryId(TEST_HISTORY.id)` runs before mount. Right after mount, the real `setHistory` action stores the current history, with a one-line comment that it arrives while the link's request is in flight. The fetch then merges into the stored history, just as before. `storedCurrentHistoryId` isn't returned by the store, so `initialState` can't seed it; a key for it is silently ignored. The pre-store render still runs: the link shows loading and "(not current)" first. The post-mount `setHistory` matters: an earlier draft let the history arrive only through the fetch, which lost the `setHistory` merge branch (`historyStore.ts` 291–294). Seeding it before mount instead skips the link's fetch and loading render, which lost more (`historyStore.ts` 82 → 61 lines, `TargetHistoryLink.vue` branches 7 → 4).

The two cases that looped over both views through inner `checkHasRunCount`/`checkHasIndicators` helpers are now `it.each(VIEWS)`. The view-dependent history link `if/else` is split into two named cases.

Preserved:
- Own workflow, both views: the run count text contains "workflow runs:" and 100, and there's no published owner badge.
- History link: absent in the run form view, contains the history name in the invocation view.
- Another user's published workflow, both views: the badge text is the owner and its title contains `Published by 'test-user'`.
- Time info: "edited" with the workflow update time in the run form view, "invoked" with the invocation time in the invocation view.

Strengthened: the invocation view marks the target history as current.

Reuse: `createTestingPinia` `initialState` (store ids `workflowStore`, `userStore`), `withPlugins`, `getFakeRegisteredUser`. No shared helper with WorkflowInvocationOverview or WorkflowInvocationInputOutputTabs: each seeds one `initialState` entry, and they differ in action stubbing and in the other stores they need.

Validation: 8 tests pass, shuffled (seed `380101`). ESLint, Prettier and full client `vue-tsc --noEmit` pass. Per-file coverage against the baseline, at the tip: no loss; `workflowStore.ts` and `historyStore.ts` gain lines.

Guidance: `createTestingPinia({ initialState })` can only seed state a setup store returns. `historyStore`'s `storedCurrentHistoryId` is private, so call `setCurrentHistoryId` instead. The README already warns about wrong store-id keys; the same silent ignore applies to unreturned state keys.
