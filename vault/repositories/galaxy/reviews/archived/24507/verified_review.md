### P2 1: Notification failures after a stop show as a green success alert (implementation verified)

`sendNotificationToUsers` used to set `status = "warning"` when any notification failed. It now returns only a string, which `onStopJobs` appends to the stop summary, and the alert variant is picked from `failed.length` alone. A partial failure ("Notification sent to 1 out of 2 users. 1 errors occurred.") or a thrown one ("Notifications could not be sent: ...") therefore shows in an `alert-success` when every stop succeeded. The test `finishes stopping when sending notifications fails` asserts `.alert-success` for that failure message.

Have `sendNotificationToUsers` return `{ ok, message }` and pick `danger` (a stop failed), then `warning` (a notification failed), then `success`. Expect `.alert-warning` in the tests.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the flipped `.alert-warning` assertion fails on the PR head and passes with the fix.

</details>

### P2 2: Stop workers back off independently and keep sending after a rate-limited job gives up (implementation verified)

In `stopJobs()` a 429 pauses only the worker that received it, and the other three keep sending to the limiter. When a job gives up (retries exhausted, or `Retry-After` over 30 s), its worker dequeues the next job and sends again, so a `Retry-After: 60` still sends every remaining DELETE within about a second.

<details><summary>Evidence</summary>

A simulation of the PR's logic against an nginx-style 1 r/s, burst 5 limiter: 200 jobs took about 479 requests, roughly half of them 429s, and about 17 jobs still failed. With `Retry-After: 60`, all 100 remaining DELETEs were sent within about 1 s. With a shared pause, the tight-limiter failures dropped to 0 and the long-Retry-After case to 4 requests.

</details>

Keep a shared `pauseUntil` that any 429 advances, and have every worker wait for it before each request. Once a rate-limited job gives up, fail the jobs still queued with that same 429 error, without sending them, so the alert shows the real cause and they stay selected for a resubmit. Keep 5xx give-ups per job: a 500 on `DELETE /api/jobs/{id}` can come from one bad job record, and it shouldn't block stopping the rest.

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

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort.

</details>

### P3 1: Job selection stays editable while a stop is in flight (implementation verified)

Only Submit is disabled while `stopping`. If the admin changes the selection during a slow bulk stop (retries can take tens of seconds), `this.selectedStopJobIds = failed.map(...)` overwrites the change when the stop finishes. Disable the header and row checkboxes while `stopping`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: an in-flight test asserting the checkboxes are disabled fails on the PR head and passes with the fix.

</details>

### P3 2: Notification-failure test spies on component internals (implementation verified)

`finishes stopping when sending notifications fails` stubs `wrapper.vm.sendNotificationToUsers` and reads `vm.stopping`. Fail `POST /api/notifications` through `useServerMock` instead. Use a 500 for one user to cover the partial-failure path and a network error to cover the thrown path, and assert the alert variant and text.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort: both rewritten tests pass against the fix for P2 1.

</details>

### P3 3: Missing assertions for Submit disabled in flight and for no body without a message (implementation verified)

No test checks that Submit is disabled while a stop is pending, and no test checks that `deleteJob(jobId)` sends no body when there is no message. Add a JobsList test that holds `stopJobs` on a pending promise, and a `deleteJob` test that reads `request.text()`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort: the in-flight test fails when `:disabled="stopping"` is removed from Submit.

</details>

### P3 4: Retry decision duplicated from `useRetryGate` (implementation verified)

`stopWithRetry` re-derives `useRetryGate.isRetrying`'s predicate (retryable, under `MAX_RETRIES`, `Retry-After` within `RETRY_BACKOFF_CAP_MS`) and re-implements `retryAfterMsOf` inline. Export `retryAfterMsOf` and `shouldRetryApiError(error, failures, isRetryable = isRetryableApiError)` from `utils/simple-error.ts`, and use them in both places so the two policies can't drift.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the existing `retryGate.test.ts` (12 tests) and `jobs.test.ts` pass unchanged after the extraction.

</details>

### P3 5: O(n·m) `includes` in `sendNotificationToUsers` (implementation verified)

`this.unfinishedJobs.filter((job) => jobIds.includes(job.id))` is quadratic. With "show all running" on a large server, select-all takes about 163 ms at 5k jobs and 2.5 s at 20k (measured in Node). Look the IDs up in a `Set` instead.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the fix is applied and the JobsList tests pass.

</details>

### P3 6: "Stopping 1 jobs..." / "Stopped 1 of 1 jobs." (implementation verified)

The stop summaries always say "jobs". Use "job" when one job is selected.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: a single-job stop test now asserts "Stopped 1 of 1 job.".

</details>

### P3 7: Dev follow-up, not for 26.1: a bulk stop endpoint, or a shared bounded-concurrency helper

Stopping N jobs still costs at least N requests, each with its own commit and handler stop call, which is a per-request limiter's worst case. A `PUT /api/jobs/stop`-style endpoint that takes a list of IDs and a message would make this a single request, and would remove this view's need for client-side concurrency and retry. If bulk client loops stay, the worker pool in `stopJobs` is a generic "map with bounded concurrency, settle all" helper. Moving it into `client/src/utils` would give the next bulk action (datasets, histories) a reusable version. Neither belongs on this release branch.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Opus 5.5 at medium effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort.

</details>
