# Test challenges debrief — PR #24507 @ 7c7538edb16

Scope: `client/src/api/jobs.test.ts` (new), `client/src/components/admin/JobsList.test.ts` (extended). No API/integration/Selenium changes. Read-only review; items below are recommendations.

## Unit tests

`api/jobs.test.ts` — keep. Uses `useServerMock` (MSW) per client/README best practices; asserts observable results (stopped/failed, attempt counts, progress) rather than internals.
- `deleteJob` body test: keep; it pins the real bug fix (`data:` -> `body:`; openapi-fetch ignored `data`, so the stop message never reached the server).
- retry / failure / concurrency tests: keep. Only module mock is `retryBackoffMs: () => 0`, acceptable. Concurrency test uses a 5ms real timer; `toBeGreaterThan(1)` could flake only in pathological cases — fine.
- Gap: no `deleteJob` test that an empty/undefined message sends no body.

`JobsList.test.ts`:
- Stop-flow tests mock `stopJobs` at module level — reasonable seam now that retry logic is unit-tested separately.
- "finishes stopping when sending notifications fails": spies on the component's own `sendNotificationToUsers` via `wrapper.vm` and asserts `vm.stopping`. Implementation testing. Rewrite: fail the notification POST with `server.use(http.post("/api/notifications", ...))` (or whatever endpoint the method uses) and assert the Submit button is re-enabled (`disabled` attr absent) instead of reading `vm.stopping`.
- No test asserts Submit is disabled while a stop is in flight (the user-visible part of `stopping`). Add one with a pending `stopJobs` promise.
- "reports a failed refresh" silences `console.log` — fine.

## E2E

`test_admin_app.py::test_admin_jobs_display` only opens the jobs page. The core admin path — select running jobs, enter message, Submit, see "Stopped N of N jobs." and jobs leave the list — has no E2E coverage, and the prior `data`/`body` bug (message silently dropped) would have been caught by one. Recommend a Selenium test: start a long-running tool (e.g. `cat` with sleep / existing slow test tool), open Admin > Jobs, tick header box, submit stop message, assert success alert and that job reaches deleted/stopped state via API (and, ideally, the stop message is persisted). Rate-limit/retry paths stay unit-level.

## Test plan
1. P2: Selenium test for bulk stop (above).
2. P3: rewrite notification-failure test to use server mock + button-disabled assertion.
3. P3: add in-flight Submit-disabled test; add deleteJob no-message-no-body test.
