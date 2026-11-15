Run via Claude Opus at high effort.

# Performance challenges debrief: tes_native_staging

I fixed the two problems I could measure and that the branch owns: state polls now use TES's MINIMAL view with a timeout, and job directory scans read one file at a time. I also added a query-count test for the job files routes, which TES calls once per file. Three commits on `tes_native_staging` (reviewed at `04085eef707`, not pushed):

- `36c8a97af9a` Check TES task states with the MINIMAL view and a timeout.
- `f2bf5a839d1` Scan TES job directory files one at a time for tool paths.
- `34906cb3cca` Pin the job files API to one query per TES file request.

Tests after the last commit:

- Unit: 103 passed (`test_tes_runner.py`, `test_pulsar_tes_task_checks.py`, `test_JobFilesManager.py`, `test_job_files_tokens.py`).
- `test/integration/test_job_files.py`: 40 passed.
- `test/integration/test_tes_runner.py`: 5 passed.
- ruff, black and isort are clean on the changed files.

Nothing went into the private security report.

## Not acted on

- **Two queries per job per poll.** The monitor reads each job's state with `job_wrapper.get_state()` before asking TES. On the monitor's fresh per-pass session, that is a `get` plus a `refresh`: two full-row `SELECT`s on `job`, measured on SQLite. With 1,000 TES jobs and the 10 s default interval, that is 200 primary-key selects a second. One batched `SELECT id, state … WHERE id IN (…)` per pass would make it one query. I left it alone for three reasons:
  - The poll interval already gates the read. The DRMAA and CLI runners read the state on every pass.
  - The TES HTTP call dominates the monitor thread's time, not these queries.
  - Batching would mean overriding `check_watched_items` and moving the unit tests off `FakeJobWrapper`. A one-query `MinimalJobWrapper.get_state` would help every runner, so it's better done outside this branch.
