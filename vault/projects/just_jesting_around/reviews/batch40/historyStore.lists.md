# historyStore.lists

Selected originator: `client/src/stores/historyStore.lists.test.ts`. Baseline and final: **16 tests**.

The suite was already scenario-per-case, so the changes are local:
- `setupTestPinia()` from `./testUtils` replaces the inline `setActivePinia(createPinia())`, as in `historyStore.test.ts`.
- A typed local `deferred<T>()` and a `HistoryListResult` type replace the three `let resolveX: (...) => void = () => undefined` placeholders. The search-vs-canonical case's `mockImplementation` now just picks one of two pending responses.
- An `ids()` helper replaces eleven repeated `.map((history) => history.id)` calls.
- The "keeps already cached fields" case drops its `as AnyHistoryEntry & { owner?: string }` cast for a `toMatchObject`.

Mocks are unchanged. The `@/api/histories` function mocks stay, because the assertions are about the store's camelCase request options, its variant dispatch and its request deduplication. The SSE, `watchHistory` and `@/app` mocks stay too. Test data is also unchanged: every `mockHistory` id, name, update time and extra field is the same.

Preserved: every request-option assertion, call count, cached-listing order, total, loaded and loading flag, record-false behaviour, merge, replace and clear behaviour, and the rejection.

Strengthened:
- The concurrent-dedupe case's `expect(first).toEqual(second)` is now `expect(second).toBe(first)`, so both callers get the same shared result, plus `ids(first)` equals `["h1"]`. Before, two separately built arrays with equal contents would also have passed `toEqual`. `toBe` pins the shared promise's result. The call count still pins the single request.
- The one-off search hit's `toBeDefined()` is now `toMatchObject({ name: "Needle" })`.

Reuse: `setupTestPinia`. Shared deferred helpers were considered and left local. Batch 10's reviews rejected a generalized deferred helper. Since then, three identical copies have appeared (workflowStore, CuratedWorkflowList, GalaxyAI `deferredResponse`), plus manual resolvers in pageStore and visualizationStore, so it may be worth revisiting as its own change. A per-file coverage comparison against the original showed no drop. The only change was a gain in `stores/testUtils.ts`.

Validation: 16 tests pass shuffled (seed `400101`, `NODE_OPTIONS=--no-webstorage`). Scoped ESLint (`--max-warnings 0`) and Prettier pass, and so does full client `vue-tsc --noEmit`.

Guidance: none.
