# refresh

Selected originator: `client/src/components/CommandPalette/providers/refresh.test.ts`. Baseline and final: **5 tests**.

The repeated `"workflows:my"` key is now a named constant, alongside `SHARED_WORKFLOWS`, and `succeedingRefresh()` names the resolved-refresh mock. The case structure was already one behavior per test and is unchanged. `afterEach` now also restores mocks, for the new `console.debug` spy, because the client config doesn't set `restoreMocks`.

Vacuous assertion replaced. "swallows a failing refresh instead of rejecting" asserted `expect(() => refreshListWhenStale(...)).not.toThrow()`. The function is synchronous and runs `refresh` inside a fire-and-forget async IIFE, so even a synchronous throw from `refresh` becomes a rejection, and the expectation can never fail. Without the `catch`, the only signal would be Vitest's unhandled-rejection report, not this test. The case is now "logs a failing refresh at debug level instead of rejecting". It spies on `console.debug` (silenced) and, after `vi.runAllTimersAsync()`, asserts the call `("Command palette could not refresh a cached list", "workflows:my", error)` alongside the original `refresh` call count. Shown red by replacing the `console.debug` line in `refresh.ts` with `void error;`: the case failed with `expected "debug" to be called with arguments`. The file was then restored with `git checkout --`.

Strengthened: "tracks each list separately" used one mock for both keys and asserted one call in total. Separate mocks now show which list refreshed (shared, once) and which did not (mine, which was just marked). The other three cases keep their assertions verbatim.

Reuse: none needed. The module has no store or component setup.

Validation: 5 tests pass shuffled (seed `360101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and full `vue-tsc --noEmit` (exit 0) pass.

Guidance: none Galaxy-specific. `not.toThrow()` around a fire-and-forget async call is a general Vitest pitfall.
