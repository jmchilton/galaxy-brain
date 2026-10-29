# Performance challenge debrief — PR #24507 @ 7c7538edb16

Client-only change: admin JobsList bulk stop goes from unbounded `Promise.all` of `DELETE /api/jobs/{id}` to `stopJobs()` (4 workers, per-job retry of 429/5xx with jittered backoff, Retry-After honoured up to 30 s).

## What improves

- Peak concurrency drops from N to 4. That is the main fix for #24506 and is sound.
- One list refresh after the batch, unchanged; no new polling.
- Notifications only go to users whose jobs stopped (fewer POSTs when some fail).

## Measurements (simulation, not a live Galaxy)

Scripts: [performance_sims/](performance_sims/). `sim.mjs` copies the PR's `stopJobs` + `retryBackoffMs` logic onto a virtual clock with a fake `deleteJob` (50 ms latency) and averages 20 runs. `sim_shared.mjs` is the same, plus a shared pause after any 429 and stop-dequeuing once a retryable failure gives up. The limiter is modelled as an nginx `limit_req` leaky bucket returning 429 with no `Retry-After` (nginx's default). Numbers are indicative; I did not run a real nginx in front of Galaxy.

| Scenario | PR: requests / wall / failed | Shared pause + stop: requests / wall / failed |
|---|---|---|
| 50 jobs, 1 r/s burst 5 | 114 / 43 s / 3.1 | 105 / 48 s / 0 |
| 200 jobs, 1 r/s burst 5 | 479 / 180 s / 17.4 | 439 / 207 s / 0 |
| 200 jobs, 5 r/s burst 10 | 280 / 39 s / 0.1 | 274 / 39 s / 0 |
| 100 jobs, every DELETE 500 | 400 / 270 s / 100 | 13 / 12 s / 100 |
| 100 jobs, 429 Retry-After 60 s | 100 / 1.3 s / 100 | 4 / 0.1 s / 100 |

What the numbers show:
- With a tight limiter, about half of all requests are 429s. Each worker backs off alone while the other three keep sending, so roughly 8% of jobs still use up their retries and fail. A shared pause removes those failures.
- A systematic server error (a 500 from a broken handler or DB problem) costs 4 requests per job and about 4.5 min for 100 jobs, with the UI stuck on "Stopping…" and the Submit button disabled.
- A long `Retry-After` (> 30 s) makes each job fail fast. The worker then dequeues the next one at once, so the remaining queue hits the limiter about 100 times in about 1 s, after the server asked for 60 s of silence.

`incl.mjs`: `jobs.filter(j => ids.includes(j.id))` in `sendNotificationToUsers` takes 6 ms at 1k, 163 ms at 5k and 2.5 s at 20k jobs, against under 2 ms with a `Set`.

## Not findings / out of scope

- Server per-job cost (`JobManager.stop`: `mark_deleted` lazy-loads output datasets and their `history_associations`, then commits once per job) is unchanged by the PR. 4-way concurrency is mild for it.
- Notifications are still one sequential POST per user. This predates the PR and is unchanged.
- The `jobs` watcher's `selectedStopJobIds.filter(id => unfinishedIds.includes(id))` has the same O(n·m) shape. It predates the PR and is untouched.

## Measurement plan if someone wants live data

1. Run Galaxy on a free port behind nginx with `limit_req zone=api rate=1r/s burst=5; limit_req_status 429;` on `/api/`.
2. Queue about 200 jobs on a local runner with a long sleep tool, then select all in Admin → Jobs and stop them.
3. Count 429s and DELETEs in the nginx access log, and the jobs left selected. Compare against a build with a shared pause.
4. Inject a 500 (temporarily raise in `JobsAPI.delete`) and time how long until the UI reports.

## Recommendations

See [performance_challenges_review.md](performance_challenges_review.md): a shared pause / stop-on-giving-up circuit breaker (P2), a `Set` for the notification filter (P3), and a bulk-stop endpoint as a dev follow-up (P3).
