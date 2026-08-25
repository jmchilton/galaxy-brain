# Plan: `embedded_galaxy` Engine

Status: planning handoff, reconciled 2026-08-24 against Planemo master `75c52d3` and Galaxy PR #23360 at `cb42d82`.

## Outcome

Add an opt-in `--engine embedded_galaxy` that loads a coherent, wheel-installed Galaxy into Planemo's Python process, serves its ASGI app over loopback HTTP, and preserves Planemo's existing BioBlend, tool-test, workflow, reporting, and Tool Shed interfaces.

The engine is successful when XML and YAML tool tests and workflow tests run without a Galaxy checkout, startup is measured in seconds on a warm environment, failures retain useful logs, and teardown leaves no server, Celery worker, forkserver pool, job, or temporary configuration behind.

## Prerequisite

Galaxy PR [#23360](https://github.com/galaxyproject/galaxy/pull/23360) must first:

- land the mypy fix currently being handled separately;
- clear a partially built `galaxy.app.app` global if ASGI assembly fails; and
- be included in a package release.

Until then, prototype against wheels built from the PR. When released, set the Planemo extra's lower bound to the **first release containing the builder and wheel-job fixes**, not merely `>=26.1`.

## Scope

Version 1 supports `planemo run`, `planemo test`, and foreground `planemo serve` for local tools and workflows, Tool Shed installs, profiles/Postgres, and the existing Conda/container dependency resolvers.

It does not:

- become Planemo's default engine;
- embed a Galaxy source checkout;
- run in daemon mode;
- run gx-it-proxy or interactive tools;
- run Celery beat or periodic maintenance;
- promise two independent Galaxy application constructions in one Python process; or
- expose Galaxy's application object as a public Planemo API.

`uvx_galaxy` remains a separate subprocess/isolation design. Do not block this engine on the older draft Planemo PR #1555 or combine the two behind a mode flag.

## Runtime design

### Configuration

Extract the checkout-independent portion of `local_galaxy_config` into a shared helper. Both local engines must use it for tool, shed, dependency-resolver, file-source, vault, database, and job configuration. The embedded branch omits the `gravity:` block and checkout-root properties such as `tool_path` and `static_dir`, allowing Galaxy's package defaults to find bundled resources.

Embedded-specific settings:

```yaml
galaxy:
  auto_configure_logging: false
  enable_celery_tasks: true
  amqp_internal_connection: sqlalchemy+sqlite:////<config>/control.sqlite
  celery_conf:
    broker_url: memory://
    result_backend: rpc://localhost
    worker_hijack_root_logger: false
```

Also set `monitor_thread_join_timeout: 5`, force interactive tools off, retain `all_in_one_handling = True`, and ensure generated `job_conf.yml` contains no `handling:` section. Do **not** set `use_metadata_binary: true`; #23360's virtual-environment recovery makes the existing generated metadata script work for the supported wheel-in-venv path without introducing a bare-`PATH` console-script dependency.

Planemo must still write `galaxy.yml`. Galaxy's Celery app reads `GALAXY_CONFIG_FILE` and caches its configuration at import time, even though `build_galaxy_web_app()` itself accepts programmatic configuration. Set that environment variable before the first lazy import of `galaxy.webapps.galaxy.fast_factory`, restore it at teardown, and keep the file and programmatic dictionaries identical.

### Startup order

1. Validate options before importing Galaxy. Reject source-selection options (`--galaxy_root`, branch/source/install options), `--daemon`, and an explicit request for interactive tools. Document that no beat scheduler runs.
2. Allocate the temporary configuration and data directories and generate the shared Galaxy configuration.
3. Install engine-scoped logging handlers and set `GALAXY_CONFIG_FILE`.
4. Lazily import and call `build_galaxy_web_app(..., register_shutdown_at_exit=False)` with `configure_logging=False` in its programmatic configuration.
5. Retain the application privately for lifecycle control. Confirm `app.is_job_handler` and that the selected application stack is not Gunicorn. `app_pair` sets `galaxy.app.app`; assert it points to this application.
6. Start one in-process Celery worker with `pool="solo"`, `concurrency=1`, and queues `("galaxy.internal", "galaxy.external")`. Use `celery.contrib.testing.worker.start_worker(..., perform_ping_check=False)` initially; wrap it in a Planemo-owned adapter so the dependency can be replaced by a supported Galaxy entry point later.
7. Bind a loopback socket in Planemo, using port `0` when no port was requested, and pass the already-open socket to uvicorn. This removes the probe-close-bind race.
8. Run uvicorn on a daemon thread with its own event loop and an explicit 10-second graceful-shutdown timeout. Poll `/api/version` with the existing bounded startup timeout.
9. Yield an `EmbeddedGalaxyConfig` implementing the existing `GalaxyConfig`/`BaseManagedGalaxyConfig` surface. Downstream execution remains HTTP-based and unchanged.

### Teardown order

Teardown must be idempotent and continue after individual failures:

1. Stop accepting HTTP work (`server.should_exit = True`) and join uvicorn for at most 10 seconds. A second `KeyboardInterrupt` sets `server.force_exit = True`; do not install a process-global `signal.signal` handler.
2. Exit the Celery worker context before dismantling the Galaxy app.
3. Defensively stop and join `celery_app.fork_pool` for at most 5 seconds, even if worker startup only partially completed.
4. Call `app.shutdown()` behind a once-flag. Set `galaxy.app.app = None` afterward if it still points to this app.
5. Remove engine logging handlers, restore modified logger levels and `GALAXY_CONFIG_FILE`, dispose remaining database connections, and remove the temporary directory unless `--no_cleanup` was requested.

Use a 30-second diagnostic budget for the whole cooperative teardown and log remaining thread/process names when it is exceeded. Be honest about the limit: Python cannot safely kill a wedged in-process thread, and a2wsgi's `ThreadPoolExecutor.shutdown(wait=True)` can still block on an actively wedged WSGI request. The daemon uvicorn thread is a backstop, not proof of hard-bounded process exit.

### Celery and jobs

Celery is required. YAML tests always use `POST /api/jobs`; that endpoint enqueues `queue_jobs` and has no synchronous branch. A worker must therefore be live before readiness is declared.

Keep Galaxy's default task routes. The worker must consume both queues because `galaxy.fetch_data` and `galaxy.set_job_metadata` route to `galaxy.external`. `memory://` plus `rpc://localhost` is appropriate for this single-process topology: Celery 5.6.3's RPC backend requeues the latest result and caches it, so repeated state reads are safe in the same backend instance. The control queue is separate and remains on its explicit config-local SQLite database.

Run the real Celery upload chain first. Retain `task_routes: {galaxy.fetch_data: disabled}` only as a documented compatibility fallback if a supported POSIX platform demonstrates a forkserver failure. Planemo declares POSIX support, where Python's forkserver context is available; add Linux and macOS coverage rather than disabling it speculatively.

Do not change Planemo's normal XML-tool submission policy to `use_legacy_api="if_needed"` in this work. A focused test may pass that value explicitly to cover the async XML path; YAML already proves the worker is necessary.

### Logging

Use a file in the configuration directory as the canonical log. `log_contents` reads it on demand, `--no_cleanup` preserves it, and `service_log_contents` returns one synthetic tail such as `{"embedded.log": <last 100 lines>}` so the existing failure replay includes web and Celery output without pretending they are separate services.

Build Galaxy with logging configuration disabled and set `worker_hijack_root_logger: false`. During the engine lifetime:

- attach the file handler to the `galaxy`, `celery`, and `uvicorn` families;
- suppress/restore Planemo's pre-existing `galaxy` console handler so default runs stay quiet except for warnings and startup failures; and
- for `-v`, use a custom handler whose `emit()` calls `ctx.vlog` at call time. Do not use a long-lived `StreamHandler`, which bypasses Rich's live stdout/stderr proxy and corrupts progress displays.

### Packaging

Declare a static optional dependency in `pyproject.toml`:

```toml
[project.optional-dependencies]
embedded_galaxy = ["galaxy>=FIRST_FIXED_RELEASE,<NEXT_SERIES"]
```

Use the locked `galaxy` metapackage, never a hand-assembled list of Galaxy distributions. Keep the bound to one release series. Base `galaxy-*` ceilings in `requirements.txt` must contain that series; `galaxy-job-config-init` is independently versioned and exempt.

Tests should parse `[project.optional-dependencies]` from `pyproject.toml` as the single source of the target series. Add both a fast containment unit test and an actual resolver check. Run resolution per PR; a scheduled check is useful maintenance but not an MVP gate.

## Planemo integration points

The work is broader than adding one factory branch:

- Register the engine in `planemo/engine/factory.py` and both Click choice lists in `planemo/options.py`.
- `planemo serve` bypasses the engine factory and calls `galaxy.serve.serve` directly. Route `embedded_galaxy` through the new configuration/lifecycle there as well.
- Extract a shared configuration builder from `local_galaxy_config`; do not copy its properties dictionary.
- Add `EmbeddedGalaxyConfig` and an embedded engine class, while reusing `GalaxyEngine` execution and Tool Shed installation logic.
- Mixed workflow and native tool tests currently cause two sequential `ensure_runnables_served` scopes. Refactor the embedded test path to use one app for the entire command. Do not attempt to reset Galaxy's module globals between launches.
- `autoupdate --test` currently forces its test phase back to `engine="galaxy"`. Preserve that behavior for v1 or reject embedded mode clearly; do not silently perform a second embedded launch.
- Thread the existing test timeout into workflow polling where practical. Current `PollingTrackerImpl` is constructed without a timeout and can wait forever after an asynchronous-task failure.

## Suggested implementation slices

1. **Packaging and registration:** optional extra, lazy import failure message, bounds tests, option validation, engine factory/CLI choices.
2. **Shared configuration:** extract and test checkout-independent generation; embedded output has no Gravity/gx-it-proxy and no `handling:` section.
3. **Application and HTTP lifecycle:** builder integration, pre-bound socket, uvicorn thread, readiness, one-app command structure, foreground serve.
4. **Celery and jobs:** environment-before-import ordering, worker adapter, both queues, fork-pool teardown, handler assertions, YAML and upload tests.
5. **Diagnostics and cleanup:** file capture, Rich-safe verbose handler, failure replay, partial-start cleanup, Ctrl-C and teardown tests.
6. **Documentation and CI:** user-facing engine guidance, package resolver job, Linux integration matrix, and macOS lifecycle smoke test if available.

Keep each slice red-to-green and independently reviewable. The first end-to-end test should be a minimal YAML tool because it proves the async submission path rather than only application startup.

## Required tests

- Missing extra gives exactly `pip install planemo[embedded_galaxy]` and normal CLI startup never imports `galaxy.app`.
- Generated config shares the common helper, omits Gravity, disables gx-it-proxy, preserves config-local control storage, and emits no `handling:` key.
- XML tool, YAML tool, upload-requiring tool, workflow, and Tool Shed-installed workflow tests pass without a checkout.
- These Planemo integrations are the checkout-free proof; do not restore #23350's heavily mocked package smoke test.
- `memory://`/`rpc://` task state can be polled repeatedly before and after completion.
- Default output is quiet; failure replays `embedded.log`; `-v` does not corrupt Rich progress rendering; Galaxy never replaces Planemo's root logging configuration.
- Construction failure, readiness failure, normal completion, first Ctrl-C, and second Ctrl-C all clean the appropriate resources and preserve the original error.
- No uvicorn/Celery threads, forkserver/pool children, local job processes, or temporary directory survive a normal run.
- Mixed tool/workflow tests use exactly one Galaxy application construction.
- Existing engines and the full Planemo test suite remain behaviorally unchanged.

## Done means

The PR records cold/warm startup timings against the post-#1678 managed engine, documents unsupported options, builds the docs, resolves the optional extra in CI, and runs at least the YAML-tool and workflow integrations on every Planemo PR.
