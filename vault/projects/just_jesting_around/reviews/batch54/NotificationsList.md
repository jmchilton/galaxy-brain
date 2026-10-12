# Batch 54: NotificationsList

Originator: `client/src/components/Notifications/NotificationsList.test.ts`.

All three original cases and eight assertions remain. The rendered card count and fixture-derived unread count still have their original exact checks, including explicit six-item expectations. The unread-filter case still checks button presence, clicks the real rendered button, and asserts the filtered card count. The empty-state case still starts with ten notifications and no empty-state message, clears the same mounted component's store, and checks the resulting message after Vue updates. No independent endpoint scenario replaces either action or state transition.

The existing native global mounting options, `withPlugins`, `enableAutoUnmount`, full child rendering, and `generateNotificationsList` shared fixture remain. The mount helper now returns its explicitly owned notifications store, avoiding an ambient store lookup in the transition test. `onTestFinished` disposes the owned Pinia after auto-unmount hooks; this also stops store-owned subscriptions. `nextTick` replaces a component-instance tick call. Test and collection names describe observable behavior, and the required click uses `get` after the original presence assertion.

Concrete reuse audit: the shared notification generator and plugin helper already serve these scenarios, with no duplicate fixture builder needed. Owned store access fits the existing mount helper; a separate helper or supporting edit would add indirection. Existing README guidance covers ownership, cleanup, and Vue render boundaries. No evidenced new guidance gap or deferred advice.

Validation:

- Baseline captured before edits; baseline and final shuffled coverage runs pass all 3 cases, seed `540101`, one worker.
- Normalized covered source statement, function, and individual branch-arm location comparison: 155 source files in both runs; all 799 baseline locations retained, 805 final locations, zero losses. Six additional covered locations in `useNotificationSSE.ts` lines 336–349 exercise `disconnect` and its `onScopeDispose` callback when Pinia is disposed. No production files changed. `NotificationsList.vue` retains 35 covered statements, 16 functions, and 35 branch arms.
- Full client `vue-tsc --noEmit`, targeted ESLint and Prettier pass. Explicit repository pre-commit applies one line-wrap formatting adjustment; the final rerun passes every applicable hook.

Evidence: `/private/tmp/readability54-notifications-before.log`, `/private/tmp/readability54-notifications-after.log`, paired `/private/tmp/readability54-notifications-{before,after}/coverage-final.json`, `/private/tmp/readability54-notifications-types.log`, `/private/tmp/readability54-notifications-hooks-final.log`.

No supporting tests, helpers, dependency files, or production edits. Root owns independent review, final integrated gates, and publication.
