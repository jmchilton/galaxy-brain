Run via Claude Opus 5.5 at high effort.

# Performance challenge debrief: tes_task_state_polling_unreachable

Reviewed `fdb30869fa8..1b65da358a9`. I fixed two request-count problems with the cancel retries and added a regression test for each. The head is now `c0d2174aeaf`.

- `3fc60a9739f` **Hold TES cancel retries for an unreachable server's next probe.** The "one request per unreachable server per sweep" dedup worked only for cancels that came due in the same sweep. Cancels added at different times never did, so each asked the dead server on its own backoff. Simulated with 200 jobs on a server answering 503, their unreachable timeouts spread over 10 minutes: steady state was about 20 cancel POSTs a minute, and that would have lasted the full 24 h retry window. Now, after a failed probe, the server's other pending cancels wait for its next probe. The server is asked once per backoff interval (at most 120 s) however many cancels it holds. Test: `test_pending_cancels_on_one_unreachable_server_share_its_retry_schedule` (40 requests before, 12 after).
- `c0d2174aeaf` **Leave a job failed for an unreachable server to the cancel retries.** `_check_tes_server_unreachable` calls `fail_job` on the monitor thread right after the server failed the check. `fail_job` then stopped the job, so `client.kill()` sent the same dead server a synchronous request: one more request per failed job, almost certain to fail. With retries on, the job now gets `stop_job = False` and its cancel goes straight into `_pending_tes_cancels`, with the first attempt at the first retry. With `tes_cancel_retry_timeout: 0` the immediate cancel stays as before. Such cancels start at 0 attempts, so the give-up log counts correctly. Test: `test_job_failed_for_an_unreachable_server_leaves_its_cancel_to_the_retries`.

In the 50-job, 74-minute simulation, cancel POSTs dropped from 436 to 13. In the 200-job simulation they dropped from 856 to 57. Status GETs didn't change.

## Not acted on

- **Status checks to an unreachable server: one GET per task per interval until `tes_unreachable_timeout`.** This is the parent's cadence. The branch doesn't add to it, and it now ends after an hour instead of never. Coalescing checks per server would mean inferring an unreachable clock for tasks that weren't asked, which is a design change for little gain when servers fail fast.
- **Black-holed servers (no pydantic-tes timeout).** This is still the upstream issue. Each retry probe can block the monitor thread for about 127 s, now at most once per 120 s per server, for up to `tes_cancel_retry_timeout` (24 h by default). Before this branch, checks against such a server blocked N times per interval, forever. The branch is not materially worse, but a `tes_cancel_retry_timeout` this long keeps one dead server slowing that handler's checks of healthy servers for a day.
- **Stop-queue thread.** One synchronous cancel per stopped job. Before the branch it was two (cancel, then a state read). Skipping it for a server known to be unreachable would need server health shared across threads, and the real fix is a request timeout.
- **Wording in docs.** The docstring and sample config say retries come "10 seconds later, then at most 2 minutes apart". A cancel that joins a server already in backoff now waits for that server's next probe, at most 120 s away. "At most 2 minutes apart" still holds; I left the wording.
- **Memory.** Each pending cancel holds a small dataclass plus a shallow copy of the destination params, for at most the retry timeout. That's a few KB each, so only a mass outage with thousands of stopped jobs reaches megabytes.

<details>
<summary>Full assessment</summary>

### Per-sweep work added by the branch

`check_watched_items` now also calls `_retry_tes_cancels` every monitor sweep (once a second). Microbenchmark with P pending cancels on one unreachable server, using a fake cancel that raises ConnectionError:

| P | Sweep with nothing due | Sweep with all due (1 probe, P−1 deferred, hold pass) |
|---|---|---|
| 100 | 3.7 µs | 0.16 ms |
| 1,000 | 32 µs | 0.87 ms |
| 10,000 | 319 µs | 9.2 ms |

The lock is held only for the scan and the hold pass (O(P)), so a stopping thread waits at most that long. The retries do no DB access. The `check_watched_item` early return with checks off costs nothing measurable. Jobs handed to the monitor drop on their first pass.

### Monitor thread on by default

`poll` is now on when either `tes_status_check_interval` or `tes_cancel_retry_timeout` is positive. With checks off, a sweep is the base loop (scoped session id, `check_database_connection`, which issues no query per the parent debrief) plus an empty `_retry_tes_cancels`. That's negligible.

### Simulations

`sim_mass_failure.py` drives the unit test's `FakeTesServer` and `Harness` with a fake clock. N RUNNING jobs join `watched` spread over S seconds. The server answers 503 to everything. It runs `check_watched_items` every simulated second for S + 3600 + 780 s and counts GETs and POSTs per minute.

| Scenario | Code | Status GETs | Cancel POSTs | Steady state after failure |
|---|---|---|---|---|
| 50 jobs over 60 s | before | 3,050 | 436 | 25 POST/min |
| 50 jobs over 60 s | after | 3,050 | 13 | 1 POST / 2 min |
| 200 jobs over 600 s | before | 12,200 | 856 | about 20 POST/min |
| 200 jobs over 600 s | after | 12,200 | 57 | 1 POST / 2 min |

"Before" includes the burst of synchronous kills as the jobs failed: 50 POSTs in the minute of failure for the 50-job run. Before the fix, the steady rate grew with the pending count up to one probe per sweep. 1,000 cancels on a dead server would have meant about 1 request/s for 24 h (86,400 requests). Now it's about 720. Server-side cost is low when the server fails fast (connection refused, 5xx). It matters for a black-holed server and for a server that is overloaded and returning 503.

### Measured, not production

All numbers are local: a loopback fake server and fake clocks. No PostgreSQL was needed, because the branch adds no queries. Scripts are in the session scratchpad and weren't kept: `sim_mass_failure.py` and `bench_sweep.py`.

### Tests

`PYTHONPATH=lib .venv/bin/python -m pytest -q -p no:cacheprovider -p no:postgresql test/unit/app/jobs/test_pulsar_tes_task_checks.py test/unit/app/jobs/test_pulsar_runner.py test/unit/app/jobs/test_runner_pulsar.py`: 126 passed (124 before, plus 2 new). Both new tests failed before their fixes: 40 vs 12 requests, and a POST at failure time. The give-up assertion fails with `attempts=1`. black and isort are clean. mypy on `pulsar.py` reports the same error count before and after.

</details>