- **Polls run one after another on one thread.** Each due job costs one HTTP request on the monitor thread. At 10 ms per request, about 1,000 jobs fill a 10 s interval. Past that, the interval stretches; nothing piles up, because `_next_checks` is set before the request. Two ways to scale further, neither of them small: TES `ListTasks` with `view=MINIMAL` and a tag or `name_prefix` filter (how well servers filter is unverified), or polling from a small thread pool. The Pulsar TES runner on the parent branch polls the same way.
- **No connection reuse, and timeouts only on state checks.** pydantic-tes calls `requests.get`/`post` at module level, with no `Session` and no timeout. Every TES call opens a new connection, so caching the `TesClient` per check would save nothing. Building one costs 4 µs. My change adds a timeout to state checks only. `create_task` (a runner worker thread), the FULL-view `get_task` (the monitor, once per failed job) and `cancel_task` can still hang. The fix belongs in pydantic-tes: a `Session`, a timeout and a MINIMAL `get_task_state`. Galaxy could then drop the private `_build_url`/`_headers` access in `fetch_tes_task_state`.
- **Task JSON size.** It is about 340 bytes per input: 33 KiB at 100 inputs, 330 KiB at 1,000, 3.3 MiB at 10,000. Building 10,000 inputs takes 169 ms, once per job. Some TES servers may cap request size (a 4 MiB gRPC default comes to mind for Funnel's gateway), but I haven't verified that. It's worth checking before relying on collections with more than about 10,000 files.
- **The job files API, measured; nothing to fix:**
  - A GET, PUT or directory PUT with a `job_token` runs exactly one query, the job lookup. The new test pins this.
  - Token verification takes 7.5 µs; signing takes 7 µs.
  - The session is released before the body moves: `GalaxyFileResponse` for GET, `_new_staging_dir` for PUT.
  - A small PUT makes five threadpool hops. It takes 6.3–6.8 ms end to end, the same as a GET (6.8 ms), so the hops don't show.
  - Writing to an object-store output path, which Pulsar uses but TES-native jobs don't, runs 3 queries (job, outputs, library outputs), not one per output.
- **Aside, outside the branch: keep-alive in the integration test server.** Every request on a reused connection to the embedded test Galaxy takes about 40 ms longer, for any route, `/api/version` included; a fresh connection takes 6 ms. I reproduced it with plain uvicorn and a pre-bound `socket.socket()`, which the test driver's `uvicorn_serve` uses:
  - Probable cause: such a socket has `proto == 0`, so asyncio's `_set_nodelay` skips `TCP_NODELAY`. That gives the delayed-ACK/Nagle stall.
  - Production gunicorn sets `TCP_NODELAY` on its listening sockets, so this probably affects tests only. That is unverified.
  - Test clients that reuse connections, a Go TES worker among them, pay it per request. A one-line `setsockopt` in `driver_util.py` would fix it. It's not this branch's business.

<details>
<summary>Full review</summary>

## How I measured

The scripts are in the session scratchpad (`tns_harden/perf/`). Nothing used a TES server or a container.

- `bench_staging.py`: token cost; `staged_input_paths` on synthetic job and tool directories; task build time and JSON size; parse cost of a BASIC poll response.
- `bench_scan_mem.py`: peak memory of the job directory scan (`tracemalloc`).
- `get_state_queries.py`: SQL statements per `get_state` on an in-memory SQLite Galaxy model.
- A throwaway integration test (deleted) counted SQL per job files request with a SQLAlchemy `before_cursor_execute` listener on the embedded server's engine. It also timed 100–300 requests per route, with and without keep-alive.

## Runner monitor loop (`check_watched_item`)

What happens on every monitor pass (`job_runner_monitor_sleep`, 1 s by default), for each watched job:

- `job_state.check_limits()`. `has_limits()` reads only the config and the tool. Every 20th pass of a running job, `job_wrapper.check_limits` stats the outputs on disk. Neither touches the database.
- A dict lookup against `_next_checks`. Most passes stop here.

Once per `tes_poll_interval` (10 s by default), for each job:

- `get_state()`: 2 queries (measured).
- `parse_tes_job_params` plus `tes_client_from_params`: 4 µs (measured).
- One TES GET.

**The BASIC view was the measured problem.** The state check asked for BASIC, because pydantic-tes can't parse MINIMAL. BASIC carries `inputs[]` with every URL, and a TES-native task stages every file the job reads as an input:

| Inputs | BASIC response per poll | Galaxy-side parse | MINIMAL |
| --- | --- | --- | --- |
| 100 | 34 KiB | 0.17 ms | 33 bytes |
| 1,000 | 336 KiB | 1.5 ms | 33 bytes |
| 10,000 | 3.4 MiB | 20 ms | 33 bytes |

So 100 running jobs with 1,000 inputs each meant 3.4 MB/s of polling, plus the TES server loading and serializing every full task. Design B makes this much worse than the Pulsar TES runner, whose tasks have a handful of inputs.

**Fix: `36c8a97af9a`.** `fetch_tes_task_state` now requests `view=MINIMAL` itself and reads `state` from the JSON:

- A missing `state` (Funnel omits UNKNOWN, its zero value) means UNKNOWN.
- A 404 means `NOT_FOUND`.
- Other errors raise, and the runner retries them as before.
- It waits at most `TES_STATE_REQUEST_TIMEOUT`, 30 s. Before, a TES server that accepted connections and never answered stalled the monitor thread for good: no polls, no limit checks, for every job of the runner.
- The old `ValidationError` workaround for TES 1.1 states (PREEMPTED, CANCELING) is gone, because states stay plain text. The unused `http_status_code` went with it.
- Tradeoff: the URL and headers come from pydantic-tes's private `TesClient._build_url` and `_headers`, so authentication stays in one place. The proper home is pydantic-tes; see "Not acted on".
- The function is shared, so the Pulsar TES runner's checks and both runners' "nothing to cancel" checks use MINIMAL too.

Tests:

- The fake TES server answers MINIMAL with only `id` and `state`, as the spec says, and the view assertions in both TES test files now expect MINIMAL.
- The new `test_a_tes_server_that_hangs_does_not_stall_the_monitor` gives the fake a 5 s delay and patches the timeout to 0.1 s. It fails with the timeout removed: I checked.
- Rebase note: this touches 12 assertions in the parent branch's `test_pulsar_tes_task_checks.py`, on top of the test challenge's move of the fakes. If `tes_task_state_polling` changes `fetch_tes_task_state` or those assertions, expect conflicts. The parent may want to adopt this change itself.

## Input staging (`staged_input_paths`, `_build_task`)

Measured, once per job submission:

| Case | Time |
| --- | --- |
| Small job (job script, 5 configs, 51-file tool directory) | 0.8 ms |
| 10,000 inputs | 81 ms |
| 10,000 files in `working/` | 211 ms |
| Fifty 1 MB files in `working/` | 69 ms and 51 MiB peak |

A fresh job directory is small, so the large cases are unlikely at submission time.

**Fix: `f2bf5a839d1`.** The scan built a list holding every file's text before searching it, and read the files even when the tool had no directory, where `referenced_tool_files` returns at once. A generator, `_scanned_texts`, now reads the files one at a time and only if the scan runs. The fifty-file case drops to 3 MiB peak and 41 ms with a tool directory, and to 1 ms with none.

Left as is:

- `tool_directory_files` stops at 201 files. `os.walk` still lists any one huge directory whole, but only once per job.
- The reference scan still runs when the whole tool directory is staged, because it also catches referenced files under `test-data` and hidden directories, which the whole-directory walk skips. At 0.8 ms for a normal job, it costs almost nothing.
- Signing the URLs: 7 µs per input (10,000 inputs = 70 ms, included in the 169 ms build).

## Job files API

Per request, with a `job_token`, measured by SQL listener (one statement each, a primary-key `SELECT … FROM job`):

| Route | Queries | Notes |
| --- | --- | --- |
| GET / HEAD | 1 | `_active_job`; session closed before `GalaxyFileResponse` streams in 1 MiB chunks; x-accel/x-sendfile apply when configured |
| PUT `?path=` | 1 | authorize in one threadpool hop; `_new_staging_dir` closes the session before the body streams; a recheck (body ≥ 1 MiB or ≥ 1 s) adds 1 |
| PUT `/{rel_path}?path=<dir>` | 1 | same; `JobWorkingDirectory.resolve()` and `in_directory` are filesystem/string work only |
| POST (Pulsar), working directory path | 1 | |
| PUT/POST to an object-store output or its extra files | 3 | `_output_dataset_path` lists `output_datasets` and `output_library_datasets`, eagerly loaded, not one query per output; pre-existing, and TES-native outputs never take this path |

- The directory route is called once per file. A discovered-output directory of 10,000 files means 10,000 requests at one query each, and with TES's per-file PUT there is no way to batch them. The new `test_token_requests_load_only_the_job` (`34906cb3cca`) pins one query per GET, PUT and directory PUT, so a future lazy load in this path gets caught. I checked it fails (3 ≠ 1) when `_write_staging_parent` consults the outputs first.
- Threadpool: a small PUT makes about five hops (authorize, mkdtemp, write, finish, rmtree). The measured end-to-end time is the same as a one-hop GET, so I didn't merge them.
- Token verification: 7.5 µs, two HMAC-SHA256s (the key derivation is redone per call; caching it isn't worth the code).
- `readable_path`'s purged-input check lazy-loads input datasets, but only for a missing file (the error path). It's pre-existing.

## `JobFilesManager` authorization queries

`_authorize` decodes the id, verifies the token or key, and loads the job: one query. `_write_staging_parent` returns at the working directory check for everything a TES-native task writes. The outputs query happens only for object-store paths (Pulsar), and it is 2 extra queries, not N+1.

## Patterns from the process doc

- Unbounded queries or Python-side slicing: none on the branch. Every query is a primary-key lookup, or the job's outputs for object-store writes.
- ORM flush/commit loops: none. The job files routes are read-only on the database; `set_external_id` is one flush per submission.
- Sync DB code in async handlers: the PUT/POST handlers are `async`, but every manager call goes through `anyio.to_thread.run_sync`. GET is a sync route, run in the threadpool.
- Expensive fields on shared endpoints, CTEs, joins: not applicable.

</details>
