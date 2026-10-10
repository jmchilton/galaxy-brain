# deferred (`client/tests/vitest/deferred.ts`)

Added by the driver after the batch 40 review asked for it. `deferred<T>()` returns a promise and the `resolve` that settles it, for tests that control when a mocked request answers. `Promise.withResolvers` isn't available under the client's `target: es2022`, so a helper is still needed.

Consumers: four identical copies became one import.
- `GalaxyAI/test-utils.ts` exported it as `deferredResponse`; it's removed there with no re-export, and `GalaxyAI.newchat.test.ts` and `GalaxyAI.routesync.test.ts` import `deferred` instead.
- `stores/workflowStore.test.ts` and `Workflow/List/CuratedWorkflowList.test.ts` drop their local copies. CuratedWorkflowList's copy started `resolve` as a no-op; the definite-assignment form is equivalent, since the executor runs synchronously.
- `stores/historyStore.lists.test.ts` (the batch originator) drops the local copy it had added.

Batch 10 rejected a shared helper when there was no repeated concept; four copies now are. Left out: the no-op resolver placeholders in `pageStore.test.ts` and `visualizationStore.test.ts`, since adopting it there changes their setup, not just an import.

Validation: the five consumer suites pass shuffled (seed `400101`, 68 tests); ESLint, Prettier and full client vue-tsc pass.
