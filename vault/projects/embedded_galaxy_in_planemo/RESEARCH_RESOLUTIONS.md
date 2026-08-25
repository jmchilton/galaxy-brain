# Resolved Research Questions

Answers to the comments and open questions in the original design notes, reconciled 2026-08-24.

## Server and lifecycle

- **HTTP or in-process transport?** Loopback HTTP. BioBlend and the tool-test interactor do not provide an injectable ASGI transport, and retaining a real `galaxy_url` leaves downstream Planemo untouched.
- **Dedicated uvicorn thread?** Yes, with its own event loop. The Planemo main thread remains available for the CLI and signal-to-`KeyboardInterrupt` behavior.
- **Port selection?** Bind one loopback socket up front, using port `0`, and give the open socket to uvicorn. Do not probe a free port and close it before uvicorn binds.
- **Daemon thread?** Yes as a last-resort backstop, paired with cooperative shutdown and bounded joins. It does not solve a2wsgi's non-daemon executor threads, so it is not advertised as a hard-kill guarantee.
- **Shutdown deadline?** Use 10 seconds for uvicorn, 10 seconds for the Celery worker, 5 seconds for the fork pool, and `monitor_thread_join_timeout: 5`, with a 30-second diagnostic budget. Galaxy's own `app.shutdown()` can still block on a wedged WSGI task; Python has no safe thread-kill primitive.
- **Custom `signal.signal` handler?** No. CPython's default SIGINT behavior already raises `KeyboardInterrupt` on the main thread and unwinds Planemo's context managers. The first interrupt initiates `kill()`; catch a second interrupt during the bounded join to set uvicorn's `force_exit`.
- **Repeat launches?** Version 1 permits one Galaxy application per Planemo process. Refactor mixed tool/workflow tests to share one scope. Preserve the managed-engine test phase in `autoupdate --test` or reject the combination. Do not attempt to reset Galaxy's many module globals.
- **Expose the app?** Keep it private on `EmbeddedGalaxyConfig` for shutdown and assertions. Parity requires no public application-object API.

## Celery, jobs, and polling

- **Can Celery be disabled?** No. YAML tool tests unconditionally use `/api/jobs`, which enqueues `queue_jobs`; without a worker the request remains `NEW` until the one-day tool-test timeout.
- **`memory://` plus `rpc://localhost` under repeated polling?** Safe for this one-process design. Celery 5.6.3's [`RPCBackend.get_task_meta`](https://github.com/celery/celery/blob/v5.6.3/celery/backends/rpc.py#L274-L306) requeues the latest result and caches decoded metadata; subsequent `AsyncResult.state` reads use that cache. Add an integration regression test anyway.
- **Forkserver portability?** Planemo declares POSIX support. Python forkserver is available on supported POSIX systems, including Linux and macOS. Keep the production-faithful upload chain and test both where CI permits; use the documented `galaxy.fetch_data: disabled` route only after a demonstrated platform failure.
- **Fail on missing beat or gx-it-proxy?** Reject explicit requests for semantics the engine cannot provide. Force gx-it-proxy off and document that periodic maintenance does not run. The short-lived test engine need not fail merely because Galaxy defines beat-scheduled tasks.
- **Change XML tests to `use_legacy_api="if_needed"`?** No; that is an orthogonal test-policy change. Exercise it in a focused test if desired. YAML already supplies the required async-path acceptance test.
- **Polling timeouts?** The earlier finding stands: workflow polling constructs `PollingTrackerImpl` without a timeout. Thread the existing test timeout into the workflow-test path or file a focused Planemo follow-up; do not rely only on the worker being correctly configured.
- **`_verify_celery_config` condition?** It is a real adjacent Galaxy bug: `if not celery_conf and not celery_conf["result_backend"]` should not index a falsey config and fails to reject a truthy config lacking the backend. Fix separately; the embedded engine supplies an explicit backend.

## Logging

