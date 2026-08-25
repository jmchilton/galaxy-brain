# Background Work: Celery and Job Handlers

> Historical deep dive. Settled decisions and resolved questions are in [`PLAN.md`](PLAN.md) and [`RESEARCH_RESOLUTIONS.md`](RESEARCH_RESOLUTIONS.md).

How asynchronous tasks and jobs get done when Galaxy has only one process. See `PROCESS_LIFECYCLE.md` for shutdown and `LOGGING_AND_OUTPUT.md` for where output lands.

## Context

Galaxy normally spreads this work across processes that gravity starts: a web process, a job handler, a Celery worker, and a Celery beat scheduler. Embedded there is one process and no gravity. Two mechanisms need answers, and they are less entangled than they look - jobs and Celery tasks are separate systems that overlap on dataset upload, and, since the tool request API landed, on tool execution itself.

Planemo today sets `enable_celery_tasks: "true"` and gives Celery its own SQLite broker to avoid write-lock contention with gunicorn. Gravity then starts a worker and a beat process, gated on its own settings rather than on Galaxy's flag.

**This document previously concluded that the embedded engine should turn Celery off.** That conclusion is wrong and is retracted below; what follows replaces it. The old reasoning was sound about *uploads* - they do fall back to ordinary jobs - but uploads are no longer the only thing Celery carries.

## Decisions

**1. Celery runs. `enable_celery_tasks: true`.**

The tool-test interactor decides between the legacy `/api/tools` submission and the asynchronous tool request API, and for one class of test it does not consult configuration at all:

```python
submit_with_legacy_api = use_legacy_api == "always" or (use_legacy_api == "if_needed" and request is None)
if testdef.value_state_representation == "test_case_json":
    # Don't submit user / YAML tools to the old endpoint.
    submit_with_legacy_api = False
```

`value_state_representation` is `test_case_json` for every tool parsed by the YAML parser (`parser/yaml.py:435`; the XML parser sets `test_case_xml`). Planemo calls `verify_tool` without `use_legacy_api`, so it gets the `"always"` default - and that override discards it. **Testing a YAML tool submits through `POST /api/jobs` whatever Planemo asks for.**

That endpoint has no synchronous branch:

```python
result = queue_jobs.delay(request=task_request)
return JobCreateResponse(tool_request_id=tool_request_id, task_result=async_task_summary(result))
```

With Celery disabled the task is published and never consumed, the `ToolRequest` stays in state `NEW`, and the interactor's `wait_on_tool_request` polls `/api/tool_requests/{id}/state` until `DEFAULT_TOOL_TEST_WAIT` - **86400 seconds**. So Celery-off does not make newer tool tests worse, it wedges them for a day. The server-side `enable_tool_requests` option does not help: it gates the *client's* choice of endpoint (`client/src/components/Tool/submit/index.js`), not the interactor's.

This also answers the question the previous version of this document left open. Yes, something polls the async-task machinery: `/api/tasks/{task_id}/state` in `galaxy_test/base/populators.py`, and `/api/tool_requests/{id}/state` on the path Planemo itself runs. Both read `AsyncResult`, so both need a live worker and a real result backend.

**2. Run the worker on a thread inside the Planemo process, via `celery.contrib.testing.worker.start_worker`.**

This is what Galaxy's own API tests do - `UsesCeleryTasks` pulls in celery's `celery_session_worker` fixture (`galaxy_test/base/api.py:52-86`) - which means the in-process worker configuration is exercised in Galaxy CI daily rather than being something Planemo invents. `start_worker` defaults to `pool='solo'`, `concurrency=1`, starts `WorkController.start` on a daemon thread, waits for the consumer to signal ready, and on exit sets `celery.worker.state.should_terminate = 0` and joins with a timeout.

