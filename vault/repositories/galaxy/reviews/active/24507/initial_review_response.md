

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/learning_galaxy.md) was run via Claude Opus 5.5 at medium effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile: gx_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: 7c7538edb16

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- Client-only change (admin Jobs list + `client/src/api/jobs.ts`); no API, schema, or tool/workflow behavior changes. Reverting is a single client revert.
- Quiet behavior change: `deleteJob` previously passed the stop message as `data:` (ignored by openapi-fetch), so it never reached the server; it now sends it as `body`. Admin stop messages will start appearing on stopped jobs, and every other `deleteJob` caller now sends its message too.
- New exported `stopJobs` helper (bounded concurrency 4, retry via existing `simple-error` backoff utilities) becomes a reusable client contract, but is internal and easy to change.
- UI semantics shift slightly: failed jobs stay selected and the stop message is retained for resubmit; notifications now go only to owners of successfully stopped jobs.

</details>

<details><summary>Risk Review Advice</summary>

Confirm the `data:` to `body:` fix is intended and that the server-side `DELETE /api/jobs/{job_id}` message handling is acceptable now that it is actually exercised, including for other `deleteJob` callers. Otherwise review is about UX of the retained-selection/error messaging rather than durable risk.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24507_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24507_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24507_review_0) builds on the PR head `7c7538edb16` in nine commits.

- **Stop summary and selection.** Notification failures now show as a warning alert instead of a success alert, the job checkboxes are locked while a stop is in flight, and a single job reads "job" rather than "jobs".
- **Rate limiting in `stopJobs`.** A 429 now pauses every worker, not just the one that received it. Once a rate-limited job gives up, the jobs still queued fail with that 429 error and are never sent. Server errors still give up one job at a time.
- **Shared retry rule.** `stopJobs` and `useRetryGate` now use one `shouldRetryApiError` helper, so the two retry rules can't drift apart.
- **Notification lookups.** They use a `Set`.
- **Tests.**
  - The vitest tests now fail notifications through the server mock rather than stubbing component internals.
  - New vitest tests cover the in-flight disabled state and a stop with no message sending no request body.
  - A new Selenium test stops a running job from Admin > Jobs. It is written but not yet run.

