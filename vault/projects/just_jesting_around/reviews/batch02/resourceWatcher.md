# resourceWatcher readability — batch 02

The 21 original scenarios and all 57 original assertion requirements are retained. Changes are limited to `client/src/composables/resourceWatcher.test.ts`.

- Replaced a file-wide `global.document` replacement and manual callback invocation with the actual DOM document, a scoped visibility getter spy, and `document.dispatchEvent`. Listener registration/removal assertions remain.
- A file-local watcher factory records instances for disposal after every scenario. Fake timers are installed per test and restored after disposing watchers and clearing outstanding timers; teardown no longer runs recurring watchers or leaves fake timers active.
- Used Vitest's async clock advance directly to settle async polling callbacks. All original interval values and slow-handler durations remain explicit.
- Renamed misleading cases: the original "listener only once" case actually checks one listener for each of two watcher instances, and the original "overlapping slow handlers" case checks that an 8000ms request does not overlap polls. Removed narration while preserving explanations of the pending-short-poll transition.
- Extracted three repeated delayed-request arrangements into a local `createSlowHandler(durationMs)` using the existing shared `wait` utility. Every scenario continues to show its 5000ms/8000ms duration.

Reuse evidence: `tests/vitest/helpers.js` already supplies `wait`; `historyStore.test.ts` and `uploadDatasetMonitorStore.test.ts` already use `vi.advanceTimersByTimeAsync`. `tooltipTestUtils.ts` waits for Vue ticks and encodes tooltip timing, so it does not serve this polling/request test. `roundRobinSelector.test.ts` also owns recurring timer cleanup, but its lifecycle-bound mounting and reactive tick requirements differ. No new shared abstraction is justified for these distinct setups.

Guide additions: none. Existing cleanup, behavior naming, composable isolation, and reuse guidance is sufficient. The native async timer API needs no wrapper or generic best-practices prose. No worthwhile marginal advice identified.

Checks: `NODE_OPTIONS=--no-webstorage pnpm exec vitest run src/composables/resourceWatcher.test.ts` passed all 21 cases. Scoped ESLint and Prettier checks passed. Exact original assertion statements were compared against the reviewed HEAD (normalizing only listener-spy variable renames): none missing; one listener-existence assertion added. The file shrank from 538 to 420 lines. Baseline and edits use the original `jest_readability_batch_01` worktree per the user's correction. No production changes or commits.

Integration follow-up: full client `vue-tsc` found that Galaxy's ambient `vitest` declarations do not expose the `MockedFunction`/`MockInstance` type re-exports. Moved those type imports to the installed `@vitest/spy` package, preserving the original file's type source and eliminating the inferred-`any` listener callback. No casts added. Targeted 21-case Vitest, ESLint, and Prettier checks passed again; the driver reruns full type-checking.