- **Memory buffer or file?** File. It bounds memory, keeps `--no_cleanup` useful, and already matches `log_contents`' string-on-demand contract.
- **Per-service shape?** Return one synthetic `embedded.log` tail. Web, job-handler, and Celery logs share a process and cannot honestly be separated, but returning `{}` would disable the existing failure replay.
- **Where do Celery logs go?** The same file. Set `worker_hijack_root_logger: false` or worker startup removes the capture handler.
- **Quiet or stream?** Quiet by default except warnings and bounded-startup diagnostics. `-v` streams through a custom handler that calls `ctx.vlog`; a normal `StreamHandler` holds the original stderr and writes through Rich live displays.

## Packaging

- **Static extra or second requirements file?** Static `[project.optional-dependencies]` is valid alongside dynamically loaded base dependencies and keeps the one-line extra visible in package metadata.
- **Series or unbounded minimum?** One release series. Galaxy's metapackage is a deployment lock, and silently following the newest series would collide with Planemo's base `galaxy-*` ceilings.
- **Where is the target series defined?** In `pyproject.toml`; tests parse it from there. Do not duplicate it in a Python constant.
- **Per-PR or scheduled resolution?** Per-PR is the gate. A scheduled resolver run is useful early warning for a new patch release but can land after the MVP.
- **Relation to `uvx_galaxy`?** Planemo PR [#1555](https://github.com/galaxyproject/planemo/pull/1555) remains an open draft last updated in 2025. It preserves environment/process isolation and now conflicts with lifecycle work merged in [#1678](https://github.com/galaxyproject/planemo/pull/1678). Treat it as a separate alternative, not another mode of the embedded engine.

## Wheel-installed jobs

- **Should Planemo force `use_metadata_binary: true`?** No. PR #23360's `sys.prefix` fallback lets the job script activate the wheel-providing venv, after which the existing generated `python metadata/set.py` path works and preserves its traceback artifact. The console-script route is not strictly safer when the environment's `bin` directory is absent from `PATH`.
- **What is the general no-`PATH` metadata command?** Galaxy has no fully general one today. `galaxy-set-metadata` is a bare console-script name, while `python -m galaxy.metadata.set_metadata` is not an entry point because that module has no `__main__` call. A general upstream design would need an absolute/interpreter-relative command while respecting remote runners. It is outside the v1 Planemo wheel-in-venv contract.
- **Other unsafe `GALAXY_LIB` readers?** On #23360, the consumers are the guarded job-script templates and remote-tool-evaluation selection. The latter now uses `galaxy-remote-tool-eval` when `galaxy_lib_dir` is `None`, and Pulsar chooses based on its own remote layout. No additional unguarded consumer was found.
- **One issue for `GALAXY_LIB` and metadata defaults?** No longer. #23360 fixes the bogus library path and virtual-environment recovery. The proposed metadata-default change is neither required for the normal venv path nor generally correct, so there is no second confirmed defect to combine.
- **AMQP default relative to CWD?** No. Runtime has long preferred an explicit `database_connection`, otherwise `<data_dir>/control.sqlite`; #23360 removes the dead schema default and documents the real behavior. Planemo should still use a separate config-local control database to avoid sharing its main SQLite database, but this is isolation policy rather than a wheel-path workaround.
- **Remote tool evaluation under wheels?** #23360 adds the package entry point and source/package dispatch. It is no longer out of scope on the basis of a missing checkout file, though the embedded engine need not add a new user-facing remote-evaluation mode in v1.

## Upstream dependency state

- Planemo [#1678](https://github.com/galaxyproject/planemo/pull/1678) merged on 2026-08-22. The embedded work should build on its managed-engine lifecycle and shared diagnostics rather than carrying the original assumption that it is pending.
- Galaxy [#23350](https://github.com/galaxyproject/galaxy/pull/23350) closed unmerged and was superseded by release-branch draft [#23360](https://github.com/galaxyproject/galaxy/pull/23360).
- Galaxy issue [#23339](https://github.com/galaxyproject/galaxy/issues/23339) remains open for the broader fact that `galaxy-test-driver` itself is not a checkout-free package. Planemo should use the new production builder and not depend on that driver.