- [`7bfdd66bd84`](https://github.com/jmchilton/galaxy/commit/7bfdd66bd84) Show notification failures after stopping jobs as a warning: `sendNotificationToUsers` returns `{ ok, message }`, and `onStopJobs` picks danger, then warning, then success.
- [`8eb99842da9`](https://github.com/jmchilton/galaxy/commit/8eb99842da9) Test notification failures through the server mock, not component internals: replaces the `vm` spy with a test where `POST /api/notifications` returns 500 for one user and a test where the request hits a network error.
- [`27fa371080d`](https://github.com/jmchilton/galaxy/commit/27fa371080d) Test Submit stays disabled during a stop and no body without message: holds `stopJobs` on a pending promise, and checks `deleteJob(jobId)` sends an empty body.
- [`f9c8ef87d3c`](https://github.com/jmchilton/galaxy/commit/f9c8ef87d3c) Lock job selection while stopping so results don't overwrite edits: adds `:disabled="stopping"` to the header and row checkboxes.
- [`274f9c6a863`](https://github.com/jmchilton/galaxy/commit/274f9c6a863) Look up stopped jobs in a Set when notifying users: replaces the O(n·m) `includes` filter.
- [`c638753dabb`](https://github.com/jmchilton/galaxy/commit/c638753dabb) Use singular 'job' in stop summaries for one job: picks "job" or "jobs" from the count, and asserts "Stopped 1 of 1 job.".
- [`9c7a78b6c65`](https://github.com/jmchilton/galaxy/commit/9c7a78b6c65) Share retry predicate between stopJobs and useRetryGate: exports `retryAfterMsOf` and `shouldRetryApiError` from `utils/simple-error.ts`, and both callers use them.
- [`e4788a0b413`](https://github.com/jmchilton/galaxy/commit/e4788a0b413) Pause all stop workers on 429 and skip queued jobs once rate limit gives up: adds a shared `pauseUntil`, and a rate-limit error that later dequeues fail with. The new tests were red first.
- [`5022bcbfd8c`](https://github.com/jmchilton/galaxy/commit/5022bcbfd8c) Add Selenium test for stopping a selected job from Admin > Jobs: adds `test_admin_jobs_stop_selected`, plus the `navigation.yml` selectors and `data-description` hooks it needs. Not run, because no Galaxy server or venv was available in the worktree.

</details>

</details>

### P2 1: Notification failures after a stop show as a green success alert (implementation verified)

`sendNotificationToUsers` used to set `status = "warning"` when any notification failed. It now returns only a string, which `onStopJobs` appends to the stop summary, and the alert variant is picked from `failed.length` alone. A partial failure ("Notification sent to 1 out of 2 users. 1 errors occurred.") or a thrown one ("Notifications could not be sent: ...") therefore shows in an `alert-success` when every stop succeeded. The test `finishes stopping when sending notifications fails` asserts `.alert-success` for that failure message.

Have `sendNotificationToUsers` return `{ ok, message }` and pick `danger` (a stop failed), then `warning` (a notification failed), then `success`. Expect `.alert-warning` in the tests.

Fixed on the review branch in [`7bfdd66bd84`](https://github.com/jmchilton/galaxy/commit/7bfdd66bd84).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the flipped `.alert-warning` assertion fails on the PR head and passes with the fix.

</details>

### P2 2: Stop workers back off independently and keep sending after a rate-limited job gives up (implementation verified)

In `stopJobs()` a 429 pauses only the worker that received it, and the other three keep sending to the limiter. When a job gives up (retries exhausted, or `Retry-After` over 30 s), its worker dequeues the next job and sends again, so a `Retry-After: 60` still sends every remaining DELETE within about a second.

<details><summary>Evidence</summary>

A simulation of the PR's logic against an nginx-style 1 r/s, burst 5 limiter: 200 jobs took about 479 requests, roughly half of them 429s, and about 17 jobs still failed. With `Retry-After: 60`, all 100 remaining DELETEs were sent within about 1 s. With a shared pause, the tight-limiter failures dropped to 0 and the long-Retry-After case to 4 requests.

</details>

Keep a shared `pauseUntil` that any 429 advances, and have every worker wait for it before each request. Once a rate-limited job gives up, fail the jobs still queued with that same 429 error, without sending them, so the alert shows the real cause and they stay selected for a resubmit. Keep 5xx give-ups per job: a 500 on `DELETE /api/jobs/{id}` can come from one bad job record, and it shouldn't block stopping the rest.

Fixed on the review branch in [`e4788a0b413`](https://github.com/jmchilton/galaxy/commit/e4788a0b413).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: new `stopJobs` tests "pauses every worker while one waits out a rate limit" and "stops sending once a rate-limited job gives up" fail on the PR head and pass with the fix. A guard test, "keeps stopping other jobs after a server error gives up", pins the per-job 5xx behaviour.

</details>

### P2 3: No E2E coverage for stopping selected jobs from Admin > Jobs

The path this PR fixes has no end-to-end test: select jobs, enter a stop message, submit, see the summary, and the jobs get stopped. `test_admin_jobs_display` only opens the page. The `data:` -> `body:` fix shows the stop message was silently dropped before, and no test caught it.

Add a Selenium test in `lib/galaxy_test/selenium/test_admin_app.py`:
- Run a long `cat_data_and_sleep` job.
- Filter Admin > Jobs to that user and tool, and wait until it is the only selectable row before using select-all, so other tests' jobs are never stopped.
- Submit a message and assert "Stopped 1 of 1 job.".
- Through the `admin_job_list` API view, assert the job is `deleting`/`deleted` and its `info` equals the stop message.

This needs `navigation.yml` selectors and `data-description` hooks on the alert and Submit button. The review branch has this test, but it was not run, because no bootstrapped Galaxy server was available in the review worktree.

Fixed on the review branch in [`5022bcbfd8c`](https://github.com/jmchilton/galaxy/commit/5022bcbfd8c).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort.

</details>

### P3 1: Job selection stays editable while a stop is in flight (implementation verified)

Only Submit is disabled while `stopping`. If the admin changes the selection during a slow bulk stop (retries can take tens of seconds), `this.selectedStopJobIds = failed.map(...)` overwrites the change when the stop finishes. Disable the header and row checkboxes while `stopping`.

Fixed on the review branch in [`f9c8ef87d3c`](https://github.com/jmchilton/galaxy/commit/f9c8ef87d3c).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: an in-flight test asserting the checkboxes are disabled fails on the PR head and passes with the fix.

</details>

### P3 2: Notification-failure test spies on component internals (implementation verified)

`finishes stopping when sending notifications fails` stubs `wrapper.vm.sendNotificationToUsers` and reads `vm.stopping`. Fail `POST /api/notifications` through `useServerMock` instead. Use a 500 for one user to cover the partial-failure path and a network error to cover the thrown path, and assert the alert variant and text.

Fixed on the review branch in [`8eb99842da9`](https://github.com/jmchilton/galaxy/commit/8eb99842da9).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort: both rewritten tests pass against the fix for P2 1.

</details>

### P3 3: Missing assertions for Submit disabled in flight and for no body without a message (implementation verified)

No test checks that Submit is disabled while a stop is pending, and no test checks that `deleteJob(jobId)` sends no body when there is no message. Add a JobsList test that holds `stopJobs` on a pending promise, and a `deleteJob` test that reads `request.text()`.

Fixed on the review branch in [`27fa371080d`](https://github.com/jmchilton/galaxy/commit/27fa371080d).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort: the in-flight test fails when `:disabled="stopping"` is removed from Submit.

</details>

### P3 4: Retry decision duplicated from `useRetryGate` (implementation verified)

`stopWithRetry` re-derives `useRetryGate.isRetrying`'s predicate (retryable, under `MAX_RETRIES`, `Retry-After` within `RETRY_BACKOFF_CAP_MS`) and re-implements `retryAfterMsOf` inline. Export `retryAfterMsOf` and `shouldRetryApiError(error, failures, isRetryable = isRetryableApiError)` from `utils/simple-error.ts`, and use them in both places so the two policies can't drift.

Fixed on the review branch in [`9c7a78b6c65`](https://github.com/jmchilton/galaxy/commit/9c7a78b6c65).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the existing `retryGate.test.ts` (12 tests) and `jobs.test.ts` pass unchanged after the extraction.

</details>

### P3 5: O(n·m) `includes` in `sendNotificationToUsers` (implementation verified)

`this.unfinishedJobs.filter((job) => jobIds.includes(job.id))` is quadratic. With "show all running" on a large server, select-all takes about 163 ms at 5k jobs and 2.5 s at 20k (measured in Node). Look the IDs up in a `Set` instead.

Fixed on the review branch in [`274f9c6a863`](https://github.com/jmchilton/galaxy/commit/274f9c6a863).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the fix is applied and the JobsList tests pass.

</details>

### P3 6: "Stopping 1 jobs..." / "Stopped 1 of 1 jobs." (implementation verified)

The stop summaries always say "jobs". Use "job" when one job is selected.

Fixed on the review branch in [`c638753dabb`](https://github.com/jmchilton/galaxy/commit/c638753dabb).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: a single-job stop test now asserts "Stopped 1 of 1 job.".

</details>

### P3 7: Dev follow-up, not for 26.1: a bulk stop endpoint, or a shared bounded-concurrency helper

Stopping N jobs still costs at least N requests, each with its own commit and handler stop call, which is a per-request limiter's worst case. A `PUT /api/jobs/stop`-style endpoint that takes a list of IDs and a message would make this a single request, and would remove this view's need for client-side concurrency and retry. If bulk client loops stay, the worker pool in `stopJobs` is a generic "map with bounded concurrency, settle all" helper. Moving it into `client/src/utils` would give the next bulk action (datasets, histories) a reusable version. Neither belongs on this release branch.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Opus 5.5 at medium effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort.

</details>
