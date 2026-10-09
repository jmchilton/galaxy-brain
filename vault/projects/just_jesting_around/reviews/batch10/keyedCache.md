# useKeyedCache readability review

Selected originator: `client/src/composables/keyedCache.test.ts`.

Fetch and predicate mocks are typed and recreated before each test, replacing shared untyped mocks whose implementations survived `mockClear()`. The numeric-zero scenario has its own correctly typed numeric fetch handler. Predicate inputs explicitly use `() => shouldFetch`: `toValue()` resolves a bare function as a getter, so the cache needs a getter that returns the predicate. The computed-predicate and ref-fetch scenarios retain their original separate boundaries.

Names now say what each scenario actually exercises, including 429 retry exhaustion and the permanent 403 response. Loading assertions compare booleans directly. All original cached values, request parameters and signals, loading checkpoints, duplicate reads, retry counts, failed-request suppression, recovery payloads, and final cleared error remain.

The delayed-fetch scenario retains three reads and manually advanced fake timers. Its unconditional `expect(true).toBe(true)` is replaced with evidence of one pending fetch, an empty cache before timer advancement, and the fetched item with loading cleared afterward. `afterEach` clears fake timers and restores the real clock, preventing the fake clock from affecting shuffled later scenarios. The recovery error check now requires an `ApiError` rather than merely a truthy value.

Reuse: inspected `LastQueue`, `useKeyedCache`, and neighboring composable tests. No concrete second consumer needs this suite's minimal ItemData fixture or fetch mock, so no new fixture or generic wrapper was introduced.

Validation: baseline 14 cases; final 14 cases. The first edited shuffled run identified the bare-function getter contract, which was corrected before the passing final run. Combined assigned-suite final seed `100033`: 63/63 cases across four files. Scoped current ESLint and Prettier passed. Evidence: `/private/tmp/jest_readability_batch10_composables_utils_{baseline,final}.json`, `_lint.log`, and `_prettier.log`.

No README addition proposed. The getter detail belongs with this concrete API's arrangement; restoring clocks and using useful assertions follow existing principles and do not warrant further general advice.
