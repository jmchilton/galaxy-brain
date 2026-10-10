# useHistoryGraphData

Selected originator: `client/src/components/History/Graph/useHistoryGraphData.test.ts`. Baseline **9 tests** → final **12 tests**, grouped into "requests" and "state".

What changed:
- A shared `beforeEach` handler with a cast `captured` spy is replaced by a local `respondWithGraph()`, following batch 12's `respondWithDatasets`. Each scenario registers its own response, and the spy records plain `{ historyId, limit, seedSrc, seedId }` values. That removes the `as unknown as URLSearchParams` cast and the `calls[0]![0].query.get(...)` chains. `respondWithError()` names the 404 response.
- The empty graph response is typed as `HistoryGraphResponse`. Adding the schema-required `truncated.scope_type: "recent"` removes `as never`; the composable never reads it.
- Each composable call now runs inside the shared [`runInTestScope`](runInTestScope.md). Before, its immediate watcher was never stopped.
- "fetches immediately on mount" is renamed, since nothing is mounted.

Preserved, scenario by scenario: initial fetch (one call, `h1`, limit `100`); no seed refs (both params absent) and both seeds (`hda`, `d-7`), each asserting exactly one call as the original `calls[0]` reads implied; historyId and limit refetches (limit refetch now also asserts exactly one call); manual `refetch()` (one call, now with its arguments); success state (loading false, error null; `not.toBeNull()` strengthened to `toEqual` the response); loading stays false on refetch; first-fetch API error (`toMatch` strengthened to exact `toBe`), with `graphData` null.

Replaced and added checks:
- **Loading during refetch.** The original snapshot ran a `vi.fn` named `stopWatch` once, synchronously after `refetch()`. It could fail, but it read as a watcher it wasn't. A `flush: "sync"` watcher now records every `loading` change during the refetch and expects none. Probe: forcing `showLoading = true` fails only this case.
- **"Clears error" was never exercised.** `error` starts null. New case: an error, then a successful refetch, ends with null. Probe: dropping `error.value = null` fails only this case.
- **"Clears graphData" on error was vacuous.** `graphData` starts null and the first fetch failed. The original first-fetch case is kept. New case: a loaded graph, then a failing refetch, ends null. Probe: dropping `graphData.value = null` on API error fails only this case; the original-style case still passed.
- **Added case:** loading is true while the first fetch is in flight, the positive twin of the refetch case.
- The seed probe (never sending seeds) fails only the seed case.

Production code was restored after each probe, and the worktree was clean.

Validation: 12/12 pass, and 48 tests across the 5 `runInTestScope` consumers pass shuffled (seed `350101`). ESLint, Prettier and full `vue-tsc --noEmit` pass.

Guidance: see `runInTestScope.md`. The README's composable section could say that directly-called composables creating watchers should run in a scope stopped per test, and point to the helper.
