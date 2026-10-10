# floatingPosition

Selected originator: `client/packages/ui/src/composables/floatingPosition.test.ts` (`@galaxyproject/galaxy-ui`). Baseline and final: **6 tests**.

How it runs: the package has no test script or vitest config of its own. The client root `vitest.config.mts` includes `packages/*/src/**/*.test.{js,ts}`, so the tests run from `client/` with `NODE_OPTIONS=--no-webstorage pnpm exec vitest run packages/ui/src/composables/floatingPosition.test.ts`. The Tool Shed frontend's vitest uses its default include and does not run them. The package has its own `type-check` script, `vue-tsc --noEmit -p tsconfig.json`, which CI runs (`js_lint.yaml`). It was run from `client/` as `pnpm --filter @galaxyproject/galaxy-ui type-check`, in addition to the client's `vue-tsc --noEmit`.

What changed:
- `setup(true)`/`setup(false)` becomes `setupFloatingPosition({ active: true })`, so the flag is named at each call site.
- The two hand-rolled `let resolve = () => {}; floatingUi.pending = new Promise(...)` blocks become `holdComputedPosition()`, which returns a `release()` function.
- The hoisted mock's `position` field is renamed `result`. It no longer shares a name with the composable's returned `position`.
- `await new Promise((settled) => setTimeout(settled))` becomes `flushPromises()`. Other `packages/ui` tests use it, and the README recommends it.
- The two "positions" cases sit together and share `expectComputedPosition(position)`.

Preserved: every original assertion:
- x is 12 once active from the start, and once activated, with y, placement and arrow
- a late result is discarded (x stays 0)
- `stopTracking` is called once on deactivation and once on scope disposal
- `whenPositioned` waits for the held position, and x is applied afterwards

Strengthened:
- The active-from-the-start case now checks y, placement and arrow too, not only x.
- The discard case also checks y and placement keep their initial values (0 and `"bottom"`). Probe: disabling the composable's `started !== generation` check fails this case (1 failed, 5 passed). It was reverted.
- Both stop-tracking cases assert `stopTracking` was not called before the deactivation or dispose. This pins the call to that step.

Reuse: `flush-promises`. No new shared helper. The `@floating-ui/dom` mock is used only by this composable's test.

Validation: 6 tests pass shuffled (seed `330101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier, the package's `type-check` and the client's `vue-tsc --noEmit` pass.
