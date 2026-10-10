# persistentProgressMonitor

Selected originator: `client/src/composables/persistentProgressMonitor.test.ts`. Baseline and final: **4 tests**.

The local `useMonitorMock()` was called once at module level, so all four tests shared one monitor. Its `waitForTask` set the shared `isRunning`, and its `loadStatus` implementation was never reached: `isFinalState` is a bare spy and the data starts now, so `start()` never takes the final/expired branch. Each test now builds its own idle monitor with the new shared `getFakeTaskMonitor` (see `getFakeTaskMonitor.md`). The original `expirationTime: 1000` is passed explicitly.

The start test used to assert only that `isRunning` became truthy. That proved little more than that the mock flipped its own ref. It now keeps that check, in the form "the composable exposes the monitor's running state", and adds `expect(waitForTask).toHaveBeenCalledWith("123")`. To keep the running-state check honest, the test passes its own `isRunning` ref and a `waitForTask` spy that sets it, so that behaviour is visible in the scenario. Changing the expected ID to `"124"` fails the test. `toBeTruthy`/`toBeFalsy` on the boolean computeds became `toBe(true)`/`toBe(false)`. Test names state behaviour rather than starting with "should". The `write: (value: any)` in the `@vueuse/core` mock is now `unknown`, because the file failed `eslint --max-warnings 0` before this change.

Preserved: the same `MOCK_REQUEST`, the `taskId: "123"` monitoring data, and the `useLocalStorage`-as-plain-ref mock, which keeps tests from sharing storage. All four scenarios are kept: no data initially, start with provided data, start-without-data rejecting with the exact message, and reset clearing the data.

Reuse: `getFakeMonitoringData` from `tests/test-data/monitoring.ts` and the new `getFakeTaskMonitor`, which `PersistentTaskProgressMonitorAlert.test.ts` also adopts.

Validation: 4 tests pass shuffled (seed 260101), together with the Alert suite (11 total). ESLint (`--max-warnings 0`), Prettier and full `vue-tsc --noEmit` are clean.

Guidance: none.
