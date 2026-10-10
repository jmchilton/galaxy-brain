# WorkflowRun (user store seed fix)

Separate small fix: `client/src/components/Workflow/Run/WorkflowRun.test.js`. Baseline and final: **6 tests**.

`REGISTERED_USER_STATE` seeded `createTestingPinia({ initialState: { user: ... } })`, but the store id is `"userStore"`, so the seed was ignored and the missing-tools cases ran with `currentUser === null`. The key is now `userStore`, and the partial literal (`id`, `email`, `isAnonymous: false`) is replaced by `getFakeRegisteredUser()` so the seed is a complete `RegisteredUser`. No assertion reads the user's fields.

What changes: no case behaves differently. `WorkflowMissingToolsRequest` shows the install button when `!userStore.isAnonymous`, and `isAnonymousUser(null)` is false, so a null user and a registered user both show it. The cases passed by accident, not because of the registered-user seed. Probe: seeding an anonymous user under the fixed `userStore` key fails "offers the install request..." and "drops the missing tool ids..." (2 failed, 4 passed); the same anonymous seed under the old `user` key passes all 6, which confirms the old seed never reached the store.

Validation: 6 tests pass shuffled (seed `320101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and `vue-tsc --noEmit` pass.

Guidance: already in the README ("`initialState` is keyed by the `defineStore` id").