Two snags to handle at the call site: `perform_ping_check=True` asserts `celery.ping` is registered, which requires importing `celery.contrib.testing.tasks` (celery's pytest plugin does this for Galaxy; Planemo must do it explicitly or pass `perform_ping_check=False`), and `setup_app_for_worker` reconfigures logging - see decision 5.

Alternatives considered:

- **`task_always_eager`.** It would be accepted; `celery_conf` is passed straight into `celery_app.conf.update(...)` with no allowlist. But the upload path is a four-task chain with a `link_error` callback, and eager-mode semantics for chains, `link_error` and `AsyncResult` lookups are exactly where Celery's eager emulation is known to diverge. It also turns `queue_jobs` into synchronous work inside the HTTP request that submitted it, which is a different execution shape from the one under test.
- **Building the worker by hand** (`celery_app.Worker(pool='solo')` on a thread). No dependency on a `contrib.testing` module, but it means owning signal-handler suppression, `without_gossip`/`without_mingle`/`without_heartbeat`, and the started/stopped handshake that `start_worker` already implements correctly.
- **A worker subprocess** (`celery -A galaxy.celery worker`). The production shape, and it isolates the forkserver pool from Planemo's process - but it reintroduces a supervised process, a second Galaxy application construction, and a second log stream, which is most of what this engine exists to remove.

`start_worker` living under `contrib.testing` deserves the same suspicion this project applied to `galaxy_test.driver`, with one difference that decides it: `galaxy_test.driver` was rejected for assuming a source checkout at module scope, and `celery.contrib.testing.worker` assumes nothing about its environment. Record an upstream ask for a supported embedding entry point in `galaxy.celery` regardless.

**3. The worker must consume `galaxy.internal` *and* `galaxy.external`.**

`task_default_queue` is `galaxy.internal`, but the schema default for `celery_conf.task_routes` sends the two tasks that matter most somewhere else:

```yaml
task_routes:
  'galaxy.fetch_data': 'galaxy.external'
  'galaxy.set_job_metadata': 'galaxy.external'
```

A worker consuming only the default queue would run `queue_jobs` and silently never run an upload. Galaxy's own fixture passes `queues: ("galaxy.internal", "galaxy.external")` for this reason; Planemo must do the same.

**4. Set the broker and the result backend explicitly.**

`config_celery_app` only defaults `broker_url` from `amqp_internal_connection`; the result backend is filled in by `Configuration._process_celery_config`, which falls back to `db+sqlite:///<data_dir>/results.sqlite?isolation_level=IMMEDIATE`. Both defaults work, and both are files.

In one process neither needs to be. Galaxy's in-process test default is `broker_url: memory://` with `result_backend: rpc://localhost` (`galaxy_test/base/api.py:37-44`), which removes two SQLite databases, the write-lock contention that motivated Planemo's separate broker file, and the `prune_kombu_sqla_transport` cleanup that nothing will schedule anyway. Take that pair, because it is the pair Galaxy CI runs in-process; keep `sqlalchemy+sqlite` plus `db+sqlite` as the fallback if the `rpc` backend proves awkward under repeated state polling. Note that Galaxy's driver forces `broker_url: None` when it launches under gravity precisely because `memory://` cannot cross a process boundary (`driver_util.py:728-731`) - the constraint that makes it available to us is the one thing this engine has that gravity does not.

**5. `worker_hijack_root_logger: false`, and do not let the worker own logging.**

`start_worker` calls `setup_app_for_worker`, which calls `app.log.setup(loglevel, logfile)`. That reaches `setup_logging_subsystem`, and with no receiver connected to celery's `setup_logging` signal - Galaxy connects none - it executes:

```python
if self.app.conf.worker_hijack_root_logger:
    root.handlers = []
```

`worker_hijack_root_logger` defaults to true, so booting the worker would **discard the root handler `LOGGING_AND_OUTPUT.md` attaches to capture Galaxy's log**, in-process, after Planemo installed it. Set it false in `celery_conf`.

`redirect_stdouts` defaults to `False` in `app.log.setup`, so `sys.stdout` survives - but only because `setup_app_for_worker` omits the argument. A real `celery worker` process redirects stdout to a logger by default, which is one more reason not to reach for the subprocess variant while Planemo is drawing rich live displays on that stream.

**6. `galaxy.app.app` and `GALAXY_CONFIG_FILE` stop being landmines and become load-bearing.**

`celery_app = init_celery_app()` runs at **import time** of `galaxy.celery`, and eight webapp service modules import from `galaxy.celery.tasks` at module scope, so the Celery app is always constructed. Its configuration comes from `get_config()` → `get_app_properties()`, which reads `GALAXY_CONFIG_FILE` / `GALAXY_ROOT_DIR` **environment variables** and is `lru_cache`d - never from the app object Planemo built. Unset, it silently builds defaults unrelated to our config.

With Celery off this was inert. With a worker executing tasks, every task calls `get_galaxy_app()`, and its fallback is `build_app()`, which constructs a **second complete `GalaxyManagerApplication`** from those same env vars. So:

- Set `GALAXY_CONFIG_FILE` before anything imports `galaxy.celery`, which in practice means before building the app at all.
- Set `galaxy.app.app` to the constructed application. There is also `set_thread_app()`, which `galaxy_mock` uses, but it writes to a `threading.local()` - it would have to be called *on the worker thread* to be seen there, so `galaxy.app.app` is the reliable seam.

**7. The forkserver pool is the real cost of turning Celery on, and Planemo owns its teardown.**

Booting a worker fires `worker_init`, and Galaxy's handler builds a process pool:

```python
context = get_context("forkserver")
celery_app.fork_pool = pebble.ProcessPool(max_workers=sender.concurrency, max_tasks=100, initializer=init_fork_pool, context=context)
```

`abort_when_job_stops` submits into it, which is how `galaxy.fetch_data` and `galaxy.set_job_metadata` actually execute. So an embedded worker means Planemo spawns a forkserver and its children - the one place this engine adds processes rather than removing them. `worker_shutting_down` stops the pool, but Galaxy's own test fixtures stop and join it explicitly in a `finally` regardless, which is a strong hint the signal alone is not enough. Planemo's teardown must do the same and must survive the pool not existing (a worker that never booted). This belongs in `PROCESS_LIFECYCLE.md`'s shutdown ordering.

**8. Uploads: run the real chain, with a documented escape hatch if the pool fights back.**

Two positions are now defensible, and the previous version of this document only saw the second:

- **(a) Leave `galaxy.fetch_data` routed normally.** Upload is the four-task chain, executing through the fork pool, exactly as in production and in Galaxy CI. Highest fidelity, and fidelity is Planemo's product.
- **(b) `task_routes: {'galaxy.fetch_data': 'disabled'}`.** `Configuration.is_fetch_with_celery_enabled()` returns `enable_celery_tasks and not fetch_disabled`, so the `continue` in `tools/execute.py` is skipped and **uploads become ordinary Galaxy jobs** run by the job handler - the mechanism the old decision 1 relied on - while `queue_jobs` and everything else still goes through Celery. This is a documented route value in the config schema, not a hack.

Take (a). Keep (b) in reach: it is a one-key change, it isolates the fork pool to metadata only, and it is the right answer if forkserver-under-embedding turns out to be hostile on any supported platform.

**9. Metadata stays off Celery: keep `use_metadata_binary: true`.**

Celery being on makes `metadata_strategy: directory_celery` available, and Galaxy's own test config uses a `*_celery` strategy. It is tempting, because in-process metadata sidesteps the wheel problem entirely - the separate metadata process needs to import `galaxy_ext`, and the default route to it is `os.path.abspath("lib")` relative to a CWD that has no checkout.

Keep the non-Celery answer anyway. `use_metadata_binary: true` switches the command to the `galaxy-set-metadata` console script, which is wheel-native and needs no `PYTHONPATH`; it is a job-destination parameter, so it belongs in the generated `job_conf.yml` (`galaxy-job-config-init` territory). The celery strategy would put metadata on the fork pool for no gain, and `_handle_metadata_externally` **synchronously waits on the task result** - its own comment says so - which is precisely the shape that deadlocks a single-slot worker if it ever runs from inside a task.

**10. Concurrency is one, and nothing may block on another task.**

`pool='solo'`, `concurrency=1` is the right default: deterministic ordering, no fork-of-a-threaded-process, one fork-pool slot. The constraint it buys is that any Celery task which waits on another Celery task's result wedges the worker permanently. Nothing on the tool- or workflow-test path does this today; decision 9 keeps it that way.

## Unchanged from the Celery-off analysis

**11. A single process does handle its own jobs - and it only works because Planemo does not configure handling.**
The predicate is `is_handler`, and its self-handling branch requires **`not self.handlers and not self.handler_assignment_methods_configured`** alongside a DB-based assignment method. With no `handling:` section, `_set_default_handler_assignment_methods` picks one from the application stack (`db-transaction-isolation` on SQLite, `db-skip-locked` on Postgres), leaves `handler_assignment_methods_configured` false, and the process declares itself a handler. Write an explicit `handling: assign: [db-skip-locked]` with no `processes:` and that branch stops matching - **the process silently stops handling its own jobs.** Planemo already avoids this by passing `all_in_one_handling = True` into `galaxy-job-config-init`, which then emits no `handling:` section at all (its own default is `False`, so this is an active override). That override is load-bearing, non-obvious, and must be preserved.

**12. Postfork functions run inline here - assert it rather than assume it.**
`job_manager.start`, `queue_worker.bind_and_start`, and `workflow_request_monitor.start` are all registered through `register_postfork_function`, whose base implementation **calls immediately**. Only `GunicornApplicationStack` defers, and only under `--preload`. Stack selection keys off `SERVER_SOFTWARE` containing `gunicorn`, then `IS_WEBAPP`, then Webless. Under uvicorn-on-a-thread we land on Webless or Web, both of which run postfork inline - which is what we want, but by accident of environment rather than by design. A stray `SERVER_SOFTWARE` inherited from an outer process would silently disable job handling with no error. Worth an explicit assertion at startup.

**13. The control queue is not Celery and runs regardless.**
Galaxy builds a kombu connection from `amqp_internal_connection` unconditionally and starts a consumer thread for its internal control queue, independent of `enable_celery_tasks`. Its schema default is a **relative path** (`./database/control.sqlite`), resolved against CWD. Planemo already overrides it; the embedded engine must keep doing so, pointing into the config directory. Note this is a separate connection from `celery_conf.broker_url`, so choosing `memory://` for Celery in decision 4 does not remove this file.

## Implementation

1. Keep `enable_celery_tasks: true` in the generated config, and add a `celery_conf` block: `broker_url: memory://`, `result_backend: rpc://localhost`, `worker_hijack_root_logger: false`, and the default `task_routes` left intact.
2. Set `GALAXY_CONFIG_FILE` before constructing the app, and set `galaxy.app.app` to the constructed application.
3. Start the worker with `celery.contrib.testing.worker.start_worker(celery_app, pool="solo", concurrency=1, queues=("galaxy.internal", "galaxy.external"), perform_ping_check=False)`, entered as part of engine startup and exited as part of teardown.
4. On teardown, after the worker context exits, stop and join `celery_app.fork_pool` defensively.
5. Keep `all_in_one_handling = True`, and add a comment at that call site explaining that an explicit `handling:` section would disable self-handling - the reason is not discoverable from the surrounding code.
6. Add `use_metadata_binary: true` to the generated job destination.
7. Point `amqp_internal_connection` into the config directory as today.
8. Assert at startup that the resolved application stack is not the gunicorn one, failing loudly rather than silently not handling jobs.

## Verification

- **A YAML tool test passes.** This is the decision this rewrite turns on, and it is the only test that exercises `/api/jobs` → `queue_jobs` → `/api/tool_requests/{id}/state`. Red first is available and cheap: with `enable_celery_tasks: false` it must hang or time out rather than fail cleanly, which is itself worth capturing once so the failure mode is on record.
- A tool test whose input requires upload passes, confirming the four-task fetch chain and the fork pool work under embedding.
- Planemo exits with no surviving worker thread, forkserver process, or pool children after a run - checked by process and thread enumeration, not by eye.
- Galaxy's log still reaches `log_contents` *after* the worker has booted, which is the assertion that catches a regression on `worker_hijack_root_logger`.
- A test asserting the generated `job_conf.yml` contains **no** `handling:` key - cheap, and guards a silent failure mode.
- A metadata-setting job succeeds in a wheel-only environment. Red first: without `use_metadata_binary`, expect an import failure inside the job.
- An assertion that `app.is_job_handler` is true after construction, which catches both the handling-config regression and the `SERVER_SOFTWARE` hazard in one check.

## Cross-cutting consequences

- **Logging does not get simpler.** The earlier version of this document expected Celery-off to close the gap that `log_service_logs_on_failure` exists for. Instead the worker is in Planemo's own process, so its output arrives on the same root logger as everything else - which is better than a separate file, but only if decision 5 holds. `LOGGING_AND_OUTPUT.md`'s open question about where in-process Celery output belongs is answered: the same buffer, no separate key.
- **Shutdown gets harder, not easier.** There is no worker or beat *process* to stop, but there is now a worker thread with a handshake, a forkserver, and pool children, on top of the in-process threads that were already there: job handler monitor (1 s poll), stop queue (10 s initial delay), one monitor thread per runner plugin, workflow request monitor, and the kombu control-queue consumer.
- **Dataset hashes come back.** `compute_dataset_hash` is guarded by `if self.app.config.enable_celery_tasks:` with no `else`; Celery-off silently skipped it. With Celery on it runs, which removes a behavioural difference from production rather than adding one.
- **Export, `materialize`, PDF export and `*_celery` metadata strategies stop being landmines.** They raise only when Celery is off. None are on the tool- or workflow-test path either way.
- **Nothing schedules periodic tasks.** No beat, so `prune_history_audit_table`, `cleanup_short_term_storage`, `prune_kombu_sqla_transport` and friends never fire. Harmless for the lifetime of a Planemo run, and worth stating.

## Adjacent findings, not acted on here

- **Planemo's workflow polling has no timeout at all.** `PollingTrackerImpl(polling_backoff)` is constructed with `timeout` omitted, so it defaults to `None` and the timeout guard never fires - the loop spins at 4 Hz indefinitely. The tool-test path does have a bound, but `DEFAULT_TOOL_TEST_WAIT` in the interactor is **86400 seconds**. Decision 1 makes this sharper than it was: a misconfigured worker produces a day-long hang rather than an error, and that is the most likely way this engine fails for someone.
- **A likely upstream bug in `_verify_celery_config`** (`lib/galaxy/jobs/runners/__init__.py:440`): `if not celery_conf and not celery_conf["result_backend"]:` uses `and` where `or` was clearly intended, making the `result_backend` guard dead - the second operand would raise `TypeError` if it were ever reached.
- **Gravity starts Celery worker and beat regardless of `enable_celery_tasks`**, gating only on its own settings. Not our problem once gravity is out of the picture, but it explains why the current setup has worker logs even when they are doing nothing.
- **`enable_tool_requests` does not do what its name suggests.** It gates the client's endpoint choice only; the tool-test interactor routes `test_case_json` tools to `/api/jobs` whether it is set or not.

## Open Questions

- Does `memory://` plus `rpc://localhost` hold up under repeated `/api/tasks/{id}/state` polling, or does the rpc backend's consume-once behaviour bite when the interactor polls the same task id many times? Galaxy CI suggests it holds; worth confirming directly before committing to it over the SQLite pair.
- Does forkserver-under-embedding behave on every platform Planemo supports, or does decision 8(b) become the default on some of them?
- Should the engine hard-fail at startup on config that needs machinery it is not running - beat-scheduled work, gx-it-proxy - rather than at use?
- `use_metadata_binary: true` for the embedded engine only, or for all Planemo-generated job configs? It looks strictly better in both, but changing the managed engine is a wider blast radius.
- Is there a case for `use_legacy_api="if_needed"` from Planemo, so XML tools with typed parameter schemas also exercise the async path? That is a testing-coverage question rather than an engine question, but this engine is where it would be cheapest to answer.
