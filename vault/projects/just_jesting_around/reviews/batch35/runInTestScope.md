# runInTestScope

Helper: `client/tests/vitest/effectScope.ts`, new. `runInTestScope(fn)` runs `fn` (usually a composable call) inside a fresh Vue `effectScope` and registers `onTestFinished(() => scope.stop())`, so watchers and computeds the composable creates stop when the current test ends, including when it fails. It must be called while a test runs (in the test body or a helper the test calls), which is how every consumer uses it.

Why: composables that call `watch`/`computed` outside a component leak their effects across tests unless a scope is stopped. The README says to call such composables directly when they need no lifecycle hooks or injection, but it leaves cleanup to each file. Three suites hand-rolled the same thing: a module-level scope list (or a single `let scope`) plus an `afterEach` that stopped it. A fourth, useScrollEdges, stopped its scope inline at the end of the test.

Consumers:
- `client/src/components/History/Graph/useHistoryGraphData.test.ts` (originator). It previously ran the composable without any scope.
- `client/src/composables/useHistoryDatasets.test.ts` (supporting, 20 → 20). Drops `scopes[]` and its `afterEach` splice.
- `client/src/components/Workflow/Editor/Lint.test.ts` (supporting, 3 → 3). Drops `lintScopes[]` and its `afterEach`.
- `client/src/components/History/Graph/useHistoryGraph.test.ts` (supporting, 12 → 12). Drops the single `let scope` and its `afterEach`. That variable kept only the latest scope, so a second call in one test would have leaked the first (no current test makes one); each call now gets its own stop.
- `client/src/components/CommandPalette/useScrollEdges.test.ts` (supporting, 1 → 1; baseline count read from its single `it`, not run before editing). Its `scope.stop()` sat after the assertions, so a failed assertion skipped it.

Ordering: `onTestFinished` runs after `afterEach` hooks, whereas the replaced `afterEach` stops ran alongside them. That moves the stop after `vi.restoreAllMocks()` in useHistoryDatasets and after VTU auto-unmount in Lint. Both suites pass shuffled.

Not adopted: `selectedItems.test.ts` and `useNotificationSSE.test.ts` create their scope in `beforeEach` and reuse it across the test body, which is a different shape. `PersistentTaskProgressMonitorAlert.test.ts` belongs to a later lane.

Validation: the 5 suites, 48 tests, pass shuffled (seed `350101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and full `vue-tsc --noEmit` pass.
