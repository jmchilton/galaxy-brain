# getFakeTaskMonitor

New shared helper: `client/tests/vitest/fakeTaskMonitor.ts` exports `getFakeTaskMonitor(overrides)`. It returns an idle `TaskMonitor`: every flag `ref(false)`, `failureReason` and `taskStatus` `ref()` (undefined), no `expirationTime`, and fresh `vi.fn()` spies for all five methods. It has no behaviour of its own. `waitForTask` does not flip `isRunning` and `loadStatus` does not write `taskStatus`. A test that needs either passes its own ref and spy as overrides.

It lives in `tests/vitest/` beside the other mock helpers, not in `tests/test-data/monitoring.ts`, because nothing in `tests/test-data/` imports `vitest`.

Consumers:
- `client/src/composables/persistentProgressMonitor.test.ts` (originator): replaces the local `useMonitorMock()`. That mock was built once at module level, so the `isRunning` set by the start test leaked into later tests.
- `client/src/components/Common/PersistentTaskProgressMonitorAlert.test.ts` (supporting): replaces the module-level `FAKE_MONITOR` literal, whose refs and spies all tests shared through `{ ...FAKE_MONITOR, isRunning: ref(true) }` spreads. A local `fakeMonitor(state)` keeps that suite's `FAKE_EXPIRATION_TIME` visible, and each test still names the one flag it sets. Its `failureReason`/`taskStatus` move from `ref("")` to `ref()`. Both are falsy for the component's `v-if="failureReason"` and the composable's watchers. All 7 tests, assertions, requests and monitoring data are unchanged. The edit only touches how the monitor is built and drops the unused `vi` import.

Batch 4's "no shared monitor mock" decision was about `DownloadItemCard.test.ts`. That suite replaces the composable's *result* (`PersistentProgressTaskMonitorResult`), which is a different boundary, so it stays as is and is not a consumer. These two suites both pass a `TaskMonitor` *input* into the real composable. No other `TaskMonitor` fakes exist in `client/src` (searched for `waitForTask: vi.fn` / `stopWaitingForTask: vi.fn`).

Validation: Alert 7 → 7 and originator 4 → 4 pass together shuffled (seed 260101). ESLint (`--max-warnings 0`) and Prettier pass on all three files, and full `vue-tsc --noEmit` is clean.
