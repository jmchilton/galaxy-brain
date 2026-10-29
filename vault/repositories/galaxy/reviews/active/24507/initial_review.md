# Initial review — `default` profile

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Opus 5.5 (`claude-opus-5-5`); effort set by coordinator (not exposed to reviewer)
- Reviewed commit: `7c7538edb16` (diff `origin/release_26.1...HEAD`, 4 client files, +282/-27)

## Verdict

Solid, well-scoped fix. Reuses the existing retry primitives in `@/utils/simple-error` (`ApiError`, `isRetryableApiError`, `MAX_RETRIES`, `RETRY_BACKOFF_CAP_MS`, `retryBackoffMs`, `rethrowSimpleWithStatus`) instead of inventing new ones, and its policy (4 attempts total, give up when `Retry-After` > 30 s) matches `useRetryGate`. The `data` -> `body` fix in `deleteJob` is real: openapi-fetch only reads `body`, and the backend `DELETE /api/jobs/{job_id}` takes an optional `DeleteJobPayload` body. So admin stop messages were being dropped. No P1s. The findings are small UX regressions and reuse nits.

Tests weren't run: the worktree has no `client/node_modules`, and installing them would modify the worktree.

## Findings

### P2 1: Notification failures now render as a green success alert

Before this PR, `sendNotificationToUsers` set `status = "warning"` when any notification failed. Now it returns a string that `onStopJobs` appends to the stop summary. Status is chosen only from `failed.length` (`"danger"` or `"success"`). Partial notification errors (`Notification sent to 1 out of 2 users. 1 errors occurred.`) and a thrown notification error (`Notifications could not be sent: ...`) both show in a `success` alert when every stop succeeded. The new test `finishes stopping when sending notifications fails` locks this in: it asserts `.alert-success` for a message that reports a failure.

Suggested fix: have `sendNotificationToUsers` report whether errors occurred (e.g. return `{ message, ok }`), or track a local `notificationFailed` flag in `onStopJobs`. Then pick `danger`, `warning` or `success`. Update the test to expect `.alert-warning`.

### P3 1: Retry decision duplicated from `useRetryGate`

`stopWithRetry` re-derives the same predicate as `useRetryGate.isRetrying` in `client/src/composables/retryGate.ts`: it is retryable, under `MAX_RETRIES`, and has no `Retry-After` over `RETRY_BACKOFF_CAP_MS`. `retryAfterMsOf` is reimplemented inline too. A small exported helper in `simple-error.ts`, such as `shouldRetryApiError(error, attempt)`, used by both would keep the two retry policies from drifting. Likewise, the queue/worker pool in `stopJobs` is a generic "map with bounded concurrency, settle all" helper. There's nothing like it in `client/src/utils` yet. Extracting it (e.g. `utils/concurrency.ts`) would leave a reusable abstraction for the next bulk action that hits the same proxy-429 problem, such as bulk dataset or history operations. Optional for a release-branch fix. It could also be a dev follow-up.

### P3 2: Selection and checkboxes stay editable while stopping; result overwrites the admin's edits

Only the Submit button is disabled while `stopping`. If the admin changes the selection during a slow bulk stop (retries can take tens of seconds), `this.selectedStopJobIds = failed.map(...)` replaces whatever they picked. The message also says failed jobs "remain selected". But the `jobs` watcher prunes any failed job that went terminal in the meantime, so the claim can be off after refresh. Cheap fix: disable the row and header checkboxes while `stopping`. Or soften the wording to "were left selected".

### P3 3: Pluralization nits

`Stopping ${total} jobs...`, `Stopped ${stopped.length} of ${total} jobs.` and `${failed.length} could not be stopped` produce "Stopping 1 jobs..." and "Stopped 1 of 1 jobs." for single selections. Cheap to fix with a `job`/`jobs` ternary. Drop this if the reviewer considers it noise.

## Notes (not findings)

- Retrying 500/502/503/504 on `DELETE` is safe here. `JobManager.stop` on an already-terminal job returns `false` without error, so a retry after a proxy timeout that did stop the job is harmless. Note that `stopJobs` counts a `false` response ("already terminal") as stopped, which is reasonable.
- The global `createRateLimiterMiddleware` only retries 429s on `GET`. This PR handles `DELETE` locally rather than widening the middleware to non-idempotent methods, which is the right call.
- `deleteJob` now throws `ApiError` (an `Error` subclass) instead of `Error`. The other caller, `JobStates/JobState.vue`, is unaffected.
- Test coverage is good. Concurrency, retry counts, the no-retry paths (403 and long `Retry-After`), progress callbacks, failed-job reselection, refresh-failure visibility and the request body are all asserted. No tests were weakened. The old per-job `deleteJob` assertions were replaced by equivalent `stopJobs` call assertions plus the summary text.
