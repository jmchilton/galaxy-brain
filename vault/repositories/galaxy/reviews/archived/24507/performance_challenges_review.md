# Performance challenge review — PR #24507

- Profile: gx_performance_challenger
- Model: Claude Opus 5.5, low effort
- Reviewed commit: `7c7538edb16` (base `release_26.1`)
- Debrief and simulation data: [performance_challenges_debrief.md](performance_challenges_debrief.md)

Verdict: a clear improvement. Capping concurrency at 4 fixes the reported burst. The remaining concerns are about how the retry loop behaves under sustained rate limiting or server errors. The numbers come from a simulation of the PR's own logic, not from a live server.

### P2 1: Workers back off independently and keep dequeuing after a job gives up

In `stopJobs()` (`client/src/api/jobs.ts`), a 429 only pauses the worker that received it, and the other three keep sending. When a job gives up because its retries ran out or `Retry-After` exceeded 30 s, the worker immediately pulls the next job and sends to the limiter again.

Simulated against an nginx-style 1 r/s, burst 5 limiter:
- 200 jobs took about 479 requests, roughly half of them 429s, and about 17 jobs still failed.
- A systematic 500 cost 400 requests and about 4.5 min for 100 jobs before the UI reported anything. Submit stays disabled the whole time.
- A `Retry-After: 60` made all 100 remaining DELETEs go out within about 1 s.

Suggested fix: keep a shared `pauseUntil` that any 429 advances, and have every worker wait for it before its next request. Once a retryable failure gives up, mark the rest of the queue as failed without sending it. Only do this for retryable failures: a 403/404 on one job should not abort the others. In the same simulation, this took the tight-limiter failures to 0, the systematic-500 case to 13 requests and 12 s, and the long-Retry-After case to 4 requests. The jobs not sent stay selected under the PR's existing "remain selected" behaviour, so resubmitting still works.

### P3 1: O(n·m) `includes` in `sendNotificationToUsers`

`this.unfinishedJobs.filter((job) => jobIds.includes(job.id))` was touched by this PR. With "show all running" on a large server, selecting all takes 163 ms at 5k jobs and 2.5 s at 20k (measured in Node). A `Set` takes under 2 ms. Build `const ids = new Set(jobIds)` and use `ids.has(job.id)`. The `jobs` watcher's `selectedStopJobIds` filter has the same shape, but it predates the PR and is untouched.

### P3 2: Follow-up (dev, not 26.1): bulk stop endpoint

N jobs still cost at least N requests, each with its own commit and its own call into the job handler's stop. That is a per-request limiter's worst case. A `PUT /api/jobs/stop` (or similar) that takes a list of ids and a message would make this one request with one commit, and would make the client-side concurrency and retry machinery unnecessary for this view. This is out of scope for a release-branch fix.
