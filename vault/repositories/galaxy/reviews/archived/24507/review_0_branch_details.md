Branch `pr_24507_review_0` builds on the PR head `7c7538edb16` in nine commits.

- **Stop summary and selection.** Notification failures now show as a warning alert instead of a success alert, the job checkboxes are locked while a stop is in flight, and a single job reads "job" rather than "jobs".
- **Rate limiting in `stopJobs`.** A 429 now pauses every worker, not just the one that received it. Once a rate-limited job gives up, the jobs still queued fail with that 429 error and are never sent. Server errors still give up one job at a time.
- **Shared retry rule.** `stopJobs` and `useRetryGate` now use one `shouldRetryApiError` helper, so the two retry rules can't drift apart.
- **Notification lookups.** They use a `Set`.
- **Tests.**
  - The vitest tests now fail notifications through the server mock rather than stubbing component internals.
  - New vitest tests cover the in-flight disabled state and a stop with no message sending no request body.
  - A new Selenium test stops a running job from Admin > Jobs. It is written but not yet run.

- `7bfdd66bd84` Show notification failures after stopping jobs as a warning: `sendNotificationToUsers` returns `{ ok, message }`, and `onStopJobs` picks danger, then warning, then success.
- `8eb99842da9` Test notification failures through the server mock, not component internals: replaces the `vm` spy with a test where `POST /api/notifications` returns 500 for one user and a test where the request hits a network error.
- `27fa371080d` Test Submit stays disabled during a stop and no body without message: holds `stopJobs` on a pending promise, and checks `deleteJob(jobId)` sends an empty body.
- `f9c8ef87d3c` Lock job selection while stopping so results don't overwrite edits: adds `:disabled="stopping"` to the header and row checkboxes.
- `274f9c6a863` Look up stopped jobs in a Set when notifying users: replaces the O(n·m) `includes` filter.
- `c638753dabb` Use singular 'job' in stop summaries for one job: picks "job" or "jobs" from the count, and asserts "Stopped 1 of 1 job.".
- `9c7a78b6c65` Share retry predicate between stopJobs and useRetryGate: exports `retryAfterMsOf` and `shouldRetryApiError` from `utils/simple-error.ts`, and both callers use them.
- `e4788a0b413` Pause all stop workers on 429 and skip queued jobs once rate limit gives up: adds a shared `pauseUntil`, and a rate-limit error that later dequeues fail with. The new tests were red first.
- `5022bcbfd8c` Add Selenium test for stopping a selected job from Admin > Jobs: adds `test_admin_jobs_stop_selected`, plus the `navigation.yml` selectors and `data-description` hooks it needs. Not run, because no Galaxy server or venv was available in the worktree.
