Run via Claude Opus 5.5 at high effort.

# Performance challenge debrief: tes_task_state_polling

Reviewed head `818dfbff276` on `release_26.2`. I changed no runtime code. I added one cheap regression guard, `4daaeb28a31` ("Check that idle TES task watches don't read the job"): the per-interval test now also asserts the job state is read once per interval, not once per monitor loop. I checked that it fails when a state read is put on the not-due path.

The per-job cost is one job-state read (2 SQL statements) plus one TES `GET ?view=BASIC` per `tes_status_check_interval`, run serially on the runner's monitor thread. Checks that aren't due cost about 0.6 µs and do no I/O. Load is linear and modest, and it degrades gracefully. The one real hazard is the missing HTTP timeout: a TES server that accepts connections but never answers stops every TES check on that handler until a restart. I confirmed this. It stays an upstream pydantic-tes fix, as the record already says.

## Not acted on

- **No HTTP timeout (confirmed, not fixed here).** A listener that accepts and never replies kept `fetch_tes_task_state` blocked for more than 20 s, with no bound in sight. pydantic-tes 0.4.0 (still the latest on PyPI) calls the module-level `requests.get` with no timeout. Galaxy can't set one without reimplementing `get_task` on TesClient's private `_url`, `_headers` and funnel hacks, or changing process-global socket defaults. Recommendation: pydantic-tes gets `TesClient(..., timeout=(connect, read))`, Pulsar's `tes_client_from_params` passes a `tes_timeout` destination param, then Galaxy bumps its pins. The impact is bounded:
  - Pulsar's AMQP status messages still drive jobs, so only the dead-task detection stalls.
  - The monitor thread is a daemon, and shutdown joins it with a timeout.
  - A black-holed host costs about 127 s per check (the Linux SYN retry limit), then the error is retried. Only a silent server holding the connection open blocks forever.
- **Job-state read is 2 statements; a narrow select would be 1.** `get_state()` does `session.get` and then `refresh` on the per-loop session, and loads the full Job row (command line, tool_state JSON, stdout/stderr) twice. On SQLite with 500 realistic rows, that measured 2.0 statements and about 840 µs per check. A `select(Job.state, Job.job_runner_external_id, Job.handler)` measured 1.0 statement and about 210 µs. At 1,000 concurrent TES jobs that saves about 17 statements/s and under 1 s of monitor-thread time per minute. That's small next to the HTTP cost, and it would replace the shared `get_state()` abstraction with a custom query plus test plumbing, so I left it.
- **TES client built per check.** It costs about 2 µs. `TesClient` holds no connection pool (each request makes its own `requests` Session), so caching it would save nothing.
- **Startup or recovery burst.** Jobs recovered together all come due in the same monitor pass one interval later. The pass is serial, so the TES server sees one connection with requests back to back (about 1.4 ms each over loopback), not concurrent load. After that pass, the jobs spread out by its duration. No jitter is needed.
- **Throughput ceiling.** One thread does N/interval checks per second. When N × latency exceeds the interval, `next_check` is set before the request, so the effective interval stretches to about N × latency instead of piling up. Detection slows, but no job is wrongly failed: the grace clock uses check times. At 1,000 jobs, 60 s and 50 ms TES latency, the thread is about 85% busy. Past that, a batch `GET /tasks?state=…` (TES 1.1 list filters) would be the scalable design, but pydantic-tes `list_tasks` takes no filters. This is speculative and not needed now.
- **Watch dict.** One small dataclass per watched task. The monitor removes it at the job's next due check. Jobs Pulsar has reported drop with no DB or HTTP work, because the `pulsar_reported` check short-circuits.

<details>
<summary>Full assessment</summary>

### Cadence and per-loop cost

`AsynchronousJobRunner.monitor` runs every `job_runner_monitor_sleep` seconds (1 s by default) and calls `check_watched_item` for every watched job. Before this branch the TES runner ran a no-op monitor (`poll = False`). For a check that isn't due, the work is `monotonic()`, a dict `setdefault` and a comparison:

- Measured: 0.59 µs per job, about 6 ms per loop at 10,000 watched jobs.
- `check_database_connection` per loop issues no query, because the scoped session from the previous loop was closed by `unset_request_id`.
- No session is created unless a check is due.

### Due check

1. `_waits_for_pulsar`: `pulsar_reported` is checked first (no I/O). Then `_runs_task_here` runs `job_wrapper.get_state()` (`session.get` plus `refresh`, 2 SELECTs on the fresh per-loop session) and `get_job()` (an identity-map hit).
2. `parse_tes_job_params` plus `tes_client_from_params`: about 2 µs.
3. `GET /v1/tasks/{id}?view=BASIC` and pydantic parsing: 1.37 ms over loopback with a new TCP connection each time. Real latency to a remote TES server dominates.
4. Only once a task has been finished for the grace period: one FULL GET (its size depends on the server's logs; tails are capped when shown), a second state read, then `fail_job`. This happens once per failed job.

The order is right: the DB check runs before the HTTP call, so stopped, finished or resubmitted jobs never reach the TES server.

### Message-queue thread

For final statuses only, `_update_job_state_for_status` adds one `_runs_task_here` call (at most 2 statements), and then the parent's `get_state()` adds a refresh. That's once per job lifetime, so it's negligible. Non-final statuses short-circuit before any query.

### Kill path

`_kill_remote_job` adds one BASIC GET only when `client.kill()` raised. `cancel_task` itself has no timeout either. That's pre-existing behavior, on the stop-queue and worker threads, and it's covered by the same upstream timeout recommendation.

### Scaling summary

Monitor-thread busy fraction ≈ N × (DB + HTTP latency) / interval:

| Concurrent TES jobs | TES latency | DB per check | Busy fraction (60 s) |
|---|---|---|---|
| 100 | 50 ms | ~1 ms | ~9% |
| 1,000 | 50 ms | ~1 ms | ~85% |
| 1,000 | 200 ms | ~1 ms | >100%, effective interval ~200 s |

TES server load per handler is N/interval requests per second on a single connection at a time. That's about 17 req/s at 1,000 jobs. Handlers check only their own jobs, so nothing is duplicated across handlers.

### Measurements

Scripts are in the session scratchpad (not kept):

- `measure_db.py`: Galaxy model on SQLite, 500 Job rows with a 3 KB command line, a 200-key tool_state and destination params. It compares `get_state()+get_job()` with a narrow select over 3 loops with fresh scoped sessions.
- `measure_checks.py`: imports the unit-test `FakeTesServer` and `Harness`. It times client construction, the BASIC fetch, not-due and due `check_watched_item`, and a silent-server fetch on a raw listening socket that never accepts data.

The SQLite numbers are local and have no network round trip. On PostgreSQL the 2-versus-1 statement difference costs one extra round trip per check. These numbers are measured, not production data.

### Tests

`PYTHONPATH=lib .venv/bin/python -m pytest -q -p no:cacheprovider -p no:postgresql test/unit/app/jobs/test_pulsar_tes_task_checks.py test/unit/app/jobs/test_pulsar_runner.py test/unit/app/jobs/test_runner_pulsar.py`: 83 passed. black, isort and ruff are clean on the test file. mypy reports only the pre-existing `galaxy/managers/notification.py` error.

</details>
